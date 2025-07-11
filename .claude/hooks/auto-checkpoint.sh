#!/bin/bash

# Auto-checkpoint hook for Claude Code
# Creates a checkpoint when Claude Code stops

# Check if there are any changes to checkpoint
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
    # Create checkpoint with timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Add all files temporarily
    git add -A
    
    # Create stash object without modifying working directory
    stash_sha=$(git stash create "claude-checkpoint: Auto-save at $timestamp")
    
    if [[ -n "$stash_sha" ]]; then
        # Store the stash in the stash list
        git stash store -m "claude-checkpoint: Auto-save at $timestamp" "$stash_sha"
        
        # Reset index to unstage files
        git reset >/dev/null 2>&1
    fi
    
    # Output JSON for hook system
    echo '{"suppressOutput": true}'
else
    # No changes, suppress output
    echo '{"suppressOutput": true}'
fi