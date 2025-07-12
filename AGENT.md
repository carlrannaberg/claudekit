# AGENT.md
This file provides guidance to AI coding assistants working in this repository.

**Note:** CLAUDE.md is a symlink to AGENT.md in this project.

# claudekit

A toolkit of custom commands, hooks, and utilities for Claude Code. This project provides powerful development workflow tools including git checkpointing, automated code quality checks, specification generation, and AI assistant configuration management. The toolkit is designed to be project-agnostic and enhances Claude Code functionality through shell scripts, commands, and hooks.

## Build & Commands

This is a bash-based toolkit with no traditional build process. Key commands:

- **Install**: `./setup.sh` - Installs claudekit to user and project directories
- **Test hooks**: Manually trigger by editing files or using Claude Code
- **Check shell syntax**: `bash -n script.sh`
- **Validate JSON**: `jq . settings.json`

### Slash Commands (in Claude Code)
- `/checkpoint:create [description]` - Create a git stash checkpoint
- `/checkpoint:restore [n]` - Restore to a previous checkpoint
- `/checkpoint:list` - List all claude checkpoints
- `/spec:create [feature]` - Generate comprehensive specification
- `/spec:check [file]` - Analyze specification completeness
- `/validate-and-fix` - Run quality checks and auto-fix
- `/git:commit` - Smart commit following conventions
- `/gh:repo-init [name]` - Create GitHub repository
- `/agent:init` - Initialize AGENT.md file
- `/agent:migration` - Migrate from other AI configs
- `/create-command` - Guide for new commands
- `/agent:cli [tool]` - Capture CLI tool help and add to AGENT.md

## Code Style

### Shell Scripts
- **Shebang**: Always use `#!/usr/bin/env bash`
- **Error handling**: Start with `set -euo pipefail`
- **Headers**: Include descriptive comment blocks
```bash
################################################################################
# Script Name                                                                  #
# Brief description of what the script does                                   #
################################################################################
```

### JSON Parsing
- Support both `jq` and fallback methods:
```bash
# Try jq first
if command -v jq &> /dev/null; then
    FILE_PATH=$(echo "$CLAUDE_PAYLOAD" | jq -r '.file_path // empty')
else
    # Fallback to sed/grep
    FILE_PATH=$(echo "$CLAUDE_PAYLOAD" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
fi
```

### Path Handling
- Always expand `~` to home directory
- Use absolute paths when possible
- Handle spaces in file paths

### Error Messages
- Use structured block format:
```bash
echo "████ Error: Clear Title ████"
echo ""
echo "Detailed explanation of the issue"
echo ""
echo "How to fix:"
echo "1. Specific step"
echo "2. Another step"
```

### Exit Codes
- `0` = Success/allow operation
- `2` = Block with error message
- Other = Unexpected errors

### Command Structure
- Markdown files with YAML frontmatter
- Specify `allowed-tools` for security
- Use `$ARGUMENTS` for user input
- Provide clear numbered steps
- Include examples for outputs

## Testing

### Manual Testing
- Test hooks by triggering their events in Claude Code
- Test commands using `/command-name` in Claude Code
- Verify shell scripts with `bash -n`
- Check JSON validity with `jq`

### Hook Testing
- **PostToolUse**: Edit a file to trigger
- **Stop**: Use Ctrl+C or Stop button
- Check logs in `~/.claude/hooks.log`

### Command Line Hook Testing
Test hooks directly without Claude Code:
```bash
# Test TypeScript hook
echo '{"tool_input": {"file_path": "/path/to/file.ts"}}' | ~/.claude/hooks/typecheck.sh

# Test ESLint hook
echo '{"tool_input": {"file_path": "/path/to/file.js"}}' | ~/.claude/hooks/eslint.sh

# Test auto-checkpoint (no input needed)
~/.claude/hooks/auto-checkpoint.sh
```
See `docs/hooks-documentation.md` for detailed testing examples.

## Security

### Tool Restrictions
- Commands must specify `allowed-tools` in frontmatter
- Example: `allowed-tools: Bash(git stash:*), Read`
- Never allow unrestricted bash access

### Git Operations
- Always use non-destructive operations
- Prefer `git stash apply` over `git stash pop`
- Create backups before destructive changes
- Never expose or commit sensitive information

## Git Commit Conventions
Based on analysis of this project's git history:
- Format: Conventional commits with type prefix (feat:, fix:, test:, docs:, refactor:, chore:)
- Tense: Imperative mood (e.g., "add", "fix", "update", not "added", "fixed", "updated")
- Length: Subject line typically under 72 characters
- Structure: `type: brief description` or `type(scope): brief description`
- Common types used:
  - `feat:` - New features
  - `fix:` - Bug fixes
  - `test:` - Test-related changes
  - `docs:` - Documentation updates
  - `refactor:` - Code refactoring
  - `chore:` - Maintenance tasks
- No ticket/task codes observed in recent history

### Path Security
- Validate file paths exist before operations
- Handle path traversal safely
- Expand `~` properly to avoid issues

## Configuration

### Environment Requirements
- **OS**: macOS/Linux with bash 4.0+
- **Required**: Git
- **Optional**:
  - Node.js/npm (for TypeScript/ESLint hooks)
  - GitHub CLI (for gh-repo-setup)
  - jq (for JSON parsing, with fallbacks)

### Installation Structure
```
~/.claude/                    # User-level installation
├── commands/                 # Global commands
└── hooks/                    # Global hooks

<project>/.claude/            # Project-level
├── settings.json            # Hook configuration
├── commands/                # Project commands
└── hooks/                   # Project hooks
```

### Hook Configuration
Edit `.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": ["typecheck.sh", "eslint.sh"],
    "Stop": ["auto-checkpoint.sh"]
  }
}
```

### Development Guidelines
1. Always provide fallback methods for tools
2. Log to `~/.claude/` for debugging
3. Use clear, actionable error messages
4. Support incremental/cached operations
5. Follow existing patterns in the codebase
6. Test thoroughly in Claude Code environment

## Architecture

### Project Structure
- `setup.sh` - Installation script
- `.claude/commands/` - Slash command definitions
- `.claude/hooks/` - Event-triggered scripts
- `docs/` - Detailed documentation

### Hook System
- **PostToolUse**: Triggered after file edits
- **Stop**: Triggered when Claude Code stops
- Hooks receive JSON payload via stdin
- Must output JSON response or exit with code

### Command System
- Markdown files define commands
- Frontmatter specifies permissions
- Shell expansions for dynamic content
- Support for arguments via `$ARGUMENTS`