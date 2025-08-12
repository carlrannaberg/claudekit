# AGENT.md
This file provides guidance to AI coding assistants working in this repository.

**Note:** CLAUDE.md is a symlink to AGENT.md in this project.

# claudekit

A toolkit of custom commands, hooks, and utilities for Claude Code. This project provides powerful development workflow tools including git checkpointing, automated code quality checks, specification generation, and AI assistant configuration management. The toolkit is designed to be project-agnostic and enhances Claude Code functionality through shell scripts, commands, and hooks.

## Build & Commands

This is a TypeScript-based toolkit. Key commands:

- **Install**: `npm install -g claudekit` - Install claudekit globally
- **Setup**: `claudekit setup` - Initialize claudekit in your project
- **Build**: `npm run build` - **IMPORTANT: Run after any code changes to compile TypeScript**
- **Symlinks**: `npm run symlinks` - Create/update symlinks from `.claude/` to `src/` for development
- **Test hooks**: Manually trigger by editing files or using Claude Code
- **Check shell syntax**: `bash -n script.sh`
- **Validate JSON**: `jq . settings.json`

**Important**: After making any changes to TypeScript files (hooks, commands, or library code), you MUST run `npm run build` before testing. The project uses compiled JavaScript from the `dist/` directory, not the source TypeScript files.

### Creating New Components

- **Subagents**: See [Subagent Development Guide](docs/subagent-development-guide.md) for creating AI assistant subagents
- **Commands**: Use `/create-command` in Claude Code for guidance
- **Hooks**: Follow self-contained patterns in `src/hooks/`

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
  - `\!command` - Execute bash commands and include output (note: exclamation mark must be escaped with backslash)
  - `@file` - Include file contents
  - `$ARGUMENTS` - User-provided arguments
- Provide clear numbered steps for Claude to follow
- Include examples for expected outputs

#### Declaring allowed-tools
- Only declare tools that Claude will explicitly invoke during command execution
- Commands prefixed with `!` execute automatically and DON'T need to be in allowed-tools
- Example: If your command includes `!git status` (automatic) and instructs Claude to run `git commit` (explicit), only `Bash(git commit:*)` needs to be in allowed-tools

#### Command Execution Best Practices
- **Complex Subshells**: Avoid complex subshells in `!` commands as they can cause Claude Code's Bash tool to display "Error:" labels even when commands succeed
  - Problematic: `!(command | head -n; [ $(command | wc -l) -gt n ] && echo "...")`
  - Better: `!command | head -n`
- **Git Commands**: Always use `--no-pager` with git commands to prevent interactive mode issues
  - Example: `!git --no-pager log --oneline -5`

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
allowed-tools: Read, Task
---

## Instructions for Claude:

1. First, check prerequisites...
2. Then, perform the main task...
3. Finally, report results...
```

## Testing

### Automated Testing Framework
Claudekit includes a comprehensive testing framework in the `tests/` directory:

```bash
# Run all tests
./tests/run-tests.sh

# Run only unit tests (skip integration)
./tests/run-tests.sh --no-integration

# Run specific test suite
./tests/run-tests.sh --test typecheck

# Run with verbose output
./tests/run-tests.sh -v
```

**Test Structure:**
- `tests/test-framework.sh` - Core testing utilities and assertions
- `tests/test-reporter.sh` - Test result reporting and formatting
- `tests/unit/` - Unit tests for individual hooks
- `tests/integration/` - Integration tests for workflows
- `tests/TESTING_PLAN.md` - Comprehensive test coverage documentation

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
echo '{"tool_input": {"file_path": "/path/to/file.ts"}}' | claudekit-hooks run typecheck-changed

# Test ESLint hook
echo '{"tool_input": {"file_path": "/path/to/file.js"}}' | claudekit-hooks run lint-changed

# Test auto-checkpoint (no input needed)
claudekit-hooks run create-checkpoint
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

### Directory Structure

**IMPORTANT**: Keep source code and configuration separate:
- `src/` - All source code (commands, hooks, etc.) lives here
- `.claude/` - Project-level configuration only (settings.json, symlinks)

```
# claudekit repository structure
src/
├── commands/                 # Source code for all commands
│   ├── agent/               # Agent-related commands
│   ├── checkpoint/          # Checkpoint commands
│   ├── config/              # Configuration commands
│   ├── git/                 # Git workflow commands
│   └── ...                  # Other command namespaces
└── hooks/                   # Source code for all hooks

.claude/
├── settings.json            # Project-specific hook configuration
├── commands/                # Symlinks to src/commands/*
└── hooks/                   # Legacy - hooks now managed by embedded system

examples/
└── settings.user.example.json  # Example user-level settings (env vars only)
```

### Installation Structure
```
~/.claude/                    # User-level installation
├── settings.json            # User settings (env vars only, NO hooks)
└── commands/                # Copied commands from src/commands/

<project>/.claude/            # Project-level
├── settings.json            # Hook configuration for this project
└── hooks/                   # Legacy - hooks now managed by embedded system
```

**Key principles:**
- Source code always goes in `src/`
- `.claude/` contains only configuration and symlinks
- User settings should contain environment variables only
- Hook configurations belong in project settings, not user settings

### File Organization & Best Practices

claudekit promotes standardized file organization that keeps projects clean and maintainable:

#### Reports Directory
All project reports and persistent documentation should be saved to `reports/`:

```
reports/                     # All project reports (tracked in git)
├── README.md               # Explains reports directory purpose
├── implementation/         # Feature implementation reports
├── testing/               # Test results and coverage
├── performance/           # Performance analysis
└── validation/            # Quality and validation reports
```

**Report Naming Conventions:**
- Use descriptive prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Include dates in YYYY-MM-DD format
- Example: `reports/testing/TEST_RESULTS_2024-07-18.md`

#### Temporary Files
All temporary debugging scripts and artifacts should go in `temp/`:

```
temp/                       # Temporary files (gitignored)
├── debug-*.js             # Debug scripts
├── analyze-*.ts           # Analysis scripts
├── test-results/          # Temporary test outputs
└── logs/                  # Debug logs
```

**Common Patterns Cleaned by `/dev:cleanup`:**
- Debug scripts: `debug-*.js`, `analyze-*.ts`
- Test files: `test-*.js`, `quick-test.ts`
- Research files: `research-*.js`
- Temporary directories: `temp-*/`, `test-*/`
- Reports outside reports/: `*_SUMMARY.md`, `*_REPORT.md`

#### Integration with Commands
- **`/agent:init`** - Creates reports/ structure and documents these conventions
- **`/dev:cleanup`** - Identifies and cleans files not following these patterns

See [File Organization Guide](docs/file-organization.md) for detailed patterns and examples.

### Hook Configuration
Edit `.claude/settings.json` using the new matcher format:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run lint-changed"}]
      },
      {
        "matcher": "Write,Edit,MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run test-changed"}]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run create-checkpoint"},
          {"type": "command", "command": "claudekit-hooks run check-todos"}
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
- **Pipe Separator**: `"Write|Edit|MultiEdit"` (matches any of these tools)
- **Universal Match**: `"*"` (matches all tools/events)

#### Common Patterns
- `"Write|Edit|MultiEdit"` - All file modification tools (pipe separator)
- `"Write,Edit,MultiEdit"` - All file modification tools (comma separator)
- `"Notebook.*"` - All Notebook-related tools
- `"*"` - All tools (for cleanup/validation hooks)

### Claude Code Settings Management

The `.claude` directory contains configuration with specific version control rules:

#### Version Controlled Files (commit these):
- `.claude/settings.json` - Shared team settings for hooks, tools, and environment
- `.claude/commands/*.md` - Custom slash commands available to all team members
- Hooks are managed via embedded system: `claudekit-hooks run <hook-name>`

#### Ignored Files (do NOT commit):
- `.claude/settings.local.json` - Personal preferences and local overrides
- Any `*.local.json` files - Personal configuration not meant for sharing

**Important Notes:**
- Claude Code automatically adds `.claude/settings.local.json` to `.gitignore`
- The shared `settings.json` should contain team-wide standards (linting, type checking, etc.)
- Personal preferences or experimental settings belong in `settings.local.json`
- Hooks are managed via the embedded system (`claudekit-hooks run <hook-name>`)
- User-level settings (`~/.claude/settings.json`) should only contain environment variables, not hooks

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
- `cli/` - TypeScript CLI source code
- `.claude/commands/` - Slash command definitions
- Hooks managed via embedded system - Event-triggered validations
- `docs/` - Detailed documentation

### Hook System
- **PostToolUse**: Triggered after file edits
- **Stop**: Triggered when Claude Code stops
- Hooks receive JSON payload via stdin
- Must output JSON response or exit with code
- **Self-contained**: All hooks include necessary functions inline (no external dependencies)

#### Self-Containment Principle
Each hook script MUST be completely self-contained:
- Include all required functions directly in the script
- Do NOT source external libraries or validation files
- Do NOT depend on external scripts
- Copy common functions into each hook that needs them
- This ensures hooks work reliably regardless of installation method or directory structure

Example: If multiple hooks need JSON parsing, each hook should have its own copy of the parsing function rather than sourcing a shared library.

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

## CLI Tools Reference

Documentation for CLI tools used in this project.

<details>
<summary><strong>stm</strong> - A simple command-line task management tool</summary>

```
Usage: stm [options] [command]

A simple command-line task management tool

Options:
  -h, --help                              display help for command
  -v, --version                           display version information

Commands:
  add [options] <title>                   Add a new task
  export [options]                        Export tasks to a file or stdout
  grep [options] <pattern>                Search tasks by pattern (supports regular expressions)
  help [command]                          display help for command
  init                                    Initialize STM repository in the current directory
  list [options]                          List tasks with optional filtering
  show [options] <id>                     Show a specific task
  update [options] <id> [assignments...]  Update a task with flexible options for metadata, content sections, and editor integration
```

</details>