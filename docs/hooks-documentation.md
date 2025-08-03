# Claudekit Embedded Hooks Documentation

This document describes the embedded hooks system in claudekit and how to use it with Claude Code.

## Hook Naming Convention

Claudekit uses clear suffixes to indicate hook scope:
- `-changed`: Operates only on files that were created or modified
- `-project`: Operates on the entire project
- Action verbs (e.g., `create-checkpoint`): Perform specific actions

## Introduction to Embedded Hooks

Claudekit provides a powerful embedded hooks system that enhances your Claude Code development workflow. Unlike traditional shell script hooks, embedded hooks are built directly into the `claudekit-hooks` executable, providing:

- **Cross-platform compatibility** - Works on Windows, macOS, and Linux
- **Automatic package manager detection** - Supports npm, yarn, and pnpm seamlessly
- **Rich error reporting** - Clear, actionable error messages with fix suggestions
- **Zero configuration** - Works out of the box with sensible defaults
- **High performance** - Fast execution with built-in caching

## How to Use claudekit-hooks

### Installation

The `claudekit-hooks` command is automatically installed when you install claudekit:

```bash
npm install -g claudekit
# or
yarn global add claudekit
# or
pnpm add -g claudekit
```

### Basic Usage

The `claudekit-hooks` command provides several subcommands:

```bash
# Run a specific hook
claudekit-hooks run <hook-name>

# Test a hook with a specific file
claudekit-hooks test <hook-name> --file <path>

# List all available hooks
claudekit-hooks list

# Show help
claudekit-hooks --help
```

### Integration with Claude Code

Hooks are configured in your project's `.claude/settings.json` file. The claudekit setup command will set this up for you automatically based on your project type.

## Available Hooks and Their Purposes

### PostToolUse Hooks

These hooks run after Claude Code modifies files:

#### typecheck-changed

**Purpose:** Enforces TypeScript type checking on modified files and prevents type errors from being introduced.

**Triggers on:** Write, Edit, MultiEdit tools (TypeScript/TSX files only)

**Features:**
- Runs TypeScript compiler with intelligent caching
- Detects TypeScript version for optimal performance
- Provides detailed error messages with fix suggestions
- Automatically finds tsconfig.json in parent directories
- Supports monorepo structures

**Example output:**
```
████ TypeScript Type Error ████

src/index.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.

10     const count: number = "hello";
       ~~~~~

To fix:
1. Change the type annotation to match the value
2. Or change the value to match the type
```

#### check-any-changed

**Purpose:** Enforces strict typing by preventing the use of `any` types in modified files.

**Triggers on:** Write, Edit, MultiEdit tools (TypeScript files only)

**Features:**
- Detects forbidden `any` types in TypeScript files
- Ignores test files (*.test.ts, *.spec.ts)
- Excludes valid test utilities like `expect.any()`
- Provides specific fix suggestions for each occurrence

#### lint-changed

**Purpose:** Enforces code style and quality standards using ESLint on modified files.

**Triggers on:** Write, Edit, MultiEdit tools (JS/JSX/TS/TSX files)

**Features:**
- Runs ESLint with automatic caching for performance
- Detects ESLint configuration automatically
- Supports all major ESLint config formats
- Shows clear error messages with line numbers
- Optionally auto-fixes issues (configurable)

#### test-changed

**Purpose:** Automatically runs tests related to modified files.

**Triggers on:** Write, Edit, MultiEdit tools (source files with test coverage)

**Features:**
- Intelligently finds related test files:
  - `{filename}.test.{ext}`
  - `{filename}.spec.{ext}`
  - `__tests__/{filename}.{test,spec}.{ext}`
  - `tests/{filename}.{test,spec}.{ext}`
- Runs only affected tests for fast feedback
- Supports Jest, Vitest, Mocha, and other test runners
- Shows failing test details

### Stop Hooks

These hooks run when Claude Code stops or completes a task:

#### create-checkpoint

**Purpose:** Automatically creates git checkpoints to preserve your work.

**Features:**
- Creates checkpoint only if there are uncommitted changes
- Uses descriptive messages with timestamps
- Manages checkpoint count (configurable limit)
- Silent operation - doesn't interrupt workflow
- Preserves complete working directory state

**Configuration:**
```json
{
  "hooks": {
    "auto-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 10
    }
  }
}
```

#### check-todos

**Purpose:** Ensures all todos are completed before Claude Code stops.

**Features:**
- Reads Claude Code transcript for TodoWrite entries
- Blocks stop if incomplete todos exist
- Shows list of incomplete items
- Prevents accidental task abandonment
- Smart loop prevention

**Example output:**
```
████ Incomplete Todos ████

You have 2 incomplete todo(s):

• [in_progress] Add error handling to API calls
• [pending] Write unit tests for new features

Please complete these tasks before stopping.
```

#### typecheck-project, lint-project, test-project

**Purpose:** Run comprehensive validation on the entire project when work is completed.

**Features:**
- **typecheck-project**: Runs TypeScript validation on entire project
- **lint-project**: Runs ESLint validation on entire project  
- **test-project**: Runs complete test suite
- Provides consolidated results
- Ensures code quality before stopping
- Configurable validation commands
- Can be run individually or together

## Hook Configuration in settings.json

Hooks are configured in your project's `.claude/settings.json` file. Here's a complete example:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": "claudekit-hooks run check-any-changed"}
        ]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run lint-changed"}
        ]
      },
      {
        "matcher": "Write,Edit,MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run test-changed"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run create-checkpoint"},
          {"type": "command", "command": "claudekit-hooks run check-todos"}
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-project"},
          {"type": "command", "command": "claudekit-hooks run lint-project"},
          {"type": "command", "command": "claudekit-hooks run test-project"}
        ]
      }
    ]
  }
}
```

### Matcher Patterns

The matcher field supports various patterns:

- **Exact tool match**: `"Write"` - matches only the Write tool
- **Multiple tools**: `"Write,Edit,MultiEdit"` - matches any of these tools
- **Wildcard**: `"*"` - matches all tools/events
- **Conditional logic**: `"Write|Edit|MultiEdit"` - matches Write tool on TypeScript files
- **Regex patterns**: `"Notebook.*"` - matches all Notebook-related tools

### Hook-Specific Configuration

Some hooks support additional configuration through a `.claudekit/config.json` file:

```json
{
  "hooks": {
    "typecheck": {
      "command": "yarn tsc --noEmit",
      "timeout": 45000
    },
    "eslint": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "timeout": 30000
    },
    "auto-checkpoint": {
      "prefix": "ai-session",
      "maxCheckpoints": 20
    },
    "run-related-tests": {
      "command": "npm test",
      "timeout": 90000
    }
  }
}
```

## Testing Hooks with the Test Command

The `claudekit-hooks test` command allows you to test hooks outside of Claude Code:

### Basic Testing

```bash
# Test a specific hook with a file
claudekit-hooks test typecheck-changed --file src/index.ts

# Test without a specific file (for hooks that don't need one)
claudekit-hooks test auto-checkpoint

# Test with verbose output
claudekit-hooks test lint-changed --file src/app.js --verbose
```

### Testing PostToolUse Hooks

#### TypeScript Hook
```bash
# Test type checking on a TypeScript file
claudekit-hooks test typecheck-changed --file src/components/Button.tsx

# Test the no-any hook
claudekit-hooks test check-any-changed --file src/utils/helpers.ts
```

#### ESLint Hook
```bash
# Test ESLint on a JavaScript file
claudekit-hooks test lint-changed --file src/index.js

# Test with auto-fix enabled (if configured)
claudekit-hooks test lint-changed --file src/app.jsx --fix
```

#### Test Runner Hook
```bash
# Test finding and running related tests
claudekit-hooks test test-changed --file src/utils/math.js
```

### Testing Stop Hooks

```bash
# Test auto-checkpoint (will create checkpoint if there are changes)
claudekit-hooks test auto-checkpoint

# Test todo validation (reads current Claude transcript)
claudekit-hooks test validate-todo-completion

# Test project validation (runs all checks)
claudekit-hooks test project-validation
```

### Advanced Testing Options

```bash
# Test with custom configuration
claudekit-hooks test typecheck-changed --file src/index.ts --config .claudekit/test-config.json

# Test with timeout override
claudekit-hooks test lint-changed --file src/app.js --timeout 60000

# Dry run (show what would happen without executing)
claudekit-hooks test test-changed --file src/utils.js --dry-run
```

### Exit Codes

Hooks follow standard exit code conventions:
- `0` - Success (validation passed or hook completed successfully)
- `2` - Validation failure (hook blocked due to errors)
- `1` - Unexpected error or configuration issue

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Set environment variable
export CLAUDEKIT_DEBUG=true

# Or use the debug flag
claudekit-hooks test typecheck-changed --file src/index.ts --debug
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Hook Not Running

**Problem**: Hook doesn't execute when expected in Claude Code.

**Solutions**:
1. Verify claudekit-hooks is installed:
   ```bash
   which claudekit-hooks
   claudekit-hooks --version
   ```

2. Check your .claude/settings.json configuration:
   ```bash
   cat .claude/settings.json | jq '.hooks'
   ```

3. Test the hook directly:
   ```bash
   claudekit-hooks test <hook-name> --file <path>
   ```

4. Run Claude Code with debug flag:
   ```bash
   claude-code --debug
   ```

#### TypeScript Errors Not Detected

**Problem**: TypeScript hook passes but errors exist.

**Solutions**:
1. Ensure tsconfig.json exists in your project or parent directory
2. Check TypeScript is installed:
   ```bash
   npm list typescript
   ```
3. Test TypeScript directly:
   ```bash
   npx tsc --noEmit
   ```

#### ESLint Not Finding Configuration

**Problem**: ESLint hook skips validation.

**Solutions**:
1. Verify ESLint configuration exists (.eslintrc.*, eslint.config.js)
2. Check ESLint is installed:
   ```bash
   npm list eslint
   ```
3. Test ESLint directly:
   ```bash
   npx eslint src/
   ```

#### Package Manager Detection Issues

**Problem**: Wrong package manager detected.

**Solutions**:
1. Check for conflicting lock files:
   ```bash
   ls -la | grep -E "(package-lock|yarn.lock|pnpm-lock)"
   ```
2. Set explicit package manager in package.json:
   ```json
   {
     "packageManager": "pnpm@8.0.0"
   }
   ```
3. Configure in .claudekit/config.json:
   ```json
   {
     "packageManager": "yarn"
   }
   ```

#### Hook Timeout Errors

**Problem**: Hook times out on large projects.

**Solutions**:
1. Increase timeout in .claudekit/config.json:
   ```json
   {
     "hooks": {
       "typecheck": {
         "timeout": 120000
       }
     }
   }
   ```
2. Optimize your project configuration (exclude unnecessary files)
3. Use incremental builds where possible

#### Checkpoint Not Created

**Problem**: Auto-checkpoint doesn't create checkpoints.

**Solutions**:
1. Ensure you're in a git repository:
   ```bash
   git status
   ```
2. Check for uncommitted changes:
   ```bash
   git diff --stat
   ```
3. Verify git stash works:
   ```bash
   git stash create "test"
   ```

### Getting Help

1. **Check hook status**:
   ```bash
   claudekit-hooks list
   ```

2. **Validate configuration**:
   ```bash
   claudekit validate
   ```

3. **View detailed logs**:
   ```bash
   export CLAUDEKIT_DEBUG=true
   claudekit-hooks test <hook-name> --file <path>
   ```

4. **Report issues**:
   - GitHub Issues: https://github.com/claudekit/claudekit/issues
   - Include output of `claudekit-hooks --version`
   - Include relevant configuration files

## Migration from Shell Hooks

If you're migrating from shell script hooks, see the [Migration Guide](./migration-from-shell-hooks.md) for detailed instructions on updating your configuration.

## See Also

- [Hooks Reference](./hooks-reference.md) - Detailed configuration options
- [Migration Guide](./migration-from-shell-hooks.md) - Migrating from shell scripts
- [Package Manager Support](./package-manager-agnostic.md) - Cross-package manager compatibility