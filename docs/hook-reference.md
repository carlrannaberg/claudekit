# Hook Reference Guide

## Hook Naming Convention

Claudekit uses clear suffixes to indicate hook scope:
- `-changed` suffix: Operates on modified files only
- `-project` suffix: Operates on entire project  
- Action verbs: Non-validation actions (create, check)

## Changed File Hooks

### typecheck-changed
- **Purpose**: Run TypeScript type checking on modified files
- **Trigger**: PostToolUse event when .ts/.tsx files change
- **Config**: `typescriptCommand` to customize tsc invocation
- **Performance**: Fast, only checks changed files
- **Example**:
  ```json
  {
    "matcher": "Write|Edit|MultiEdit",
    "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
  }
  ```

### lint-changed
- **Purpose**: Run ESLint validation on modified JavaScript/TypeScript files
- **Trigger**: PostToolUse event when .js/.jsx/.ts/.tsx files change
- **Config**: `eslintCommand` to customize eslint invocation
- **Performance**: Fast, only lints changed files
- **Example**:
  ```json
  {
    "matcher": "Write|Edit|MultiEdit",
    "hooks": [{"type": "command", "command": "claudekit-hooks run lint-changed"}]
  }
  ```

### check-any-changed
- **Purpose**: Check for forbidden 'any' types in modified TypeScript files
- **Trigger**: PostToolUse event when .ts/.tsx files change
- **Config**: None
- **Note**: Ignores 'any' in comments and expect.any() in tests
- **Example**:
  ```json
  {
    "matcher": "Write|Edit|MultiEdit",
    "hooks": [{"type": "command", "command": "claudekit-hooks run check-any-changed"}]
  }
  ```

### test-changed
- **Purpose**: Run tests for modified files
- **Trigger**: PostToolUse event when source files change
- **Config**: `testCommand` to customize test runner
- **Note**: Attempts to find and run related test files
- **Performance**: Fast, only runs relevant tests
- **Example**:
  ```json
  {
    "matcher": "Write,Edit,MultiEdit",
    "hooks": [{"type": "command", "command": "claudekit-hooks run test-changed"}]
  }
  ```

## Project-Wide Hooks

### typecheck-project
- **Purpose**: Run TypeScript validation on entire project
- **Trigger**: Stop event or manual execution
- **Config**: `typescriptCommand` to customize tsc invocation
- **Performance**: Can be slow on large projects
- **Example**:
  ```json
  {
    "matcher": "*",
    "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-project"}]
  }
  ```

### lint-project
- **Purpose**: Run ESLint on entire project
- **Trigger**: Stop event or manual execution
- **Config**: `eslintCommand` to customize eslint invocation
- **Performance**: Can be slow on large projects
- **Example**:
  ```json
  {
    "matcher": "*",
    "hooks": [{"type": "command", "command": "claudekit-hooks run lint-project"}]
  }
  ```

### test-project
- **Purpose**: Run complete test suite
- **Trigger**: Stop event or manual execution
- **Config**: `testCommand` to customize test runner
- **Performance**: Depends on test suite size
- **Example**:
  ```json
  {
    "matcher": "*",
    "hooks": [{"type": "command", "command": "claudekit-hooks run test-project"}]
  }
  ```

## Action Hooks

### create-checkpoint
- **Purpose**: Create git checkpoint of current changes
- **Trigger**: Stop event
- **Config**: `prefix` for checkpoint naming (default: 'claude')
- **Behavior**: Creates git stash, then applies it to restore working directory
- **Example**:
  ```json
  {
    "matcher": "*",
    "hooks": [{"type": "command", "command": "claudekit-hooks run create-checkpoint"}]
  }
  ```

### check-todos
- **Purpose**: Ensure all todos are marked as completed
- **Trigger**: Stop event
- **Config**: None
- **Behavior**: Blocks if incomplete todos are found
- **Example**:
  ```json
  {
    "matcher": "*",
    "hooks": [{"type": "command", "command": "claudekit-hooks run check-todos"}]
  }
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

## Hook Configuration Options

### Global Configuration
Hooks can be configured through a `.claudekit/config.json` file:

```json
{
  "hooks": {
    "typecheck-changed": {
      "command": "yarn tsc --noEmit",
      "timeout": 45000
    },
    "typecheck-project": {
      "command": "yarn tsc --noEmit",
      "timeout": 90000
    },
    "lint-changed": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "timeout": 30000
    },
    "lint-project": {
      "command": "yarn eslint src/",
      "timeout": 60000
    },
    "create-checkpoint": {
      "prefix": "ai-session",
      "maxCheckpoints": 20
    },
    "test-changed": {
      "command": "npm test",
      "timeout": 90000
    },
    "test-project": {
      "command": "npm run test:all",
      "timeout": 300000
    }
  }
}
```

### Per-Hook Configuration Options

#### TypeScript Hooks (typecheck-changed, typecheck-project)
- `command`: Custom TypeScript command (default: auto-detected)
- `timeout`: Maximum execution time in milliseconds
- `configFile`: Path to specific tsconfig.json file

#### ESLint Hooks (lint-changed, lint-project)
- `command`: Custom ESLint command (default: auto-detected)
- `fix`: Auto-fix issues when possible (default: false)
- `extensions`: File extensions to lint (default: [".js", ".jsx", ".ts", ".tsx"])
- `timeout`: Maximum execution time in milliseconds

#### Test Hooks (test-changed, test-project)
- `command`: Custom test command (default: auto-detected)
- `timeout`: Maximum execution time in milliseconds
- `testPatterns`: Custom patterns for finding test files

#### Checkpoint Hook (create-checkpoint)
- `prefix`: Prefix for checkpoint messages (default: "claude")
- `maxCheckpoints`: Maximum number of checkpoints to keep (default: 10)

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

### Common Issues

#### Hook Not Running
1. Check `.claude/settings.json` syntax with `jq .`
2. Verify `claudekit-hooks` is installed and accessible
3. Test hook manually: `claudekit-hooks test <hook-name>`

#### TypeScript Errors
1. Ensure `tsconfig.json` exists and is valid
2. Check TypeScript installation: `npm list typescript`
3. Test manually: `npx tsc --noEmit`

#### ESLint Issues
1. Verify ESLint configuration exists
2. Check ESLint installation: `npm list eslint`
3. Test manually: `npx eslint src/`

#### Performance Issues
1. Increase timeout values in configuration
2. Use more specific file matchers
3. Optimize project build configuration
4. Consider excluding large directories

### Debug Mode
Enable debug output for troubleshooting:
```bash
export CLAUDEKIT_DEBUG=true
claudekit-hooks test <hook-name> --file <path>
```

## See Also

- [Hooks Documentation](./hooks-documentation.md) - Detailed hook information
- [Migration Guide](./migration-from-shell-hooks.md) - Migrating from shell scripts
- [Claude Code Configuration](./claude-code-configuration.md) - Configuration guide