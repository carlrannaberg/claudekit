First, please specify the command type:

**Command Type:** 
- **project** - Add to current project's `.claude/commands/` directory (shared with team)
- **personal** - Add to user's `~/.claude/commands/` directory (personal use only)

If not specified, I'll ask which type to create.

---

Create a Claude Code slash command with full feature support:

## Basic Information
**Command Name:** {{COMMAND_NAME}}
**Description:** {{DESCRIPTION}}
**Usage Example:** {{EXAMPLE_USAGE}}

## YAML Frontmatter (Optional)
```yaml
allowed-tools:
  - {{ALLOWED_TOOLS}}
description: {{DESCRIPTION}}
```

## Command Content
```
{{COMMAND_TEMPLATE}}
```

## Supported Features

**Arguments & Placeholders:**
- Use `$ARGUMENTS` to accept dynamic input
- Example: `/my-command argument1 argument2`

**Bash Command Execution:**
- Use `!command` to execute bash commands before the slash command
- Command output is included in context
- Example: `!git status` or `!npm test`

**File References:**
- Use `@filename` to include file contents
- Example: `@package.json` or `@src/main.ts`

**Namespacing:**
- Organize commands in subdirectories for namespaces
- Example: `/project:frontend:component`

---

Please create this slash command by:

1. **Determine Location**
   - Ask for command type if not specified (project vs personal)
   - Create `.claude/commands/` directory if it doesn't exist
   - Create subdirectories for namespaced commands if needed

2. **Create Command File**
   - Generate `{{COMMAND_NAME}}.md` file with optional YAML frontmatter
   - Include the command template with any placeholders, bash commands, or file references
   - Ensure proper markdown formatting

3. **Provide Usage Instructions**
   - Show how to invoke the command with `/{{COMMAND_NAME}}`
   - Explain argument usage if `$ARGUMENTS` is used
   - Document any bash commands or file references
   - Explain any important usage notes