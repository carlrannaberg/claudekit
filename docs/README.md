# claudekit Documentation

A comprehensive toolkit of custom commands, hooks, and utilities for Claude Code. This documentation provides everything you need to install, configure, and extend claudekit for your development workflow.

## Quick Start

New to claudekit? Start here:

- **[Installation Guide](getting-started/installation.md)** - Get up and running in minutes
- **[Configuration](getting-started/configuration.md)** - Basic setup and common configurations
- **[Troubleshooting](getting-started/troubleshooting.md)** - Common issues and solutions

## Documentation Structure

### 📚 Getting Started
Essential documentation for new users:

| Document | Description |
|----------|-------------|
| [Installation](getting-started/installation.md) | Step-by-step installation and setup |
| [Configuration](getting-started/configuration.md) | Hook configuration and project setup |
| [Troubleshooting](getting-started/troubleshooting.md) | Common problems and solutions |

### 📖 Guides
In-depth guides for specific workflows:

| Guide | Description |
|-------|-------------|
| [Creating Commands](guides/creating-commands.md) | Build custom slash commands for Claude Code |
| [Creating Hooks](guides/creating-hooks.md) | Develop automated validation and workflow hooks |
| [Hook Profiling](guides/hook-profiling.md) | Measure and optimize hook performance and output |
| [Thinking Level](guides/thinking-level.md) | Configure AI reasoning enhancement levels |
| [File Guard](guides/file-guard.md) | Protect sensitive files from AI access |
| [Codebase Map](guides/codebase-map.md) | Automated project context for AI assistants |
| [Creating Subagents](guides/creating-subagents.md) | Build specialized AI assistants for specific tasks |
| [Checkpoint System](guides/checkpoint.md) | Git checkpointing and safe development practices |
| [Spec Workflow](guides/spec-workflow.md) | Specification-driven development with AI |
| [Validation Workflow](guides/validation-workflow.md) | Automated code quality and validation |
| [Project Organization](guides/project-organization.md) | Best practices for file and directory structure |
| [AI Migration](guides/ai-migration.md) | Migrating from other AI coding tools |

### 🔧 Reference
Quick reference documentation:

| Reference | Description |
|-----------|-------------|
| [CLI Reference](reference/cli.md) | Command-line tools and utilities |
| [Slash Commands](reference/commands.md) | Complete list of Claude Code slash commands |
| [Hooks Reference](reference/hooks.md) | All available hooks and their configurations |
| [Subagents Reference](reference/subagents.md) | Available AI subagents and their specialties |

### 📋 Official Documentation
Official Claude Code documentation relevant to claudekit:

| Document | Description |
|----------|-------------|
| [Commands](official/commands.md) | Official Claude Code slash commands documentation |
| [Hooks](official/hooks.md) | Official Claude Code hooks system documentation |
| [Subagents](official/subagents.md) | Official Claude Code subagents documentation |

### 🔗 Integrations
Third-party integrations and external tools:

| Integration | Description |
|-------------|-------------|
| [GitHub Actions](integrations/github-actions.md) | CI/CD pipeline integration |
| [MCP Context7](integrations/mcp-context7.md) | AI documentation context system |
| [NPM Publishing](integrations/npm-publishing.md) | Package management and publishing |
| [Oracle](integrations/oracle.md) | Advanced AI query and analysis system |
| [STM Tasks](integrations/stm-tasks.md) | Task management integration |

### 🏗️ Internals
Technical details and architecture:

| Document | Description |
|----------|-------------|
| [Claude Code Config](internals/claude-code-config.md) | Configuration system internals |
| [Package Managers](internals/package-managers.md) | Multi-package manager support |
| [Principles](internals/principles.md) | Design principles and architecture decisions |

## Key Features

### 🚀 Slash Commands
Powerful commands for common development tasks:
- `/checkpoint:create` - Create git checkpoints for safe experimentation
- `/git:status` - Intelligent git status with insights
- `/spec:create` - Generate comprehensive feature specifications
- `/validate-and-fix` - Automated code quality checks and fixes

### 🔄 Automated Hooks
Real-time validation as you code:
- **TypeScript** - Type checking and 'any' type detection
- **ESLint** - Linting with auto-fix support
- **Testing** - Run relevant tests on changes
- **Checkpoints** - Auto-save progress points

### 🤖 AI Subagents
Specialized AI assistants for specific domains:
- **Build Tools**: webpack-expert, vite-expert
- **TypeScript**: typescript-expert, typescript-build-expert
- **React**: react-expert, react-performance-expert
- **Testing**: jest-testing-expert, playwright-expert
- **Infrastructure**: docker-expert, github-actions-expert

## Common Workflows

### Starting a New Feature
```bash
# Create a checkpoint
/checkpoint:create Starting feature X

# Generate specification
/spec:create user authentication system

# Hooks automatically validate code as you work
```

### Code Quality & Commits
```bash
# Validate and fix issues
/validate-and-fix

# Review changes
/git:status

# Create conventional commit
/git:commit
```

### Working with Subagents
Use specialized AI assistants for domain-specific tasks:
```bash
# React performance issues
Use Task tool with subagent_type: "react-performance-expert"

# Complex TypeScript types
Use Task tool with subagent_type: "typescript-type-expert"

# Webpack configuration
Use Task tool with subagent_type: "webpack-expert"
```

## Architecture Overview

claudekit is built around three core components:

1. **Commands** - Slash commands that provide reusable prompts and workflows
2. **Hooks** - Event-driven automation that runs during development
3. **Subagents** - Specialized AI assistants with deep domain expertise

All components are designed to be:
- **Self-contained** - No external dependencies
- **Project-agnostic** - Work with any codebase
- **Configurable** - Adapt to your specific needs
- **Extensible** - Easy to add custom functionality

## Configuration Files

### Project-Level Configuration
- `.claude/settings.json` - Hook configuration and project settings
- `.claude/commands/` - Project-specific slash commands

### User-Level Configuration
- `~/.claude/settings.json` - Global environment variables
- `~/.claude/commands/` - Personal slash commands

## Support and Contributing

### Getting Help
- Check [Troubleshooting](getting-started/troubleshooting.md) for common issues
- Review relevant guides for your specific use case
- Use the `/oracle` command in Claude Code for complex queries

### Contributing
- Follow the patterns established in existing commands and hooks
- Test thoroughly with `npm run build` after changes
- Use self-contained scripts that don't require external dependencies
- Document new features with clear examples

## Environment Requirements

- **OS**: macOS/Linux with bash 4.0+
- **Required**: Git, Node.js/npm
- **Optional**: GitHub CLI, jq (with fallbacks provided)

## Next Steps

1. **New Users**: Start with [Installation](getting-started/installation.md)
2. **Customization**: Learn [Creating Commands](guides/creating-commands.md) and [Creating Hooks](guides/creating-hooks.md)
3. **Advanced Usage**: Explore [Subagents](guides/creating-subagents.md) and [Integrations](integrations/)
4. **Development**: Review [Internals](internals/) for technical details

---

*claudekit enhances Claude Code with powerful automation, intelligent workflows, and specialized AI assistance. Start with the basics and gradually add more advanced features as your needs grow.*