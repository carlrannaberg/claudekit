# Check Comment Replacement Hook

## Overview

The check-comment-replacement hook detects a common anti-pattern where AI assistants replace code with explanatory comments instead of cleanly removing it. When code needs to be deleted, it should be removed entirely - git commit messages should document the reasoning, not inline comments.

## Installation

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks check-comment-replacement
```

This configures the hook to run on PostToolUse events for Edit and MultiEdit operations in `.claude/settings.json`.

## How It Works

1. **Edit Detection** - Monitors Edit and MultiEdit tool usage
2. **Content Analysis** - Examines old vs new content in code files
3. **Pattern Matching** - Identifies when actual code is replaced with only comments
4. **Violation Reporting** - Provides feedback with mandatory instructions to fix the issue

## Architecture

```
┌─────────────────────────────────────────────┐
│         Edit/MultiEdit Tool Use            │
│    old_string → new_string changes         │
│         (operation completes)              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│    check-comment-replacement (PostToolUse) │
│  • Extract edit operations from payload    │
│  • Skip documentation files (.md, .txt)    │
│  • Analyze content transformation          │
│  • Detect code → comments replacement      │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│              Result                         │
│   SILENT: Clean code changes               │
│   FEEDBACK: Code replaced with comments    │
└─────────────────────────────────────────────┘
```

## Detection Logic

The hook identifies violations when:

- **Old content** contains actual code (non-comment, non-empty lines)
- **New content** consists entirely of comments
- **Size similarity** suggests replacement rather than deletion
- **File type** is a code file (skips .md, .txt, .rst documentation)

**Comment patterns detected:**
- `// Single line comments`
- `/* Block comments */`
- `# Hash comments` (excluding `##` markdown headers)
- `-- SQL/Lua style comments`
- `* Block comment continuations`
- `<!-- HTML comments -->`

## What Claude Sees

When the hook detects a violation after an edit has completed, Claude receives feedback like this:

```
BLOCKED: Code Replacement Detected

⚠️ **Code Replaced with Comments**

Found 1 instance where code is being replaced with comments.

**Issue:** When removing code, it should be deleted cleanly. Replacing it with explanatory comments creates noise.

**How to fix:**
1. If code needs to be removed, delete it completely
2. Don't leave comments explaining why code was removed
3. Use git commit messages to document removal reasons, not code comments
4. Keep the codebase clean and focused on what IS, not what WAS

**Violations found:**

1. Code replaced with comments - if removing code, delete it cleanly without explanatory comments

Original code:
```
function processData(input) {
  return input.map(item => item.value);
}
```

Attempted replacement:
```
// TODO: Remove this function - no longer needed
// function processData(input) {
//   return input.map(item => item.value);
// }
```

MANDATORY INSTRUCTIONS:
1. Delete the code completely instead of replacing it with comments
2. If code is no longer needed, remove it cleanly
3. Use git commit messages to document why code was removed
4. If the code should stay, keep it and add explanatory comments alongside it
```

## Skipped Files

The hook automatically skips validation for documentation files:
- `.md` - Markdown files
- `.mdx` - MDX files  
- `.txt` - Text files
- `.rst` - reStructuredText files

These files commonly contain commented-out examples and code blocks that are intentional.

## Usage Examples

### Violation Example
```typescript
// This will be blocked:
// OLD: function calculate() { return 42; }
// NEW: // Removed calculate function - no longer needed

// Instead, delete the function completely
```

### Allowed Examples
```typescript
// These are allowed:
// OLD: function calculate() { return 42; }
// NEW: function calculate(input) { return input * 2; } // Updated logic

// Or complete deletion:
// OLD: function calculate() { return 42; }
// NEW: (empty - function removed entirely)
```

## Troubleshooting

**Hook not triggering?**
Check if configured correctly:
```bash
claudekit list hooks | grep check-comment-replacement
```

**False positives with documentation?**
The hook skips .md, .txt, .rst files automatically. For other documentation formats, consider:
1. Renaming files to use .md extension
2. Using a different approach (clean deletion vs commenting)

**Testing the hook manually:**
```bash
echo '{"tool_name":"Edit","tool_input":{"old_string":"function test() {}","new_string":"// function test() {}"}}' | \
  claudekit-hooks run check-comment-replacement
```

## Key Design Decisions

### Why Block Comment Replacements?
- **Clean codebase** - Code should represent current reality, not history
- **Reduce noise** - Comments explaining removed code create maintenance burden
- **Git for history** - Version control already tracks what was removed and why
- **Focus on present** - Code comments should explain what IS, not what WAS

### Why Skip Documentation Files?
- **Different purpose** - Documentation often contains intentional commented examples
- **Teaching material** - Showing "don't do this" patterns is common in docs
- **Code samples** - Examples may include commented alternatives

### Why Check Replacement Size?
- **Intent detection** - Large deletions likely aren't "replacements"
- **Reduce false positives** - Avoids flagging legitimate section removal
- **Focus on anti-pattern** - Targets specific AI behavior of explaining deletions

## Limitations

- **Pattern-based detection** - Complex code structures might be missed
- **Single language comments** - Doesn't cover all possible comment syntaxes
- **Intent interpretation** - Can't distinguish intentional commenting from deletion
- **Documentation scope** - Only skips common documentation file extensions
- **Size heuristics** - May miss violations in very small or very large changes

## Common Violations Caught

- Functions replaced with "TODO: Remove this" comments
- Code blocks commented out with explanatory text
- Entire classes replaced with "This is no longer needed" comments
- Configuration replaced with "Use environment variables instead" comments
- Import statements replaced with "Dependency removed" comments