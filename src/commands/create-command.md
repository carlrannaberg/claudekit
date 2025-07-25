---
description: Create a new Claude Code slash command with full feature support
category: ai-assistant
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

**Bash Execution:** If the user wants command output, use exclamation mark (!) prefix
- Example: `\!git status` to include git status in the command
- **Performance tip**: Combine related commands with `&&` for faster execution
- Example: `\!git status --porcelain && echo "--- PWD: $(pwd) ---" && ls -la`

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

### Declaring allowed-tools
- Only declare tools that Claude will explicitly invoke during command execution
- Commands prefixed with `!` execute automatically and DON'T need to be in allowed-tools
- Example: If your command includes `!git status` (automatic) and instructs Claude to run `git commit` (explicit), only `Bash(git commit:*)` needs to be in allowed-tools

### Command Execution Best Practices
- **Complex Subshells**: Avoid complex subshells in `!` commands as they can cause Claude Code's Bash tool to display "Error:" labels even when commands succeed
  - Problematic: `!(command | head -n; [ $(command | wc -l) -gt n ] && echo "...")`
  - Better: `!command | head -n`
- **Git Commands**: Always use `--no-pager` with git commands to prevent interactive mode issues
  - Example: `!git --no-pager log --oneline -5`

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

When creating command content, write instructions TO the AI agent, not as the AI agent:

❌ **Avoid first-person language**:
- "I'll launch subagents to search for..."
- "I'll clean up debug files..."
- "What I'll do next..."
- "My approach will be..."

✅ **Use instructional language**:
- "Launch subagents to search for..."
- "Clean up debug files by..."
- "Next steps:"
- "Approach:"

**Example Structure:**
```markdown
---
description: Clean up debug files and test artifacts
allowed-tools: Task, Bash, Read, LS
---

# Clean Up Development Artifacts

Remove debug files, test artifacts, and status reports created during development.

## Tasks

1. **Search for Debug Files**
   - Use Task tool to find temporary files
   - Identify debug scripts and logs
   - Locate test artifacts

2. **Clean Up Process**
   - Remove debug files safely
   - Archive important logs
   - Report cleanup summary

## Files to Clean
- Debug scripts (debug-*.js, test-*.py)
- Log files (*.log, debug.txt)
- Temporary outputs
```

This creates clear instructions for the AI agent to follow rather than the agent describing what it will do.

## Bash Command Execution in Commands

### Using the Exclamation Mark Prefix
Execute bash commands immediately when the slash command runs using the exclamation mark (!) prefix. The output is included in the command context.

**Single Command Example:**
````markdown
- Current git status: \!git status --porcelain
- Current working directory: \!pwd
- Files in current directory: \!ls -la
````

**Performance Optimization - Combined Commands:**
````markdown
- Git status and directory: \!git status --porcelain && echo "--- PWD: $(pwd) ---" && ls -la
````

### Complete Example
````markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
---

## Context

- Current git status: \!git status --porcelain
- Current git diff: \!git diff HEAD
- Current branch and recent commits: \!git branch --show-current && echo "--- Recent commits ---" && git log --oneline -10

## Your task

Based on the above changes, create a single git commit.
````

### Performance Guidelines
- **Combine related commands** with `&&` to reduce execution time
- **Use one-liners** instead of multiple separate bash commands
- **Group context gathering** into single commands where logical
- **Separate different contexts** with echo separators for clarity