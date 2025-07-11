---
description: Create a new Claude Code slash command with full feature support
allowed-tools: Write, Bash(mkdir:*)
---

Create a new Claude Code slash command based on the user's requirements.

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

## YAML Frontmatter Example

```yaml
---
description: Brief description of what the command does
allowed-tools: Write, Edit, Bash(npm:*)
---
```

## Features to Support

When creating the command, support these Claude Code features if requested:

**Arguments:** If the user wants dynamic input, use `$ARGUMENTS` placeholder
- Example: `/deploy $ARGUMENTS` where user types `/deploy production`

**Bash Execution:** If the user wants command output, use `!` prefix
- Example: `!git status` to include git status in the command

**File References:** If the user wants file contents, use `@` prefix
- Example: `@package.json` to include package.json contents

**Namespacing:** If the command name contains `:`, create subdirectories
- Example: `/api:create` → `.claude/commands/api/create.md`

Common tool patterns:
- `Write` - For creating files
- `Edit` - For modifying files
- `Read` - For reading files
- `Bash(npm:*)` - Run any npm command
- `Bash(git:*)` - Run any git command
- `Bash(mkdir:*)` - Create directories

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