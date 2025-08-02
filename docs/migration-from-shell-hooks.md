# Migrating from Shell Script Hooks to Embedded Hooks

This guide helps you migrate from legacy shell script hooks to the new embedded claudekit hooks system.

## Overview

The embedded hooks system replaces individual shell script files with a single `claudekit-hooks` executable that provides:

- **Cross-platform support** - Works on Windows, macOS, and Linux
- **Better error handling** - Rich error messages and actionable fix suggestions
- **Automatic package manager detection** - Works with npm, yarn, and pnpm seamlessly
- **Configuration via JSON** - No more editing shell scripts
- **Built-in timeout management** - Prevents runaway processes
- **Easy testing** - Test hooks outside Claude Code with the test command

## Key Differences

### Shell Script Hooks (Legacy)
- Individual `.sh` files in `.claude/hooks/`
- Configuration hardcoded in scripts
- Platform-specific (bash required)
- Manual JSON parsing
- Limited error reporting
- File permission issues

### Embedded Hooks (New)
- Single `claudekit-hooks` binary
- Configuration in `.claudekit/config.json`
- Cross-platform (Node.js based)
- Native JSON support
- Rich error messages
- No permission issues

## Migration Steps

### 1. Install the Latest Claudekit

```bash
npm install -g claudekit@latest
```

This installs both the `claudekit` CLI and the `claudekit-hooks` executable.

### 2. Update Claude Code Settings

Update your `.claude/settings.json` to use the embedded hooks commands:

**Before (Shell Scripts):**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": ".claude/hooks/typecheck.sh"}
        ]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
        "hooks": [
          {"type": "command", "command": ".claude/hooks/eslint.sh"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": ".claude/hooks/auto-checkpoint.sh"}
        ]
      }
    ]
  }
}
```

**After (Embedded Hooks):**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": "claudekit-hooks run check-any-changed"}
        ]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run lint-changed"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run create-checkpoint"}
        ]
      }
    ]
  }
}
```

### 3. Create Hook Configuration (Optional)

If you need custom configuration, create `.claudekit/config.json`:

```json
{
  "hooks": {
    "typecheck-changed": {
      "timeout": 30000
    },
    "lint-changed": {
      "fix": true,
      "timeout": 30000
    },
    "create-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 10
    }
  }
}
```

### 4. Remove Old Shell Scripts

Once the embedded hooks are working, remove the old shell scripts:

```bash
rm -rf .claude/hooks/*.sh
rm -f .claude/validation-lib.sh
```

### 5. Test Your Migration

Test that hooks work correctly:

```bash
# List available hooks
claudekit-hooks list

# Test individual hooks
claudekit-hooks test typecheck-changed --file src/index.ts
claudekit-hooks test lint-changed --file src/app.js
claudekit-hooks test create-checkpoint
```

## Hook Mapping Guide

### typecheck.sh → claudekit-hooks run typecheck-changed

**Shell Script Features:**
- Runs `tsc --noEmit`
- Detects TypeScript version
- Checks for tsconfig.json
- Blocks on type errors

**Embedded Hook Equivalent:**
Simply replace the command in settings.json. Configuration via `.claudekit/config.json`:
```json
{
  "hooks": {
    "typecheck-changed": {
      "command": "tsc --noEmit",
      "timeout": 30000,
      "incremental": true
    }
  }
}
```

### eslint.sh → claudekit-hooks run lint-changed

**Shell Script Features:**
- Runs ESLint on files
- Checks for ESLint config
- Enforces zero warnings
- Caching support

**Embedded Hook Equivalent:**
Replace command and configure as needed:
```json
{
  "hooks": {
    "lint-changed": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "maxWarnings": 0,
      "timeout": 30000
    }
  }
}
```

### auto-checkpoint.sh → claudekit-hooks run create-checkpoint

**Shell Script Features:**
- Creates git stash checkpoints
- Manages checkpoint count
- Custom prefix support
- Silent operation

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 10,
      "includeUntracked": true,
      "timeout": 10000
    }
  }
}
```

### validate-todo-completion.sh → claudekit-hooks run check-todos

**Shell Script Features:**
- Reads Claude transcript
- Checks for incomplete todos
- Prevents infinite loops
- Debug logging

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "check-todos": {
      "timeout": 5000,
      "allowPending": false
    }
  }
}
```

### run-related-tests.sh → claudekit-hooks run test-changed

**Shell Script Features:**
- Finds related test files
- Runs tests for modified files
- Multiple test patterns
- Blocks on failures

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "test-changed": {
      "command": "npm test --",
      "testPatterns": ["*.test.js", "*.spec.js"],
      "timeout": 60000
    }
  }
}
```

### project-validation.sh → split into typecheck-project, lint-project, test-project

**Shell Script Features:**
- Runs TypeScript validation
- Runs ESLint on all files
- Runs test suite
- Parallel execution

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "typecheck-project": {
      "parallel": true,
      "timeout": 120000,
      "skipTests": false
    }
  }
}
```

## Additional Embedded Hooks

The embedded system includes an additional hook not in shell scripts:

### check-any-changed

Prevents the use of `any` types in TypeScript files:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": "claudekit-hooks run check-any-changed"}
        ]
      }
    ]
  }
}
```

## Custom Shell Scripts

If you have custom shell scripts not covered by embedded hooks:

### Option 1: Keep Using Shell Scripts
You can use custom shell scripts alongside embedded hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": ".claude/hooks/custom-check.sh"}
        ]
      }
    ]
  }
}
```

### Option 2: Request New Hook Type
Open an issue on the claudekit repository to request support for your use case.

### Option 3: Use External Commands
Configure embedded hooks to run custom commands:

```json
{
  "hooks": {
    "typecheck-changed": {
      "command": "./scripts/my-custom-typecheck.sh"
    }
  }
}
```

## Troubleshooting

### Hooks Not Running

1. **Check Installation:**
   ```bash
   which claudekit-hooks
   claudekit-hooks --version
   ```

2. **Verify Configuration:**
   ```bash
   # Check Claude Code settings
   cat .claude/settings.json | jq '.hooks'
   
   # Check hook configuration
   cat .claudekit/config.json
   ```

3. **Test Hooks Directly:**
   ```bash
   claudekit-hooks test typecheck-changed --file test.ts --debug
   ```

### Different Behavior

The embedded hooks aim for compatibility but may have slight differences:

- **Exit Codes**: Same as shell scripts (0 for success, 2 for validation errors)
- **Output Format**: May include colors and better formatting
- **Performance**: Generally faster due to Node.js runtime
- **Error Messages**: More detailed and actionable

### Package Manager Detection

The embedded system automatically detects your package manager. To override:

**Via Configuration:**
```json
{
  "packageManager": "pnpm"
}
```

**Via Environment:**
```bash
export CLAUDEKIT_PACKAGE_MANAGER=yarn
```

### Permission Issues

Unlike shell scripts, embedded hooks don't require:
- `chmod +x` commands
- Shebang lines
- Bash installation

## Benefits of Migration

1. **Cross-Platform Support**: Works identically on Windows, macOS, and Linux
2. **Better Error Messages**: Clear, actionable error reporting with fix suggestions
3. **Configuration Management**: JSON-based configuration instead of editing scripts
4. **Performance**: Faster execution with built-in caching
5. **Maintenance**: Automatic updates with claudekit updates
6. **Testing**: Easy testing outside Claude Code
7. **No Permission Issues**: No need to manage file permissions

## Quick Reference

| Shell Script | Embedded Hook | Notes |
|-------------|---------------|-------|
| `.claude/hooks/typecheck.sh` | `claudekit-hooks run typecheck-changed` | Automatic TS version detection |
| `.claude/hooks/eslint.sh` | `claudekit-hooks run lint-changed` | Supports auto-fix |
| `.claude/hooks/auto-checkpoint.sh` | `claudekit-hooks run create-checkpoint` | Configurable prefix |
| `.claude/hooks/validate-todo-completion.sh` | `claudekit-hooks run check-todos` | Smart loop prevention |
| `.claude/hooks/run-related-tests.sh` | `claudekit-hooks run test-changed` | Multiple test patterns |
| `.claude/hooks/project-validation.sh` | Split into `typecheck-project`, `lint-project`, `test-project` | Parallel execution |
| N/A | `claudekit-hooks run check-any-changed` | New hook for strict typing |

## Getting Help

- **Documentation**: See [Hooks Documentation](./hooks-documentation.md)
- **Configuration**: See [Hooks Reference](./hooks-reference.md)
- **Issues**: https://github.com/claudekit/claudekit/issues
- **Testing**: Use `claudekit-hooks test <hook> --debug`