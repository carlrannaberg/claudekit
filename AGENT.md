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
- `/spec:validate [file]` - Analyze specification completeness
- `/spec:decompose [file]` - Decompose spec into TaskMaster tasks
- `/spec:execute [file]` - Execute specification with concurrent agents
- `/validate-and-fix` - Run quality checks and auto-fix
- `/git:commit` - Smart commit following conventions
- `/git:status` - Intelligent git status analysis with insights
- `/git:push` - Safe push with pre-flight checks
- `/gh:repo-init [name]` - Create GitHub repository
- `/agent:init` - Initialize AGENT.md file
- `/agent:migration` - Migrate from other AI configs
- `/create-command` - Guide for new commands
- `/agent:cli [tool]` - Capture CLI tool help and add to AGENT.md
- `/dev:cleanup` - Clean up debug files and development artifacts

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
- **Important**: Slash commands are prompts/instructions for Claude, not shell scripts
- Markdown files with YAML frontmatter serve as "reusable prompts" (per Claude Code docs)
- Specify `allowed-tools` for security in frontmatter
- Use `$ARGUMENTS` for user input
- Support dynamic content:
  - `!command` - Execute bash commands and include output
  - `@file` - Include file contents
  - `$ARGUMENTS` - User-provided arguments
- Provide clear numbered steps for Claude to follow
- Include examples for expected outputs

### How Slash Commands Work
According to Claude Code documentation, slash commands are instructions that Claude interprets:
1. User types `/command-name [arguments]`
2. Claude reads the corresponding `.md` file from `.claude/commands/`
3. Claude interprets the markdown as a prompt with instructions to follow
4. Claude executes the instructions using available tools (Bash, Read, etc.)
5. Claude can interact with the user during execution for clarifications

Example command structure:
```yaml
---
description: Brief description of what the command does
allowed-tools: Read, Task, Bash(task-master:*)
---

## Instructions for Claude:

1. First, check prerequisites...
2. Then, perform the main task...
3. Finally, report results...
```

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
Edit `.claude/settings.json` using the new matcher format:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [{"type": "command", "command": ".claude/hooks/typecheck.sh"}]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
        "hooks": [{"type": "command", "command": ".claude/hooks/eslint.sh"}]
      },
      {
        "matcher": "Write,Edit,MultiEdit",
        "hooks": [{"type": "command", "command": ".claude/hooks/run-related-tests.sh"}]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": ".claude/hooks/auto-checkpoint.sh"},
          {"type": "command", "command": ".claude/hooks/validate-todo-completion.sh"}
        ]
      }
    ]
  }
}
```

#### Matcher Patterns
The new hook matcher format supports:
- **Exact Match**: `"Write"` (matches only Write tool)
- **Multiple Tools**: `"Write,Edit,MultiEdit"` (OR logic)
- **Regex Patterns**: `"Notebook.*"` (matches Notebook tools)
- **Conditional Logic**: `"tools:Write AND file_paths:**/*.ts"` (specific files)
- **Universal Match**: `"*"` (matches all tools/events)

#### Common Patterns
- `"tools:Write AND file_paths:**/*.ts"` - TypeScript files only
- `"tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}"` - JavaScript/TypeScript files
- `"Write,Edit,MultiEdit"` - File modification tools
- `"*"` - All tools (for cleanup/validation hooks)

### Development Guidelines
1. Always provide fallback methods for tools
2. Log to `~/.claude/` for debugging
3. Use clear, actionable error messages
4. Support incremental/cached operations
5. Follow existing patterns in the codebase
6. Test thoroughly in Claude Code environment

### Testing Philosophy
**When tests fail, fix the code, not the test.**

Example from this project:
- Tests revealed that the TypeScript 'any' detection pattern had false positives with comments and `expect.any()`
- Wrong approach: Comment out or remove the failing test cases
- Right approach: Improve the pattern to exclude comments and valid test utilities while still catching forbidden 'any' types

Key principles:
1. **Tests should be meaningful** - Avoid tests that always pass regardless of behavior
2. **Test actual functionality** - Call the functions being tested, don't just check side effects
3. **Failing tests are valuable** - They reveal bugs or missing features
4. **Fix the root cause** - When a test fails, fix the underlying issue, don't hide the test
5. **Test edge cases** - Tests that reveal limitations help improve the code
6. **Document test purpose** - Each test should include a comment explaining why it exists and what it validates

Bad test example (always passes):
```bash
# This "test" passes no matter what happens
if has_eslint; then
  test_pass  # ESLint found
else
  test_pass  # No ESLint found
fi
```

Good test example (actually tests behavior):
```bash
# Purpose: Verify has_eslint returns false when no config files exist.
# This ensures ESLint validation is skipped for projects without ESLint setup.
test_start "has_eslint without config"
rm -f .eslintrc.json
if ! has_eslint; then
  test_pass
else
  test_fail "Should return false without config"
fi
```

When environment changes, the purpose comment helps determine:
- **Keep the test** if the purpose is still valid (e.g., "ensure graceful fallback")
- **Update the test** if the behavior should change (e.g., "now should return true")
- **Delete the test** if the functionality no longer exists (e.g., "remove deprecated feature")

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
- **Self-contained**: All hooks include necessary functions inline (no external dependencies)

### Command System
- Markdown files define commands
- Frontmatter specifies permissions
- Shell expansions for dynamic content
- Support for arguments via `$ARGUMENTS`

## Naming Conventions

### Avoid "Enhanced" Prefixes
When modifying or creating features, do not prefix names with "Enhanced", "Improved", "Better", etc.:
- ❌ "Enhanced Orchestration Strategy"
- ❌ "Improved Error Handling"  
- ❌ "Better Validation Process"
- ✅ "Orchestration Strategy"
- ✅ "Error Handling"
- ✅ "Validation Process"

Use descriptive, direct names that focus on what the feature does, not that it's an improvement over something else.

## Status Reporting Guidelines

### Avoid Verbose Status Updates
Do not provide unnecessary status reporting or progress commentary:

❌ **Avoid**:
- "I'll analyze the current git status for you."
- "Let me gather the details efficiently:"
- "I see there are changes. Let me gather the details:"
- "Now I'm going to run the build..."
- "Processing your request..."
- "Working on it..."

✅ **Do**:
- Show results directly
- Focus on the actual output and findings
- Get straight to the point
- Let actions speak for themselves

### Command Execution
- Skip explanatory preambles about what you're going to do
- Don't announce each step unless specifically requested
- Provide concise, actionable information
- Focus on results, not process descriptions

### Preventing AGENT.md Pollution
Never add status updates, progress reports, changelog entries, or implementation logs to AGENT.md:

❌ **Never add to AGENT.md**:
- Changelog-style entries about what was changed
- "Added feature X to command Y"
- "Updated Z with new functionality"
- "Fixed issue in A"
- "Updated commands with new validation"
- Implementation summaries or progress reports
- Lists of completed tasks or modifications

✅ **Keep AGENT.md clean**:
- Focus on guidelines and instructions for AI assistants
- Document patterns and conventions only
- Provide examples and templates
- Maintain reference information only

AGENT.md should remain focused on guidance for AI assistants, not become a log of what was implemented or changed.