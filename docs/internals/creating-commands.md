# Create Command Documentation

The `/create-command` is a prompt template that guides Claude Code to create new slash commands for you.

## Related Documentation

- [Official Commands Documentation](../official/commands.md) - Claude Code's built-in slash command features and syntax  
- [Prompting Guide](prompting-guide.md) - Patterns and best practices for effective command prompts

## Overview

This command provides Claude with structured instructions for creating new slash commands with full support for Claude Code's advanced features.

## Command Types

### Project Commands
- Stored in `.claude/commands/` in your current project
- Shared with your team through version control
- Best for project-specific workflows

### Personal Commands
- Stored in `~/.claude/commands/` in your home directory
- Available across all your projects
- Best for personal productivity tools

## Features

### 1. Dynamic Arguments

Use `$ARGUMENTS` placeholder to accept user input:

```markdown
# Example: /deploy-to environment
Deploy to $ARGUMENTS environment
```

### 2. Bash Command Execution

Execute bash commands before the slash command runs using `!` prefix:

```markdown
# Get current branch
Current branch: !`git branch --show-current`

# Run tests (detects package manager automatically)
Test results: !`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm test" || command -v yarn >/dev/null 2>&1 && echo "yarn test" || echo "npm test")`
```

#### Performance Optimization
Combine related commands with `&&` for faster execution instead of multiple separate bash calls:

```markdown
# ❌ Slower - Multiple separate executions
Git status: !`git status --short`
Git diff: !`git diff --stat`
Recent commits: !`git log --oneline -5`

# ✅ Faster - Single combined execution
Repository state: !`git status --short && echo "---" && git diff --stat && echo "---" && git log --oneline -5`
```

This reduces overhead and improves command responsiveness.

### 3. File References

Include file contents using `@` prefix:

```markdown
# Include package.json
Package info: @package.json

# Include source file
Current implementation: @src/main.ts
```

### 4. Namespacing

Organize commands in subdirectories:
- `/api:create` - Stored in `.claude/commands/api/create.md`
- `/test:unit:run` - Stored in `.claude/commands/test/unit/run.md`

## Example Commands

### Simple Command
```markdown
---
description: Format all TypeScript files
allowed-tools: Bash(npm:*, pnpm:*, yarn:*)
---

Format all TypeScript files in the project:
!`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm run format" || command -v yarn >/dev/null 2>&1 && echo "yarn format" || echo "npm run format")`
```

### Command with Arguments
```markdown
---
description: Create a new React component
argument-hint: <component-name>
allowed-tools: Write
category: workflow
---

Create a new React component named $ARGUMENTS

Component template:
```tsx
import React from 'react';

export const $ARGUMENTS: React.FC = () => {
  return <div>$ARGUMENTS Component</div>;
};
```

### Command with File Analysis
```markdown
---
description: Analyze dependencies
allowed-tools: Read, Bash(npm:*, pnpm:*, yarn:*)
category: validation
---

Current dependencies:
@package.json

Outdated packages:
!`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm outdated" || command -v yarn >/dev/null 2>&1 && echo "yarn outdated" || echo "npm outdated")`

Suggest which packages to update based on the above information.
```

## YAML Frontmatter Schema

Claudekit commands use standardized frontmatter that follows Claude Code's official schema with claudekit extensions:

```yaml
---
# Official Claude Code fields:
allowed-tools: Read, Write, Bash(git:*)
description: Brief description of what the command does
argument-hint: Expected arguments (e.g., "<feature-name>")
model: sonnet  # Optional: opus, sonnet, haiku, or specific model

# Claudekit extension (optional):
category: workflow  # Optional: workflow, claude-setup, validation
---
```

### allowed-tools (Security Control)

The `allowed-tools` field provides granular security control over what tools Claude can use during command execution:

```yaml
# Basic tool access
allowed-tools: Read, Write, Edit

# Tool with restrictions (recommended for security)
allowed-tools: Bash(git:*), Read  # Only git commands, plus Read

# Multiple tools with mixed restrictions
allowed-tools: Read, Write, Bash(npm:*, git:*), Task
```

**Important**: This differs from subagent `tools:` arrays. Command `allowed-tools` uses comma-separated strings with optional parenthetical restrictions for security.

### Other Official Fields

- **description**: Brief description shown in help and command listings
- **argument-hint**: Help text for expected arguments (e.g., `"<component-name>"`, `"[environment]"`)
- **model**: Specify which Claude model to use (`opus`, `sonnet`, `haiku`, or specific model string)

### Claudekit Extensions

- **category**: Optional organization field (`workflow`, `claude-setup`, `validation`)

## Using Specialized Subagents in Commands

For commands that involve domain-specific work, leverage specialized subagents for better results:

### Pattern for Subagent Integration

```markdown
---
description: Complex task with domain expertise needed
allowed-tools: Task, Read, Bash
category: claude-setup
---

## Task Analysis
Analyze the requirements to identify specialized domains needed.

## Subagent Delegation
- **Use specialized subagents** when tasks match expert domains (TypeScript, React, testing, databases, etc.)
- Run `claudekit list agents` to see available specialized experts
- Match task requirements to expert domains for optimal results  
- Use general-purpose approach only when no specialized expert fits

For each domain-specific task, use the Task tool to delegate to appropriate experts.
```

### Examples of Domain Matching

- **TypeScript issues** → TypeScript experts
- **React components** → React experts  
- **Database queries** → Database experts
- **Test failures** → Testing experts
- **Build problems** → Build tool experts
- **Performance issues** → Performance experts

### Commands That Should Use This Pattern

- `/validate-and-fix` - Uses specialists for different types of code issues
- `/spec:create` - Uses specialists for domain research during spec creation  
- `/spec:validate` - Uses specialists for domain-specific spec analysis
- `/spec:execute` - Uses specialists for implementation tasks
- Custom workflow commands that span multiple technical domains

## Validation

### Linting Your Commands

Claudekit provides a linter to validate your command files:

```bash
# Lint all commands in .claude/commands
claudekit lint-commands

# Lint commands in a specific directory
claudekit lint-commands path/to/commands

# Check overall project setup (not schemas)
claudekit doctor
```

The linter checks frontmatter for:
- Valid YAML syntax
- Required fields (`allowed-tools` when using bash commands)
- Correct field names and types
- Unknown or deprecated fields
- Common mistakes and typos

### Common Validation Errors

1. **Invalid YAML**: Check for proper indentation and syntax
2. **Unknown fields**: Remove any fields not in the official or claudekit schema
3. **Missing `allowed-tools`**: Required when using `!` bash commands
4. **Invalid tool names**: Ensure tool names match available tools

## Best Practices

1. **Keep commands focused** - Each command should do one thing well
2. **Use descriptive names** - Make it clear what the command does
3. **Follow prompting patterns** - See [Prompting Guide](prompting-guide.md) for effective command structure and syntax
4. **Document usage** - Include examples in the command file
5. **Use specialized subagents** - Delegate domain-specific work to experts when possible
6. **Test thoroughly** - Ensure bash commands and file references work
7. **Lint regularly** - Run `claudekit lint-commands` before committing
8. **Version control** - Commit project commands to share with team

## Creating Your First Command

1. Run `/create-command`
2. Choose project or personal
3. Provide:
   - Command name
   - Description
   - Command template
4. The command will be created and ready to use!

## Advanced Usage

### Conditional Logic
```markdown
Check if tests pass:
!`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm test" || command -v yarn >/dev/null 2>&1 && echo "yarn test" || echo "npm test") && echo "Tests passed" || echo "Tests failed"`
```

### Multiple File References
```markdown
Review these files:
- Config: @tsconfig.json
- ESLint: @.eslintrc.js
- Package: @package.json
```

### Complex Workflows
```markdown
---
description: Complete PR checklist
argument-hint: <pr-title>
allowed-tools: Bash(npm:*, pnpm:*, yarn:*, git:*), Edit
category: workflow
---

PR Checklist for $ARGUMENTS:

1. Run tests: !`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm test" || command -v yarn >/dev/null 2>&1 && echo "yarn test" || echo "npm test")`
2. Check lint: !`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm run lint" || command -v yarn >/dev/null 2>&1 && echo "yarn lint" || echo "npm run lint")`
3. Check types: !`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm run typecheck" || command -v yarn >/dev/null 2>&1 && echo "yarn typecheck" || echo "npm run typecheck")`
4. Review changes: !`git diff main`

Based on the results above, fix any issues found.
```

## Authoritative Command Template

**This section serves as THE definitive reference for all claudekit command templates. All other documentation should reference this section instead of duplicating template content.**

### Complete Command Structure Template

```markdown
---
# === OFFICIAL CLAUDE CODE FIELDS ===
# Required for any command that uses tools explicitly
allowed-tools: Read, Write, Edit, Bash(git:*, npm:*), Task

# Required - Brief description for help and listings
description: Brief description of what the command does

# Optional - Help text shown to users about expected arguments
argument-hint: "<component-name>" | "[environment]" | "Optional hint text"

# Optional - Specify which Claude model to use
model: sonnet  # Options: opus, sonnet, haiku, or specific model string

# === CLAUDEKIT EXTENSIONS ===
# Optional - Organizational category for command grouping
category: workflow  # Options: workflow, claude-setup, validation
---

# Command Title

Brief explanation of what this command does and when to use it.

## Arguments

If using `$ARGUMENTS`, explain:
- What arguments are expected
- Format requirements
- Examples of valid input

## Dynamic Content

### Bash Command Execution
Use `!` prefix for immediate command execution:

```bash
# Single command
Current status: !git status --porcelain

# Combined commands (recommended for performance)
Repository state: !git status --porcelain && echo "---" && git diff --stat && echo "---" && git log --oneline -5
```

### File References
Use `@` prefix to include file contents:

```
Current config: @package.json
Source code: @src/main.ts
```

## Task Instructions

Write clear, actionable instructions for the AI agent:

1. **First step** - What to analyze or check
2. **Second step** - What actions to take
3. **Final step** - What to report or create

Based on the above information, [specific task directive].
```

### Field Reference

#### Official Claude Code Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `allowed-tools` | When using tools | String | Comma-separated list of tools with optional restrictions |
| `description` | Yes | String | Brief description for help and command listings |
| `argument-hint` | No | String | Help text describing expected arguments |
| `model` | No | String | Claude model to use: `opus`, `sonnet`, `haiku`, or specific model |

#### Claudekit Extension Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `category` | No | String | Organization category: `workflow`, `claude-setup`, `validation` |

### Security Patterns for allowed-tools

```yaml
# Basic tool access
allowed-tools: Read, Write, Edit

# Restricted bash access (recommended)
allowed-tools: Bash(git:*), Bash(npm:*), Read
# Only allows git and npm commands, plus Read tool

# Multiple tools with mixed restrictions  
allowed-tools: Read, Write, Bash(git:*, npm:*), Task
# Allows Read/Write, restricted bash, and Task tool

# Unrestricted bash (use with caution)
allowed-tools: Bash, Read, Write
# Allows any bash command - only use when necessary
```

**Important Security Note**: The `allowed-tools` field uses comma-separated strings with optional parenthetical restrictions. This differs from subagent `tools:` arrays which use different syntax.

### Template Usage Guidelines

1. **Use this template as the single source** - Do not create duplicate templates elsewhere
2. **Reference this section** - Link to this authoritative template instead of copying
3. **Follow the structure** - Maintain consistency across all commands
4. **Update centrally** - Changes to template structure should be made here only
5. **Validate regularly** - Use `claudekit lint-commands` to check compliance

### Template Validation

This template structure is validated by `claudekit lint-commands` which checks:

- ✅ Valid YAML frontmatter syntax
- ✅ Required fields present (`description`)
- ✅ Field names match official schema + claudekit extensions  
- ✅ `allowed-tools` format when bash commands present
- ✅ No unknown or deprecated fields
- ✅ Proper field value types

### Implementation Notes

- **Bash commands** prefixed with `!` execute automatically - don't add them to `allowed-tools`
- **Interactive tools** that Claude invokes explicitly must be in `allowed-tools`  
- **Namespaced commands** (e.g., `/api:create`) create subdirectory structure
- **Argument handling** via `$ARGUMENTS` placeholder supports any user input format
- **File references** via `@filename` include full file contents in command context