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
---

Format all TypeScript files in the project:
!`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm run format" || command -v yarn >/dev/null 2>&1 && echo "yarn format" || echo "npm run format")`
```

### Command with Arguments
```markdown
---
description: Create a new React component
allowed-tools: Write
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
---

Current dependencies:
@package.json

Outdated packages:
!`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm outdated" || command -v yarn >/dev/null 2>&1 && echo "yarn outdated" || echo "npm outdated")`

Suggest which packages to update based on the above information.
```

## YAML Frontmatter Options

### allowed-tools
Specify which tools the command can use:
```yaml
allowed-tools:
  - Write
  - Edit
  - Bash(<package-manager>:*)
```

### description
Brief description shown in help:
```yaml
description: Create a new API endpoint
```

## Using Specialized Subagents in Commands

For commands that involve domain-specific work, leverage specialized subagents for better results:

### Pattern for Subagent Integration

```markdown
---
description: Complex task with domain expertise needed  
allowed-tools: Task, Read, Bash
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

## Best Practices

1. **Keep commands focused** - Each command should do one thing well
2. **Use descriptive names** - Make it clear what the command does
3. **Follow prompting patterns** - See [Prompting Guide](prompting-guide.md) for effective command structure and syntax
4. **Document usage** - Include examples in the command file
5. **Use specialized subagents** - Delegate domain-specific work to experts when possible
6. **Test thoroughly** - Ensure bash commands and file references work
7. **Version control** - Commit project commands to share with team

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
allowed-tools: Bash(*), Edit
---

PR Checklist for $ARGUMENTS:

1. Run tests: !`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm test" || command -v yarn >/dev/null 2>&1 && echo "yarn test" || echo "npm test")`
2. Check lint: !`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm run lint" || command -v yarn >/dev/null 2>&1 && echo "yarn lint" || echo "npm run lint")`
3. Check types: !`$(command -v pnpm >/dev/null 2>&1 && echo "pnpm run typecheck" || command -v yarn >/dev/null 2>&1 && echo "yarn typecheck" || echo "npm run typecheck")`
4. Review changes: !`git diff main`

Based on the results above, fix any issues found.
```