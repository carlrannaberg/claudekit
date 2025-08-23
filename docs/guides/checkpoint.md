# Checkpoint Workflow: Git-Based Development Snapshots

## Overview

Claudekit's checkpoint system provides automatic and manual save points during AI-assisted development sessions using git stashes. These lightweight, non-intrusive snapshots enable safe experimentation and quick rollback without affecting your project's commit history.

**Key Benefits:**
- **Safe experimentation** - Try risky changes with easy rollback
- **Non-destructive** - Never affects your commit history or working directory
- **Automatic backups** - Auto-save on session end prevents work loss
- **Manual control** - Create checkpoints before major changes
- **Easy restoration** - Restore to any previous checkpoint instantly
- **Smart management** - Automatic cleanup of old checkpoints

## Quick Start

### New to Claudekit?

Install claudekit with checkpoint system and enable both hook and commands with a single command:

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks create-checkpoint --commands checkpoint:create,checkpoint:restore,checkpoint:list
```

### Already Have Claudekit?

Add checkpoint system to your existing project:

```bash
claudekit setup --yes --force --hooks create-checkpoint --commands checkpoint:create,checkpoint:restore,checkpoint:list
```

Both commands will:
- Add create-checkpoint hook to your `.claude/settings.json` (auto-saves on Stop event)
- Install all three checkpoint commands (`/checkpoint:create`, `/checkpoint:restore`, `/checkpoint:list`)
- Merge with any existing configuration (won't overwrite other hooks)
- Skip interactive prompts with `--yes --force`

### Manual Configuration

You can also manually add the hook and commands to `.claude/settings.json`:

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

Then copy the commands from `src/commands/checkpoint/` to `.claude/commands/checkpoint/`.

### Verify Setup

Test that the checkpoint system is working:

```bash
# Check if hook is configured
claudekit list hooks | grep create-checkpoint

# Check if commands are available
ls -la .claude/commands/checkpoint/

# Test manual checkpoint creation
echo "test change" > test.txt
git add test.txt
# Use /checkpoint:create in Claude Code
```

## How It Works

The checkpoint system consists of one hook and three commands working together:

### 1. Create Checkpoint Hook (`create-checkpoint`)
- **Trigger**: `Stop` event (when Claude Code session ends)
- **Purpose**: Automatically saves uncommitted changes before session ends
- **Behavior**:
  - Only creates checkpoint if there are uncommitted changes
  - Uses `git stash create` + `git stash store` to avoid touching working directory
  - Prefixes messages with `claude-checkpoint:` for easy identification
  - Silently manages cleanup of old checkpoints (default: keeps 10 most recent)
  - Completely transparent - no output or interruption

### 2. Manual Checkpoint Commands

#### `/checkpoint:create [description]`
- **Purpose**: Create checkpoint before risky changes or experiments
- **Behavior**: Creates named checkpoint while preserving your working state
- **Usage**: `/checkpoint:create before OAuth refactor`

#### `/checkpoint:restore <number|latest>`
- **Purpose**: Restore files to previous checkpoint state
- **Behavior**: Applies checkpoint using `git stash apply` (preserves checkpoint)
- **Usage**: `/checkpoint:restore latest` or `/checkpoint:restore 2`

#### `/checkpoint:list`
- **Purpose**: View all available checkpoints with timestamps and descriptions
- **Behavior**: Shows formatted list of all claude-checkpoints
- **Output**: `[2] 2025-01-15 10:30:45 - before OAuth refactor (main)`

### Workflow Example

```bash
# 1. Start working on a feature
/checkpoint:create starting authentication feature

# 2. Claude makes changes, session ends
# → create-checkpoint hook automatically saves progress

# 3. Next session, before trying risky approach
/checkpoint:create current auth working, trying OAuth

# 4. Changes don't work out well
/checkpoint:restore latest  # Back to working state

# 5. When satisfied with final result
/git:commit  # Convert to proper commit
```

## Configuration

### Hook Configuration in .claude/settings.json

The checkpoint system must be configured in your project's `.claude/settings.json`:

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

This configuration:
- Triggers on `Stop` event (session end)
- Matches all session endings with universal matcher (`*`)
- Runs the embedded create-checkpoint hook

### Advanced Hook Configuration

#### With Other Hooks
```json
{
  "hooks": {
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

#### Pre-Write Checkpoints (Experimental)
For maximum safety, checkpoint before every file modification:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run create-checkpoint"}
        ]
      }
    ]
  }
}
```

**Note**: This creates many checkpoints and is usually overkill. The default Stop event configuration is recommended.

## Customization

### Checkpoint Configuration in .claudekit/config.json

Customize checkpoint behavior by creating `.claudekit/config.json`:

```json
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 10
    }
  }
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefix` | string | `"claude"` | Prefix for checkpoint messages |
| `maxCheckpoints` | number | `10` | Maximum checkpoints to keep (auto-cleanup) |

#### Example Configurations

```jsonc
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "ai-assistant",        // Changes prefix to "ai-assistant-checkpoint:"
      "maxCheckpoints": 20             // Keeps 20 checkpoints instead of 10
    }
  }
}
```

### Project-Specific Configurations

#### Development Project
```json
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "dev",
      "maxCheckpoints": 15
    }
  }
}
```

#### Production Project (Conservative)
```json
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "prod",
      "maxCheckpoints": 5
    }
  }
}
```

#### Experimental Project (Aggressive)
```json
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "experiment", 
      "maxCheckpoints": 30
    }
  }
}
```

## Usage Examples

### Basic Checkpoint Workflow

**Scenario**: Adding a new feature with experimentation

```bash
# 1. Create checkpoint before starting
/checkpoint:create starting user authentication feature

# 2. Work on feature, Claude makes changes
# (Files modified: auth.ts, user.model.ts, login.component.tsx)

# 3. Before trying a risky refactor
/checkpoint:create auth basic working, trying advanced validation

# 4. Refactor doesn't work well
/checkpoint:restore latest  # Back to "auth basic working" state

# 5. Try different approach  
/checkpoint:create trying JWT tokens instead

# 6. This approach works better, ready to commit
/git:commit
```

### Emergency Recovery

**Scenario**: Something went wrong, need to recover

```bash
# 1. Check what checkpoints are available
/checkpoint:list

# Output:
# Claude Code Checkpoints:
# [0] 2025-01-15 14:30:22 - Auto-save at 2025-01-15T14:30:22.123Z (main)
# [2] 2025-01-15 14:15:10 - trying JWT tokens instead (main)
# [4] 2025-01-15 13:45:30 - auth basic working, trying advanced validation (main)
# [6] 2025-01-15 13:20:15 - starting user authentication feature (main)

# 2. Restore to last known good state
/checkpoint:restore 4  # "auth basic working" state

# 3. Current changes backed up and good state restored
```

### Team Collaboration

**Scenario**: Handing off work to teammate

```bash
# 1. Create checkpoint with descriptive message
/checkpoint:create OAuth integration complete, needs testing

# 2. Commit stable parts
/git:commit "Add OAuth configuration and basic flow"

# 3. Teammate can see checkpoint history
/checkpoint:list

# 4. Teammate can continue from checkpoint
/checkpoint:restore latest
```

### Long-Running Experiments

**Scenario**: Multiple experimental approaches

```bash
# Day 1: Try approach A
/checkpoint:create clean state before performance optimization

# Work on approach A
/checkpoint:create approach A: caching implementation

# Day 2: Try approach B  
/checkpoint:restore 2  # Back to clean state
/checkpoint:create approach B: database optimization

# Day 3: Compare approaches
/checkpoint:list  # See all attempts
/checkpoint:restore 3  # Back to approach A
# Test performance...

/checkpoint:restore 1  # Back to approach B  
# Test performance...

# Choose winner and commit
/checkpoint:restore 3  # Approach A was better
/git:commit "Implement caching for 50% performance improvement"
```

## Best Practices

### 1. Use Descriptive Checkpoint Messages

```bash
# ❌ Poor messages
/checkpoint:create test
/checkpoint:create checkpoint 1
/checkpoint:create changes

# ✅ Good messages  
/checkpoint:create user authentication working, before OAuth integration
/checkpoint:create API endpoints complete, starting frontend integration
/checkpoint:create bug fixed but tests failing, investigating
```

### 2. Strategic Checkpoint Timing

**Create checkpoints before:**
- Major refactoring attempts
- Experimental feature additions
- Complex debugging sessions
- Architectural changes
- Integration of new libraries

**Example timing:**
```bash
# Before major changes
/checkpoint:create stable baseline before database migration

# Before experiments
/checkpoint:create current implementation working, trying performance optimization

# Before integrations
/checkpoint:create core features complete, adding third-party auth
```

### 3. Regular Checkpoint Review

```bash
# Weekly: Review old checkpoints
/checkpoint:list

# Clean up manually if needed (checkpoints auto-cleanup at configured limit)
git stash list | grep claude-checkpoint

# Commit stable checkpoints to permanent history
/checkpoint:restore 5  # Restore good checkpoint
/git:commit "Add user authentication system"
```

### 4. Integration with Git Workflow

```bash
# Ideal workflow:
# 1. Checkpoint → 2. Experiment → 3. Checkpoint → 4. Commit

# Starting new feature
git checkout -b feature/user-auth
/checkpoint:create starting user authentication on clean branch

# Develop feature
# (Claude makes changes)
/checkpoint:create basic auth working

# Experiment with enhancement
/checkpoint:create basic auth complete, adding 2FA

# Ready to commit
/git:commit "Add user authentication with 2FA support"

# Checkpoints remain available for future reference
```

### 5. Team Coordination

```bash
# When sharing work, create descriptive checkpoint
/checkpoint:create payment integration complete, ready for review

# Document checkpoint in commit message
/git:commit "Add payment processing

Stable checkpoint available: 'payment integration complete, ready for review'
Use /checkpoint:restore to access implementation details."
```

## Troubleshooting

### Issue: Hook Not Creating Checkpoints

**Symptoms:** No automatic checkpoints when Claude Code sessions end

**Debugging steps:**
1. **Check hook is enabled:**
   ```bash
   claudekit list hooks | grep create-checkpoint
   ```

2. **Verify git status:**
   ```bash
   git status --porcelain
   # Should show uncommitted changes for checkpoint to be created
   ```

3. **Test hook manually:**
   ```bash
   echo "test" > temp.txt
   claudekit-hooks run create-checkpoint
   git stash list | grep claude-checkpoint
   ```

4. **Check configuration:**
   ```bash
   cat .claude/settings.json | grep -A5 "Stop"
   ```

### Issue: Commands Not Available

**Symptoms:** `/checkpoint:create` not recognized in Claude Code

**Solutions:**
1. **Check commands are installed:**
   ```bash
   ls -la .claude/commands/checkpoint/
   # Should show: create.md, restore.md, list.md
   ```

2. **Install missing commands:**
   ```bash
   claudekit setup --commands checkpoint:create,checkpoint:restore,checkpoint:list
   ```

3. **Manual command installation:**
   ```bash
   mkdir -p .claude/commands/checkpoint
   cp src/commands/checkpoint/* .claude/commands/checkpoint/
   ```

### Issue: Checkpoints Not Listing/Restoring

**Symptoms:** `/checkpoint:list` shows no checkpoints or `/checkpoint:restore` fails

**Debugging steps:**
1. **Check git stash directly:**
   ```bash
   git stash list | grep claude-checkpoint
   ```

2. **Verify stash format:**
   ```bash
   git stash list
   # Look for: stash@{n}: On branch: claude-checkpoint: message
   ```

3. **Test manual stash creation:**
   ```bash
   echo "test" > temp.txt
   git add temp.txt
   git stash create "claude-checkpoint: test"
   ```

### Issue: Working Directory Changes on Checkpoint

**Symptoms:** Files change or disappear when checkpoint is created

**Causes & Solutions:**
This should not happen with the embedded hook. If it does:

1. **Check you're using the embedded hook:**
   ```bash
   # Should be: claudekit-hooks run create-checkpoint
   # Not: git stash push
   grep "create-checkpoint" .claude/settings.json
   ```

2. **Verify hook implementation:**
   ```bash
   # The hook uses git stash create + store, not push
   claudekit-hooks run create-checkpoint --dry-run
   ```

3. **Update to latest claudekit:**
   ```bash
   npm update -g claudekit
   ```

### Issue: Too Many Checkpoints

**Symptoms:** `git stash list` shows hundreds of claude-checkpoints

**Solutions:**
1. **Check auto-cleanup configuration:**
   ```json
   {
     "hooks": {
       "create-checkpoint": {
         "maxCheckpoints": 10
       }
     }
   }
   ```

2. **Manual cleanup:**
   ```bash
   # Remove all but last 5 claude-checkpoints
   git stash list | grep claude-checkpoint | tail -n +6 | cut -d: -f1 | xargs -r git stash drop
   ```

3. **Reset checkpoint limit:**
   ```bash
   echo '{"hooks":{"create-checkpoint":{"maxCheckpoints":5}}}' > .claudekit/config.json
   ```

### Issue: Checkpoint Restoration Conflicts

**Symptoms:** Merge conflicts when restoring checkpoint

**Causes & Solutions:**
1. **Uncommitted changes conflict with checkpoint:**
   ```bash
   # The restore command should create backup automatically
   # Check for backup stash:
   git stash list | grep "claude-restore-backup"
   ```

2. **Resolve conflicts manually:**
   ```bash
   # After conflict, resolve files and restore
   git add resolved-files.txt
   git stash apply stash@{2}  # Apply checkpoint again
   ```

3. **Use restore command properly:**
   ```bash
   # Let the command handle conflicts
   /checkpoint:restore 2
   # It will backup current changes automatically
   ```

### Performance Considerations

#### Large Repositories

For repositories with many files (>10,000):

1. **Monitor checkpoint creation time:**
   ```bash
   time claudekit-hooks run create-checkpoint
   # Should complete in <5 seconds
   ```

2. **Consider reducing checkpoint frequency:**
   ```json
   {
     "hooks": {
       "create-checkpoint": {
         "maxCheckpoints": 5  // Keep fewer checkpoints
       }
     }
   }
   ```

3. **Use .gitignore to exclude large files:**
   ```gitignore
   # Exclude from checkpoints
   node_modules/
   dist/
   build/
   *.log
   ```

#### Memory Usage

Checkpoints use git's efficient delta storage:
- Small changes: ~1-10KB per checkpoint
- Medium changes: ~10-100KB per checkpoint  
- Large changes: ~100KB-1MB per checkpoint

Total overhead typically <50MB even with 30+ checkpoints.

## Advanced Use Cases

### Automated Checkpoint Strategies

#### Time-Based Checkpoints
```json
{
  "hooks": {
    "create-checkpoint": {
      "prefix": "hourly",
      "maxCheckpoints": 24
    }
  }
}
```

Combined with cron job for hourly checkpoints during work hours:
```bash
# Add to crontab: checkpoint every hour, 9am-5pm, weekdays
0 9-17 * * 1-5 cd /path/to/project && claudekit-hooks run create-checkpoint
```

#### Feature Branch Checkpoints
```bash
# Different checkpoint strategies per branch type
case $(git branch --show-current) in
  main|master)
    # Conservative on main
    export CHECKPOINT_MAX=5
    ;;
  feature/*)
    # Aggressive on feature branches  
    export CHECKPOINT_MAX=20
    ;;
  experiment/*)
    # Very aggressive on experiments
    export CHECKPOINT_MAX=50
    ;;
esac
```

### Integration with CI/CD

#### Pre-Deploy Checkpoints
```yaml
# .github/workflows/deploy.yml
- name: Create pre-deploy checkpoint
  run: |
    npm install -g claudekit
    claudekit-hooks run create-checkpoint
    git stash list | head -1  # Log latest checkpoint
```

#### Development Environment Setup
```bash
# setup-dev.sh - Team onboarding script
#!/bin/bash
echo "Setting up checkpoint system..."

# Install claudekit with checkpoints
npm install -g claudekit
claudekit setup --yes --force --hooks create-checkpoint --commands checkpoint:create,checkpoint:restore,checkpoint:list

# Configure for development
echo '{
  "hooks": {
    "create-checkpoint": {
      "prefix": "dev",
      "maxCheckpoints": 15
    }
  }
}' > .claudekit/config.json

echo "✅ Checkpoint system ready!"
echo "- Automatic saves when Claude Code exits"
echo "- Use /checkpoint:create before risky changes"  
echo "- Use /checkpoint:list to see all checkpoints"
echo "- Use /checkpoint:restore to rollback"
```

### Custom Integration Scripts

#### Checkpoint Analysis
```bash
#!/bin/bash
# analyze-checkpoints.sh - Show checkpoint statistics

echo "Checkpoint Analysis:"
echo "==================="

total=$(git stash list | grep claude-checkpoint | wc -l)
echo "Total checkpoints: $total"

oldest=$(git stash list | grep claude-checkpoint | tail -1 | cut -d: -f1)
if [ -n "$oldest" ]; then
    echo "Oldest checkpoint: $(git log -1 --format="%ar" $oldest)"
fi

newest=$(git stash list | grep claude-checkpoint | head -1 | cut -d: -f1)  
if [ -n "$newest" ]; then
    echo "Newest checkpoint: $(git log -1 --format="%ar" $newest)"
fi

echo ""
echo "Recent checkpoints:"
git stash list | grep claude-checkpoint | head -5 | while IFS=: read stash branch message; do
    timestamp=$(git log -1 --format="%ar" $stash)
    echo "  $stash ($timestamp): ${message##*claude-checkpoint: }"
done
```

#### Checkpoint Export
```bash
#!/bin/bash
# export-checkpoint.sh - Export checkpoint as patch file

if [ -z "$1" ]; then
    echo "Usage: $0 <checkpoint-number>"
    echo "Available checkpoints:"
    git stash list | grep claude-checkpoint | head -10
    exit 1
fi

stash_ref="stash@{$1}"
checkpoint_msg=$(git stash list | grep "^$stash_ref" | cut -d: -f3-)
filename="checkpoint-$1-$(date +%Y%m%d).patch"

git stash show -p "$stash_ref" > "$filename"
echo "Checkpoint exported to: $filename"
echo "Description: $checkpoint_msg"
```

## Migration and Team Adoption

### Migrating from Manual Git Workflows

**Before**: Manual git stash commands
```bash
git stash push -m "before trying new approach"
# Work...
git stash pop  # Oops, lost the checkpoint!
```

**After**: Claudekit checkpoint system
```bash
/checkpoint:create before trying new approach
# Work...  
/checkpoint:restore latest  # Checkpoint preserved!
```

### Team Onboarding Checklist

```markdown
## Checkpoint System Onboarding

### Setup (One-time)
- [ ] Install: `npm install -g claudekit`
- [ ] Configure: `claudekit setup --hooks create-checkpoint --commands checkpoint:create,checkpoint:restore,checkpoint:list`
- [ ] Test: Create test checkpoint and verify with `/checkpoint:list`

### Daily Workflow
- [ ] Use `/checkpoint:create` before major changes
- [ ] Check `/checkpoint:list` when recovering from issues
- [ ] Use `/checkpoint:restore` instead of manual git reset
- [ ] Rely on automatic checkpoints for session safety

### Best Practices Review
- [ ] Checkpoint messages are descriptive
- [ ] Regular cleanup of very old checkpoints  
- [ ] Integration with git commit workflow
- [ ] Team communication about important checkpoints
```

### Migration Script for Existing Projects

```bash
#!/bin/bash
# migrate-to-checkpoints.sh - Convert existing project

echo "Migrating project to Claudekit checkpoint system..."

# 1. Install system
npm install -g claudekit
claudekit setup --yes --force --hooks create-checkpoint --commands checkpoint:create,checkpoint:restore,checkpoint:list

# 2. Convert existing stashes to checkpoint format
git stash list | grep -v claude-checkpoint | head -10 | while read line; do
    stash_ref=$(echo "$line" | cut -d: -f1)
    old_msg=$(echo "$line" | cut -d: -f3)
    
    echo "Converting $stash_ref: $old_msg"
    
    # Apply old stash temporarily
    git stash apply "$stash_ref" 2>/dev/null
    
    # Create checkpoint with converted message
    claudekit-hooks run create-checkpoint "Migrated: $old_msg"
    
    # Reset to clean state
    git reset --hard HEAD
    
    # Drop old stash
    git stash drop "$stash_ref"
done

echo "✅ Migration complete!"
echo "Use /checkpoint:list to see converted checkpoints"
```

---

## Summary

Claudekit's checkpoint system provides:

✅ **Automatic safety net** - Never lose work when Claude Code exits  
✅ **Manual control** - Create checkpoints before risky changes  
✅ **Easy restoration** - Rollback to any previous state instantly  
✅ **Non-destructive** - Never affects commit history or working directory  
✅ **Smart management** - Automatic cleanup prevents stash clutter  
✅ **Team-friendly** - Consistent workflow across team members  
✅ **Git-native** - Uses standard git stash mechanism  

The checkpoint system transforms AI-assisted development from risky to safe, enabling bold experimentation with confidence that you can always return to a working state.

For questions or issues, see the [troubleshooting section](#troubleshooting) or check our [GitHub Issues](https://github.com/carlrannaberg/claudekit/issues).