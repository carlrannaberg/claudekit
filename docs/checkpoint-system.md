# Claude Code Checkpoint System

A git-based checkpoint system for Claude Code that provides automatic and manual save points during AI-assisted development sessions.

## Overview

The checkpoint system uses git stashes to create lightweight, non-intrusive snapshots of your work. These checkpoints:
- Don't affect your project's commit history
- Can be created manually or automatically
- Are easily distinguishable from regular stashes
- Can be restored at any time

## Slash Commands

### `/checkpoint [description]`
Creates a checkpoint of the current working state.

**File content:**
```markdown
---
description: Create a git stash checkpoint with optional description
allowed-tools: Bash(git stash:*), Bash(git add:*), Bash(git status:*)
---

## Create a checkpoint

Create a git stash checkpoint to save your current working state.

## Current status
!`git status --short`

## Task

Create a git stash checkpoint while keeping all current changes in the working directory. Steps:

1. If no description provided in $ARGUMENTS, use current timestamp as "YYYY-MM-DD HH:MM:SS"
2. Create a stash object without modifying the working directory:
   - First add all files temporarily: `git add -A`
   - Create the stash object: `git stash create "claude-checkpoint: $ARGUMENTS"`
   - This returns a commit SHA that we need to capture
3. Store the stash object in the stash list:
   - `git stash store -m "claude-checkpoint: $ARGUMENTS" <SHA>`
4. Reset the index to unstage files: `git reset`
5. Confirm the checkpoint was created and show what was saved

Note: Using `git stash create` + `git stash store` creates a checkpoint without touching your working directory.

Example: If user runs `/checkpoint before major refactor`, it creates a stash checkpoint while leaving all your files exactly as they are.
```

**Implementation details:**
- Uses `git stash create` to create stash without affecting working directory
- Uses `git stash store` to add the stash to the stash list
- Prefixes message with `claude-checkpoint: ` for easy filtering
- If no description provided, uses timestamp
- Working directory and index remain completely unchanged

### `/restore [number|latest]`
Restores files to a previous checkpoint state.

**File content:**
```markdown
---
description: Restore project to a previous checkpoint
allowed-tools: Bash(git stash:*), Bash(git status:*), Bash(git reset:*)
---

## Restore to checkpoint

Restore your project files to a previous checkpoint created with /checkpoint.

## Available checkpoints
!`git stash list | grep "claude-checkpoint" | head -10`

## Current status
!`git status --short`

## Task

Restore the project to a previous checkpoint. Based on $ARGUMENTS:

1. Parse the argument:
   - If empty or "latest": Find the most recent claude-checkpoint stash
   - If a number (e.g. "2"): Use stash@{2} if it's a claude-checkpoint
   - Otherwise: Show error and list available checkpoints

2. Check for uncommitted changes with `git status`. If any exist, warn the user before proceeding.

3. Apply the checkpoint using `git stash apply stash@{n}` (not pop, to preserve the checkpoint)

4. Show what was restored and from which checkpoint

Example outputs:
- For `/restore`: "Restored to checkpoint: before major refactor (stash@{0})"
- For `/restore 3`: "Restored to checkpoint: working OAuth implementation (stash@{3})"
```

**Implementation details:**
- Lists only claude-checkpoint stashes
- Uses `git stash apply` (not pop) to preserve checkpoint
- Warns if uncommitted changes exist before restoring
- Shows what was restored

### `/checkpoints`
Lists all Claude Code checkpoints with details.

**File content:**
```markdown
---
description: List all Claude Code checkpoints with time and description
allowed-tools: Bash(git stash:*)
---

## List Claude Code checkpoints

Display all checkpoints created by Claude Code during this and previous sessions.

## Task

List all Claude Code checkpoints. Steps:

1. Run `git stash list` to get all stashes
2. Filter for lines containing "claude-checkpoint:" using grep or by parsing the output
3. For each matching stash line (format: `stash@{n}: On branch: message`):
   - Extract the stash number from `stash@{n}`
   - Extract the branch name after "On "
   - Extract the checkpoint description after "claude-checkpoint: "
   - Use `git log -1 --format="%ai" stash@{n}` to get the timestamp for each stash

4. Format and display as:
   ```
   Claude Code Checkpoints:
   [n] YYYY-MM-DD HH:MM:SS - Description (branch)
   ```
   Where n is the stash index number

5. If `git stash list | grep "claude-checkpoint:"` returns nothing, display:
   "No checkpoints found. Use /checkpoint [description] to create one."

Example: A stash line like `stash@{2}: On main: claude-checkpoint: before auth refactor`
Should display as: `[2] 2025-01-15 10:30:45 - before auth refactor (main)`
```

**Output format:**
```
Claude Code Checkpoints:
[0] 2025-01-15 10:30:45 - Before refactoring auth module (main)
[2] 2025-01-15 09:15:22 - Added user validation (feature/users)
[5] 2025-01-14 16:45:10 - Working OAuth implementation (main)
```

**Implementation details:**
- Filters `git stash list` for claude-checkpoint entries
- Shows stash index, timestamp, description, and branch
- Orders by most recent first

## Hooks Configuration

### Automatic Checkpointing on Stop

Claudekit includes an embedded auto-checkpoint hook. Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run create-checkpoint"
          }
        ]
      }
    ]
  }
}
```

### Custom Auto-checkpoint Script (Alternative)

If you prefer a custom script, create `~/.claude/scripts/auto-checkpoint.sh`:

```bash
#!/bin/bash

# Check if there are any changes to checkpoint
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
    # Create checkpoint with timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    git stash push --include-untracked --keep-index -m "claude-checkpoint: Auto-save at $timestamp" >/dev/null 2>&1

    # Output JSON for hook system
    echo '{"suppressOutput": true}'
else
    # No changes, suppress output
    echo '{"suppressOutput": true}'
fi
```

Make it executable:
```bash
chmod +x ~/.claude/scripts/auto-checkpoint.sh
```

**Note**: The embedded `claudekit-hooks run create-checkpoint` is recommended as it includes additional features like checkpoint management and cross-platform compatibility.

### Optional: Pre-Write Hook for Safety

For additional safety, you can create checkpoints before file writes. While claudekit doesn't include a pre-write checkpoint hook by default, you can create a custom one:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run pre-write-checkpoint"
          }
        ]
      }
    ]
  }
}
```

Or use the embedded create-checkpoint hook in PreToolUse instead of Stop for more frequent checkpoints.

## Integration with git-commit

The `/git-commit` command can be enhanced to handle checkpoints:

1. Check for existing claude-checkpoints
2. Offer to clean up old checkpoints after successful commit
3. Suggest: "Drop all checkpoints older than this commit?"

## Best Practices

1. **Manual Checkpoints**: Use `/checkpoint` before major changes or experiments
2. **Checkpoint Descriptions**: Always provide meaningful descriptions for manual checkpoints
3. **Regular Cleanup**: Periodically clean old checkpoints to avoid stash clutter
4. **Commit Workflow**: After reaching a stable state, use `/git-commit` to create a proper commit

## Example Workflow

```bash
# Starting a new feature
/checkpoint starting new auth feature

# Claude makes changes...

# Before trying something risky
/checkpoint auth working, trying OAuth approach

# If it doesn't work out
/restore latest

# When satisfied with changes
/git-commit
# (Option to clean up checkpoints appears)
```

## Implementation Notes

- Checkpoints use git's stash mechanism, so they're local-only
- They survive branch switches and other git operations
- Can be manually managed with standard git stash commands
- The `claude-checkpoint:` prefix ensures they don't interfere with regular stash usage