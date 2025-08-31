# TypeScript Validation Hooks

## Overview

The TypeScript hooks provide comprehensive type checking through two complementary hooks: `typecheck-changed` for immediate feedback when TypeScript files are modified, and `typecheck-project` for full project validation. Both hooks run project-wide TypeScript compilation to ensure type safety across the entire codebase.

## Installation

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks typecheck-changed,typecheck-project
```

This configures both hooks in `.claude/settings.json`:
- `typecheck-changed` runs on PostToolUse events for TypeScript file modifications
- `typecheck-project` runs on Stop/SubagentStop events for comprehensive validation

## How It Works

### typecheck-changed Hook
1. **File Detection** - Monitors Write, Edit, and MultiEdit operations on TypeScript files (.ts/.tsx)
2. **TypeScript Check** - Verifies TypeScript is configured (tsconfig.json exists)
3. **Project-Wide Compilation** - Runs `tsc --noEmit` to check all files (TypeScript requires full project context)
4. **Immediate Feedback** - Provides instant type checking results after file changes

### typecheck-project Hook
1. **Session Completion** - Triggers when Claude Code session ends or subagent stops
2. **Full Project Validation** - Runs TypeScript compiler on entire project
3. **Comprehensive Type Checking** - Ensures no type errors remain project-wide
4. **Final Quality Gate** - Blocks completion if type errors exist

## Architecture

```
┌─────────────────────────────────────────────┐
│       Write/Edit/MultiEdit Tool Use        │
│       TypeScript file changes (.ts/.tsx)   │
│         (operation completes)              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│      typecheck-changed (PostToolUse)       │
│  • Check if .ts/.tsx file was modified     │
│  • Verify tsconfig.json exists             │
│  • Run tsc --noEmit on entire project      │
│  • Report type errors with fix guidance    │
└─────────────────────────────────────────────┘
                  
┌─────────────────────────────────────────────┐
│           Session End/Stop                  │
│      Claude Code stop or subagent end      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     typecheck-project (Stop/SubagentStop)  │
│  • Check if TypeScript available           │
│  • Run tsc --noEmit on entire project      │
│  • Report all remaining type errors        │
│  • Block completion if errors exist        │
└─────────────────────────────────────────────┘
```

## TypeScript Configuration Detection

Both hooks automatically detect TypeScript configuration by checking for `tsconfig.json` in the project root. If no TypeScript configuration is found, the hooks skip validation silently.

**Note**: Both hooks run project-wide compilation because TypeScript type checking requires analysis of the entire project to validate type relationships, imports, and dependencies.

## What Claude Sees

### typecheck-changed Success
```
✅ TypeScript check passed!
```

### typecheck-changed Violations
```
BLOCKED: TypeScript compilation failed

src/components/UserCard.tsx(15,7): error TS2322: Type 'string' is not assignable to type 'number'.
src/utils/helpers.ts(23,12): error TS2339: Property 'nonExistentMethod' does not exist on type 'string'.
src/types/index.ts(8,3): error TS2403: Subsequent variable declarations must have the same type.

MANDATORY INSTRUCTIONS:
1. Fix ALL TypeScript errors shown above
2. Run 'npm run tsc --noEmit' to verify all errors are resolved
```

### typecheck-project Success
```
✅ TypeScript validation passed!
```

### typecheck-project Violations
```
[Formatted TypeScript compiler output with all project errors and mandatory fix instructions]
```

## Configuration

Configure both hooks in `.claudekit/config.json`:

```json
{
  "hooks": {
    "typecheck-changed": {
      "command": "npx tsc --noEmit --skipLibCheck",
      "timeout": 45000
    },
    "typecheck-project": {
      "command": "npm run type-check",
      "timeout": 60000
    }
  }
}
```

### Hook Options

Both hooks support the same configuration options:

- **`command`** - Custom TypeScript command (default: `<package-manager> tsc --noEmit`)
- **`timeout`** - Maximum execution time in milliseconds (default: none)

### Common Commands

**Standard compilation:**
```json
{
  "command": "npx tsc --noEmit"
}
```

**With additional flags:**
```json
{
  "command": "npx tsc --noEmit --skipLibCheck --strict"
}
```

**Custom npm script:**
```json
{
  "command": "npm run type-check"
}
```

## Usage Examples

### Immediate Validation (typecheck-changed)
```typescript
// Edit a TypeScript file with type errors
interface User {
  id: number;
  name: string;
}

function getUser(): User {
  return {
    id: "123",        // ❌ Type error: string not assignable to number
    name: "John",
    age: 25          // ❌ Type error: 'age' does not exist in type 'User'
  };
}

// Hook detects and reports both type errors across the project
```

### Project-Wide Validation (typecheck-project)
When Claude Code session ends, the hook runs TypeScript compilation on the entire project and reports any remaining type errors across all .ts/.tsx files.

## Supported File Types

### typecheck-changed Trigger
- `.ts` - TypeScript files
- `.tsx` - React TypeScript files

### Compilation Scope
Both hooks compile **all TypeScript files** in the project as configured in `tsconfig.json`, regardless of which specific file triggered the validation.

## Troubleshooting

### Hooks Not Running
Check if hooks are configured:
```bash
claudekit list hooks | grep typecheck
```

### TypeScript Not Found
Ensure TypeScript is configured:
```bash
# Check for TypeScript config
ls -la tsconfig.json

# Install TypeScript if missing
npm install --save-dev typescript

# Initialize tsconfig.json if needed
npx tsc --init
```

### Slow Compilation
For large projects, increase timeout:
```json
{
  "hooks": {
    "typecheck-changed": {
      "timeout": 120000
    },
    "typecheck-project": {
      "timeout": 180000
    }
  }
}
```

### Custom Build Commands
If your project uses custom type checking scripts:
```json
{
  "hooks": {
    "typecheck-changed": {
      "command": "npm run type-check:strict"
    },
    "typecheck-project": {
      "command": "npm run type-check:full"
    }
  }
}
```

### Testing Hooks Manually
```bash
# Test typecheck-changed
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/test.ts"}}' | \
  claudekit-hooks run typecheck-changed

# Test typecheck-project
claudekit-hooks run typecheck-project
```

## Key Design Decisions

### Why Project-Wide Compilation for Both Hooks?
- **Type Dependencies** - TypeScript types can depend on other files in the project
- **Import Resolution** - Changes to one file can affect type checking in other files
- **Global Types** - Type definitions and ambient declarations need full project context
- **Accurate Results** - Partial compilation can miss type errors that only appear in full context

### Why Both Individual and Project Hooks?
- **Immediate feedback** - `typecheck-changed` provides instant validation during development
- **Comprehensive validation** - `typecheck-project` ensures no issues remain before task completion
- **Development workflow** - Quick checks during active work, thorough validation before finishing
- **Quality gates** - Final validation prevents completion with unresolved type errors

### Why Skip When No tsconfig.json?
- **Optional tooling** - Not all JavaScript projects use TypeScript
- **Configuration required** - TypeScript compilation requires proper configuration
- **Graceful fallback** - Doesn't interfere with non-TypeScript projects

## Integration with Development Workflow

### During Development
1. Edit TypeScript file (.ts/.tsx)
2. `typecheck-changed` runs full project type checking
3. Receive immediate feedback on type errors anywhere in the project
4. Fix type issues before continuing

### Before Completion
1. Finish development work
2. Stop Claude Code session or subagent
3. `typecheck-project` validates entire codebase one final time
4. Address any remaining project-wide type errors

## Common Type Errors and Fixes

### Type Mismatches
```typescript
// ❌ Error
const id: number = "123";

// ✅ Fix
const id: number = 123;
// or
const id: string = "123";
```

### Missing Properties
```typescript
// ❌ Error
interface User {
  id: number;
  name: string;
}

const user: User = { id: 1 }; // Missing 'name'

// ✅ Fix
const user: User = { id: 1, name: "John" };
```

### Import/Export Issues
```typescript
// ❌ Error
import { NonExistentType } from './types';

// ✅ Fix
import { ExistingType } from './types';
```

### Any Type Usage
```typescript
// ❌ Error (if strict mode)
function process(data: any) { ... }

// ✅ Fix
interface ProcessData {
  id: number;
  value: string;
}
function process(data: ProcessData) { ... }
```

## Limitations

- **TypeScript projects only** - Requires tsconfig.json configuration
- **Full compilation** - Always runs project-wide, which can be slow for large projects
- **Build dependency** - Requires TypeScript compiler (tsc) to be available
- **Configuration sensitive** - Behavior depends on tsconfig.json settings
- **Memory intensive** - Large projects may require significant memory for type checking