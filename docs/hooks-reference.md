# Hook Configuration Reference

This document provides detailed configuration options for each hook in the claudekit hooks system.

## Configuration File

Hook configuration is stored in `.claudekit/config.json` in your project root:

```json
{
  "hooks": {
    "hookName": {
      "option1": "value1",
      "option2": "value2"
    }
  }
}
```

## Available Hooks

### typecheck
Runs TypeScript compiler to check for type errors.

**Configuration Options:**
- `command` (string): Custom TypeScript command (default: uses package manager)
- `timeout` (number): Maximum execution time in ms (default: 30000)

**Example:**
```json
{
  "hooks": {
    "typecheck": {
      "command": "yarn tsc --noEmit",
      "timeout": 45000
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

**Example:**
```json
{
  "hooks": {
    "no-any": {
      "timeout": 5000
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
- `command` (string): Custom ESLint command (default: uses package manager)
- `timeout` (number): Maximum execution time in ms (default: 30000)
- `fix` (boolean): Auto-fix issues (default: false)
- `extensions` (string[]): File extensions to check

**Example:**
```json
{
  "hooks": {
    "eslint": {
      "command": "pnpm exec eslint",
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"]
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

**Example:**
```json
{
  "hooks": {
    "auto-checkpoint": {
      "prefix": "ai-session",
      "maxCheckpoints": 20
    }
  }
}
```

**Exit Codes:**
- 0: Checkpoint created successfully
- 1: Failed to create checkpoint

### run-related-tests
Runs tests related to changed files.

**Configuration Options:**
- `command` (string): Custom test command (default: uses package manager)
- `timeout` (number): Maximum execution time in ms (default: 60000)
- `pattern` (string): Test file pattern (for future use)

**Example:**
```json
{
  "hooks": {
    "run-related-tests": {
      "command": "npm test",
      "timeout": 90000
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

**Example:**
```json
{
  "hooks": {
    "project-validation": {
      "typescriptCommand": "tsc --noEmit",
      "eslintCommand": "eslint . --ext .ts,.tsx",
      "testCommand": "npm test",
      "timeout": 180000
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

**Example:**
```json
{
  "hooks": {
    "validate-todo-completion": {
      "timeout": 5000
    }
  }
}
```

This hook reads the Claude Code transcript to ensure all TodoWrite items are marked as completed.

**Exit Codes:**
- 0: All todos completed
- 2: Incomplete todos found

## Global Configuration

In addition to hook-specific configuration, you can set global options:

```json
{
  "packageManager": "pnpm",
  "hooks": {
    // hook configurations
  }
}
```

**Global Options:**
- `packageManager` (string): Preferred package manager (auto-detected if not set)

## Environment Variables

Hooks can also be configured through environment variables:

- `CLAUDEKIT_PACKAGE_MANAGER`: Override detected package manager
- `CLAUDEKIT_HOOK_TIMEOUT`: Default timeout for all hooks (in ms)
- `CLAUDEKIT_DEBUG`: Enable debug logging

## Best Practices

1. **Timeouts**: Set appropriate timeouts based on your project size
2. **Package Manager**: Let claudekit auto-detect unless you have specific requirements
3. **Custom Commands**: Use custom commands when you need specific flags or configurations
4. **Fix Mode**: Enable ESLint fix mode for automatic code style corrections

## Troubleshooting

### Hook Not Running
- Ensure `.claudekit/config.json` exists and is valid JSON
- Check that the hook is enabled in Claude Code's `.claude/settings.json`
- Verify the `claudekit-hooks` binary is in your PATH

### Timeout Errors
- Increase the timeout value for the specific hook
- Consider optimizing your project configuration (e.g., exclude unnecessary files)

### Command Not Found
- Ensure required tools (TypeScript, ESLint, etc.) are installed
- Specify the full command path if needed