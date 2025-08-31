# Codebase Map: Automated Project Context for AI

## Overview

Claudekit's codebase mapping provides AI assistants with automatic project context through two complementary hooks:
- **Session context** - Loads project overview when Claude Code starts
- **Live updates** - Updates context as files change during development

This ensures AI assistants understand your project structure, code relationships, and architecture patterns without manual explanation.

## Installation

```bash
# Install claudekit and codebase-map tool (if not already installed)
npm install -g claudekit codebase-map

# Add both codebase map hooks to your project  
claudekit setup --yes --force --hooks codebase-map,codebase-map-update
```

This will:
- Install the `codebase-map` CLI tool globally
- Add `codebase-map` hook for session context (UserFeedback event - limits to 9,000 chars)
- Add `codebase-map-update` hook for live updates (PostToolUse event)
- Create default configuration in `.claudekit/config.json`

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│         Claude Code Session Start           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│        codebase-map Hook                    │
│  • Scans project files                     │
│  • Generates map in chosen format          │
│  • Provides as context (≤9,000 chars)      │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│            File Changes                     │
│  • User edits files via Claude Code        │
│  • PostToolUse event triggered             │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│      codebase-map-update Hook              │
│  • Detects relevant changes                │
│  • Updates map incrementally               │
│  • Sends updated context to Claude         │
└─────────────────────────────────────────────┘
```

### Two Hook Strategy

1. **codebase-map** (UserPromptSubmit or SessionStart event)
   - Runs once per session when Claude Code starts
   - Two configuration options available (see Event Types below)
   - Provides comprehensive project overview
   
2. **codebase-map-update** (PostToolUse event)  
   - Runs silently after file modifications
   - Updates the `.codebasemap` index file without any output
   - Keeps AI assistant's understanding current without interrupting workflow

### Event Types

The `codebase-map` hook supports two trigger events with different tradeoffs:

#### UserPromptSubmit (Default - Recommended)
```json
{
  "hooks": {
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

**Advantages:**
- Hidden from user (clean interface)
- Runs automatically on first user prompt
- Subject to 9,000 character limit (forces focus on essentials)

**Disadvantages:**
- Character limit may truncate large projects

#### SessionStart (Alternative)
```json
{
  "hooks": {
    "SessionStart": [
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

**Advantages:**
- No character limit (full project overview)
- Immediate availability at session start

**Disadvantages:**
- Visible output to user (clutters interface)
- Large output can be overwhelming
- May impact session startup time

## Usage Examples

### Basic Usage
```bash
# Install and setup (one-time)
npm install -g claudekit codebase-map && claudekit setup --yes --force --hooks codebase-map,codebase-map-update

# Start Claude Code session
# → Codebase map automatically provided as context
# → Edit files via Claude Code
# → Context automatically updates
```

### Manual Testing
```bash
# Test codebase map generation
codebase-map format --format dsl

# Test with filtering  
codebase-map format --format tree --include "src/**" --exclude "**/*.test.ts"

# Check character count
codebase-map format --format dsl | wc -c
```

## Configuration

Default configuration in `.claudekit/config.json`:

```json
{
  "hooks": {
    "codebase-map": {
      "format": "dsl",
      "include": ["**/*"],
      "exclude": [
        "node_modules/**",
        ".git/**",
        "dist/**", 
        "build/**",
        "*.log"
      ]
    }
  }
}
```

### Key Options

- **format**: `dsl` (code relationships) or `tree` (file structure)
- **include/exclude**: Glob patterns to filter files

### Format Examples

**DSL Format** (shows code relationships):
```
cli/cli.ts > cli/utils/logger
  fn runCli():Promise<void> async
  cn require:unknown
  cn packageJson:unknown

cli/commands/setup.ts > cli/lib/installer,cli/utils/logger
  fn setup(options:SetupOptions):Promise<void> async
```

**Tree Format** (shows file structure):
```
claudekit/
├── cli/
│   ├── cli.ts
│   ├── commands/
│   │   ├── setup.ts
│   │   └── list.ts
│   └── utils/
│       └── logger.ts
├── package.json
└── README.md
```

## Understanding the Output

### What Claude Sees

When a session starts, Claude receives context like this:

```
📍 Codebase Map (loaded once per session):

# Legend: fn=function cl=class cn=constant m=methods p=properties

cli/cli.ts > cli/utils/logger
  fn runCli():Promise<void> async
  cn require:unknown
  cn packageJson:unknown
  cn program:unknown
  cn logger:unknown

cli/commands/setup.ts > cli/lib/installer,cli/lib/paths,cli/types/index,cli/utils/colors,cli/utils/logger,cli/utils/progress
  fn setup(options:SetupOptions):Promise<void> async

cli/hooks/base.ts > cli/hooks/subagent-detector,cli/hooks/utils
  cl BaseHook(11m,3p)
  
cli/hooks/codebase-map.ts > cli/hooks/base,cli/hooks/codebase-map-utils
  cl CodebaseMapHook(5m,3p) extends BaseHook
  cl CodebaseMapUpdateHook(2m,4p) extends BaseHook

[... rest of project structure under 9,000 character limit]
```

### What the Update Hook Does

The `codebase-map-update` hook runs silently when you modify files. It:
- Updates the `.codebasemap` index file without any output  
- Sends incremental updates to Claude about changed files
- Maintains accuracy without interrupting your workflow
- Only triggers when files matching your include/exclude patterns change

This gives Claude immediate understanding of:
- Project architecture and file organization
- Function and class definitions with signatures
- Import/export relationships between files
- Code patterns and naming conventions
- Real-time awareness of changes as you work

## Managing Output Size

### UserPromptSubmit Event (9,000 Character Limit)

When using `UserPromptSubmit` event, the codebase-map hook has a 9,000 character limit. Strategies to stay within it:

### Smart Filtering
```json
{
  "include": ["src/**", "lib/**"],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.js", 
    "**/dist/**",
    "**/*.d.ts"
  ]
}
```

### Format Selection
- **DSL format**: More information per character (shows relationships)
- **Tree format**: More concise but less detail

### Large File Strategy
Exclude directories with large files:
```json
{
  "exclude": [
    "**/dist/**",
    "**/build/**", 
    "**/*.min.js",
    "**/vendor/**"
  ]
}
```

### SessionStart Event (No Character Limit)

When using `SessionStart` event, there's no character limit, but consider:

- **User Experience**: Large output will be visible and may clutter the interface
- **Performance**: Very large outputs may slow down session initialization
- **Relevance**: Focus filtering on relevant files rather than avoiding size limits

## Troubleshooting

### Context Not Appearing
Check if hooks are configured:
```bash
claudekit list hooks | grep codebase-map
```

### codebase-map Command Not Found
Install the CLI tool:
```bash
npm install -g codebase-map
```

### Context Truncated
Check character count and adjust filtering:
```bash
# Check current size
codebase-map format --format dsl | wc -c

# Add more exclusions to .claudekit/config.json
```

### Updates Not Working
Verify the update hook is installed:
```bash
claudekit list hooks | grep codebase-map-update
```

## Key Design Decisions

### Why Two Hooks?
- **Session hook**: Comprehensive project overview once per session
- **Update hook**: Incremental updates maintain accuracy without spam

### Why UserPromptSubmit vs SessionStart?
- **UserPromptSubmit (default)**: Hidden context, 9,000 char limit, cleaner UI
- **SessionStart (alternative)**: Visible output, no limit, immediate availability
- Choose based on project size and user preference

### Why 9,000 Character Limit for UserPromptSubmit?
- UserPromptSubmit event limitation in Claude Code
- Forces focus on essential project structure
- Prevents overwhelming AI with excessive detail
- SessionStart event has no such limitation

### Why DSL Format Default?
- More information density than tree format
- Shows code relationships and patterns
- Better for AI understanding of architecture

## Limitations

- **Character limit**: UserPromptSubmit event capped at 9,000 characters (SessionStart has no limit)
- **Interface visibility**: SessionStart event output is visible to user (may clutter interface)
- **File type support**: Best with common programming languages  
- **Large projects**: UserPromptSubmit may require aggressive filtering to fit limit
- **Large files**: No automatic size limits - must exclude manually via patterns
- **Binary files**: Excluded automatically (no useful context)
- **Real-time updates**: Only updates when files are modified via Claude Code

## Learn More

- [Codebase Map CLI Documentation](https://github.com/carlrannaberg/codebase-map) - Full CLI reference
- [Hook Configuration](../reference/hooks.md) - Advanced hook setup
- [Project Organization Guide](project-organization.md) - Structuring projects for better mapping