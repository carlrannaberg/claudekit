# Check Any Changed Hook

## Overview

The check-any-changed hook detects and prevents the use of TypeScript's `any` type in changed files. It enforces proper typing by flagging `any` types and providing specific guidance on how to replace them with proper type definitions.

**Why separate from TypeScript compiler?** While TypeScript's strict mode can also catch `any` types, this hook provides instant feedback through fast pattern matching on individual files, without needing to compile the entire project. This makes it much faster for immediate validation during development.

## Installation

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks check-any-changed
```

This configures the hook to run on PostToolUse events for Write, Edit, and MultiEdit operations in `.claude/settings.json`.

## How It Works

1. **File Detection** - Monitors Write, Edit, and MultiEdit operations on TypeScript files
2. **Content Analysis** - Scans .ts and .tsx files for forbidden `any` type usage
3. **Smart Filtering** - Removes strings and comments to avoid false positives
4. **Pattern Matching** - Detects various `any` type patterns while allowing test utilities
5. **Violation Reporting** - Provides detailed feedback with specific fix examples

## Architecture

```
┌─────────────────────────────────────────────┐
│       Write/Edit/MultiEdit Tool Use        │
│       TypeScript file modifications        │
│         (operation completes)              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│      check-any-changed (PostToolUse)       │
│  • Check if file is .ts/.tsx extension     │
│  • Remove strings/comments for analysis    │
│  • Scan for forbidden 'any' type patterns  │
│  • Skip test utilities (expect.any())      │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│              Result                         │
│   SUCCESS: No 'any' types found           │
│   FEEDBACK: 'any' types detected          │
└─────────────────────────────────────────────┘
```

## Detection Patterns

The hook identifies these forbidden `any` type patterns:

- **: any** - Type annotations (`param: any`)
- **: any[]** - Array types (`items: any[]`)
- **<any>** - Generic types (`Promise<any>`)
- **as any** - Type assertions (`value as any`)
- **= any** - Variable assignments (`let x = any`)

**Allowed patterns:**
- `expect.any()` - Jest test utilities
- `.any()` - Method calls
- `any` within strings or comments

## What Claude Sees

When the hook detects violations after a TypeScript file edit, Claude receives feedback like this:

```
BLOCKED: Forbidden 'any' types detected

❌ File contains 2 forbidden 'any' types:

Line 15: const data: any = response.json();
Line 23: items: any[]

MANDATORY INSTRUCTIONS:
1. Replace ALL 'any' types with proper types
2. Use specific interfaces, union types, or generics instead of 'any'
3. Examples of fixes:
4.   - Instead of: data: any → Define: interface Data { ... }
5.   - Instead of: items: any[] → Use: items: Item[] or items: Array<{id: string, name: string}>
6.   - Instead of: value: any → Use: value: string | number | boolean
7.   - Instead of: response: any → Use: response: unknown (then add type guards)
```

When no violations are found:
```
✅ No forbidden 'any' types found!
```

## Smart Analysis Features

### String and Comment Removal
The hook removes strings and comments before analysis to prevent false positives:

```typescript
// These won't trigger violations:
const message = "Don't use any shortcuts"; // ✅ 'any' in string
/* TODO: Fix any issues later */ // ✅ 'any' in comment
```

### Test Utility Exceptions
Jest and testing utilities are allowed:
```typescript
// These won't trigger violations:
expect.any(String) // ✅ Jest matcher
mock.any() // ✅ Method call
```

## Usage Examples

### Violations Caught
```typescript
// ❌ These trigger violations:
function process(data: any) { ... }
const items: any[] = [];
const result = getValue() as any;
let config: any = {};
```

### Proper Alternatives
```typescript
// ✅ These are the fixes:
interface ProcessData {
  id: string;
  name: string;
}
function process(data: ProcessData) { ... }

const items: Item[] = [];
const result = getValue() as ProcessedResult;
let config: ConfigOptions = {};
```

## Troubleshooting

**Hook not triggering?**
Check if configured correctly:
```bash
claudekit list hooks | grep check-any-changed
```

**False positives with legitimate 'any'?**
The hook removes strings and comments, but if you have edge cases:
- Check that test utilities use `expect.any()` format
- Verify the pattern isn't in a context the hook should ignore

**Testing the hook manually:**
```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.ts","old_string":"x: string","new_string":"x: any"}}' | \
  claudekit-hooks run check-any-changed
```

## Limitations

- **TypeScript files only** - Only scans .ts and .tsx extensions
- **No configuration** - Fixed patterns with no customization options

## Common Patterns and Fixes

### API Responses
```typescript
// ❌ Avoid
const response: any = await fetch('/api/data').then(r => r.json());

// ✅ Better
interface ApiResponse {
  data: UserData[];
  status: string;
}
const response: ApiResponse = await fetch('/api/data').then(r => r.json());
```

### Event Handlers
```typescript
// ❌ Avoid  
function handleClick(event: any) { ... }

// ✅ Better
function handleClick(event: MouseEvent) { ... }
```

### Generic Functions
```typescript
// ❌ Avoid
function process(input: any): any { ... }

// ✅ Better
function process<T>(input: T): ProcessedResult<T> { ... }
```