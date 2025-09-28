# Thinking Level Hook: Automatic Reasoning Enhancement

## Overview

The thinking-level hook automatically adds thinking prompts to user queries before they reach Claude, enabling deeper reasoning without manual prompt engineering. It runs invisibly on every user prompt, upgrading Claude's reasoning depth while keeping the user interface clean.

**Key Benefits:**
- **Automatic reasoning** - No manual "think step by step" needed
- **Invisible operation** - Users see normal interface, Claude gets enhanced prompts  
- **Configurable intensity** - Choose reasoning depth (3 levels available)
- **Zero workflow disruption** - Works transparently with all interactions

## Installation

```bash
# Install claudekit (if not already installed)
npm install -g claudekit

# Add thinking-level hook to your project
claudekit setup --yes --force --hooks thinking-level
```

This will:
- Add thinking-level hook to your `.claude/settings.json` (UserPromptSubmit event)
- Configure default level 2 ("megathink") for balanced reasoning
- Merge with existing configuration without overwriting other hooks

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│            User Query                       │
│    "How do I optimize this function?"       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│       thinking-level Hook                  │
│  • Intercepts UserPromptSubmit event       │
│  • Prepends thinking prompt based on level │
│  • Passes modified prompt to Claude        │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│         Claude Receives                     │
│   "megathink\nHow do I optimize function?" │
│   (User only sees original question)       │
└─────────────────────────────────────────────┘
```

### Example Flow

1. User types: "How do I optimize this function?"
2. thinking-level hook intercepts the query
3. Adds invisible thinking prompt: "megathink\nHow do I optimize this function?"
4. Claude receives the enhanced prompt and provides deeper reasoning
5. User sees normal interface but gets higher quality responses

## Configuration

### Thinking Levels

Configure in `.claudekit/config.json`:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 2
    }
  }
}
```

**Available Levels:**
- **Level 0**: Disabled (no thinking prompt added)
- **Level 1** (`"think"`): Basic step-by-step reasoning
- **Level 2** (`"megathink"`): Balanced depth and performance (default)
- **Level 3** (`"ultrathink"`): Maximum reasoning depth

### Level Comparison

| Level | Prompt | Reasoning Depth | Performance Impact |
|-------|--------|----------------|-------------------|
| 0 | (none) | None | None |
| 1 | `"think"` | Basic | Minimal |
| 2 | `"megathink"` | Moderate | ~2.5x tokens |  
| 3 | `"ultrathink"` | Maximum | ~8x tokens |

**Recommendation**: Level 2 provides the best balance of improved reasoning with reasonable performance.

## Usage Examples

### Basic Usage
```bash
# Install and it works automatically
claudekit setup --yes --force --hooks thinking-level

# Every user query now gets thinking prompts invisibly
# No change to user interface
```

### Level Configuration  
```bash
# Configure specific thinking level
echo '{
  "hooks": {
    "thinking-level": {
      "level": 3
    }
  }
}' > .claudekit/config.json
```

### Temporary Disable
```bash
# Disable without removing hook (level 0 = disabled)
echo '{
  "hooks": {
    "thinking-level": {
      "level": 0
    }
  }
}' > .claudekit/config.json
```

## What Users Experience

**Without thinking-level:**
- User: "How do I fix this bug?"
- Claude: Brief, surface-level response

**With thinking-level (Level 2):**
- User: "How do I fix this bug?" (same interface)
- Claude receives: "megathink\nHow do I fix this bug?"
- Claude: Detailed analysis with step-by-step reasoning

The user interface remains identical - the enhancement happens transparently.

## Troubleshooting

### Hook Not Running
Check if hook is configured:
```bash
claudekit list hooks | grep thinking-level
```

If missing, reinstall:
```bash
claudekit setup --yes --force --hooks thinking-level
```

### Level Not Changing
Verify configuration in `.claudekit/config.json`:
```bash
# Check current config
cat .claudekit/config.json | grep -A5 thinking-level

# Should show your chosen level
```

### Performance Issues
If responses are too slow, reduce thinking level:
```json
{
  "hooks": {
    "thinking-level": {
      "level": 1
    }
  }
}
```

### Unexpected Behavior
Disable temporarily to test if hook is causing issues:
```json
{
  "hooks": {
    "thinking-level": {
      "level": 0
    }
  }
}
```

## Key Design Decisions

### Why UserPromptSubmit Hook?
- **Pre-processing** - Modifies user input before Claude sees it
- **Invisible operation** - No change to user interface
- **Universal application** - Works with all user queries automatically

### Why Three Levels?
- **Level 1** - For basic improvements without significant cost
- **Level 2** - Optimal balance for most users (default)
- **Level 3** - Maximum reasoning for complex tasks (higher cost)

### Why Invisible Enhancement?
- **Clean UX** - Users don't need to remember thinking prompts
- **Consistent application** - Every query benefits automatically
- **No workflow change** - Existing habits remain unchanged

## Limitations

- **Token usage increase** - Higher levels use more tokens per response
- **Response time impact** - Deeper thinking takes longer to process
- **Claude Code only** - Only works within Claude Code environment
- **No selective application** - Applies to all queries (can't exclude specific types)
- **Configuration per project** - Each project needs separate setup

## Learn More

- [Hook Configuration](../reference/hooks.md) - Advanced hook setup options
- [Claude Code Hooks](https://docs.claude.com/en/docs/claude-code/hooks) - Official hook documentation