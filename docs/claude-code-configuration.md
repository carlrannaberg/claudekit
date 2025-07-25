# Claude Code Configuration Guide

This comprehensive guide covers Claude Code configuration management, including the `.claude` directory structure, settings files, version control best practices, and team collaboration patterns.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Settings Files](#settings-files)
- [Version Control Rules](#version-control-rules)
- [Configuration Hierarchy](#configuration-hierarchy)
- [Hook Configuration](#hook-configuration)
- [Environment Variables](#environment-variables)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

Claude Code uses a layered configuration system that supports both team-wide standards and personal preferences. The configuration system is designed to:

- Share team standards across all developers
- Allow personal customization without conflicts
- Keep sensitive data out of version control
- Enable project-specific and user-specific settings

## Directory Structure

### Project Level (`.claude/`)

```
your-project/
├── .claude/
│   ├── settings.json         # Team settings (version controlled)
│   ├── settings.local.json   # Personal settings (gitignored)
│   ├── commands/             # Custom slash commands
│   │   ├── my-command.md     # Team command (version controlled)
│   │   └── personal.md       # Personal command (if gitignored)
│   └── hooks/                # Hook scripts
│       ├── typecheck.sh      # Team hook (version controlled)
│       └── my-hook.sh        # Personal hook (if gitignored)
└── .gitignore               # Should include .claude/settings.local.json
```

### User Level (`~/.claude/`)

```
~/.claude/
├── settings.json            # User-level settings (env vars only)
└── commands/                # User-level commands available globally
    └── global-command.md
```

## Settings Files

### settings.json (Team Settings)

The shared `settings.json` contains team-wide standards and should be committed to version control:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [{"type": "command", "command": ".claude/hooks/typecheck.sh"}]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
        "hooks": [{"type": "command", "command": ".claude/hooks/eslint.sh"}]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": ".claude/hooks/auto-checkpoint.sh"},
          {"type": "command", "command": ".claude/hooks/validate-todo-completion.sh"}
        ]
      }
    ]
  },
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "600000",
    "PROJECT_NAME": "my-project",
    "API_BASE_URL": "https://api.example.com"
  },
  "tools": {
    "bash": {
      "defaultTimeoutMs": 600000
    }
  }
}
```

### settings.local.json (Personal Settings)

Personal preferences and local overrides go in `settings.local.json`:

```json
{
  "env": {
    "MY_LOCAL_API_KEY": "personal-key-12345",
    "DEBUG_MODE": "true",
    "LOCAL_DATABASE_URL": "postgresql://localhost/myapp_dev"
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.py",
        "hooks": [{"type": "command", "command": ".claude/hooks/my-python-linter.sh"}]
      }
    ]
  }
}
```

### User-Level Settings

User-level settings (`~/.claude/settings.json`) should contain only environment variables and global preferences:

```json
{
  "env": {
    "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx",
    "EDITOR": "vim",
    "DEFAULT_BRANCH": "main"
  }
}
```

**Important**: Do NOT put hooks in user-level settings as they won't work reliably across different projects.

## Version Control Rules

### Files to Commit

✅ **Always commit these files:**
- `.claude/settings.json` - Team configuration
- `.claude/commands/*.md` - Team slash commands
- `.claude/hooks/*.sh` - Team hook scripts

### Files to Ignore

❌ **Never commit these files:**
- `.claude/settings.local.json` - Personal preferences
- `*.local.json` - Any local configuration
- Files containing API keys or secrets
- Personal hook scripts (unless team agrees)

### .gitignore Configuration

Claude Code automatically adds `.claude/settings.local.json` to `.gitignore`, but you should ensure your `.gitignore` includes:

```gitignore
# Claude Code local settings
.claude/settings.local.json
*.local.json

# Don't ignore team settings
!.claude/settings.json
!.claude/commands/
!.claude/hooks/
```

## Configuration Hierarchy

Claude Code merges configurations in this order (later overrides earlier):

1. **User-level settings** (`~/.claude/settings.json`)
   - Environment variables only
   - Available across all projects

2. **Project team settings** (`.claude/settings.json`)
   - Team standards and shared configuration
   - Hooks, tools, and project-specific env vars

3. **Project local settings** (`.claude/settings.local.json`)
   - Personal overrides and secrets
   - Highest priority

### Merging Behavior

- **Environment variables**: Later values override earlier ones
- **Hooks**: All hooks are combined (not replaced)
- **Tools**: Settings are deeply merged

## Hook Configuration

### Matcher Patterns

The hook system uses flexible matcher patterns:

#### Basic Patterns
- `"Write"` - Exact tool match
- `"Write,Edit,MultiEdit"` - Multiple tools (OR)
- `"Notebook.*"` - Regex pattern
- `"*"` - Universal match

#### Advanced Patterns
- `"tools:Write AND file_paths:**/*.ts"` - Conditional logic
- `"tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}"` - Multiple extensions

### Hook Types

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "pattern",
        "hooks": [
          {"type": "command", "command": "path/to/script.sh"},
          {"type": "inline", "script": "echo 'Inline script'"}
        ]
      }
    ]
  }
}
```

### Common Hook Patterns

**TypeScript Type Checking:**
```json
{
  "matcher": "tools:Write AND file_paths:**/*.ts",
  "hooks": [{"type": "command", "command": ".claude/hooks/typecheck.sh"}]
}
```

**Linting JavaScript/TypeScript:**
```json
{
  "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
  "hooks": [{"type": "command", "command": ".claude/hooks/eslint.sh"}]
}
```

**Auto-save on Stop:**
```json
{
  "matcher": "*",
  "hooks": [{"type": "command", "command": ".claude/hooks/auto-checkpoint.sh"}]
}
```

**Test Runner:**
```json
{
  "matcher": "Write,Edit,MultiEdit",
  "hooks": [{"type": "command", "command": ".claude/hooks/run-related-tests.sh"}]
}
```

## Environment Variables

### Setting Environment Variables

Environment variables can be set at multiple levels:

**User level** (global across projects):
```json
{
  "env": {
    "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx",
    "NPM_TOKEN": "npm_xxxxxxxxxxxx"
  }
}
```

**Project team level** (shared with team):
```json
{
  "env": {
    "API_BASE_URL": "https://api.example.com",
    "NODE_ENV": "development"
  }
}
```

**Project local level** (personal/secret):
```json
{
  "env": {
    "DATABASE_URL": "postgresql://localhost/myapp_dev",
    "AWS_ACCESS_KEY_ID": "AKIAXXXXXXXX"
  }
}
```

### Using Environment Variables

Environment variables are available to:
- Hook scripts
- Bash commands run by Claude
- Slash commands that execute shell commands

## Best Practices

### 1. Team vs Personal Settings

**Team settings should include:**
- Coding standards (linting, formatting)
- Type checking rules
- Test runners
- Build processes
- Shared development URLs

**Personal settings should include:**
- API keys and tokens
- Local database URLs
- Personal preferences
- Experimental hooks

### 2. Hook Script Guidelines

**Make hooks executable:**
```bash
chmod +x .claude/hooks/*.sh
```

**Include shebang and error handling:**
```bash
#!/usr/bin/env bash
set -euo pipefail
```

**Make hooks self-contained:**
- Don't rely on external scripts
- Include all necessary functions
- Handle missing dependencies gracefully

### 3. Security Considerations

**Never commit:**
- API keys or tokens
- Database passwords
- Private SSH keys
- Personal information

**Use environment variables for secrets:**
```json
// Bad: Hardcoded secret
{
  "apiKey": "sk-1234567890abcdef"
}

// Good: Environment variable
{
  "env": {
    "API_KEY": "sk-1234567890abcdef"
  }
}
```

### 4. Documentation

**Document your configuration:**
- Add comments in hook scripts
- Create README in `.claude/` directory
- Document required environment variables
- Include setup instructions for new developers

## Examples

### Example 1: TypeScript Project

**.claude/settings.json:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [{"type": "command", "command": ".claude/hooks/typecheck.sh"}]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{ts,tsx}",
        "hooks": [{"type": "command", "command": ".claude/hooks/eslint.sh"}]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [{"type": "command", "command": ".claude/hooks/auto-checkpoint.sh"}]
      }
    ]
  },
  "env": {
    "NODE_ENV": "development",
    "TYPESCRIPT_STRICT": "true"
  }
}
```

### Example 2: Python Project

**.claude/settings.json:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.py",
        "hooks": [
          {"type": "command", "command": ".claude/hooks/black-format.sh"},
          {"type": "command", "command": ".claude/hooks/mypy-check.sh"}
        ]
      }
    ]
  },
  "env": {
    "PYTHON_VERSION": "3.11",
    "PYTEST_OPTIONS": "-v --color=yes"
  }
}
```

### Example 3: Multi-Language Project

**.claude/settings.json:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.go",
        "hooks": [{"type": "command", "command": ".claude/hooks/go-fmt.sh"}]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.rs",
        "hooks": [{"type": "command", "command": ".claude/hooks/cargo-check.sh"}]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts}",
        "hooks": [{"type": "command", "command": ".claude/hooks/prettier.sh"}]
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

**1. Hooks not running:**
- Check file permissions: `chmod +x .claude/hooks/*.sh`
- Verify matcher pattern matches your files
- Check logs in `~/.claude/hooks.log`

**2. Settings not applying:**
- Check file name spelling (settings.json, not setting.json)
- Validate JSON syntax: `jq . .claude/settings.json`
- Ensure proper configuration hierarchy

**3. Local settings committed accidentally:**
- Add to .gitignore immediately
- Remove from git history if contains secrets
- Rotate any exposed credentials

### Debug Commands

**Test hook directly:**
```bash
echo '{"tool_input": {"file_path": "test.ts"}}' | .claude/hooks/typecheck.sh
```

**Validate settings:**
```bash
jq . .claude/settings.json
jq . .claude/settings.local.json
```

**Check hook permissions:**
```bash
ls -la .claude/hooks/
```

### Getting Help

If you encounter issues:
1. Check the [claudekit documentation](https://github.com/carlrannaberg/claudekit)
2. Review the [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)
3. Check hook logs in `~/.claude/hooks.log`
4. Test hooks in isolation before using in Claude Code

## See Also

- [Hooks Documentation](hooks-documentation.md) - Detailed hook implementation guide
- [Create Command Documentation](create-command-documentation.md) - Creating custom commands
- [AGENT.md Commands](agent-commands-documentation.md) - AI assistant configuration