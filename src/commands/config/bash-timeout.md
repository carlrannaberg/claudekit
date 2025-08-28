---
description: Configure bash timeout values in Claude Code settings
category: claude-setup
allowed-tools: Read, Edit, Write
argument-hint: "<duration> [scope]"
---

# Configure Bash Timeout Settings

Configure the bash command timeout values in your Claude Code settings.json file. The default timeout is 2 minutes (120000ms), which is often insufficient for long-running operations like builds, tests, or deployments.

## Current Settings

User settings: !if [ -f ~/.claude/settings.json ]; then if command -v jq &>/dev/null; then cat ~/.claude/settings.json | jq '.env // {}' 2>/dev/null; else cat ~/.claude/settings.json | grep -A 10 '"env"' 2>/dev/null || echo "No env settings found"; fi; else echo "No user settings file"; fi
Project settings: !if [ -f .claude/settings.json ]; then if command -v jq &>/dev/null; then cat .claude/settings.json | jq '.env // {}' 2>/dev/null; else cat .claude/settings.json | grep -A 10 '"env"' 2>/dev/null || echo "No env settings found"; fi; else echo "No project settings file"; fi

## Available Timeout Settings

- **BASH_DEFAULT_TIMEOUT_MS**: The default timeout for bash commands (in milliseconds)
- **BASH_MAX_TIMEOUT_MS**: The maximum timeout that can be set for bash commands (in milliseconds)

## Common Timeout Values

- 2 minutes: 120000 (default)
- 5 minutes: 300000
- 10 minutes: 600000
- 15 minutes: 900000
- 20 minutes: 1200000
- 30 minutes: 1800000

## Configure Settings

1. First, check if settings.json exists in the appropriate location
2. Read the current settings to preserve existing configuration
3. Add or update the `env` section with the desired timeout values
4. Maintain all existing settings (hooks, etc.)

### For User-Level Settings (~/.claude/settings.json)
- Applies to all projects for the current user
- Location: `~/.claude/settings.json`

### For Project-Level Settings (.claude/settings.json)
- Applies only to the current project
- Location: `.claude/settings.json`
- Project settings override user settings

## Arguments

Specify the timeout duration (e.g., "10min", "20min", "5m", "600s") and optionally the scope:
- `$ARGUMENTS` format: `[duration] [scope]`
- Duration: Required (e.g., "10min", "20min", "300s")
- Scope: Optional - "user" (default) or "project"

Examples:
- `/bash-timeout 10min` - Set user-level timeout to 10 minutes
- `/bash-timeout 20min project` - Set project-level timeout to 20 minutes
- `/bash-timeout 600s user` - Set user-level timeout to 600 seconds

## Implementation Steps

1. Parse the arguments to extract duration and scope
2. Convert duration to milliseconds
3. Determine the settings file path based on scope
4. Read existing settings if the file exists
5. Update or add the env section with new timeout values
6. Set BASH_DEFAULT_TIMEOUT_MS to the specified value
7. Set BASH_MAX_TIMEOUT_MS to 2x the default value (or at least 20 minutes)
8. Write the updated settings back to the file
9. Confirm the changes to the user

## Example Configuration

```json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "600000",
    "BASH_MAX_TIMEOUT_MS": "1200000"
  },
  "hooks": {
    // existing hooks configuration...
  }
}
```

This sets:
- Default timeout: 10 minutes (600000ms)
- Maximum timeout: 20 minutes (1200000ms)