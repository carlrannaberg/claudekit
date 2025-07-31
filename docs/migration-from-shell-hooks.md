# Migrating from Shell Script Hooks

This guide helps you migrate from the legacy shell script hooks to the new TypeScript-based claudekit hooks system.

## Overview

The new TypeScript-based hooks system replaces the shell script hooks with a more robust, cross-platform solution that provides:

- Better error handling and reporting
- Consistent behavior across platforms
- Configuration through JSON instead of hardcoded scripts
- Automatic package manager detection
- Built-in timeout management

## Key Differences

### Shell Script Hooks
- Individual `.sh` files in `.claude/hooks/`
- Configuration hardcoded in scripts
- Platform-specific (bash required)
- Manual JSON parsing
- Limited error reporting

### Claudekit Hooks
- Single `claudekit-hooks` binary
- Configuration in `.claudekit/config.json`
- Cross-platform (Node.js based)
- Native JSON support
- Rich error messages and debugging

## Migration Steps

### 1. Install the Latest Claudekit

```bash
npm install -g claudekit@latest
```

This installs both the `claudekit` and `claudekit-hooks` binaries.

### 2. Update Claude Code Settings

Update your `.claude/settings.json` to use the new `claudekit-hooks` commands:

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

**After (Claudekit Hooks):**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks typecheck"}
        ]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks eslint"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks auto-checkpoint"}
        ]
      }
    ]
  }
}
```

### 3. Create Hook Configuration

Create `.claudekit/config.json` to configure your hooks:

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

Once the new hooks are working, you can remove the old shell scripts:

```bash
rm -rf .claude/hooks/*.sh
```

## Hook Mapping Guide

### typecheck.sh → claudekit-hooks typecheck

**Shell Script Features:**
- Runs `tsc --noEmit`
- Checks for tsconfig.json
- Returns exit code 2 on errors

**Claudekit Equivalent:**
```json
{
  "hooks": {
    "typecheck": {
      "command": "tsc --noEmit",
      "timeout": 30000
    }
  }
}
```

### eslint.sh → claudekit-hooks eslint

**Shell Script Features:**
- Runs ESLint on file
- Checks for ESLint config
- Optional auto-fix

**Claudekit Equivalent:**
```json
{
  "hooks": {
    "eslint": {
      "fix": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "timeout": 30000
    }
  }
}
```

### auto-checkpoint.sh → claudekit-hooks auto-checkpoint

**Shell Script Features:**
- Creates git stash checkpoints
- Manages checkpoint count
- Custom prefix

**Claudekit Equivalent:**
```json
{
  "hooks": {
    "auto-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 10,
      "timeout": 10000
    }
  }
}
```

### validate-todo-completion.sh → claudekit-hooks validate-todo-completion

**Shell Script Features:**
- Reads Claude transcript
- Checks for incomplete todos

**Claudekit Equivalent:**
```json
{
  "hooks": {
    "validate-todo-completion": {
      "timeout": 5000
    }
  }
}
```

## Custom Shell Scripts

If you have custom shell scripts that aren't covered by the built-in hooks, you have several options:

### Option 1: Keep Using Shell Scripts
You can continue using custom shell scripts alongside claudekit hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks typecheck"},
          {"type": "command", "command": ".claude/hooks/custom-check.sh"}
        ]
      }
    ]
  }
}
```

### Option 2: Request New Hook Type
Open an issue on the claudekit repository to request support for your use case.

### Option 3: Create a Plugin (Future)
The claudekit hooks system will support plugins in a future release.

## Troubleshooting

### Hooks Not Running

1. **Check Binary Installation:**
   ```bash
   which claudekit-hooks
   ```

2. **Verify Configuration:**
   ```bash
   claudekit validate
   ```

3. **Test Hook Directly:**
   ```bash
   echo '{"tool_input": {"file_path": "test.ts"}}' | claudekit-hooks typecheck
   ```

### Different Behavior

The new hooks system aims for compatibility but may have slight differences:

- **Exit Codes**: Should be the same (0 for success, 2 for validation errors)
- **Output Format**: May include additional formatting or colors
- **Performance**: Generally faster due to Node.js caching

### Package Manager Detection

The new system automatically detects your package manager. If detection fails, you can specify it:

```json
{
  "packageManager": "pnpm",
  "hooks": {
    // ... hooks configuration
  }
}
```

## Benefits of Migration

1. **Cross-Platform Support**: Works on Windows, macOS, and Linux
2. **Better Error Messages**: Clear, actionable error reporting
3. **Configuration Management**: Centralized, version-controlled configuration
4. **Performance**: Faster execution with Node.js runtime
5. **Maintenance**: Easier to update and maintain

## Getting Help

- Check the [Hooks Reference](./hooks-reference.md) for detailed configuration options
- Review the [Hooks Documentation](./hooks-documentation.md) for usage examples
- Open an issue on GitHub for migration problems