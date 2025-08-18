# Claudekit Hooks Reference

This document provides comprehensive documentation for the embedded hooks system in claudekit and how to use it with Claude Code.

## Overview

Claudekit provides a powerful embedded hooks system that enhances your Claude Code development workflow. Unlike traditional shell script hooks, embedded hooks are built directly into the `claudekit-hooks` executable, providing:

- **Cross-platform compatibility** - Works on Windows, macOS, and Linux
- **Automatic package manager detection** - Supports npm, yarn, and pnpm seamlessly
- **Rich error reporting** - Clear, actionable error messages with fix suggestions
- **Zero configuration** - Works out of the box with sensible defaults
- **High performance** - Fast execution with built-in caching

## Hook Naming Convention

Claudekit uses clear suffixes to indicate hook scope:
- `-changed`: Operates only on files that were created or modified
- `-project`: Operates on the entire project
- Action verbs (e.g., `create-checkpoint`): Perform specific actions

## Installation and Usage

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

# Show hook execution statistics
claudekit-hooks stats

# View recent hook executions
claudekit-hooks recent 10
```

### Integration with Claude Code

Hooks are configured in your project's `.claude/settings.json` file. The claudekit setup command will set this up for you automatically based on your project type.

## Available Hooks

### PostToolUse Hooks

These hooks run after Claude Code modifies files:

#### typecheck-changed

**Purpose:** Enforces TypeScript type checking on modified files and prevents type errors from being introduced.

**Triggers on:** Write, Edit, MultiEdit tools (TypeScript/TSX files only)

**Configuration Options:**
- `command` (string): Custom TypeScript command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 30000)
- `tsconfig` (string): Path to tsconfig.json (default: auto-detected)
- `incremental` (boolean): Use incremental compilation (default: true)

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

**Exit Codes:**
- 0: Success or skipped (no tsconfig.json)
- 2: TypeScript compilation errors found

#### check-any-changed

**Purpose:** Enforces strict typing by preventing the use of `any` types in modified files.

**Triggers on:** Write, Edit, MultiEdit tools (TypeScript files only)

**Configuration Options:**
- `timeout` (number): Maximum execution time in ms (default: 5000)
- `excludePatterns` (string[]): Additional patterns to exclude (default: test files)

**Features:**
- Detects forbidden `any` types in TypeScript files
- Ignores test files (*.test.ts, *.spec.ts)
- Excludes valid test utilities like `expect.any()`
- Provides specific fix suggestions for each occurrence

**Exit Codes:**
- 0: No 'any' types found
- 2: Forbidden 'any' types detected

#### lint-changed

**Purpose:** Enforces code style and quality standards using ESLint on modified files.

**Triggers on:** Write, Edit, MultiEdit tools (JS/JSX/TS/TSX files)

**Configuration Options:**
- `command` (string): Custom ESLint command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 30000)
- `fix` (boolean): Auto-fix issues (default: false)
- `extensions` (string[]): File extensions to check
- `maxWarnings` (number): Maximum warnings allowed (default: 0)

**Features:**
- Runs ESLint with automatic caching for performance
- Detects ESLint configuration automatically
- Supports all major ESLint config formats
- Shows clear error messages with line numbers
- Optionally auto-fixes issues (configurable)

**Exit Codes:**
- 0: Success or skipped (no ESLint config)
- 2: ESLint errors found

#### test-changed

**Purpose:** Automatically runs tests related to modified files.

**Triggers on:** Write, Edit, MultiEdit tools (source files with test coverage)

**Configuration Options:**
- `command` (string): Custom test command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 60000)
- `testPatterns` (string[]): Additional test file patterns
- `runInBand` (boolean): Run tests sequentially (default: false)

**Features:**
- Intelligently finds related test files:
  - `{filename}.test.{ext}`
  - `{filename}.spec.{ext}`
  - `__tests__/{filename}.{test,spec}.{ext}`
  - `tests/{filename}.{test,spec}.{ext}`
- Runs only affected tests for fast feedback
- Supports Jest, Vitest, Mocha, and other test runners
- Shows failing test details

**Exit Codes:**
- 0: Tests passed or no related tests found
- 1: Test failures

### Stop Hooks

These hooks run when Claude Code stops or completes a task:

#### create-checkpoint

**Purpose:** Automatically saves your work as a git stash when Claude Code stops.

**Configuration Options:**
- `timeout` (number): Maximum execution time in ms (default: 10000)
- `prefix` (string): Checkpoint message prefix (default: "claude")
- `maxCheckpoints` (number): Maximum checkpoints to keep (default: 10)
- `includeUntracked` (boolean): Include untracked files (default: true)

**Features:**
- Creates checkpoint only if there are uncommitted changes
- Uses descriptive messages with timestamps
- Maintains configurable number of recent checkpoints (default: 10)
- Non-destructive - keeps changes in working directory
- Silent operation - doesn't interrupt workflow
- Preserves complete working directory state

**Exit Codes:**
- 0: Checkpoint created successfully or no changes
- 1: Failed to create checkpoint

#### check-todos

**Purpose:** Ensures all TodoWrite tasks are completed before allowing Claude Code to stop.

**Configuration Options:**
- `timeout` (number): Maximum execution time in ms (default: 5000)
- `allowPending` (boolean): Allow pending todos (default: false)
- `requireDescription` (boolean): Require todo descriptions (default: true)

**Features:**
- Blocks if incomplete todos exist in current session
- Helps maintain task completion discipline
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

**Exit Codes:**
- 0: All todos completed
- 2: Incomplete todos found

#### self-review

**Purpose:** Prompts Claude Code to critically evaluate its code changes before finishing.

**Features:**
- Asks 3 random questions from focus areas (Refactoring, Code Quality, Consistency)
- Configurable question sets and file patterns
- Only triggers after code changes
- Helps catch issues before they become problems

#### check-comment-replacement

**Purpose:** Detects when code is replaced with comments instead of being deleted cleanly.

**Features:**
- Identifies suspicious comment patterns that might indicate deleted code
- Helps maintain clean codebase
- Prevents code rot from commented-out sections

#### check-unused-parameters

**Purpose:** Catches lazy refactoring where parameters are prefixed with underscore.

**Features:**
- Identifies function parameters starting with underscore
- Encourages proper parameter removal instead of prefixing
- Helps maintain clean function signatures

### UserPromptSubmit Hooks

These hooks run when users submit their first prompt in a Claude Code session:

#### codebase-map

**Purpose:** Provide codebase map context to Claude Code on the first user prompt of each session.

**Triggers on:** UserPromptSubmit event (first prompt only)

**Dependencies:** Requires [codebase-map](https://github.com/carlrannaberg/codebase-map) CLI tool installed

**Configuration Options:**
- `format` (string): Output format - auto|json|dsl|graph|markdown (default: "auto")
- `command` (string): Custom command to run (default: "codebase-map scan")

**Features:**
- Runs only once per Claude Code session (prevents duplicate context)
- Automatically scans and indexes project structure on first user interaction
- Generates AST-based analysis of functions, classes, and constants
- Tracks imports/exports and builds dependency graph
- Adds map invisibly to Claude's context (like CLAUDE.md)
- Silently cleans up old session files (older than 7 days)
- Session tracking prevents re-execution within the same session

**Installation:**
```bash
npm install -g codebase-map
```

**Example output in Claude Code:**
```
📍 Codebase Map (loaded once per session):

# Project Structure
cli/index.ts > cli/utils
src/hooks/typecheck.ts > TypecheckHook
```

#### codebase-map-update

**Purpose:** Incrementally update the codebase map index when files change.

**Triggers on:** Write, Edit, MultiEdit tools (TypeScript/JavaScript files only)

**Dependencies:** Requires codebase-map CLI tool installed

**Configuration Options:**
- `updateOnChanges` (boolean): Enable/disable automatic updates (default: true)
- `command` (string): Custom update command (default: "codebase-map update [file]")

**Features:**
- Incremental updates without full re-scan
- Debounced to avoid excessive regeneration (5 second delay)
- Only updates for code file changes (.ts, .tsx, .js, .jsx, .mjs, .cjs)
- Runs silently to avoid disrupting workflow

### Project-Wide Hooks

These hooks validate the entire project:

#### typecheck-project

**Purpose:** Validates TypeScript types across the entire project.

**Configuration Options:**
- `command` (string): Custom TypeScript command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 90000)
- `configFile` (string): Path to specific tsconfig.json file

**Features:**
- Comprehensive type checking for all TypeScript files
- Useful for final validation before commits
- Catches cross-file type issues

**Exit Codes:**
- 0: All type checks passed
- 2: TypeScript compilation errors found

#### lint-project

**Purpose:** Runs ESLint across the entire project.

**Configuration Options:**
- `command` (string): Custom ESLint command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 60000)
- `fix` (boolean): Auto-fix issues (default: false)

**Features:**
- Comprehensive linting for code quality
- Auto-fix capability (configurable)
- Useful for maintaining consistent code style

**Exit Codes:**
- 0: All lint checks passed
- 2: ESLint errors found

#### test-project

**Purpose:** Runs the complete test suite.

**Configuration Options:**
- `command` (string): Custom test command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 300000)

**Features:**
- Executes all tests in the project
- Configurable timeout for large test suites
- Final validation before commits

**Exit Codes:**
- 0: All tests passed
- 1: Test failures

## Configuration

### Claude Code Configuration (.claude/settings.json)

This file tells Claude Code which hooks to run and when:

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
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run codebase-map"}
        ]
      }
    ]
  }
}
```

#### Event Types

- **PostToolUse** - Runs after file modifications (Write, Edit, MultiEdit)
- **Stop** - Runs when Claude Code stops
- **SubagentStop** - Runs when a subagent completes
- **SessionStart** - Runs when a new Claude Code session begins
- **UserPromptSubmit** - Runs when a user submits a prompt (special hooks only)

#### Matcher Patterns

The matcher field supports various patterns:

- **Exact tool match**: `"Write"` - matches only the Write tool
- **Multiple tools**: `"Write,Edit,MultiEdit"` - matches any of these tools
- **Wildcard**: `"*"` - matches all tools/events
- **Conditional logic**: `"Write|Edit|MultiEdit"` - matches Write tool on TypeScript files
- **Regex patterns**: `"Notebook.*"` - matches all Notebook-related tools

### Hook-Specific Configuration (.claudekit/config.json)

This file contains configuration for individual hooks:

```json
{
  "packageManager": "pnpm",
  "hooks": {
    "typecheck-changed": {
      "command": "yarn tsc --noEmit",
      "timeout": 45000,
      "incremental": true
    },
    "lint-changed": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "timeout": 30000
    },
    "create-checkpoint": {
      "prefix": "ai-session",
      "maxCheckpoints": 20
    },
    "test-changed": {
      "command": "npm test",
      "timeout": 90000
    }
  }
}
```

### Global Configuration

In addition to hook-specific configuration, you can set global options:

```json
{
  "packageManager": "pnpm",
  "debug": false,
  "hooks": {
    // hook configurations
  }
}
```

**Global Options:**
- `packageManager` (string): Preferred package manager (auto-detected if not set)
- `debug` (boolean): Enable debug logging (default: false)

### Environment Variables

Hooks can also be configured through environment variables:

- `CLAUDEKIT_PACKAGE_MANAGER`: Override detected package manager
- `CLAUDEKIT_HOOK_TIMEOUT`: Default timeout for all hooks (in ms)
- `CLAUDEKIT_DEBUG`: Enable debug logging (set to "true")
- `CLAUDEKIT_CONFIG_PATH`: Custom config file path

### Configuration Precedence

Configuration is resolved in the following order (highest to lowest priority):

1. Environment variables
2. Command-line arguments (for test command)
3. Hook-specific configuration in `.claudekit/config.json`
4. Global configuration in `.claudekit/config.json`
5. Built-in defaults

## Testing Hooks

You can test hooks outside of Claude Code using the `claudekit-hooks` command:

### Basic Testing

```bash
# Test a specific hook with a file
claudekit-hooks test typecheck-changed --file src/index.ts

# Test without a specific file (for hooks that don't need one)
claudekit-hooks test create-checkpoint

# Test with verbose output
claudekit-hooks test lint-changed --file src/app.js --verbose
```

### Testing with stdin (legacy method)

```bash
# Run a specific hook (reads stdin for file context)
echo '{"tool_input": {"file_path": "src/index.ts"}}' | claudekit-hooks run typecheck-changed

# Test parameter validation hook
echo '{"tool_input": {"file_path": "src/component.ts"}}' | claudekit-hooks run check-unused-parameters

# Run a hook without file context
claudekit-hooks run create-checkpoint

# List all available hooks
claudekit-hooks list

# Show hook execution statistics
claudekit-hooks stats

# View recent hook activity
claudekit-hooks recent 5
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

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Set environment variable
export CLAUDEKIT_DEBUG=true

# Or use the debug flag
claudekit-hooks test typecheck-changed --file src/index.ts --debug
```

## Configuration Examples

### Minimal Setup
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run lint-changed"}
        ]
      }
    ]
  }
}
```

### TypeScript Project Setup
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
    ]
  }
}
```

### Full Validation Setup
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
          {"type": "command", "command": "claudekit-hooks run check-todos"},
          {"type": "command", "command": "claudekit-hooks run typecheck-project"},
          {"type": "command", "command": "claudekit-hooks run lint-project"},
          {"type": "command", "command": "claudekit-hooks run test-project"}
        ]
      }
    ]
  }
}
```

### Project-Specific Configuration Examples

#### TypeScript-Only Project
```json
{
  "hooks": {
    "typecheck-changed": {
      "timeout": 45000,
      "incremental": true
    },
    "check-any-changed": {
      "excludePatterns": ["*.d.ts"]
    },
    "typecheck-project": {
      "timeout": 60000
    }
  }
}
```

#### Full-Stack Project
```json
{
  "packageManager": "yarn",
  "hooks": {
    "typecheck-changed": {
      "command": "yarn workspaces run typecheck",
      "timeout": 90000
    },
    "lint-changed": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx", ".vue"],
      "timeout": 60000
    },
    "test-changed": {
      "command": "yarn test --",
      "runInBand": true
    },
    "create-checkpoint": {
      "prefix": "dev",
      "maxCheckpoints": 25
    }
  }
}
```

#### Monorepo Configuration
```json
{
  "packageManager": "pnpm",
  "hooks": {
    "typecheck-changed": {
      "command": "pnpm -r run typecheck",
      "timeout": 120000
    },
    "lint-changed": {
      "command": "pnpm -r run lint",
      "timeout": 90000
    },
    "typecheck-project": {
      "timeout": 180000
    }
  }
}
```

## Performance Tips

### Development Workflow
- Use `-changed` hooks for fast feedback during development
- Reserve `-project` hooks for Stop events or CI/CD
- Configure custom commands to exclude slow operations
- Use appropriate timeouts to prevent hanging

### Large Projects
- Consider excluding large directories from TypeScript/ESLint checks
- Use incremental builds where possible
- Tune timeout values based on project size
- Use test filtering for faster feedback

### Monorepos
- Configure hooks per package using file path matchers
- Use workspace-specific commands
- Consider separate configurations for different project types

## Troubleshooting

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

## Best Practices

1. **Timeouts**: Set appropriate timeouts based on your project size
   - Small projects: 15-30 seconds
   - Medium projects: 30-60 seconds
   - Large projects: 60-120 seconds

2. **Package Manager**: Let claudekit auto-detect unless you have specific requirements

3. **Custom Commands**: Use custom commands when you need specific flags or configurations

4. **Fix Mode**: Enable ESLint fix mode for automatic code style corrections, but be aware it modifies files

5. **Exit Codes**: Hooks follow standard exit code conventions:
   - `0` - Success (validation passed or hook completed successfully)
   - `2` - Validation failure (hook blocked due to errors)
   - `1` - Unexpected error or configuration issue

## Migration from Shell Hooks

If you're migrating from shell script hooks, see the [Migration Guide](./migration-from-shell-hooks.md) for detailed instructions on updating your configuration.

## See Also

- [Migration Guide](./migration-from-shell-hooks.md) - Migrating from shell scripts
- [Package Manager Support](./package-manager-agnostic.md) - Cross-package manager compatibility
- [Claude Code Configuration](./claude-code-configuration.md) - Configuration guide