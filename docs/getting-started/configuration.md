# Configuration

## Configuration Files

Claudekit uses two configuration files:

**`.claude/settings.json`** - Project settings (hooks, commands)
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
    }]
  }
}
```

**`.claudekit/config.json`** - Hook configuration
```json
{
  "hooks": {
    "typecheck-changed": {
      "command": "npm run typecheck"
    }
  }
}
```

## Hook Configuration

### Event Registration (`.claude/settings.json`)

Hooks are registered to Claude Code events in `.claude/settings.json` using the `claudekit-hooks run <hook>` command format:

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
  }
}
```

### Matcher Patterns

The new hook matcher format supports:
- **Exact Match**: `"Write"` (matches only Write tool)
- **Multiple Tools**: `"Write,Edit,MultiEdit"` (OR logic)
- **Regex Patterns**: `"Notebook.*"` (matches Notebook tools)
- **Pipe Separator**: `"Write|Edit|MultiEdit"` (matches any of these tools)
- **Universal Match**: `"*"` (matches all tools/events)

### Hook-Specific Settings (`.claudekit/config.json`)

Hooks support additional configuration through `.claudekit/config.json` in your project root. This file provides centralized hook configuration with JSON schema validation and graceful fallbacks to sensible defaults:

```json
{
  "hooks": {
    "self-review": {
      "timeout": 30000
    },
    "typecheck-changed": {
      "command": "pnpm tsc --noEmit",
      "timeout": 45000
    },
    "lint-changed": {
      "command": "pnpm eslint",
      "extensions": [".ts", ".tsx", ".js", ".jsx"],
      "fix": true,
      "timeout": 30000
    },
    "test-project": {
      "command": "npm run test:fast",
      "timeout": 50000
    },
    "create-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 15
    }
  }
}
```

### Hook-Specific Configuration

**self-review**  
Customize which files trigger reviews and what questions get asked:
```json
"self-review": {
  "targetPatterns": [        // Which files to monitor for changes
    "**/*.ts",
    "**/*.tsx",
    "!**/*.test.*"          // Exclude test files
  ],
  "focusAreas": [           // Replace default question sets
    {
      "name": "Performance",
      "questions": [
        "Did you consider the performance impact?",
        "Are there unnecessary re-renders?",
        "Could this benefit from caching?"
      ]
    }
  ]
}
```

**typecheck-changed / typecheck-project**  
Override TypeScript compiler settings:
```json
"typecheck-changed": {
  "command": "pnpm tsc --noEmit",  // Custom command if not using npm
  "timeout": 45000                  // Increase timeout for large codebases
}
```

**lint-changed / lint-project**  
Configure ESLint behavior and auto-fixing:
```json
"lint-changed": {
  "command": "pnpm eslint",         // Custom command
  "fix": true,                      // Auto-fix issues
  "extensions": [".ts", ".tsx"],    // Which files to lint
  "timeout": 30000
}
```

**test-changed / test-project**  
Customize test execution:
```json
"test-project": {
  "command": "npm run test:fast",   // Use faster test suite
  "timeout": 60000                  // Increase timeout for integration tests
}
```

**create-checkpoint**  
Control checkpoint naming and retention:
```json
"create-checkpoint": {
  "prefix": "claude",                // Prefix for stash messages
  "maxCheckpoints": 15               // How many to keep (older ones deleted)
}
```

## Claude Code Settings Management

The `.claude` directory contains configuration with specific version control rules:

### Version Controlled Files (commit these):
- `.claude/settings.json` - Shared team settings for hooks, tools, and environment
- `.claude/commands/*.md` - Custom slash commands available to all team members
- Hooks are managed via embedded system: `claudekit-hooks run <hook-name>`

### Ignored Files (do NOT commit):
- `.claude/settings.local.json` - Personal preferences and local overrides
- Any `*.local.json` files - Personal configuration not meant for sharing

**Important Notes:**
- Claude Code automatically adds `.claude/settings.local.json` to `.gitignore`
- The shared `settings.json` should contain team-wide standards (linting, type checking, etc.)
- Personal preferences or experimental settings belong in `settings.local.json`
- Hooks are managed via the embedded system (`claudekit-hooks run <hook-name>`)
- User-level settings (`~/.claude/settings.json`) should only contain environment variables, not hooks

## Platform & Language Support

**Currently optimized for:**
- **Platform**: macOS/Linux (Windows via WSL)
- **Language**: TypeScript/JavaScript projects
- **Package Manager**: npm (with yarn/pnpm compatibility)
- **Node.js**: Version 20+ required

## Environment Requirements
- **OS**: macOS/Linux with bash 4.0+
- **Required**: Git, Node.js 20+
- **Optional**:
  - GitHub CLI (for gh-repo-setup command)
  - jq (for JSON parsing, with fallbacks)

## Directory Structure

**IMPORTANT**: Keep source code and configuration separate:
- `src/` - All source code (commands, hooks, etc.) lives here
- `.claude/` - Project-level configuration only (settings.json, symlinks)

```
# claudekit repository structure
src/
├── commands/                 # Source code for all commands
│   ├── agent/               # Agent-related commands
│   ├── checkpoint/          # Checkpoint commands
│   ├── config/              # Configuration commands
│   ├── git/                 # Git workflow commands
│   └── ...                  # Other command namespaces
└── hooks/                   # Source code for all hooks

.claude/
├── settings.json            # Project-specific hook configuration
├── commands/                # Symlinks to src/commands/*
└── hooks/                   # Legacy - hooks now managed by embedded system

examples/
└── settings.user.example.json  # Example user-level settings (env vars only)
```

### Installation Structure
```
~/.claude/                    # User-level installation
├── settings.json            # User settings (env vars only, NO hooks)
└── commands/                # Copied commands from src/commands/

<project>/.claude/            # Project-level
├── settings.json            # Hook configuration for this project
└── hooks/                   # Legacy - hooks now managed by embedded system
```

**Key principles:**
- Source code always goes in `src/`
- `.claude/` contains only configuration and symlinks
- User settings can contain environment variables and global hooks
- Both user-level and project-level hooks are merged and executed