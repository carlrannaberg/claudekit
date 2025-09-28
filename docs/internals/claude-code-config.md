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
│   └── hooks/                # Legacy - hooks now managed by embedded system
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
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run lint-changed"}]
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
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run python-lint"}]
      }
    ]
  }
}
```

### User-Level Settings

User-level settings (`~/.claude/settings.json`) can contain environment variables, global preferences, and hooks:

```json
{
  "env": {
    "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx",
    "EDITOR": "vim",
    "DEFAULT_BRANCH": "main"
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run security-check"}]
      }
    ]
  }
}
```

**Hook Configuration Precedence**: Hooks from both user-level and project-level configurations are merged:
- User-level hooks apply globally across all projects
- Project-level hooks add to or complement user-level hooks
- All hooks from both sources are executed (they are additive, not overriding)
- Use `claudekit-hooks status` to see the merged result for any project

## Version Control Rules

### Files to Commit

✅ **Always commit these files:**
- `.claude/settings.json` - Team configuration
- `.claude/commands/*.md` - Team slash commands
- Hooks are managed via embedded system: `claudekit-hooks run <hook-name>`

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
# Hooks are managed via embedded system
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
- **Hooks**: All hooks from both user-level and project-level configurations are combined (additive)
- **Tools**: Settings are deeply merged

### Hook Merging Details

When hooks are configured at both user and project levels:
- All hooks from both sources are included
- User-level hooks provide global functionality (e.g., security checks)
- Project-level hooks provide project-specific functionality (e.g., TypeScript checking)
- Hook execution order follows the configuration hierarchy
- No hooks are replaced or overridden - they are cumulative

## Hook Configuration

### Matcher Patterns

The hook system uses flexible matcher patterns:

#### Basic Patterns
- `"Write"` - Exact tool match
- `"Write,Edit,MultiEdit"` - Multiple tools (OR)
- `"Notebook.*"` - Regex pattern
- `"*"` - Universal match

#### Advanced Patterns
- `"Write|Edit|MultiEdit"` - Conditional logic
- `"Write|Edit|MultiEdit"` - Multiple extensions

### Hook Types

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "pattern",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run hook-name"},
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
  "matcher": "Write|Edit|MultiEdit",
  "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
}
```

**Linting JavaScript/TypeScript:**
```json
{
  "matcher": "Write|Edit|MultiEdit",
  "hooks": [{"type": "command", "command": "claudekit-hooks run lint-changed"}]
}
```

**Auto-save on Stop:**
```json
{
  "matcher": "*",
  "hooks": [{"type": "command", "command": "claudekit-hooks run create-checkpoint"}]
}
```

**Test Runner:**
```json
{
  "matcher": "Write,Edit,MultiEdit",
  "hooks": [{"type": "command", "command": "claudekit-hooks run test-changed"}]
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

**Using Embedded Hooks:**

Claudekit provides embedded hooks that work cross-platform. See [Hooks Documentation](../reference/hooks.md).

**For Custom Shell Scripts:**

Hooks are managed via the embedded system:
```bash
# List available hooks
claudekit-hooks list

# Test a hook
claudekit-hooks test typecheck-changed --file test.ts
```

Include shebang and error handling:
```bash
#!/usr/bin/env bash
set -euo pipefail
```

Make hooks self-contained:
- Don't rely on external scripts
- Include all necessary functions
- Handle missing dependencies gracefully

**Consider using embedded hooks instead of custom scripts for better maintainability.**

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
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run lint-changed"}]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [{"type": "command", "command": "claudekit-hooks run create-checkpoint"}]
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
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run black-format"},  # Python formatter
          {"type": "command", "command": "claudekit-hooks run mypy"}     # Type checker
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
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run go-fmt"}]  # Go formatter
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run cargo-check"}]  # Rust checker
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

**1. Hooks not running:**
- For embedded hooks: Verify `claudekit-hooks` is installed: `which claudekit-hooks`
- For embedded hooks: Run `claudekit-hooks list` to see available hooks
- Verify matcher pattern matches your files
- Test hooks directly: `claudekit-hooks test <hook-name> --file <path>`

**2. Settings not applying:**
- Check file name spelling (settings.json, not setting.json)
- Validate JSON syntax: `jq . .claude/settings.json`
- Ensure proper configuration hierarchy

**3. Local settings committed accidentally:**
- Add to .gitignore immediately
- Remove from git history if contains secrets
- Rotate any exposed credentials

### Debug Commands

**Test embedded hooks:**
```bash
claudekit-hooks test typecheck-changed --file test.ts
claudekit-hooks test lint-changed --file app.js
```

**Test embedded hooks:**
```bash
claudekit-hooks test python-lint --file test.py
```

**Validate settings:**
```bash
jq . .claude/settings.json
jq . .claude/settings.local.json
```

**List available embedded hooks:**
```bash
claudekit-hooks list
```

### Getting Help

If you encounter issues:
1. Check the [claudekit documentation](https://github.com/carlrannaberg/claudekit)
2. Review the [Claude Code documentation](https://docs.claude.com/en/docs/claude-code/overview)
3. Check hook logs in `~/.claude/hooks.log`
4. Test hooks in isolation before using in Claude Code

## See Also

- [Hooks Documentation](../reference/hooks.md) - Detailed hook implementation guide
- [Commands Reference](../reference/commands.md) - Available commands
- [Creating Subagents](creating-subagents.md) - Creating custom AI agents