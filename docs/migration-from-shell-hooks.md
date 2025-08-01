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
          {"type": "command", "command": "claudekit-hooks run typecheck"},
          {"type": "command", "command": "claudekit-hooks run no-any"}
        ]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run eslint"}
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

### 3. Create Hook Configuration (Optional)

If you need custom configuration, create `.claudekit/config.json`:

```json
{
  "hooks": {
    "typecheck": {
      "timeout": 30000
    },
    "eslint": {
      "fix": true,
      "timeout": 30000
    },
    "auto-checkpoint": {
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
claudekit-hooks test typecheck --file src/index.ts
claudekit-hooks test eslint --file src/app.js
claudekit-hooks test auto-checkpoint
```

## Hook Mapping Guide

### typecheck.sh → claudekit-hooks run typecheck

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
    "typecheck": {
      "command": "tsc --noEmit",
      "timeout": 30000,
      "incremental": true
    }
  }
}
```

### eslint.sh → claudekit-hooks run eslint

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
    "eslint": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "maxWarnings": 0,
      "timeout": 30000
    }
  }
}
```

### auto-checkpoint.sh → claudekit-hooks run auto-checkpoint

**Shell Script Features:**
- Creates git stash checkpoints
- Manages checkpoint count
- Custom prefix support
- Silent operation

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "auto-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 10,
      "includeUntracked": true,
      "timeout": 10000
    }
  }
}
```

### validate-todo-completion.sh → claudekit-hooks run validate-todo-completion

**Shell Script Features:**
- Reads Claude transcript
- Checks for incomplete todos
- Prevents infinite loops
- Debug logging

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "validate-todo-completion": {
      "timeout": 5000,
      "allowPending": false
    }
  }
}
```

### run-related-tests.sh → claudekit-hooks run run-related-tests

**Shell Script Features:**
- Finds related test files
- Runs tests for modified files
- Multiple test patterns
- Blocks on failures

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "run-related-tests": {
      "command": "npm test --",
      "testPatterns": ["*.test.js", "*.spec.js"],
      "timeout": 60000
    }
  }
}
```

### project-validation.sh → claudekit-hooks run project-validation

**Shell Script Features:**
- Runs TypeScript validation
- Runs ESLint on all files
- Runs test suite
- Parallel execution

**Embedded Hook Equivalent:**
```json
{
  "hooks": {
    "project-validation": {
      "parallel": true,
      "timeout": 120000,
      "skipTests": false
    }
  }
}
```

## Additional Embedded Hooks

The embedded system includes an additional hook not in shell scripts:

### no-any

Prevents the use of `any` types in TypeScript files:

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
          {"type": "command", "command": "claudekit-hooks run typecheck"},
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
    "typecheck": {
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
   claudekit-hooks test typecheck --file test.ts --debug
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
| `.claude/hooks/typecheck.sh` | `claudekit-hooks run typecheck` | Automatic TS version detection |
| `.claude/hooks/eslint.sh` | `claudekit-hooks run eslint` | Supports auto-fix |
| `.claude/hooks/auto-checkpoint.sh` | `claudekit-hooks run auto-checkpoint` | Configurable prefix |
| `.claude/hooks/validate-todo-completion.sh` | `claudekit-hooks run validate-todo-completion` | Smart loop prevention |
| `.claude/hooks/run-related-tests.sh` | `claudekit-hooks run run-related-tests` | Multiple test patterns |
| `.claude/hooks/project-validation.sh` | `claudekit-hooks run project-validation` | Parallel execution |
| N/A | `claudekit-hooks run no-any` | New hook for strict typing |

## Getting Help

- **Documentation**: See [Hooks Documentation](./hooks-documentation.md)
- **Configuration**: See [Hooks Reference](./hooks-reference.md)
- **Issues**: https://github.com/claudekit/claudekit/issues
- **Testing**: Use `claudekit-hooks test <hook> --debug`