![claudekit banner](assets/banner.png)

# claudekit

A powerful CLI toolkit for enhancing Claude Code with custom commands, hooks, and development workflow utilities.

## Installation

```bash
npm install -g claudekit
```

Or using other package managers:
```bash
yarn global add claudekit
pnpm add -g claudekit
```

## Quick Start

```bash
# Initialize claudekit in your project
claudekit setup

# Install recommended hooks and commands
claudekit install

# List installed components
claudekit list
```

## CLI Commands

### `claudekit setup`
Initialize claudekit in your project by creating a `.claude` directory with recommended settings.

```bash
claudekit setup [options]

Options:
  -f, --force               Overwrite existing .claude directory
  --skip-recommendations    Skip project analysis and recommendations
```

The setup command:
- Analyzes your project to detect TypeScript, ESLint, testing frameworks, etc.
- Creates `.claude/settings.json` with embedded hooks configuration
- Sets up directories for commands and installs the embedded hooks system
- Provides personalized recommendations based on your project

### `claudekit-hooks`
Manage and execute embedded hooks system.

```bash
claudekit-hooks <command> [options]

Commands:
  run <hook>      Run a specific hook
  list            List all available hooks
  stats           Show hook execution statistics
  recent [limit]  Show recent hook executions (default: 20)

Options:
  --config <path>  Path to config file (default: .claudekit/config.json)
  --debug          Enable debug logging

Examples:
  claudekit-hooks run typecheck-changed    # Run TypeScript validation on changed files
  claudekit-hooks list                     # List all available embedded hooks
  claudekit-hooks stats                    # Show hook performance statistics
  claudekit-hooks recent 10                # Show last 10 hook executions
```

### `claudekit install`
Install hooks and commands into your project.

```bash
claudekit install [component...] [options]

Options:
  -t, --type <type>    Component type: hook, command, or all (default: "all")
  -c, --category <category>  Filter by category (e.g., validation, git)
  --essential          Install only essential components
  --dry-run           Show what would be installed without installing

Examples:
  claudekit install                    # Install all recommended components
  claudekit install typecheck eslint   # Install specific components
  claudekit install --type command     # Install all commands
  claudekit install --essential        # Install only essential components
```

### `claudekit list`
List installed hooks, commands, and current configuration.

```bash
claudekit list [options]

Options:
  -t, --type <type>    List specific type: hooks, commands, or all (default: "all")
  -v, --verbose        Show detailed information
```

Output includes:
- Installed hooks with descriptions and file sizes
- Available commands organized by namespace
- Current settings.json configuration


## Hooks System

Claudekit provides an embedded hooks system that integrates seamlessly with Claude Code through the `claudekit-hooks` executable.

### Overview

The embedded hooks system allows you to run validation and automation hooks without managing individual script files. All hooks are built into the `claudekit-hooks` executable, which is installed globally with claudekit.

### Available Embedded Hooks

#### Hook Naming Convention

Claudekit uses clear suffixes to indicate hook scope:
- `-changed`: Operates only on files that were created or modified
- `-project`: Operates on the entire project
- Action verbs (e.g., `create-checkpoint`): Perform specific actions

#### File-Scoped Hooks (operate on changed files only)
- **typecheck-changed** - TypeScript type checking on modified files
- **check-any-changed** - Forbid `any` types in modified TypeScript files
- **lint-changed** - ESLint validation on modified JavaScript/TypeScript files
- **test-changed** - Run tests related to modified files

#### Project-Wide Hooks (operate on entire project)
- **typecheck-project** - TypeScript type checking on entire project
- **lint-project** - ESLint validation on entire project
- **test-project** - Run complete test suite

#### Action Hooks
- **create-checkpoint** - Automatically create git checkpoints when Claude Code stops
- **check-todos** - Ensure all todos are completed before stopping

### Hook Configuration

Hooks are configured in `.claude/settings.json` using the `claudekit-hooks run <hook>` command format:

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

### Testing Hooks

You can test hooks outside of Claude Code using the `claudekit-hooks` command:

```bash
# Run a specific hook (reads stdin for file context)
echo '{"tool_input": {"file_path": "src/index.ts"}}' | claudekit-hooks run typecheck-changed

# Run a hook without file context
claudekit-hooks run create-checkpoint

# List all available hooks
claudekit-hooks list

# Show hook execution statistics
claudekit-hooks stats

# View recent hook activity
claudekit-hooks recent 5
```

## Features

### 🛡️ Embedded Hooks System
Automatically enforce code quality and run tests with the built-in TypeScript hooks system:

#### File-Scoped Validation (operates on changed files only)
- **typecheck-changed** - TypeScript type checking on modified files
- **check-any-changed** - Forbid `any` types in modified TypeScript files  
- **lint-changed** - ESLint code style validation on modified files
- **test-changed** - Auto-run tests for modified files

#### Project-Wide Validation
- **typecheck-project** - TypeScript validation on entire project
- **lint-project** - ESLint validation on entire project  
- **test-project** - Run complete test suite

#### Action Hooks
- **create-checkpoint** - Save work automatically when Claude Code stops
- **check-todos** - Prevent stopping with incomplete todos

#### Hook Management & Monitoring
- Built-in execution logging with statistics tracking
- Performance monitoring with `claudekit-hooks stats`
- Recent activity viewing with `claudekit-hooks recent`
- Debug mode for troubleshooting hook issues

### 📝 Slash Commands

#### Development Tools
- `/spec:create [feature]` - Generate comprehensive specification documents
- `/spec:validate [file]` - Analyze specification completeness and quality
- `/spec:decompose [file]` - Decompose specification into TaskMaster tasks
- `/spec:execute [file]` - Execute specification with concurrent agents
- `/validate-and-fix` - Run quality checks and auto-fix discovered issues
- `/dev:cleanup` - Clean up debug files and development artifacts
- `/config:bash-timeout [duration] [scope]` - Configure bash command timeout values

#### AGENT.md Configuration
- `/agent:init` - Create or improve AGENT.md with intelligent codebase analysis
- `/agent:migration` - Convert other AI config files to AGENT.md
- `/agent:cli [tool]` - Capture CLI tool help documentation and add it to AGENT.md

#### Git & GitHub Integration
- `/git:commit` - Create commits following project conventions with diff statistics and smart truncation
- `/git:status` - Intelligently analyze git status and provide insights about current state
- `/git:push` - Push commits to remote with safety checks and branch management
- `/gh:repo-init [name]` - Create new GitHub repository with full setup

#### Git Checkpoint System
- `/checkpoint:create [description]` - Save current state
- `/checkpoint:restore [n]` - Restore previous state
- `/checkpoint:list` - List all checkpoints

#### Command Creation
- `/create-command` - Interactive guide for creating new slash commands

## Configuration

### Settings Structure

claudekit uses a two-level configuration system:

**Project Settings** (`.claude/settings.json`):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
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

**User Settings** (`~/.claude/settings.json`):
```json
{
  "env": {
    "GITHUB_TOKEN": "your-token",
    "OPENAI_API_KEY": "your-key"
  }
}
```

### Hook Matchers

The hook system supports sophisticated matching patterns:

- **Exact Match**: `"Write"` (matches only Write tool)
- **Multiple Tools**: `"Write,Edit,MultiEdit"` (OR logic)
- **Regex Patterns**: `"Notebook.*"` (matches all Notebook tools)
- **Conditional Logic**: `"Write|Edit|MultiEdit"` (specific files)
- **Universal Match**: `"*"` (matches all tools/events)

## Platform & Language Support

**Currently optimized for:**
- **Platform**: macOS/Linux (Windows via WSL)
- **Language**: TypeScript/JavaScript projects
- **Package Manager**: npm (with yarn/pnpm compatibility)
- **Node.js**: Version 20+ required

## MCP Integration

Some commands support optional MCP server integration:

### Context7 (for documentation access)
```bash
# Install globally
npm install -g @upstash/context7-mcp

# Add to Claude Code
claude mcp add context7 context7-mcp
```

Enables `/spec:create` to fetch up-to-date library documentation.

## Documentation

- [Claude Code Configuration](docs/claude-code-configuration.md) - Comprehensive configuration guide
- [Checkpoint System](docs/checkpoint-system.md) - Detailed checkpoint documentation
- [Hooks Documentation](docs/hooks-documentation.md) - Information about all hooks
- [Hooks Reference](docs/hooks-reference.md) - Complete hook configuration options
- [Migration from Shell Hooks](docs/migration-from-shell-hooks.md) - Migrating from shell script hooks
- [File Organization](docs/file-organization.md) - Project structure best practices
- [Create Command](docs/create-command-documentation.md) - How to create custom slash commands
- [Testing Guide](tests/README.md) - Running the test suite

## Troubleshooting

### Common Issues

#### Test Suite Timeout in Claude Code

**Problem:** The `test-project` hook fails with a timeout when running tests through Claude Code's Stop hook.

**Cause:** Claude Code has a 60-second timeout limit for hooks. Test suites that include building and running comprehensive tests often exceed this limit.

**Solutions:**

1. **Configure a faster test command** in `.claudekit/config.json`:
   ```json
   {
     "hooks": {
       "test-project": {
         "testCommand": "npm run test:unit"  // Run only unit tests
       }
     }
   }
   ```

2. **Disable the test-project hook** if your test suite is too large:
   - Remove `test-project` from your `.claude/settings.json` Stop hooks
   - Run tests manually when needed with `npm test`

3. **Create a custom fast test script** in your `package.json`:
   ```json
   {
     "scripts": {
       "test:fast": "vitest run --reporter=dot --bail=1"
     }
   }
   ```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/carlrannaberg/claudekit.git
cd claudekit

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:commands

# Run with coverage
npm run test:coverage
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Run tests (`npm test`)
4. Submit a Pull Request

## License

MIT License