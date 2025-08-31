# ESLint Validation Hooks

## Overview

The ESLint hooks provide comprehensive code quality validation through two complementary hooks: `lint-changed` for immediate feedback on modified files, and `lint-project` for full project validation. Together, they ensure consistent code quality throughout development and before task completion.

## Installation

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks lint-changed,lint-project
```

This configures both hooks in `.claude/settings.json`:
- `lint-changed` runs on PostToolUse events for file modifications
- `lint-project` runs on Stop/SubagentStop events for comprehensive validation

## How It Works

### lint-changed Hook
1. **File Detection** - Monitors Write, Edit, and MultiEdit operations on JavaScript/TypeScript files
2. **ESLint Check** - Verifies ESLint is configured in the project
3. **Single File Validation** - Runs ESLint on the specific changed file
4. **Immediate Feedback** - Provides instant code quality guidance

### lint-project Hook  
1. **Session Completion** - Triggers when Claude Code session ends or subagent stops
2. **Full Project Scan** - Runs ESLint on entire codebase with standard extensions
3. **Comprehensive Validation** - Ensures no lint issues remain project-wide
4. **Final Quality Gate** - Blocks completion if lint errors exist

## Architecture

```
┌─────────────────────────────────────────────┐
│       Write/Edit/MultiEdit Tool Use        │
│     JavaScript/TypeScript file changes     │
│         (operation completes)              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│        lint-changed (PostToolUse)          │
│  • Check if .js/.jsx/.ts/.tsx file         │
│  • Verify ESLint configuration exists      │
│  • Run ESLint on specific changed file     │
│  • Report errors with fix instructions     │
└─────────────────────────────────────────────┘
                  
┌─────────────────────────────────────────────┐
│           Session End/Stop                  │
│      Claude Code stop or subagent end      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│       lint-project (Stop/SubagentStop)     │
│  • Check if ESLint available in project    │
│  • Run ESLint on entire project            │
│  • Report all remaining lint issues        │
│  • Block completion if errors exist        │
└─────────────────────────────────────────────┘
```

## ESLint Configuration Detection

Both hooks automatically detect ESLint configuration through these files:
- `.eslintrc.json`
- `.eslintrc.js`
- `.eslintrc.yml` / `.eslintrc.yaml`
- `eslint.config.js`
- `eslint.config.mjs`

If no ESLint configuration is found, the hooks skip validation silently.

## What Claude Sees

### lint-changed Success
```
✅ ESLint check passed!
```

### lint-changed Violations
```
BLOCKED: ESLint check failed

/path/to/file.ts
  15:7  error  'unusedVar' is defined but never used  no-unused-vars
  23:1  error  Missing semicolon                     semi
  31:5  warning  Unexpected console statement        no-console

MANDATORY INSTRUCTIONS:
You MUST fix ALL lint errors and warnings shown above.

REQUIRED ACTIONS:
1. Fix all errors shown above
2. Run the project's lint command to verify all issues are resolved
   (Check AGENTS.md/CLAUDE.md or package.json scripts for the exact command)
3. Common fixes:
   - Missing semicolons or trailing commas
   - Unused variables (remove or use them)
   - Console.log statements (remove from production code)
   - Improper indentation or spacing
```

### lint-project Success
```
✅ ESLint validation passed!
```

### lint-project Violations
```
[Formatted ESLint output with all project errors and mandatory fix instructions]
```

## Configuration

Configure both hooks in `.claudekit/config.json`:

```json
{
  "hooks": {
    "lint-changed": {
      "command": "npx eslint",
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "fix": false,
      "timeout": 30000
    },
    "lint-project": {
      "command": "npm run lint",
      "timeout": 60000
    }
  }
}
```

### lint-changed Options
- **`command`** - Custom ESLint command (default: `<package-manager> eslint`)
- **`extensions`** - File extensions to check (default: auto-detected from file)
- **`fix`** - Whether to auto-fix issues with `--fix` (default: false)
- **`timeout`** - Maximum execution time in milliseconds (default: 30000)

### lint-project Options  
- **`command`** - Custom lint command (default: `<package-manager> eslint . --ext .js,.jsx,.ts,.tsx`)
- **`timeout`** - Maximum execution time in milliseconds (default: none)

## Usage Examples

### Immediate File Validation (lint-changed)
```javascript
// Edit a JavaScript file with lint issues
function test() {
    let unusedVar = 'hello'  // Missing semicolon, unused variable
    console.log('debug')     // Console statement
}

// Hook detects and reports:
// - Missing semicolon
// - Unused variable 
// - Console statement
```

### Project-Wide Validation (lint-project)
When Claude Code session ends, the hook scans the entire project and reports any remaining lint issues across all JavaScript/TypeScript files.

## Supported File Types

### lint-changed
- `.js` - JavaScript files
- `.jsx` - React JavaScript files  
- `.ts` - TypeScript files
- `.tsx` - React TypeScript files

### lint-project
- All files matching ESLint configuration
- Default: `.js`, `.jsx`, `.ts`, `.tsx` extensions

## Troubleshooting

### Hooks Not Running
Check if hooks are configured:
```bash
claudekit list hooks | grep lint
```

### ESLint Not Found
Ensure ESLint is configured:
```bash
# Check for config files
ls -la .eslint*

# Install ESLint if missing
npm install --save-dev eslint
```

### Custom Lint Commands
If your project uses custom lint scripts:
```json
{
  "hooks": {
    "lint-changed": {
      "command": "npm run lint:fix"
    },
    "lint-project": {
      "command": "npm run lint:all"
    }
  }
}
```

### Testing Hooks Manually
```bash
# Test lint-changed
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.js"}}' | \
  claudekit-hooks run lint-changed

# Test lint-project  
claudekit-hooks run lint-project
```

## Key Design Decisions

### Why Two Separate Hooks?
- **Immediate feedback** - `lint-changed` provides instant validation during development
- **Comprehensive validation** - `lint-project` ensures no issues slip through project-wide
- **Performance optimization** - Single file checking is faster for active development
- **Quality gates** - Project-wide validation prevents completion with unresolved issues

### Why PostToolUse and Stop Events?
- **PostToolUse** - Validates files immediately after modification for quick feedback
- **Stop events** - Comprehensive check before task completion ensures quality standards
- **Non-blocking development** - Allows work to continue while providing guidance

### Why Skip When No ESLint?
- **Optional tooling** - Not all projects use ESLint
- **Zero configuration** - Works out of the box without requiring ESLint setup
- **Graceful fallback** - Doesn't interfere with projects using other linting tools

## Integration with Development Workflow

### During Development
1. Edit JavaScript/TypeScript file
2. `lint-changed` validates the specific file
3. Receive immediate feedback on code quality issues
4. Fix issues before continuing

### Before Completion  
1. Finish development work
2. Stop Claude Code session or subagent
3. `lint-project` validates entire codebase
4. Address any remaining project-wide lint issues

## Limitations

- **ESLint dependency** - Requires ESLint configuration in the project
- **JavaScript/TypeScript only** - Doesn't validate other file types
- **Configuration detection** - May not detect all ESLint config variations
- **Command execution** - Relies on ESLint being properly installed and accessible
- **Timeout constraints** - Large projects may need increased timeout values