# Session-Based Hook Control

> Temporarily disable and re-enable hooks for individual Claude Code sessions without affecting other developers or making permanent configuration changes.

## Overview

Session-based hook control allows you to temporarily disable specific hooks for your current Claude Code session while keeping them active for other sessions and team members. This is particularly useful when:

- **Rapid prototyping**: Disable type checking to iterate quickly without interruptions
- **Debugging**: Turn off linting to focus on logic without style distractions  
- **Experimentation**: Disable validation hooks when exploring new ideas
- **Performance testing**: Isolate specific hooks to measure their impact
- **Collaborative work**: Customize your experience without affecting teammates

## Quick Start

### Basic Commands

```bash
# Disable a hook for this session only
/hook:disable typecheck-changed

# Check the status of a hook
/hook:status typecheck-changed
# Output: typecheck-changed: 🔒 disabled

# Re-enable the hook
/hook:enable typecheck-changed

# Check status again
/hook:status typecheck-changed  
# Output: typecheck-changed: ✅ enabled
```

### List All Hooks

```bash
# See all configured hooks and their current status
/hook:status
# Output:
# Hook status for this project:
#   ✅ typecheck-changed
#   🔒 lint-changed        (disabled)
#   ✅ test-changed
#   ✅ self-review
```

## 4-State Hook System

The session control system recognizes four distinct hook states:

### ✅ Enabled (Default)
Hook is configured in `.claude/settings.json` and active for this session.

```bash
/hook:status typecheck-changed
# Output: typecheck-changed: ✅ enabled
```

### 🔒 Disabled (Session-specific)
Hook is configured but temporarily disabled for your current session only.

```bash
/hook:disable typecheck-changed
/hook:status typecheck-changed
# Output: typecheck-changed: 🔒 disabled
```

### ⚪ Not Configured
Hook exists in claudekit's registry but isn't configured in your project's `.claude/settings.json`.

```bash
/hook:status check-unused-parameters
# Output: check-unused-parameters: ⚪ not configured
#         This hook exists but is not configured in .claude/settings.json
```

### ❌ Not Found
Hook doesn't exist anywhere in claudekit's registry.

```bash
/hook:status nonexistent-hook
# Output: ❌ No hook found matching 'nonexistent-hook'
#         Available hooks configured for this project:
#           typecheck-changed
#           lint-changed
#           test-changed
```

## Fuzzy Matching

Hook names support intelligent fuzzy matching for convenience:

### Exact Matches
```bash
/hook:disable typecheck-changed  # Exact match - works immediately
```

### Partial Matches
```bash
/hook:disable typecheck          # Matches "typecheck-changed" 
/hook:disable self-rev           # Matches "self-review"
```

### Multiple Matches
```bash
/hook:disable type               # Multiple matches found
# Output: 🤔 Multiple hooks match 'type':
#           typecheck-changed
#           typecheck-project
#         Be more specific: claudekit-hooks disable [exact-name]
```

### Smart Suggestions
```bash
/hook:disable tyepcheck          # Typo in hook name
# Output: ❌ No hook found matching 'tyepcheck'
#         Available hooks configured for this project:
#           typecheck-changed
#           lint-changed
#           test-changed
```

## Use Cases

### 1. Rapid Prototyping
When exploring new ideas, disable validation hooks temporarily:

```bash
/hook:disable typecheck-changed
/hook:disable lint-changed
# Prototype without interruptions
/hook:enable typecheck-changed   # Re-enable when ready
/hook:enable lint-changed
```

### 2. Debugging Focus
Disable non-essential hooks while debugging:

```bash
/hook:disable self-review        # Skip code review prompts
/hook:disable test-changed       # Skip test runs during debug
# Debug with fewer distractions
```

### 3. Performance Analysis
Isolate hook performance impact:

```bash
/hook:disable codebase-map       # Disable expensive operations
# Measure performance difference
```

### 4. Temporary Workflow Changes
Adapt to specific development phases:

```bash
# During refactoring: disable failing tests temporarily
/hook:disable test-changed

# During documentation: focus only on content
/hook:disable typecheck-changed
/hook:disable lint-changed
```

## Session Isolation

### How Sessions Work
- **Session Detection**: Uses Claude Code's transcript UUID or terminal session ID
- **Automatic Identification**: Each session gets a unique identifier
- **State Persistence**: Session preferences stored in `~/.claudekit/sessions/[uuid].json`
- **Zero Interference**: Your disabled hooks don't affect other sessions

### Session Markers
Each command shows a session marker for verification:

```bash
/hook:disable self-review
# Output: <!-- claudekit-session-marker:f946a00c67d4db0d -->
#         🔒 Disabled self-review for this session
```

### Multiple Sessions
Each Claude Code session maintains independent state:

```bash
# Session A: self-review disabled
# Session B: self-review enabled  
# Session C: self-review enabled
```

## Best Practices

### 1. Use Descriptively
```bash
# Good: Clear intent
/hook:disable typecheck-changed  # During rapid prototyping

# Avoid: Permanent-feeling disables
/hook:disable typecheck-changed  # (and forget to re-enable)
```

### 2. Check Status Regularly
```bash
/hook:status                     # See all hook states
```

### 3. Re-enable Before Finishing
```bash
# At end of session
/hook:enable typecheck-changed
/hook:enable lint-changed
```

### 4. Use Partial Names
```bash
/hook:disable type               # Shorter than "typecheck-changed"
/hook:disable self               # Shorter than "self-review"
```

## Advanced Usage

### Batch Status Checking
```bash
/hook:status                     # All hooks
/hook:status type                # All matching "type"
```

### Integration with Development Workflow
```bash
# Start focused work session
/hook:disable self-review lint-changed test-changed

# Rapid development...

# Before committing
/hook:enable self-review lint-changed test-changed
```

## Troubleshooting

### "Cannot determine current Claude Code session"
**Problem**: Command fails with session detection error.
**Solution**: Ensure you're running commands within Claude Code, not external terminal.

### Hook still running after disable
**Problem**: Hook continues to execute despite being disabled.
**Solution**: 
1. Verify you're in the correct session: `/hook:status [hook-name]`
2. Check the session marker matches between disable and current session
3. Try re-disabling: `/hook:disable [hook-name]`

### "Hook is not configured"
**Problem**: Trying to disable a hook that isn't in your project.
**Solution**: Only configured hooks can be disabled. Check `/hook:status` for available hooks.

### Forgotten disabled hooks
**Problem**: Hooks remain disabled longer than intended.
**Solution**: 
1. Check current status: `/hook:status`
2. Re-enable as needed: `/hook:enable [hook-name]`
3. Note: Hooks reset to enabled when starting new Claude Code sessions

### Session state not persisting
**Problem**: Hook state resets unexpectedly.
**Solution**: Session state is tied to Claude Code sessions. Starting a new session resets all hooks to enabled state.

## Technical Details

### Session Storage
- **Location**: `~/.claudekit/sessions/[transcript-uuid].json`
- **Format**: JSON with disabled hooks array and metadata
- **Cleanup**: Files accumulate over time (manual cleanup recommended)

### Session Detection Priority
1. `CLAUDE_TRANSCRIPT_PATH` environment variable
2. Extract UUID from `ITERM_SESSION_ID` 
3. Search `.claude/transcripts/` directory
4. Search `~/.claude/transcripts/` directory
5. Fallback to session marker hash

### Hook Integration
- **Check Point**: Before hook execution in `BaseHook.run()`
- **Performance**: ~1ms overhead per hook check
- **Isolation**: Session checks don't affect global hook configuration