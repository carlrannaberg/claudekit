# Self-Review Hook

## Overview

The self-review hook prompts Claude to examine its own work for common AI shortcuts like mock implementations, placeholder code, and incomplete integration. It triggers intelligently - only when files have changed since the last review.

## Installation

```bash
claudekit setup --yes --force --hooks self-review
```

This configures the hook to run on Stop and SubagentStop events in `.claude/settings.json`.

## How It Works

1. **Change Detection** - Analyzes session transcript for file modifications
2. **Smart Triggering** - Only runs when code files changed since last review marker
3. **Randomized Questions** - Uses different prompts each time to maintain effectiveness
4. **Focus Areas** - Examines implementation completeness, code quality, integration, and consistency

## Default Focus Areas

The hook examines four areas where AI assistants commonly take shortcuts:

1. **Implementation Completeness** 
   - Real functionality vs mock implementations
   - No "TODO" comments in production code
   - Actual logic vs hardcoded return values

2. **Code Quality**
   - Code left better than found
   - No unnecessary duplication
   - Following existing patterns

3. **Integration & Refactoring**
   - Proper integration with existing code
   - Refactoring opportunities identified
   - No temporary workarounds left

4. **Codebase Consistency**
   - Patterns applied consistently across codebase
   - Dependent code updated appropriately
   - New utilities that could benefit other areas

📋 **[View current default questions in source →](https://github.com/carlrannaberg/claudekit/blob/main/cli/hooks/self-review.ts#L33-L79)**

## Configuration

Configure in `.claudekit/config.json`:

```json
{
  "hooks": {
    "self-review": {
      "timeout": 30000,
      "targetPatterns": ["src/**/*.ts", "!**/*.test.ts"],
      "focusAreas": [
        {
          "name": "Custom Focus",
          "questions": [
            "Custom question 1?",
            "Custom question 2?"
          ]
        }
      ]
    }
  }
}
```

### Options

- **`timeout`** - Maximum execution time in milliseconds (default: 30000)
- **`targetPatterns`** - Glob patterns to match files for change detection
- **`focusAreas`** - Custom focus areas (**completely replaces all defaults when specified**)

### Custom Focus Areas

When you specify `focusAreas`, it replaces all four default focus areas. To keep some defaults, you must explicitly include them:

```json
{
  "hooks": {
    "self-review": {
      "focusAreas": [
        {
          "name": "Implementation Completeness",
          "questions": [
            "Did you create mock implementations instead of real functionality?",
            "Are there any TODO placeholders in production code?"
          ]
        },
        {
          "name": "Security",
          "questions": [
            "Did you add proper input validation?",
            "Are errors handled gracefully?"
          ]
        }
      ]
    }
  }
}
```

## When It Triggers

The hook runs when:
- ✅ Claude Code session ends (Stop event)
- ✅ Subagent completes work (SubagentStop event)
- ✅ Code files matching target patterns were modified since last review
- ✅ Not already in a stop hook loop

The hook doesn't run when:
- ❌ No file changes since last review marker
- ❌ Already running in stop hook context
- ❌ No transcript available

## What Claude Sees

When the self-review hook triggers, Claude receives a prompt like this:

```
📋 **Self-Review**

Please review these aspects of your changes:

**Implementation Completeness:**
• Does the implementation actually do what it claims, or just return hardcoded values?

**Code Quality:**
• Did you leave the code better than you found it?

**Integration & Refactoring:**
• Would refactoring the surrounding code make everything simpler?

**Codebase Consistency:**
• Should your solution be applied elsewhere for consistency?

💡 **Tip:** The code-review-expert subagent is available. Use it to review each self-review topic.
Use the Task tool with subagent_type: "code-review-expert"

Address any concerns before proceeding.
```

## Integration with Code Review

If `code-review-expert` subagent is installed, the self-review prompt suggests using it for deeper analysis of any concerns identified.

## Troubleshooting

**Hook not triggering?**
The hook only runs when:
- Code files were modified since last review (checks transcript)
- It hasn't already run for those changes (tracks with marker)
- Not already in a stop hook loop

Check with `/hooks` command and `claude --debug` for execution details.

**Custom focus areas not working?**
- Validate JSON syntax: `jq . .claudekit/config.json`
- Remember: Custom focusAreas completely replace defaults
- Use `claude --debug` to see which focus areas are being used

## Common Pitfalls Caught

- Functions returning hardcoded values instead of implementing logic
- "TODO: Implement later" or "Not implemented yet" in production code
- New code added without updating related functionality
- Duplicated logic that should be extracted to utilities
- Inconsistent patterns compared to existing codebase
- Mock implementations that pass tests but don't actually work