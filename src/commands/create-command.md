---
description: Create a new Claude Code slash command with full feature support
category: claude-setup
allowed-tools: Write, Read, Bash(mkdir:*)
argument-hint: "[command-name] [description]"
---

Create a new Claude Code slash command based on the user's requirements: $ARGUMENTS

For complete slash command documentation, see: https://docs.anthropic.com/en/docs/claude-code/slash-commands

First, ask the user to specify the command type:
- **project** - Add to current project's `.claude/commands/` directory (shared with team)
- **personal** - Add to user's `~/.claude/commands/` directory (personal use only)

If the user doesn't specify, ask which type to create.

Then gather the following information from the user:
- Command name
- Description
- Command content/template
- Any required tools (for frontmatter)
- Whether to use arguments, bash commands, or file references

## Command Template Structure

### YAML Frontmatter
Commands use standardized frontmatter that follows Claude Code's official schema:

```yaml
---
# Required field:
description: Brief description of what the command does

# Security control (highly recommended):
allowed-tools: Read, Write, Bash(git:*)  # Specify allowed tools

# Optional fields:
argument-hint: "<feature-name>"  # Help text for expected arguments
model: sonnet  # opus, sonnet, haiku, or specific model
category: workflow  # workflow, ai-assistant, or validation
---
```

### Security with allowed-tools
The `allowed-tools` field provides granular security control:
- Basic: `allowed-tools: Read, Write, Edit`
- Restricted bash: `allowed-tools: Bash(git:*), Read`  # Only git commands
- Multiple restrictions: `allowed-tools: Read, Write, Bash(npm:*, git:*)`

## Features to Support

When creating the command, support these Claude Code features if requested:

**Arguments:** If the user wants dynamic input, use `$ARGUMENTS` placeholder
- Example: `/deploy $ARGUMENTS` where user types `/deploy production`

**Bash Execution:** If the user wants command output, use exclamation mark (!) prefix
- Example: `!pwd > /dev/null 2>&1` or `!ls -la > /dev/null 2>&1` to include command output
- **Performance tip**: Combine related commands with `&&` for faster execution
- Example: `!pwd > /dev/null 2>&1 && ls -la 2>/dev/null | head -5 > /dev/null`

**File References:** If the user wants file contents, use `@` prefix
- Example: `@package.json` to include package.json contents

**Namespacing:** If the command name contains `:`, create subdirectories
- Example: `/api:create` → `.claude/commands/api/create.md`


## Implementation Steps

1. **Determine Location**
   - If command type not specified, ask the user (project vs personal)
   - For project commands: create `.claude/commands/` directory if needed
   - For personal commands: create `~/.claude/commands/` directory if needed
   - Create subdirectories for namespaced commands (e.g., `api/` for `/api:create`)

2. **Create Command File**
   - Generate `{{COMMAND_NAME}}.md` file in the appropriate directory
   - Include YAML frontmatter if the command needs specific tools
   - Add the command content with any placeholders, bash commands, or file references
   - Ensure proper markdown formatting

3. **Show the User**
   - Display the created command file path
   - Show how to invoke it with `/{{COMMAND_NAME}}`
   - Explain any argument usage if `$ARGUMENTS` is included
   - Provide a brief example of using the command

## Command Content Guidelines

Key principle: Write instructions TO the AI agent, not as the AI agent. Use imperative, instructional language rather than first-person descriptions of what the agent will do.

### Example Command Templates

**Simple Command:**
```markdown
---
description: Create a React component
allowed-tools: Write
---

Create a new React component named $ARGUMENTS

Component template:
\```tsx
import React from 'react';

export const $ARGUMENTS: React.FC = () => {
  return <div>$ARGUMENTS Component</div>;
};
\```
```

**Command with Bash and File Analysis:**
```markdown
---
description: Analyze dependencies
allowed-tools: Read, Bash(npm:*, yarn:*, pnpm:*)
---

Current dependencies:
@package.json

Outdated packages:
!npm outdated 2>/dev/null || echo "No outdated packages"

Suggest which packages to update based on the above information.
```