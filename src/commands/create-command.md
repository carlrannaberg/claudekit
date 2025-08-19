---
description: Create a new Claude Code slash command with full feature support
category: ai-assistant
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

## Command Template Reference

For the complete, authoritative command template structure, see:
**[Authoritative Command Template](../../docs/guides/creating-commands.md#authoritative-command-template)**

Use this single source of truth for all template structure, field definitions, and implementation patterns.

## Features to Support

When creating the command, support these Claude Code features if requested:

**Arguments:** If the user wants dynamic input, use `$ARGUMENTS` placeholder
- Example: `/deploy $ARGUMENTS` where user types `/deploy production`

**Bash Execution:** If the user wants command output, use exclamation mark (!) prefix
- Example: `\!git status` to include git status in the command
- **Performance tip**: Combine related commands with `&&` for faster execution
- Example: `\!git status --porcelain && echo "--- PWD: $(pwd) ---" && ls -la`

**File References:** If the user wants file contents, use `@` prefix
- Example: `@package.json` to include package.json contents

**Namespacing:** If the command name contains `:`, create subdirectories
- Example: `/api:create` → `.claude/commands/api/create.md`

**Note**: For detailed field definitions, security patterns, and complete template structure, see the **[Authoritative Command Template](../../docs/guides/creating-commands.md#authoritative-command-template)** reference above.

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

**Refer to the [Authoritative Command Template](../../docs/guides/creating-commands.md#authoritative-command-template) for complete content structure and writing guidelines.**

Key principle: Write instructions TO the AI agent, not as the AI agent. Use imperative, instructional language rather than first-person descriptions of what the agent will do.

**For bash command execution patterns and examples, see the [Authoritative Command Template](../../docs/guides/creating-commands.md#authoritative-command-template) section.**