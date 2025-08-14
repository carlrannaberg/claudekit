![claudekit banner](assets/banner.png)

# claudekit

A powerful CLI toolkit for enhancing Claude Code with custom commands, hooks, and development workflow utilities.

## Why Claudekit?

Claude Code is powerful, but without guardrails it can introduce issues into your codebase. Claudekit solves these problems:

### Without Claudekit
- ❌ Claude adds `any` types that break your strict TypeScript
- ❌ Work gets lost when Claude Code stops or crashes  
- ❌ Claude replaces code with comments like "// ... rest of implementation"
- ❌ Tests aren't run, breaking changes slip through
- ❌ No review of changes before finishing

### With Claudekit
- ✅ Immediately blocks `any` types and other anti-patterns
- ✅ Auto-saves git checkpoints you can restore anytime
- ✅ Detects and prevents code replacement with comments
- ✅ Runs tests automatically on file changes
- ✅ Prompts Claude to review its own work before finishing

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
# 1. Initialize claudekit in your project
claudekit setup

# 2. Try it in Claude Code - create a checkpoint
# In Claude Code, type: /checkpoint:create Initial setup

# 3. Check what's installed
claudekit list
```

After setup, claudekit automatically:
- 🛡️ Blocks TypeScript errors and `any` types when files change
- 💾 Creates git checkpoints when Claude stops
- 🧪 Runs tests for modified files
- 📋 Prompts self-review questions before finishing

## CLI Commands

### `claudekit setup`
Initialize claudekit in your project by creating a `.claude` directory with recommended settings.

```bash
claudekit setup [options]

Options:
  -f, --force               Overwrite existing .claude directory
  -y, --yes                 Automatic yes to prompts (use defaults)
  --all                     Install all features including all 24+ agents
  --skip-agents             Skip subagent installation
  --commands <list>         Comma-separated list of command IDs to install
  --hooks <list>            Comma-separated list of hook IDs to install  
  --agents <list>           Comma-separated list of agent IDs to install (e.g., typescript-expert,react-expert)
  --user                    Install in user directory (~/.claude) instead of project
  --project <path>          Target directory for project installation
  --select-individual       Use legacy individual component selection instead of groups
```

The setup command:
- Analyzes your project to detect TypeScript, ESLint, testing frameworks, etc.
- Creates `.claude/settings.json` with embedded hooks configuration
- Sets up directories for commands and installs the embedded hooks system
- Installs specialized AI subagents for enhanced domain expertise (24+ agents available)
- Provides three-step selection process: Commands → Hooks → Agents
- Supports non-interactive installation for CI/CD workflows

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

### `claudekit lint-subagents`
Lint subagent markdown files for frontmatter issues and validate against official specifications.

```bash
claudekit lint-subagents [directory] [options]

Options:
  -q, --quiet      Suppress suggestions, only show errors and warnings
  -v, --verbose    Show all files including valid ones

Examples:
  claudekit lint-subagents                    # Lint .claude/agents directory
  claudekit lint-subagents src/agents         # Lint specific directory
  claudekit lint-subagents --verbose          # Show all files, even valid ones
```

The linter validates:
- Required fields (name, description)
- Field formats and naming conventions
- Tool declarations and patterns
- CSS color values for UI theming
- Unused or unrecognized fields

### `claudekit lint-commands`
Lint slash command markdown files for frontmatter issues and validate configurations.

```bash
claudekit lint-commands [directory] [options]

Options:
  -q, --quiet      Suppress suggestions, only show errors and warnings
  -v, --verbose    Show all files including valid ones

Examples:
  claudekit lint-commands                     # Lint .claude/commands directory
  claudekit lint-commands src/commands        # Lint specific directory
  claudekit lint-commands --quiet             # Only show errors and warnings
```

The linter validates:
- Allowed-tools declarations and patterns
- MCP tool support (mcp__server__tool format)
- Model specifications (claude-3.5-sonnet, etc.)
- Argument hints for commands using $ARGUMENTS
- File reference declarations (@file usage)

### `claudekit validate`
Validate your claudekit installation and configuration.

```bash
claudekit validate [options]

Options:
  -q, --quiet      Only show errors
  -v, --verbose    Show detailed validation information

Examples:
  claudekit validate           # Check installation and configuration
  claudekit validate --verbose # Show detailed validation results
```

The validate command checks:
- Claudekit installation integrity
- Hook configuration syntax
- Command frontmatter validation
- Agent configuration validation
- File permissions and accessibility

## Hooks System

Claudekit provides an embedded hooks system that integrates seamlessly with Claude Code through the `claudekit-hooks` executable.

### Overview

The embedded hooks system allows you to run validation and automation hooks without managing individual script files. All hooks are built into the `claudekit-hooks` executable, which is installed globally with claudekit.

### Available Embedded Hooks

#### Code Quality Hooks

**typecheck-changed** / **typecheck-project**  
Runs TypeScript compiler to catch type errors. The `-changed` variant only checks modified files for faster feedback, while `-project` validates the entire codebase.
- Triggers on: File edits (changed) or manual run (project)
- Blocks on: Type errors, missing types, or invalid TypeScript syntax

**lint-changed** / **lint-project**  
Enforces code style and catches potential bugs with ESLint. Auto-fixes issues when possible if configured.
- Triggers on: File edits (changed) or manual run (project)  
- Blocks on: ESLint errors (warnings are shown but don't block)

**test-changed** / **test-project**  
Runs your test suite to ensure changes don't break functionality. The `-changed` variant runs only tests related to modified files.
- Triggers on: File edits (changed) or manual run (project)
- Blocks on: Failing tests

#### Code Pattern Detection

**check-any-changed**  
Prevents TypeScript `any` types from creeping into your codebase. Catches both explicit and implicit any usage.
- Triggers on: TypeScript file edits
- Blocks on: Use of `any` type (except in .test.ts files and specific utilities)

**check-comment-replacement**  
Detects when functional code is replaced with explanatory comments like "// ... rest of implementation".
- Triggers on: File edits
- Blocks on: Suspicious comment patterns that might indicate deleted code

**check-unused-parameters**  
Catches lazy refactoring where parameters are prefixed with underscore instead of being properly removed.
- Triggers on: File edits
- Blocks on: Function parameters starting with underscore

#### Workflow Automation

**create-checkpoint**  
Automatically saves your work as a git stash when Claude Code stops. Creates named checkpoints you can restore later.
- Triggers on: Stop event
- Creates: Git stash with timestamp and optional description
- Maintains: Configurable number of recent checkpoints (default: 10)

**check-todos**  
Ensures all TodoWrite tasks are completed before allowing Claude Code to stop.
- Triggers on: Stop event
- Blocks on: Incomplete todos in the current session

**self-review**  
Prompts Claude Code to critically evaluate its code changes before finishing. Asks targeted questions from different focus areas to catch issues.
- Triggers on: Stop event after code changes
- Asks: 3 random questions from focus areas (Refactoring, Code Quality, Consistency)
- Configurable: Custom question sets and file patterns to monitor

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

### Hook Configuration

Hooks support additional configuration through `.claudekit/config.json` in your project root. This file provides centralized hook configuration with JSON schema validation and graceful fallbacks to sensible defaults:

```json
{
  "hooks": {
    "self-review": {
      "timeout": 30000
    },
    "typecheck-changed": {
      "command": "pnpm tsc --noEmit",
      "timeout": 45000
    },
    "lint-changed": {
      "command": "pnpm eslint",
      "extensions": [".ts", ".tsx", ".js", ".jsx"],
      "fix": true,
      "timeout": 30000
    },
    "test-project": {
      "command": "npm run test:fast",
      "timeout": 50000
    },
    "create-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 15
    }
  }
}
```

#### Hook-Specific Configuration

**self-review**  
Customize which files trigger reviews and what questions get asked:
```json
"self-review": {
  "targetPatterns": [        // Which files to monitor for changes
    "**/*.ts",
    "**/*.tsx",
    "!**/*.test.*"          // Exclude test files
  ],
  "focusAreas": [           // Replace default question sets
    {
      "name": "Performance",
      "questions": [
        "Did you consider the performance impact?",
        "Are there unnecessary re-renders?",
        "Could this benefit from caching?"
      ]
    }
  ]
}
```

**typecheck-changed / typecheck-project**  
Override TypeScript compiler settings:
```json
"typecheck-changed": {
  "command": "pnpm tsc --noEmit",  // Custom command if not using npm
  "timeout": 45000                  // Increase timeout for large codebases
}
```

**lint-changed / lint-project**  
Configure ESLint behavior and auto-fixing:
```json
"lint-changed": {
  "command": "pnpm eslint",         // Custom command
  "fix": true,                      // Auto-fix issues
  "extensions": [".ts", ".tsx"],    // Which files to lint
  "timeout": 30000
}
```

**test-changed / test-project**  
Customize test execution:
```json
"test-project": {
  "command": "npm run test:fast",   // Use faster test suite
  "timeout": 60000                  // Increase timeout for integration tests
}
```

**create-checkpoint**  
Control checkpoint naming and retention:
```json
"create-checkpoint": {
  "prefix": "claude",                // Prefix for stash messages
  "maxCheckpoints": 15               // How many to keep (older ones deleted)
}
```

#### Configuration Loading

The configuration system provides robust loading with:
- **JSON Schema Validation**: Ensures configuration format is correct
- **Graceful Fallbacks**: Uses sensible defaults when config is missing or invalid
- **Debug Logging**: Set `DEBUG=true` to see configuration loading details
- **Type Safety**: Full TypeScript interfaces for each hook's configuration options

### Testing Hooks

You can test hooks outside of Claude Code using the `claudekit-hooks` command:

```bash
# Run a specific hook (reads stdin for file context)
echo '{"tool_input": {"file_path": "src/index.ts"}}' | claudekit-hooks run typecheck-changed

# Test parameter validation hook
echo '{"tool_input": {"file_path": "src/component.ts"}}' | claudekit-hooks run check-unused-parameters

# Run a hook without file context
claudekit-hooks run create-checkpoint

# List all available hooks
claudekit-hooks list

# Show hook execution statistics
claudekit-hooks stats

# View recent hook activity
claudekit-hooks recent 5
```

## Subagents

Claudekit includes a comprehensive library of 24+ specialized subagents that enhance Claude Code with deep domain expertise across 7 major categories:

### Available Agents by Category

#### 🔧 Build Tools
- **vite-expert**: Vite build optimization, ESM-first development, HMR optimization, plugin ecosystem
- **webpack-expert**: Webpack build optimization, configuration patterns, bundle analysis, code splitting

#### 🎯 Code Quality  
- **linting-expert**: Code linting, formatting, static analysis across multiple languages and tools

#### 🗄️ Database
- **database-expert**: General database performance, schema design, query optimization across SQL and NoSQL
- **postgres-expert**: PostgreSQL query optimization, JSONB operations, advanced indexing, partitioning  
- **mongodb-expert**: MongoDB document modeling, aggregation pipelines, sharding, replica sets

#### 🚀 DevOps & Infrastructure
- **devops-expert**: CI/CD pipelines, containerization, infrastructure as code, monitoring
- **docker-expert**: Multi-stage builds, image optimization, container security, Docker Compose
- **github-actions-expert**: GitHub Actions CI/CD optimization, workflow automation, custom actions

#### 🎨 Frontend Development
- **accessibility-expert**: WCAG 2.1/2.2 compliance, WAI-ARIA implementation, screen reader optimization
- **css-styling-expert**: CSS architecture, responsive design, CSS-in-JS optimization, design systems

#### 📦 Framework Specialists
- **nextjs-expert**: Next.js App Router, Server Components, performance optimization, full-stack patterns

#### 🌿 Git Version Control
- **git-expert**: Merge conflicts, branching strategies, repository recovery, performance optimization

#### ⚙️ Node.js Runtime
- **nodejs-expert**: Node.js async patterns, module systems, performance optimization, process management

#### ⚛️ React Development
- **react-expert**: React component patterns, hooks, performance optimization
- **react-performance-expert**: DevTools Profiler, memoization, Core Web Vitals, bundle optimization

#### 🧪 Testing Frameworks
- **testing-expert**: Test structure, mocking strategies, async testing, cross-framework debugging
- **jest-testing-expert**: Jest framework, advanced mocking, snapshot testing, TypeScript integration
- **vitest-expert**: Vitest testing framework with modern ESM patterns

#### 📘 TypeScript Development
- **typescript-expert**: General TypeScript expertise and best practices
- **typescript-build-expert**: TypeScript compiler configuration, build optimization, module resolution
- **typescript-type-expert**: Advanced type system specialist for complex generics, conditional types

### Installation

Subagents can be installed interactively or non-interactively:

```bash
# Interactive setup (select agents through UI)
claudekit setup

# Install all 24+ agents
claudekit setup --all

# Install specific agents non-interactively  
claudekit setup --agents typescript-expert,react-expert,testing-expert --yes

# Install frontend development stack
claudekit setup --agents react-expert,typescript-expert,css-styling-expert,accessibility-expert --yes

# Install backend development stack  
claudekit setup --agents nodejs-expert,postgres-expert,docker-expert,github-actions-expert --yes

# Install testing-focused stack
claudekit setup --agents jest-testing-expert,vitest-expert,testing-expert --yes

# Skip agents entirely
claudekit setup --skip-agents
```

**Note**: When you install a broad domain expert (e.g., `typescript-expert`), it automatically includes its specialized agents (e.g., `typescript-type-expert`, `typescript-build-expert`).

### Usage

Once installed, Claude Code automatically delegates to appropriate subagents based on your task. For example:

- "Fix this TypeScript error" → Delegates to typescript-expert
- "Optimize React rendering" → Delegates to react-performance-expert  
- "Write Playwright tests" → Delegates to playwright-expert

### Custom Agents

Create your own agents by adding markdown files to `.claude/agents/`:

```markdown
---
name: my-expert
description: My domain expertise
tools: Read, Grep, Edit
---

# System prompt here
```

See `src/agents/` for examples.

### How It Works

1. During setup, agents are copied from `src/agents/` to `.claude/agents/`
2. Claude Code automatically discovers agents in `.claude/agents/`
3. When you ask a question, Claude evaluates if any agent matches
4. If a match is found, Claude delegates to that agent's expertise
5. The agent operates in a clean context with focused knowledge

### Contributing Agents

We welcome community contributions! To add a new agent:

1. Fork the repository
2. Create your agent in `src/agents/[domain]/[name].md`
3. Add it to the agents array in `cli/commands/setup.ts`
4. Test with real scenarios
5. Submit a pull request

See [Agent Authoring Guide](src/agents/README.md) for detailed guidelines.

## Features

### 🤖 Subagents
Specialized domain expert AI assistants:
- **TypeScript Expert** - Comprehensive TypeScript/JavaScript guidance
- **Custom Agents** - Create your own domain experts
- **Automatic Delegation** - Claude routes tasks to the best expert
- **Agent Library** - Growing collection of community agents

### 🛡️ Embedded Hooks System
Automatically enforce code quality and run tests with the built-in TypeScript hooks system:

#### File-Scoped Validation (operates on changed files only)
- **typecheck-changed** - TypeScript type checking on modified files
- **check-any-changed** - Forbid `any` types in modified TypeScript files
- **check-comment-replacement** - Prevent replacing functional code with explanatory comments
- **check-unused-parameters** - Detect lazy refactoring where parameters are prefixed with underscore instead of being removed
- **lint-changed** - ESLint code style validation on modified files
- **test-changed** - Auto-run tests for modified files

#### Project-Wide Validation
- **typecheck-project** - TypeScript validation on entire project
- **lint-project** - ESLint validation on entire project  
- **test-project** - Run complete test suite

#### Action Hooks
- **create-checkpoint** - Save work automatically when Claude Code stops
- **check-todos** - Prevent stopping with incomplete todos
- **self-review** - Prompt critical self-review with configurable focus areas and intelligent duplicate prevention (supports glob patterns and custom focus areas in `.claudekit/config.json`)

#### Hook Management & Monitoring
- Built-in execution logging with statistics tracking
- Performance monitoring with `claudekit-hooks stats`
- Recent activity viewing with `claudekit-hooks recent`
- Debug mode for troubleshooting hook issues

#### Intelligent Transcript Analysis
- **TranscriptParser**: Advanced Claude Code session analysis with UI message grouping
- **Smart File Detection**: Glob pattern matching with negative patterns (e.g., exclude test files)
- **Message Windowing**: Analyzes conversation history matching Claude Code UI behavior
- **Duplicate Prevention**: Marker-based tracking prevents redundant hook triggers
- **Change Detection**: Identifies recent file modifications within configurable time windows

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
- `/agent:init` - Create or improve AGENT.md with intelligent codebase analysis and automatic subagent discovery
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
         "command": "npm run test:unit",  // Run only unit tests
         "timeout": 50000  // Optional: adjust timeout
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

## Troubleshooting

### Common Issues and Solutions

#### Hooks Not Triggering

**Problem**: Hooks don't run when files change or Claude stops.

**Solutions**:
1. Check `.claude/settings.json` exists and has correct hook configuration
2. Verify hooks are using the embedded format: `claudekit-hooks run <hook-name>`
3. Run `claudekit validate` to check configuration syntax
4. Ensure claudekit is installed globally: `npm list -g claudekit`

#### TypeScript/ESLint Not Found

**Problem**: TypeScript or ESLint hooks fail with "command not found".

**Solutions**:
1. Install missing dependencies in your project:
   ```bash
   npm install --save-dev typescript eslint
   ```
2. Configure custom commands in `.claudekit/config.json`:
   ```json
   {
     "hooks": {
       "typecheck-changed": {
         "command": "npx tsc --noEmit"  // Use npx if not in PATH
       }
     }
   }
   ```

#### Tests Failing to Run

**Problem**: Test hooks can't find or run tests.

**Solutions**:
1. Ensure test script exists in `package.json`:
   ```json
   {
     "scripts": {
       "test": "jest"  // or vitest, mocha, etc.
     }
   }
   ```
2. Configure custom test command in `.claudekit/config.json`
3. Increase timeout for large test suites:
   ```json
   {
     "hooks": {
       "test-project": {
         "timeout": 60000  // 60 seconds
       }
     }
   }
   ```

#### Checkpoints Not Being Created

**Problem**: Git checkpoints aren't saved when Claude stops.

**Solutions**:
1. Ensure you're in a git repository: `git status`
2. Check for uncommitted changes (checkpoints need changes to stash)
3. Verify the Stop hook is configured in `.claude/settings.json`
4. Check checkpoint limit hasn't been reached (default: 10)

#### Self-Review Triggering Repeatedly

**Problem**: Self-review prompts appear even without new changes.

**Solutions**:
1. This is usually a duplicate detection issue
2. Update to latest claudekit version: `npm update -g claudekit`
3. Check transcript permissions: Claude Code needs access to its transcript

#### Permission Errors

**Problem**: "EACCES" or permission denied errors.

**Solutions**:
1. Fix npm permissions (avoid using sudo):
   ```bash
   npm config set prefix ~/.npm-global
   export PATH=~/.npm-global/bin:$PATH
   ```
2. Reinstall claudekit without sudo
3. Check file permissions in `.claude/` directory

#### Hooks Running Too Slowly

**Problem**: Hooks timeout or slow down Claude Code.

**Solutions**:
1. Use `-changed` variants instead of `-project` hooks for faster feedback
2. Increase timeouts in `.claudekit/config.json`
3. Disable hooks temporarily while debugging:
   ```bash
   # Comment out hooks in .claude/settings.json
   ```
4. Run `claudekit-hooks stats` to identify slow hooks

### Getting Help

If you encounter issues not covered here:

1. Run `claudekit validate --verbose` for detailed diagnostics
2. Check debug output: `DEBUG=true claudekit-hooks run <hook-name>`
3. Search [existing issues](https://github.com/carlrannaberg/claudekit/issues)
4. Open a new issue with:
   - Your claudekit version: `claudekit --version`
   - Node.js version: `node --version`
   - Error messages and debug output
   - Relevant configuration files

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

# Create/update symlinks for development (links .claude/ to src/)
npm run symlinks

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