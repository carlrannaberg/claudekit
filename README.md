# claudekit

A toolkit of custom commands, hooks, and utilities for Claude Code.

## Overview

claudekit is a collection of slash commands, hooks, and utilities designed to enhance your Claude Code experience. It provides powerful tools for development workflows, including git checkpointing, custom automations, and more.

## Features

### Development Tools
- `/spec [feature/bugfix description]` - Generate comprehensive specification documents
  - Creates detailed specs in `specs/` folder
  - Includes technical design, testing strategy, and implementation phases
  - Integrates with external library documentation (requires context7 MCP server)
  - Follows structured template for consistency
- `/validate-and-fix` - Run quality checks and auto-fix discovered issues
  - Executes lint, test, and type checking in parallel
  - Analyzes errors and distributes fixes to concurrent agents
  - Ensures non-overlapping fixes to avoid conflicts
  - Verifies all issues are resolved after completion

### AGENT.md Configuration
Universal AI assistant configuration with the [AGENT.md standard](https://agent.md):
- `/agent-init` - Analyze codebase and create comprehensive AGENT.md
- `/agent-migration` - Convert existing configs (CLAUDE.md, .cursorrules, etc.) to AGENT.md
- Supports 10+ AI assistants with automatic symlinks

### Command Creation
- `/create-command` - Guide for creating new slash commands
  - Prompts Claude to create project-level or personal commands
  - Includes templates for arguments, bash execution, and file references
  - Supports namespacing through subdirectories

### Git & GitHub Integration
- `/git-commit` - Create commits following project conventions
  - Analyzes project's commit style from git history
  - Checks for sensitive data and debug code
  - Updates documentation when needed
  - Documents commit conventions in CLAUDE.md
- `/gh-repo-setup [name]` - Create new GitHub repository with full setup
  - Creates directory structure and initializes git
  - Creates private repository by default (for security)
  - Sets up README.md and initial commit
  - Configures remote origin and pushes to GitHub

### Git Checkpoint System
Create and restore git stash checkpoints without affecting your working directory
- `/checkpoint` - Save current state
- `/restore` - Restore previous state  
- `/checkpoints` - List all checkpoints
- Auto-checkpoint on Stop event

### Development Hooks
Enforce code quality and run tests automatically:
- **typecheck.sh** - TypeScript type checking (blocks `any` types)
- **eslint.sh** - ESLint code style and quality validation
- **run-related-tests.sh** - Auto-run tests for modified files
- **validate-todo-completion.sh** - Prevent stopping with incomplete todos
- **auto-checkpoint.sh** - Save work automatically when Claude Code stops

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/carlrannaberg/claudekit.git
   cd claudekit
   ```

2. Run the setup script:
   ```bash
   ./setup.sh
   ```

   The script will:
   - Install commands to `~/.claude/commands/`
   - Install hooks to `.claude/hooks/` (project-specific)
   - Configure your `~/.claude/settings.json` (with options to backup existing settings)

3. (Optional) Enable Context7 for enhanced `/spec` features:
   ```bash
   # Add Context7 to current project (local server)
   claude mcp add context7 -- npx -y @context7/mcp-server
   
   # Or use the remote server
   claude mcp add --transport sse context7 https://mcp.context7.com/sse
   ```
   This enables the `/spec` command to fetch up-to-date library documentation

## Usage

### Development Workflows

- **`/spec [description]`** - Generate specification documents
  ```
  /spec add user authentication with OAuth2
  /spec fix-123 memory leak in data processor
  ```
  Creates comprehensive technical specifications in the `specs/` folder with sections for design, testing, security, and implementation phases. Integrates with external library documentation for accurate technical details.

- **`/validate-and-fix`** - Run quality checks and auto-fix issues
  ```
  /validate-and-fix
  ```
  Runs all quality checks (lint, test, typecheck) in parallel, then launches concurrent agents to fix different categories of issues efficiently without conflicts.

### AGENT.md Commands

- **`/agent-init`** - Initialize new project with AGENT.md
  ```
  /agent-init
  ```
  Analyzes your codebase and creates a comprehensive AGENT.md file based on discovered patterns, commands, and conventions.

- **`/agent-migration`** - Migrate existing configs to AGENT.md
  ```
  /agent-migration
  ```
  Converts existing AI config files (CLAUDE.md, .cursorrules, etc.) to AGENT.md with symlinks for all AI assistants.

### Creating Custom Commands

- **`/create-command`** - Create new slash commands
  ```
  /create-command
  ```
  Prompts Claude to help you create new slash commands with proper structure, including support for arguments, bash execution, and file references.

### Git & GitHub Management

- **`/git-commit`** - Create git commits following project conventions
  ```
  /git-commit
  ```
  Analyzes project commit history to follow established conventions, checks for sensitive data, updates documentation as needed, and documents conventions in CLAUDE.md.

- **`/gh-repo-setup [name]`** - Create new GitHub repository
  ```
  /gh-repo-setup my-new-project
  ```
  Creates a complete GitHub repository setup including directory creation, git initialization, README.md, initial commit, and remote configuration. Repositories are private by default for security.

### Git Checkpoint Commands

- **`/checkpoint [description]`** - Create a checkpoint of your current work
  ```
  /checkpoint before refactoring auth module
  ```

- **`/restore [number|latest]`** - Restore to a previous checkpoint
  ```
  /restore        # Restore to latest checkpoint
  /restore 3      # Restore to checkpoint at stash@{3}
  ```

- **`/checkpoints`** - List all available checkpoints
  ```
  /checkpoints
  ```

### Auto-checkpoint Hook

The Stop hook automatically creates a checkpoint when Claude Code finishes responding, ensuring you never lose work between sessions.

## MCP Integration

Some commands support optional MCP server integration for enhanced features:
- **Context7** - Provides access to up-to-date library documentation
- Used by the `/spec` command for accurate technical specifications  
- Install in your projects with: `claude mcp add context7 -- npx -y @context7/mcp-server`

## Documentation

- [Checkpoint System](docs/checkpoint-system.md) - Detailed checkpoint documentation
- [Hooks Documentation](docs/hooks-documentation.md) - Information about all hooks
- [AGENT.md Commands](docs/agent-commands-documentation.md) - Guide for agent-init and agent-migration
- [AGENT.md Migration](docs/agent-migration-documentation.md) - Detailed migration documentation
- [Create Command](docs/create-command-documentation.md) - How to create custom slash commands
- [Spec Command](docs/spec-documentation.md) - Generate specification documents
- [MCP Setup](docs/mcp-setup.md) - Model Context Protocol configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License