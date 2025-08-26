# Thinking Level Hook: Enhanced AI Reasoning

## Overview

Claudekit includes a thinking-level hook that automatically enhances Claude's reasoning capabilities by injecting invisible thinking keywords into every prompt. This hook operates transparently in the background, improving Claude's problem-solving abilities without any visible changes to the user experience.

> **Important:** This feature leverages Claude Code's built-in thinking budget system. The keywords (`think`, `think hard`, `think harder`, `ultrathink`) trigger specific token allocations (4,000 to 31,999 tokens) that give Claude more computational resources for complex reasoning tasks.

**Key Benefits:**
- **Automatic enhancement** - No need to manually add thinking keywords to prompts
- **Invisible operation** - Keywords are injected silently without user awareness
- **Configurable intensity** - Choose from 5 levels of reasoning enhancement
- **Performance optimized** - Lightweight operation with minimal overhead
- **Smart defaults** - Level 2 ("megathink") provides balanced enhancement out of the box

## Quick Start

### New to Claudekit?

Install claudekit and enable thinking-level enhancement with a single command:

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks thinking-level
```

### Already Have Claudekit?

Add thinking-level to your existing project:

```bash
claudekit setup --yes --force --hooks thinking-level
```

Both commands will:
- Add thinking-level hook to your `.claude/settings.json`
- Configure it to run on every UserPromptSubmit event
- Set default level 2 ("megathink") for balanced reasoning
- Merge with existing configuration without overwriting other hooks

### Manual Configuration

You can also manually add thinking-level to `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run thinking-level"
          }
        ]
      }
    ]
  }
}
```

### Customize Thinking Intensity

Configure the thinking level in `.claudekit/config.json`:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 3
    }
  }
}
```

### Verify Configuration

Test that the thinking-level hook is properly configured:

```bash
# Check if thinking-level is configured
claudekit list hooks | grep thinking-level

# Test the hook directly (should see additionalContext in output)
echo '{}' | claudekit-hooks run thinking-level | grep additionalContext

# Check current configuration
cat .claudekit/config.json | grep -A 2 thinking-level
```

## Configuration

### Thinking Levels

The hook supports 4 configurable levels (0-3), each injecting different keywords with specific token budgets:

| Level | Keyword | Token Budget | Description | Use Case |
|-------|---------|--------------|-------------|----------|
| 0 | *(none)* | 0 | Disabled - no enhancement | When you want pure Claude without modifications |
| 1 | `think` | 4,000 | Basic reasoning enhancement | Simple tasks, quick responses |
| **2** | `megathink` | **10,000** | **Moderate enhancement (default)** | **Balanced for most tasks** |
| 3 | `ultrathink` | 31,999 | Maximum reasoning enhancement | Critical thinking, deep problem-solving |

> **Note:** Token budgets are specific to Claude Code and represent the amount of computational thinking Claude allocates to process your request. Higher budgets allow for more thorough analysis but may increase response time.

### Complete Claude Code Keywords Reference

While our hook uses the primary keywords shown above, Claude Code actually recognizes many trigger phrases for each thinking level:

#### **BASIC Level** (4,000 tokens)
- `think` - Any mention of the word "think"

#### **MIDDLE Level** (10,000 tokens)
- `megathink` - Our hook's keyword (special keyword)
- `think hard`
- `think about it`
- `think a lot`
- `think deeply`
- `think more`

#### **HIGHEST Level** (31,999 tokens)
- `ultrathink` - Our hook's keyword (special maximum keyword)
- `think harder`
- `think intensely`
- `think longer`
- `think really hard`
- `think super hard`
- `think very hard`

> **Why we use specific keywords:** Our hook uses `think`, `megathink`, and `ultrathink` as they are the distinctive special keywords that clearly indicate the progression of thinking levels. However, if you manually type any of the above phrases in your prompts, Claude Code will recognize them and allocate the corresponding token budget.

### Configuration Options

Configure the hook in `.claudekit/config.json`:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 2  // 0-4, default is 2
    }
  }
}
```

### Disabling the Hook

To temporarily disable thinking enhancement without removing the hook:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 0
    }
  }
}
```

To completely remove the hook, delete its entry from `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      // Remove the thinking-level hook entry
    ]
  }
}
```

## How It Works

### Technical Implementation

1. **Event Trigger**: The hook runs on every `UserPromptSubmit` event
2. **Keyword Injection**: Based on the configured level, it injects a thinking keyword
3. **Invisible Operation**: Keywords are added via `additionalContext` field
4. **JSON Response**: Returns structured output that Claude Code processes

### Example Flow

When you submit a prompt like "How do I optimize this function?":

1. Claude Code triggers the UserPromptSubmit event
2. The thinking-level hook intercepts the event
3. With level 2 (default), it adds "megathink" invisibly
4. Claude receives: "think hard\nHow do I optimize this function?"
5. You see only: "How do I optimize this function?"
6. Claude provides enhanced reasoning in its response

### Integration with Claude Code

The hook integrates seamlessly with Claude Code's hook system:

```javascript
// Hook response structure
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "think hard"  // Invisible to user
  }
}
```

## Best Practices

### Choosing the Right Level

**Level 0 - Disabled**
- Use when you need raw Claude without modifications
- Helpful for testing baseline performance
- Required for certain specialized tasks

**Level 1 - Basic ("think")**
- Quick questions and simple tasks
- Code completion and basic explanations
- When speed is more important than depth

**Level 2 - Moderate ("megathink")** *(Default)*
- General programming tasks
- Bug fixing and debugging
- Code review and refactoring
- Most day-to-day development work

**Level 3 - Maximum ("ultrathink")** *(31,999 tokens)*
- Complex architectural decisions
- Algorithm design and optimization
- Security analysis and threat modeling
- Critical system design decisions
- Complex mathematical proofs
- Multi-faceted problem solving
- When accuracy is paramount

### Token Budget Hierarchy

The thinking system follows a clear hierarchy of computational resources:

- **BASIC** → 4,000 tokens (baseline)
- **MIDDLE** → 10,000 tokens (2.5x more than basic)
- **HIGHEST** → 31,999 tokens (8x more than basic)

This exponential increase reflects the complexity jump between simple queries, moderate analysis, and deep problem-solving tasks.

### Performance Considerations

The thinking-level hook has minimal overhead but affects Claude's processing time:

**Hook Performance:**
- **Execution time**: < 5ms per invocation
- **Memory usage**: Negligible (< 1MB)
- **Character usage**: 5-11 characters per prompt
- **Keyword tokens**: 1-3 tokens per prompt

**Claude Processing Time (based on token budget):**
- **Level 1** (4,000 tokens): Standard response time
- **Level 2** (10,000 tokens): ~2.5x longer processing
- **Level 3** (31,999 tokens): ~8x longer processing (45-180 seconds for complex tasks)

### Interaction with Other Hooks

The thinking-level hook works well with other UserPromptSubmit hooks:

- **Character limit**: UserPromptSubmit hooks share a 10,000 character limit
- **Thinking-level usage**: Only 5-11 characters
- **Compatible with**: codebase-map, self-review, and other hooks
- **Execution order**: Runs based on `.claude/settings.json` order

## Common Use Cases

### Software Development

Set level 2-3 for most development tasks:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 2  // Good for general development
    }
  }
}
```

### Code Review and Debugging

Increase to level 3 for thorough analysis:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 3  // Enhanced for code review
    }
  }
}
```

### Complex Problem Solving

Use level 3 for critical thinking tasks:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 3  // Maximum reasoning (ultrathink)
    }
  }
}
```

### Quick Tasks

Reduce to level 1 or 0 for simple queries:

```json
{
  "hooks": {
    "thinking-level": {
      "level": 1  // Light enhancement
    }
  }
}
```

## Testing

### Unit Testing

The thinking-level hook includes comprehensive unit tests:

```bash
# Run thinking-level tests
npm test -- tests/hooks/unit/thinking-level.test.ts

# Run all hook tests
npm test -- tests/hooks/unit/
```

### Manual Testing

Test different thinking levels:

```bash
# Test level 0 (disabled)
echo '{"hooks": {"thinking-level": {"level": 0}}}' > .claudekit/config.json
echo '{}' | claudekit-hooks run thinking-level

# Test level 2 (default)
echo '{"hooks": {"thinking-level": {"level": 2}}}' > .claudekit/config.json
echo '{}' | claudekit-hooks run thinking-level

# Test level 3 (maximum)
echo '{"hooks": {"thinking-level": {"level": 3}}}' > .claudekit/config.json
echo '{}' | claudekit-hooks run thinking-level
```

### Performance Testing

Profile the hook's performance:

```bash
# Profile thinking-level hook performance
claudekit-hooks profile thinking-level --iterations 100

# Expected results:
# - Execution time: < 5ms average
# - Output size: < 100 characters
# - Consistent performance across levels
```

## Troubleshooting

### Hook Not Working

1. **Check configuration exists:**
   ```bash
   cat .claude/settings.json | grep thinking-level
   ```

2. **Verify hook is installed:**
   ```bash
   claudekit list hooks | grep thinking-level
   ```

3. **Test hook directly:**
   ```bash
   echo '{}' | claudekit-hooks run thinking-level
   ```

### Wrong Thinking Level

1. **Check current configuration:**
   ```bash
   cat .claudekit/config.json | grep -A 2 thinking-level
   ```

2. **Update configuration:**
   ```bash
   echo '{"hooks":{"thinking-level":{"level":2}}}' > .claudekit/config.json
   ```

3. **Verify change:**
   ```bash
   echo '{}' | claudekit-hooks run thinking-level | grep additionalContext
   ```

### Performance Issues

1. **Profile the hook:**
   ```bash
   claudekit-hooks profile thinking-level
   ```

2. **Check for conflicts:**
   ```bash
   # List all UserPromptSubmit hooks
   cat .claude/settings.json | grep -A 5 UserPromptSubmit
   ```

3. **Verify character limit:**
   ```bash
   # Total characters from all UserPromptSubmit hooks should be < 10,000
   claudekit-hooks profile --hook-event UserPromptSubmit
   ```

## FAQ

**Q: Does the thinking-level hook slow down Claude's responses?**
A: No, the hook adds < 5ms to prompt processing and Claude processes the keywords instantly.

**Q: Can I see what keywords are being injected?**
A: The keywords are intentionally invisible. To verify, run the hook directly with `claudekit-hooks run thinking-level`.

**Q: Why does the hook use "ultrathink" for level 3?**
A: Claude Code recognizes multiple keywords for the 31,999 token budget (including "think harder", "think intensely", and "ultrathink"). We chose "ultrathink" as it's the most recognized maximum keyword and clearly indicates the highest thinking level.

**Q: Should I always use level 4 for best results?**
A: No. Level 2 (default) provides the best balance. Higher levels may overthink simple tasks.

**Q: Can I use different levels for different projects?**
A: Yes. Configure `.claudekit/config.json` differently in each project.

**Q: Does this work with other AI assistants?**
A: The hook is designed specifically for Claude's reasoning patterns.

**Q: How do I know if the hook is actually improving responses?**
A: Compare responses with level 0 (disabled) vs level 2 (default) on complex tasks.

## See Also

- [Hook Reference](../reference/hooks.md#thinking-level) - Technical details
- [Creating Hooks](creating-hooks.md) - Build custom hooks
- [Hook Profiling](hook-profiling.md) - Performance optimization