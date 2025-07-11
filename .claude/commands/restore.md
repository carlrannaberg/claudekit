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