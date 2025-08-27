# Self-Review Hook: AI Implementation Completeness Detection

## Overview

Claudekit includes a self-review hook that automatically prompts Claude to critically examine its own work before completing development sessions. This hook addresses common AI assistant pitfalls like creating mock implementations that appear functional but lack real logic, leaving placeholder code in production, and missing integration opportunities.

The self-review hook forces Claude to pause and honestly assess whether it took shortcuts, left work incomplete, or missed opportunities to improve the overall codebase. It operates intelligently - only triggering when there are actual file changes since the last review.

**Key Benefits:**
- **Prevents AI shortcuts** - Catches when Claude creates mock implementations instead of real functionality
- **Ensures completeness** - Forces Claude to examine if work was actually finished or just made to "look done"
- **Improves code integration** - Prompts Claude to consider refactoring opportunities and consistency
- **Smart activation** - Only runs when there are new file changes since the last review
- **Randomized questions** - Uses different self-assessment prompts each time to maintain effectiveness

## Quick Start

### New to Claudekit?

Install claudekit and enable self-review with a single command:

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks self-review
```

### Already Have Claudekit?

Add self-review to your existing project:

```bash
claudekit setup --yes --force --hooks self-review
```

Both commands will:
- Add self-review hook to your `.claude/settings.json`
- Configure it to run on Stop and SubagentStop events
- Merge with existing configuration without overwriting other hooks
- Use intelligent file change detection to avoid unnecessary reviews

### Manual Configuration

You can also manually add self-review to `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run self-review"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run self-review"
          }
        ]
      }
    ]
  }
}
```

## How It Works

### Smart Detection

The self-review hook uses transcript analysis to determine when to trigger:

1. **Change Detection**: Scans the session transcript for file modifications
2. **Last Review Tracking**: Remembers when the last self-review occurred using a unique marker
3. **Targeted Patterns**: Can be configured to only watch specific file types
4. **Intelligent Skipping**: Won't trigger if no files were changed since the last review

### Focus Areas

The hook prompts Claude to self-assess in four critical areas where AI assistants commonly take shortcuts:

#### 1. Implementation Completeness
Claude examines whether it created real functionality or just made things "look complete":
- Did it implement actual logic or just return hardcoded values?
- Are there "Not implemented yet" comments masquerading as working code?
- Did it create mock implementations that pass tests but don't actually work?
- Was work left half-finished with the appearance of completion?

#### 2. Code Quality  
Claude assesses whether it maintained code standards:
- Did it leave the code better than it found it?
- Is there duplicated logic that should be extracted?
- Does it follow existing code patterns or introduce inconsistency?
- Did it clean up after making changes work?

#### 3. Integration & Refactoring
Claude considers whether new code integrates well:
- Did it just add code on top without proper integration?
- Should new functionality be extracted into cleaner abstractions?
- Are there refactoring opportunities that would improve the overall structure?
- Were temporary workarounds left in place?

#### 4. Codebase Consistency
Claude evaluates broader impact:
- Should similar changes be applied elsewhere for consistency?
- Did it update all dependent code that might be affected?
- Could new utilities benefit other parts of the codebase?
- Is it following patterns used elsewhere in the project?

### Code Review Agent Integration

If you have the `code-review-expert` subagent installed, the self-review hook will suggest that Claude use it for deeper analysis of any concerns identified.

## Configuration

Configure the self-review hook in `.claudekit/config.json`:

```json
{
  "hooks": {
    "self-review": {
      "timeout": 30000,
      "targetPatterns": ["**/*.ts", "**/*.js", "!**/*.test.ts"],
      "focusAreas": [
        {
          "name": "Custom Focus Area",
          "questions": [
            "Your custom question 1?",
            "Your custom question 2?"
          ]
        }
      ]
    }
  }
}
```

### Configuration Options

- **`timeout`**: Maximum execution time in milliseconds (default: 30000)
- **`targetPatterns`**: Glob patterns to match files for change detection (default: all files)
- **`focusAreas`**: Custom focus areas with specific questions (**⚠️ COMPLETELY REPLACES all 4 default focus areas**)

### ⚠️ Important: Custom Focus Areas Override

When you specify `focusAreas` in the configuration, it **completely replaces** all four default focus areas (Implementation Completeness, Code Quality, Integration & Refactoring, and Codebase Consistency). Only your custom focus areas will be used.

If you want to keep some default areas and add custom ones, you must explicitly include them in your configuration.

#### Example: Keeping Some Defaults + Adding Custom Areas

```json
{
  "hooks": {
    "self-review": {
      "focusAreas": [
        {
          "name": "Implementation Completeness",
          "questions": [
            "Did you create a mock implementation just to pass tests instead of real functionality?",
            "Are there any 'Not implemented yet' placeholders or TODO comments in production code?",
            "Does the implementation actually do what it claims, or just return hardcoded values?"
          ]
        },
        {
          "name": "Security & Error Handling",
          "questions": [
            "Did you add proper input validation for user-facing functions?",
            "Are error cases handled gracefully with informative messages?",
            "Did you check for potential security vulnerabilities in your changes?"
          ]
        }
      ]
    }
  }
}
```

### Default Focus Areas Reference

For the current default focus areas and questions, see the source code:

**📋 [View Current Defaults →](https://github.com/carlrannaberg/claudekit/blob/main/cli/hooks/self-review.ts#L33-L79)**

### Target Patterns Examples

```json
{
  "hooks": {
    "self-review": {
      "targetPatterns": [
        "src/**/*.ts",           // Only TypeScript files in src
        "lib/**/*.js",           // JavaScript files in lib
        "!**/*.test.*",          // Exclude all test files
        "!**/*.spec.*",          // Exclude all spec files
        "!**/dist/**"            // Exclude build output
      ]
    }
  }
}
```

## When Claude Gets Prompted for Self-Review

The hook interrupts Claude's workflow when:
- ✅ Claude Code session ends (Stop event)
- ✅ Subagent completes work (SubagentStop event)
- ✅ Files matching target patterns were modified since last review
- ✅ Not already in a stop hook loop (prevents infinite loops)

Claude isn't prompted when:
- ❌ No file changes since last review
- ❌ Already running in a stop hook context
- ❌ No transcript available (not in Claude Code session)

## Best Practices

### Effective Configuration

- **Target production code** - Use `targetPatterns` to focus on source files, exclude tests and generated code
- **Custom focus areas** - Add project-specific questions about common AI pitfalls you've observed
- **Start with defaults** - The built-in focus areas catch the most common AI shortcuts and incomplete implementations

### Maximizing Effectiveness

- **Monitor Claude's responses** - Pay attention to what self-review catches to identify patterns
- **Adjust question difficulty** - Add more specific questions if Claude consistently misses certain types of incomplete work
- **File targeting** - Focus on critical code paths where incomplete implementations would be most problematic

### Debugging

Enable debug output to understand hook behavior:

```bash
DEBUG=true /path/to/your/session
```

This will show:
- When the hook checks for file changes
- Whether previous review markers are found
- File change detection results

## Common Issues

### Hook Not Triggering

**Problem**: Self-review doesn't run when expected

**Solutions**:
1. Check if files actually changed:
   ```bash
   claudekit-hooks run self-review
   ```
2. Verify target patterns match your files
3. Check transcript path is available in Claude Code session

### False Positives

**Problem**: Hook triggers when no meaningful changes occurred

**Solutions**:
1. Refine `targetPatterns` to exclude auto-generated files
2. Add exclusion patterns for temporary files
3. Adjust the hook to run less frequently

### Custom Questions Not Appearing

**Problem**: Configuration doesn't seem to apply

**Solutions**:
1. Verify `.claudekit/config.json` syntax with `jq . .claudekit/config.json`
2. Check file permissions on config file
3. Test with single focus area first

## Integration with Other Tools

### Code Review Expert

When `code-review-expert` is installed, use it for detailed analysis:

```
Use the Task tool with subagent_type: "code-review-expert"
Prompt: "Review the implementation completeness aspects highlighted by self-review"
```

### Quality Workflows

Combine with other quality hooks:
- Run after `typecheck-project` and `lint-project`
- Use before `create-checkpoint` to ensure clean saves
- Integrate with `/validate-and-fix` command

## Examples

### What Claude Sees

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

### Common AI Pitfalls Caught

The self-review is designed to catch patterns like:
- **Mock implementations**: Functions that return hardcoded success values instead of actual logic
- **Placeholder comments**: "TODO: Implement this later" in production code
- **Incomplete integration**: Adding new code without updating related functionality
- **Missing abstractions**: Duplicating logic instead of creating reusable utilities
- **Inconsistent patterns**: Using different approaches than existing code

This automated self-reflection helps Claude maintain higher code quality and completeness standards.