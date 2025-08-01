# Claudekit Hooks Configuration Reference

This document provides detailed configuration options for the claudekit embedded hooks system.

## Configuration Files

Claudekit uses two configuration files for hooks:

1. **`.claude/settings.json`** - Claude Code hook configuration (which hooks to run and when)
2. **`.claudekit/config.json`** - Hook-specific configuration options (timeouts, commands, etc.)

## Claude Code Configuration (.claude/settings.json)

This file tells Claude Code which hooks to run and when:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck"},
          {"type": "command", "command": "claudekit-hooks run no-any"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run auto-checkpoint"}
        ]
      }
    ]
  }
}
```

### Event Types

- **PostToolUse** - Runs after file modifications (Write, Edit, MultiEdit)
- **Stop** - Runs when Claude Code stops
- **SubagentStop** - Runs when a subagent completes

### Matcher Patterns

- `"Write"` - Exact tool match
- `"Write,Edit,MultiEdit"` - Multiple tools (OR logic)
- `"*"` - All tools/events
- `"tools:Write AND file_paths:**/*.ts"` - Conditional matching
- `"Notebook.*"` - Regex patterns

## Hook-Specific Configuration (.claudekit/config.json)

This file contains configuration for individual hooks:

```json
{
  "packageManager": "pnpm",
  "hooks": {
    "typecheck": {
      "command": "yarn tsc --noEmit",
      "timeout": 45000
    },
    "eslint": {
      "fix": true,
      "timeout": 30000
    }
  }
}
```

## Available Hooks

### typecheck
Runs TypeScript compiler to check for type errors.

**Configuration Options:**
- `command` (string): Custom TypeScript command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 30000)
- `tsconfig` (string): Path to tsconfig.json (default: auto-detected)
- `incremental` (boolean): Use incremental compilation (default: true)

**Example:**
```json
{
  "hooks": {
    "typecheck": {
      "command": "yarn tsc --noEmit",
      "timeout": 45000,
      "incremental": true
    }
  }
}
```

**Exit Codes:**
- 0: Success or skipped (no tsconfig.json)
- 2: TypeScript compilation errors found

### no-any
Forbids the use of 'any' types in TypeScript files.

**Configuration Options:**
- `timeout` (number): Maximum execution time in ms (default: 5000)
- `excludePatterns` (string[]): Additional patterns to exclude (default: test files)

**Example:**
```json
{
  "hooks": {
    "no-any": {
      "timeout": 5000,
      "excludePatterns": ["*.d.ts", "*.generated.ts"]
    }
  }
}
```

**Exit Codes:**
- 0: No 'any' types found
- 2: Forbidden 'any' types detected

### eslint
Runs ESLint on JavaScript and TypeScript files.

**Configuration Options:**
- `command` (string): Custom ESLint command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 30000)
- `fix` (boolean): Auto-fix issues (default: false)
- `extensions` (string[]): File extensions to check
- `maxWarnings` (number): Maximum warnings allowed (default: 0)

**Example:**
```json
{
  "hooks": {
    "eslint": {
      "command": "pnpm exec eslint",
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "maxWarnings": 0
    }
  }
}
```

**Exit Codes:**
- 0: Success or skipped (no ESLint config)
- 2: ESLint errors found

### auto-checkpoint
Creates git checkpoints automatically on Stop events.

**Configuration Options:**
- `timeout` (number): Maximum execution time in ms (default: 10000)
- `prefix` (string): Checkpoint message prefix (default: "claude")
- `maxCheckpoints` (number): Maximum checkpoints to keep (default: 10)
- `includeUntracked` (boolean): Include untracked files (default: true)

**Example:**
```json
{
  "hooks": {
    "auto-checkpoint": {
      "prefix": "ai-session",
      "maxCheckpoints": 20,
      "includeUntracked": false
    }
  }
}
```

**Exit Codes:**
- 0: Checkpoint created successfully or no changes
- 1: Failed to create checkpoint

### run-related-tests
Runs tests related to changed files.

**Configuration Options:**
- `command` (string): Custom test command (default: auto-detected)
- `timeout` (number): Maximum execution time in ms (default: 60000)
- `testPatterns` (string[]): Additional test file patterns
- `runInBand` (boolean): Run tests sequentially (default: false)

**Example:**
```json
{
  "hooks": {
    "run-related-tests": {
      "command": "npm test --",
      "timeout": 90000,
      "testPatterns": ["*.integration.test.js"],
      "runInBand": true
    }
  }
}
```

**Exit Codes:**
- 0: Tests passed or no related tests found
- 1: Test failures

### project-validation
Runs comprehensive project validation.

**Configuration Options:**
- `typescriptCommand` (string): Custom TypeScript validation command
- `eslintCommand` (string): Custom ESLint validation command  
- `testCommand` (string): Custom test command
- `timeout` (number): Maximum execution time in ms (default: 120000)
- `parallel` (boolean): Run validations in parallel (default: true)
- `skipTests` (boolean): Skip test validation (default: false)

**Example:**
```json
{
  "hooks": {
    "project-validation": {
      "typescriptCommand": "tsc --noEmit",
      "eslintCommand": "eslint . --ext .ts,.tsx",
      "testCommand": "npm test -- --coverage",
      "timeout": 180000,
      "parallel": true
    }
  }
}
```

**Exit Codes:**
- 0: All validations passed
- 2: One or more validations failed

### validate-todo-completion
Validates that all todos are completed before stopping.

**Configuration Options:**
- `timeout` (number): Maximum execution time in ms (default: 5000)
- `allowPending` (boolean): Allow pending todos (default: false)
- `requireDescription` (boolean): Require todo descriptions (default: true)

**Example:**
```json
{
  "hooks": {
    "validate-todo-completion": {
      "timeout": 5000,
      "allowPending": false,
      "requireDescription": true
    }
  }
}
```

**Exit Codes:**
- 0: All todos completed
- 2: Incomplete todos found

## Global Configuration

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

## Environment Variables

Hooks can also be configured through environment variables:

- `CLAUDEKIT_PACKAGE_MANAGER`: Override detected package manager
- `CLAUDEKIT_HOOK_TIMEOUT`: Default timeout for all hooks (in ms)
- `CLAUDEKIT_DEBUG`: Enable debug logging (set to "true")
- `CLAUDEKIT_CONFIG_PATH`: Custom config file path

## Configuration Precedence

Configuration is resolved in the following order (highest to lowest priority):

1. Environment variables
2. Command-line arguments (for test command)
3. Hook-specific configuration in `.claudekit/config.json`
4. Global configuration in `.claudekit/config.json`
5. Built-in defaults

## Best Practices

1. **Timeouts**: Set appropriate timeouts based on your project size
   - Small projects: 15-30 seconds
   - Medium projects: 30-60 seconds
   - Large projects: 60-120 seconds

2. **Package Manager**: Let claudekit auto-detect unless you have specific requirements

3. **Custom Commands**: Use custom commands when you need specific flags or configurations

4. **Fix Mode**: Enable ESLint fix mode for automatic code style corrections, but be aware it modifies files

5. **Parallel Execution**: Enable parallel validation for faster feedback on multi-core systems

## Troubleshooting

### Hook Not Running
- Ensure `.claude/settings.json` has correct hook configuration
- Verify `claudekit-hooks` is in your PATH
- Check that the hook name is spelled correctly

### Configuration Not Applied
- Ensure `.claudekit/config.json` exists and is valid JSON
- Check for typos in configuration keys
- Use `claudekit-hooks test` with `--debug` to see loaded configuration

### Timeout Errors
- Increase the timeout value for the specific hook
- Consider optimizing your project configuration (e.g., exclude unnecessary files)
- Use incremental builds where supported

### Package Manager Issues
- Remove conflicting lock files
- Set explicit `packageManager` in config
- Use environment variable `CLAUDEKIT_PACKAGE_MANAGER` for override

## Examples

### TypeScript-Only Project
```json
{
  "hooks": {
    "typecheck": {
      "timeout": 45000,
      "incremental": true
    },
    "no-any": {
      "excludePatterns": ["*.d.ts"]
    },
    "project-validation": {
      "skipTests": true,
      "timeout": 60000
    }
  }
}
```

### Full-Stack Project
```json
{
  "packageManager": "yarn",
  "hooks": {
    "typecheck": {
      "command": "yarn workspaces run typecheck",
      "timeout": 90000
    },
    "eslint": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx", ".vue"],
      "timeout": 60000
    },
    "run-related-tests": {
      "command": "yarn test --",
      "runInBand": true
    },
    "auto-checkpoint": {
      "prefix": "dev",
      "maxCheckpoints": 25
    }
  }
}
```

### Monorepo Configuration
```json
{
  "packageManager": "pnpm",
  "hooks": {
    "typecheck": {
      "command": "pnpm -r run typecheck",
      "timeout": 120000
    },
    "eslint": {
      "command": "pnpm -r run lint",
      "timeout": 90000
    },
    "project-validation": {
      "parallel": true,
      "timeout": 180000
    }
  }
}
```