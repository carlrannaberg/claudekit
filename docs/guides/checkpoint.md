# Checkpoint Workflow: Git-Based Development Snapshots

## Overview

Claudekit's checkpoint system provides automatic and manual save points during AI-assisted development sessions using git stashes. These lightweight, non-intrusive snapshots enable safe experimentation and quick rollback without affecting your project's commit history.

**Key Benefits:**
- **Safe experimentation** - Try risky changes with easy rollback
- **Non-destructive** - Never affects your commit history or working directory
- **Automatic backups** - Auto-save on session end prevents work loss
- **Manual control** - Create checkpoints before major changes

## Installation

```bash
# Install claudekit (if not already installed)
npm install -g claudekit

# Add checkpoint system to your project
claudekit setup --yes --force --hooks create-checkpoint --commands checkpoint:create,checkpoint:restore,checkpoint:list
```

This will:
- Add create-checkpoint hook to your `.claude/settings.json` (auto-saves on Stop event)
- Install all three checkpoint commands (`/checkpoint:create`, `/checkpoint:restore`, `/checkpoint:list`)
- Merge with any existing configuration (won't overwrite other hooks)

## How It Works

The checkpoint system uses git stashes with special naming conventions:

1. **Automatic checkpoints** - Created when Claude Code stops via the `create-checkpoint` hook
2. **Manual checkpoints** - Created on-demand using `/checkpoint:create [description]`
3. **Easy restoration** - Restore any checkpoint using `/checkpoint:restore [number]`
4. **Smart cleanup** - Automatically manages old checkpoints (default: keep last 10)

### Architecture

```
┌─────────────────────────────────────────────┐
│              Claude Code Session            │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│            Stop Event Hook                  │
│  • Detects uncommitted changes             │
│  • Creates git stash with timestamp         │
│  • Names: "claude-checkpoint: YYYY-MM-DD"  │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│              Git Stash Stack                │
│  • claude-checkpoint: 2024-01-15 14:30     │
│  • claude-checkpoint: manual-backup        │
│  • claude-checkpoint: 2024-01-15 13:45     │
└─────────────────────────────────────────────┘
```

## Usage Examples

### Automatic Checkpoints
```bash
# Work in Claude Code...
# Hit Stop button or Ctrl+C
# Checkpoint automatically created if changes exist
```

### Manual Checkpoints
```bash
# Create checkpoint before risky change
/checkpoint:create "before major refactor"

# List all checkpoints
/checkpoint:list

# Restore to previous checkpoint
/checkpoint:restore 2
```

### Typical Workflow
```bash
# Start working
echo "new feature" >> feature.js

# Create manual checkpoint
/checkpoint:create "added initial feature"

# Continue working...
echo "more changes" >> feature.js

# Something goes wrong, restore to checkpoint
/checkpoint:restore 1
```

## Configuration

Basic configuration in `.claudekit/config.json`:

```json
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "auto",
      "maxCheckpoints": 10,
      "enabled": true
    }
  }
}
```

**Options:**
- `prefix` - Custom prefix for checkpoint names (default: auto-generated timestamp)
- `maxCheckpoints` - Maximum checkpoints to keep (default: 10)
- `enabled` - Enable/disable automatic checkpoints (default: true)

## Troubleshooting

### Hook Not Running
Check if hook is configured:
```bash
claudekit list hooks | grep create-checkpoint
```

If missing, reinstall:
```bash
claudekit setup --yes --force --hooks create-checkpoint
```

### Commands Not Available
Check if commands are installed:
```bash
ls -la .claude/commands/checkpoint/
```

If missing, reinstall:
```bash
claudekit setup --commands checkpoint:create,checkpoint:restore,checkpoint:list
```

### Checkpoints Not Appearing
Check git stash directly:
```bash
git stash list | grep claude-checkpoint
```

Common causes:
- No uncommitted changes when checkpoint was created
- Git repository not initialized (`git init`)
- Git user not configured (`git config user.name/user.email`)

### Restore Not Working
Ensure clean working directory before restore:
```bash
git status
# If changes exist, stash or commit them first
git add .
git commit -m "temp changes"
# Then restore
/checkpoint:restore 1
```

## Key Design Decisions

### Why Git Stashes?
- **Lightweight** - No additional files or databases
- **Non-destructive** - Never affects commit history
- **Standard tooling** - Works with existing git workflows
- **Atomic operations** - Complete saves, not partial states

### Why Prefixed Names?
- **Easy identification** - Clear which stashes are checkpoints
- **Safe cleanup** - Only removes claude-checkpoint stashes
- **No conflicts** - Won't interfere with manual git stashes

## Limitations

- **Git repository required** - Only works in initialized git repos
- **Stash limitations** - Untracked files not included (use `git add` first)
- **Single branch** - Checkpoints are branch-specific
- **Storage overhead** - Each checkpoint uses disk space (~KB-MB per checkpoint)
- **Manual cleanup** - Old checkpoints accumulate if maxCheckpoints not set

## Learn More

- [Git Stash Documentation](https://git-scm.com/docs/git-stash) - Understanding the underlying mechanism
- [Hook Configuration](../reference/hooks.md) - Advanced hook setup options
- [Git Workflow Commands](git-workflow.md) - Complementary git commands