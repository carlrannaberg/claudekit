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
claudekit init

# Install recommended hooks and commands
claudekit install

# List installed components
claudekit list
```

## CLI Commands

### `claudekit init`
Initialize claudekit in your project by creating a `.claude` directory with recommended settings.

```bash
claudekit init [options]

Options:
  -f, --force               Overwrite existing .claude directory
  --skip-recommendations    Skip project analysis and recommendations
```

The init command:
- Analyzes your project to detect TypeScript, ESLint, testing frameworks, etc.
- Creates `.claude/settings.json` with recommended hooks configuration
- Sets up directories for hooks and commands
- Provides personalized recommendations based on your project

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
  claudekit install typecheck eslint   # Install specific hooks
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

### `claudekit setup`
Interactive setup wizard for first-time configuration (alternative to manual setup).

```bash
claudekit setup [options]

Options:
  --user     Configure user-level settings only
  --project  Configure project-level settings only
```

## Features

### 🛡️ Development Hooks
Automatically enforce code quality and run tests:

- **typecheck** - TypeScript type checking (blocks `any` types)
- **eslint** - ESLint code style and quality validation
- **run-related-tests** - Auto-run tests for modified files
- **validate-todo-completion** - Prevent stopping with incomplete todos
- **auto-checkpoint** - Save work automatically when Claude Code stops

### 📝 Slash Commands

#### Development Tools
- `/spec:create [feature]` - Generate comprehensive specification documents
- `/validate-and-fix` - Run quality checks and auto-fix discovered issues
- `/dev:cleanup` - Clean up debug files and development artifacts

#### AGENT.md Configuration
- `/agent:init` - Create or improve AGENT.md with intelligent codebase analysis
- `/agent:migration` - Convert other AI config files to AGENT.md

#### Git & GitHub Integration
- `/git:commit` - Create commits following project conventions with diff statistics and smart truncation
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
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [{"type": "command", "command": ".claude/hooks/typecheck.sh"}]
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
- **Conditional Logic**: `"tools:Write AND file_paths:**/*.ts"` (specific files)
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
- [File Organization](docs/file-organization.md) - Project structure best practices
- [Create Command](docs/create-command-documentation.md) - How to create custom slash commands
- [Testing Guide](tests/README.md) - Running the test suite

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