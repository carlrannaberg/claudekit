# claudekit

A toolkit of custom commands, hooks, and utilities for Claude Code.

## Overview

claudekit is a collection of slash commands, hooks, and utilities designed to enhance your Claude Code experience. It provides powerful tools for development workflows, including git checkpointing, custom automations, and more.

## Platform & Language Support

**Currently optimized for:**
- **Platform**: macOS (Linux support available, Windows via WSL)
- **Language**: TypeScript/JavaScript projects
- **Package Manager**: npm (with yarn/pnpm compatibility)
- **Node.js**: Version 20+ recommended

Many claudekit features work across different platforms and languages, though the hooks and validation tools are specifically tuned for TypeScript development on macOS.

## Features

### Development Tools
- `/spec:create [feature/bugfix description]` - Generate comprehensive specification documents
  - Creates detailed specs in `specs/` folder
  - Includes technical design, testing strategy, and implementation phases
  - Integrates with external library documentation (requires context7 MCP server)
  - Follows structured template for consistency
- `/validate-and-fix` - Run quality checks and auto-fix discovered issues
  - Executes lint, test, and type checking in parallel
  - Analyzes errors and distributes fixes to concurrent agents
  - Ensures non-overlapping fixes to avoid conflicts
  - Verifies all issues are resolved after completion
- `/dev:cleanup` - Clean up debug files and development artifacts
  - Identifies temporary files created during development sessions
  - Proposes deletion of debug scripts, test artifacts, and status reports
  - Requires user approval before any deletion
  - Suggests .gitignore patterns to prevent future accumulation

### AGENT.md Configuration
Universal AI assistant configuration with the [AGENT.md standard](https://agent.md):
- `/agent:init` - Create or improve AGENT.md with intelligent codebase analysis
- `/agent:migration` - Convert other AI config files (CLAUDE.md, .cursorrules, etc.) to AGENT.md
- Supports 10+ AI assistants with automatic symlinks

### Command Creation
- `/create-command` - Guide for creating new slash commands
  - Prompts Claude to create project-level or personal commands
  - Includes templates for arguments, bash execution, and file references
  - Supports namespacing through subdirectories

### Git & GitHub Integration
- `/git:commit` - Create commits following project conventions
  - Analyzes project's commit style from git history
  - Checks for sensitive data and debug code
  - Updates documentation when needed
  - Documents commit conventions in CLAUDE.md
- `/gh:repo-init [name]` - Create new GitHub repository with full setup
  - Creates directory structure and initializes git
  - Creates private repository by default (for security)
  - Sets up README.md and initial commit
  - Configures remote origin and pushes to GitHub

### Git Checkpoint System
Create and restore git stash checkpoints without affecting your working directory
- `/checkpoint:create` - Save current state
- `/checkpoint:restore` - Restore previous state  
- `/checkpoint:list` - List all checkpoints
- Auto-checkpoint on Stop event

### Development Hooks
Enforce code quality and run tests automatically:
- **typecheck.sh** - TypeScript type checking (blocks `any` types)
- **eslint.sh** - ESLint code style and quality validation
- **run-related-tests.sh** - Auto-run tests for modified files
- **validate-todo-completion.sh** - Prevent stopping with incomplete todos
- **auto-checkpoint.sh** - Save work automatically when Claude Code stops

## File Organization Best Practices

claudekit promotes clean, organized codebases through standardized file organization conventions that work seamlessly with the `/dev:cleanup` command.

### Reports Directory
All project reports and documentation should be saved to a dedicated `reports/` directory:

```
your-project/
├── reports/              # All project reports and documentation
│   ├── implementation/   # Feature implementation reports
│   ├── testing/         # Test results and coverage
│   ├── performance/     # Performance analysis
│   └── validation/      # Quality and validation reports
├── src/                 # Source code
└── tests/              # Test files
```

**Report Naming Conventions:**
- Use descriptive prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Include dates in YYYY-MM-DD format
- Example: `TEST_RESULTS_2024-07-18.md`

### Temporary Files
All temporary debugging scripts and artifacts should use the `/temp` directory:

```
your-project/
├── temp/                # Temporary files (gitignored)
│   ├── debug-*.js      # Debug scripts
│   ├── analyze-*.py    # Analysis scripts
│   ├── test-results/   # Temporary test outputs
│   └── logs/           # Debug logs
└── .gitignore          # Should include /temp/
```

**Common Temporary Patterns:**
- Debug scripts: `debug-*.js`, `analyze-*.ts`
- Test files: `test-*.js`, `quick-test.py`
- Research files: `research-*.js`
- Temporary directories: `temp-*/`, `test-*/`

### Integration with Commands
- **`/agent:init`** - Automatically creates the `reports/` directory structure and adds file organization guidelines to your AGENT.md
- **`/dev:cleanup`** - Identifies and cleans up temporary files that don't follow these conventions, helping maintain a clean workspace

See the [File Organization Guide](docs/file-organization.md) for detailed examples and patterns.

## Claude Code Configuration

### The .claude Directory

Claude Code uses the `.claude` directory for configuration, with specific version control rules:

#### Version Controlled (commit these):
- **`.claude/settings.json`** - Shared team settings for hooks, tools, and environment variables
- **`.claude/commands/*.md`** - Custom slash commands available to all team members  
- **`.claude/hooks/*.sh`** - Hook scripts for automated validations and actions

#### Local Only (do NOT commit):
- **`.claude/settings.local.json`** - Personal preferences and local overrides
- **`*.local.json`** - Any local configuration files

### Settings Management

**Team Settings** (`.claude/settings.json`):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [{"type": "command", "command": ".claude/hooks/typecheck.sh"}]
      }
    ]
  },
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "600000"
  }
}
```

**Personal Settings** (`.claude/settings.local.json`):
```json
{
  "env": {
    "MY_LOCAL_API_KEY": "personal-key",
    "DEBUG_MODE": "true"
  }
}
```

### Best Practices
- Keep hooks and shared configuration in `settings.json`
- Use `settings.local.json` for personal preferences and secrets
- Make hook scripts executable: `chmod +x .claude/hooks/*.sh`
- Claude Code automatically adds `settings.local.json` to `.gitignore`

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
   - Prompt for project path to install hooks to `<project>/.claude/hooks/` (project-specific)
   - Configure your `~/.claude/settings.json` (with options to backup existing settings)

3. (Optional) Enable Context7 for enhanced `/spec` features:
   ```bash
   # Step 1: Install the Context7 MCP server globally using your package manager
   npm install -g @upstash/context7-mcp    # npm
   yarn global add @upstash/context7-mcp   # yarn
   pnpm add -g @upstash/context7-mcp       # pnpm
   
   # Step 2: Add it to Claude Code
   claude mcp add context7 context7-mcp
   ```
   This enables the `/spec` command to fetch up-to-date library documentation

## Usage

### Development Workflows

- **`/spec:create [description]`** - Generate specification documents
  ```
  /spec:create add user authentication with OAuth2
  /spec:create fix-123 memory leak in data processor
  ```
  Creates comprehensive technical specifications in the `specs/` folder with sections for design, testing, security, and implementation phases. Integrates with external library documentation for accurate technical details.

- **`/spec:validate [file]`** - Analyze specification completeness
  ```
  /spec:validate specs/hooks-system-implementation.md
  ```
  Analyzes specifications to determine if they contain sufficient detail for autonomous implementation. Evaluates intent, scope, requirements, and implementation details.

- **`/spec:decompose [file]`** - Decompose spec into manageable tasks
  ```
  /spec:decompose specs/feat-user-authentication.md
  ```
  Breaks down validated specifications into actionable tasks with proper dependencies and implementation steps.

- **`/spec:execute [file]`** - Execute specification with concurrent agents
  ```
  /spec:execute specs/feat-user-authentication.md
  ```
  Takes a validated specification and orchestrates the implementation by breaking it into tasks and distributing them to concurrent AI agents for parallel execution.

- **`/validate-and-fix`** - Run quality checks and auto-fix issues
  ```
  /validate-and-fix
  ```
  Runs all quality checks (lint, test, typecheck) in parallel, then launches concurrent agents to fix different categories of issues efficiently without conflicts.

### AGENT.md Commands

- **`/agent:init`** - Create or improve AGENT.md with intelligent analysis
  ```
  /agent:init
  ```
  Analyzes your codebase and creates or improves AGENT.md with discovered patterns, commands, and conventions. Safe to run on existing AGENT.md files.

- **`/agent:migration`** - Convert other AI config files to AGENT.md
  ```
  /agent:migration
  ```
  Converts existing AI config files (CLAUDE.md, .cursorrules, etc.) to AGENT.md with symlinks for all AI assistants. Use only when you have non-AGENT.md files.

### Creating Custom Commands

- **`/create-command`** - Create new slash commands
  ```
  /create-command
  ```
  Prompts Claude to help you create new slash commands with proper structure, including support for arguments, bash execution, and file references.

### Git & GitHub Management

- **`/git:commit`** - Create git commits following project conventions
  ```
  /git:commit
  ```
  Analyzes project commit history to follow established conventions, checks for sensitive data, updates documentation as needed, and documents conventions in CLAUDE.md.

- **`/gh:repo-init [name]`** - Create new GitHub repository
  ```
  /gh:repo-init my-new-project
  ```
  Creates a complete GitHub repository setup including directory creation, git initialization, README.md, initial commit, and remote configuration. Repositories are private by default for security.

### Git Checkpoint Commands

- **`/checkpoint:create [description]`** - Create a checkpoint of your current work
  ```
  /checkpoint:create before refactoring auth module
  ```

- **`/checkpoint:restore [number|latest]`** - Restore to a previous checkpoint
  ```
  /checkpoint:restore        # Restore to latest checkpoint
  /checkpoint:restore 3      # Restore to checkpoint at stash@{3}
  ```

- **`/checkpoint:list`** - List all available checkpoints
  ```
  /checkpoint:list
  ```

### Auto-checkpoint Hook

The Stop hook automatically creates a checkpoint when Claude Code finishes responding, ensuring you never lose work between sessions.

## MCP Integration

Some commands support optional MCP server integration for enhanced features:
- **Context7** - Provides access to up-to-date library documentation
- Used by the `/spec:create` command for accurate technical specifications  
- Installation:
  ```bash
  # Install globally using your package manager
  npm install -g @upstash/context7-mcp    # npm
  yarn global add @upstash/context7-mcp   # yarn
  pnpm add -g @upstash/context7-mcp       # pnpm
  
  # Then add to Claude Code
  claude mcp add context7 context7-mcp
  ```

## Documentation

- [Claude Code Configuration](docs/claude-code-configuration.md) - Comprehensive configuration guide
- [Checkpoint System](docs/checkpoint-system.md) - Detailed checkpoint documentation
- [Hooks Documentation](docs/hooks-documentation.md) - Information about all hooks
- [File Organization](docs/file-organization.md) - Project structure best practices
- [AGENT.md Commands](docs/agent-commands-documentation.md) - Guide for agent:init and agent:migration
- [AGENT.md Migration](docs/agent-migration-documentation.md) - Detailed migration documentation
- [Create Command](docs/create-command-documentation.md) - How to create custom slash commands
- [Spec Command](docs/spec-documentation.md) - Generate specification documents
- [MCP Setup](docs/mcp-setup.md) - Model Context Protocol configuration
- [Package Manager Support](docs/package-manager-agnostic.md) - npm, yarn, pnpm compatibility
- [Flexible Command Names](docs/flexible-command-names.md) - Works with any script naming

## Testing

Run the test suite to ensure hooks are working correctly:

```bash
cd tests
./run-tests.sh              # Run all tests
./run-tests.sh --no-integration  # Run unit tests only
./run-tests.sh --test typecheck  # Run specific test suite
```

See [tests/README.md](tests/README.md) for detailed testing documentation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Make sure to run tests before submitting.

## License

MIT License