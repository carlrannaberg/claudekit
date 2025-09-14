# Technical overview

# Prerequisites

To understand claudekit's architecture, you should first be familiar with these Claude Code concepts:

- **[Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)** - Slash commands in markdown format that Claude interprets as instructions. Claudekit extends Claude Code with custom commands for git workflows, checkpointing, spec-driven development, and more.

- **[Subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)** - Specialized experts that handle specific technical domains. Claudekit provides 30+ expert subagents for TypeScript, React, databases, testing, and other specialized areas.

- **[Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)** - Event-triggered scripts that run automatically during Claude Code sessions. Claudekit's core automation comes from hooks that validate code, run tests, create checkpoints, and maintain code quality.

# Architecture

## Commands

Slash commands for common development tasks are organized into namespaces like `git:*`, `spec:*`, and `checkpoint:*`. Using the "!" prefix, they execute bash commands automatically to provide Claude context for task execution.

## Subagents

Claudekit offers 30+ domain-specific expert subagents, categorized across areas like TypeScript, React, databases, and testing. Each subagent contains specialized instructions along with solutions to frequently encountered problems.

## Hooks

Claudekit hooks include code quality, testing, checkpointing, codebase mapping, and more. Triggering is determined by project state and transcript history, with per-session controls.

## CLI

### claudekit

Project setup and component management CLI with interactive configuration.

### claudekit-hooks

Hook execution CLI with session management and profiling capabilities.

## Configuration

### Project Configuration
- `.claude/settings.json` - Hook configuration for this project
- `.claude/commands/` - Project-specific slash commands
- `.claude/agents/` - Project-specific subagents
- `.claudekit/config.json` - Claudekit settings (codebase map, etc.)

### User Configuration
- `~/.claude/settings.json` - User-level hook configuration
- `~/.claude/commands/` - User's personal commands
- `~/.claude/agents/` - User's personal subagents
- `~/.claudekit/config.json` - User-level claudekit settings
- `~/.claudekit/logs` - Hook execution logs
- `~/.claudekit/sessions` - Session tracking and context mappings

## Release pipeline

### Prepare release script

Bash script that automates version bumping, testing, and release commits. Uses Claude Code in non-interactive mode to analyze code changes and update README.md and CHANGELOG.md with accurate documentation.

### Release GitHub action

Automated workflow that publishes releases when version changes are detected. Validates builds, creates git tags, publishes to npm, and generates GitHub releases with extracted changelog content.

# Basic utilities

## Validate and fix issues

### Commands

[/validate-and-fix](../src/commands/validate-and-fix.md)

## Temporary file cleanup

### Commands

[/dev:cleanup](../src/commands/dev/cleanup.md)

## Thinking level

### Hooks

[thinking-level](guides/thinking-level.md)

## Agents.md

### Commands

[/agents-md:init](../src/commands/agents-md/init.md)

[/agents-md:migration](../src/commands/agents-md/migration.md)

[/agents-md:cli](../src/commands/agents-md/cli.md)

## Create commands and agents

### Commands

[/create-command](../src/commands/create-command.md)

[/create-subagent](../src/commands/create-subagent.md)

## Session-based hook control

### Commands

[/hook:disable](../src/commands/hook/disable.md)

[/hook:enable](../src/commands/hook/enable.md)

[/hook:status](../src/commands/hook/status.md)

## Bash tool timeout config

### Commands

[/config:bash-timeout](../src/commands/config/bash-timeout.md)

# Expert subagents

## Generic

[triage-expert](../src/agents/triage-expert.md)

[refactoring-expert](../src/agents/refactoring/refactoring-expert.md)

[documentation-expert](../src/agents/documentation/documentation-expert.md)

[cli-expert](../src/agents/cli-expert.md)

## Technology focused

### Build tools

[vite-expert](../src/agents/build-tools/build-tools-vite-expert.md)

[webpack-expert](../src/agents/build-tools/build-tools-webpack-expert.md)

### Code quality

[linting-expert](../src/agents/code-quality/code-quality-linting-expert.md)

### Database

[database-expert](../src/agents/database/database-expert.md)

[mongodb-expert](../src/agents/database/database-mongodb-expert.md)

[postgres-expert](../src/agents/database/database-postgres-expert.md)

### Devops

[devops-expert](../src/agents/devops/devops-expert.md)

[docker-expert](../src/agents/infrastructure/infrastructure-docker-expert.md)

[github-actions-expert](../src/agents/infrastructure/infrastructure-github-actions-expert.md)

### E2E testing

[playwright-expert](../src/agents/e2e/e2e-playwright-expert.md)

### Framework

[ai-sdk-expert](../src/agents/ai-sdk-expert.md)

[nestjs-expert](../src/agents/nestjs-expert.md)

[nextjs-expert](../src/agents/framework/framework-nextjs-expert.md)

### Frontend

[accessibility-expert](../src/agents/frontend/frontend-accessibility-expert.md)

[css-styling-expert](../src/agents/frontend/frontend-css-styling-expert.md)

### Git

[git-expert](../src/agents/git/git-expert.md)

### Node.js

[nodejs-expert](../src/agents/nodejs/nodejs-expert.md)

### React

[react-expert](../src/agents/react/react-expert.md)

[react-performance-expert](../src/agents/react/react-performance-expert.md)

### Testing

[testing-expert](../src/agents/testing/testing-expert.md)

[jest-expert](../src/agents/testing/jest-testing-expert.md)

[vitest-expert](../src/agents/testing/vitest-testing-expert.md)

### Typescript

[typescript-expert](../src/agents/typescript/typescript-expert.md)

[typescript-build-expert](../src/agents/typescript/typescript-build-expert.md)

[typescript-type-expert](../src/agents/typescript/typescript-type-expert.md)

# Workflows

## Git

[/git:ignore-init](../src/commands/git/ignore-init.md)

[/git:status](../src/commands/git/status.md)

[/git:checkout](../src/commands/git/checkout.md)

[/git:commit](../src/commands/git/commit.md)

[/git:push](../src/commands/git/push.md)

## GitHub

[/gh:repo-init](../src/commands/gh/repo-init.md)

## Code search

### Commands

[/code-review](../src/commands/code-review.md)

### Subagents

[code-review-expert](../src/agents/code-review-expert.md)

## Research

### Commands

[/research](../src/commands/research.md)

### Subagents

[research](../src/agents/research-expert.md)

## Spec-driven development

### Commands

[/spec:create](../src/commands/spec/create.md)

[/spec:validate](../src/commands/spec/validate.md)

[/spec:decompose](../src/commands/spec/decompose.md)

[/spec:execute](../src/commands/spec/execute.md)

## Checkpointing

### Hooks

[create-checkpoint](guides/checkpoint.md)

### Commands

[/checkpoint:create](../src/commands/checkpoint/create.md)

[/checkpoint:restore](../src/commands/checkpoint/restore.md)

[/checkpoint:list](../src/commands/checkpoint/list.md)

## Codebase map

### Hooks

[codebase-map](guides/codebase-map.md)

codebase-map-update

## File guard

[file-guard](guides/file-guard.md)

## Quality checks

### Hooks

check-unused-parameters

[check-comment-replacement](guides/check-comment-replacement.md)

check-todos

## Typescript type checking

### Hooks

[check-any-changed](guides/check-any-changed.md)

[typecheck-changed](guides/typescript-hooks.md)

type-check-project

## Linter checking

### Hooks

[lint-changed](guides/eslint-hooks.md)

[lint-project](guides/eslint-hooks.md)

## Test running

### Hooks

[test-changed](guides/test-hooks.md)

[test-project](guides/test-hooks.md)

## Self-review

### Hooks

[self-review](guides/self-review.md)

### Subagents

[code-review-expert](../src/agents/code-review-expert.md)

# Advanced utilities

## Doctor

claudekit doctor

## Claude files linter

claudekit lint-commands

claudekit lint-agents

## Hook profiler

claudekit-hooks profile

claudekit-hooks profile <hook>

## Exposed prompts for external use

claudekit show command <command>

claudekit show agent <subagent>
