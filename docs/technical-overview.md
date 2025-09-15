# Technical overview

# Prerequisites

To understand claudekit's architecture, you should first be familiar with these Claude Code concepts:

- **[Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)** - Slash commands in markdown format that Claude interprets as instructions. Claudekit extends Claude Code with custom commands for git workflows, checkpointing, spec-driven development, and more.

- **[Subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)** - Specialized experts that handle specific technical domains. Claudekit provides 30+ expert subagents for TypeScript, React, databases, testing, and other specialized areas.

- **[Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)** - Event-triggered scripts that run automatically during Claude Code sessions. Claudekit's core automation comes from hooks that validate code, run tests, create checkpoints, and maintain code quality.

# Architecture

## Commands

Slash commands for common development tasks are organized into namespaces like `git:*`, `spec:*`, and `checkpoint:*`. Using the "!" prefix, they execute bash commands automatically to provide Claude context for task execution. See [command creation guide](internals/creating-commands.md) for implementation details.

## Subagents

Claudekit offers 30+ domain-specific expert subagents, categorized across areas like TypeScript, React, databases, and testing. Each subagent contains specialized instructions along with solutions to frequently encountered problems. See [subagent creation guide](internals/creating-subagents.md) for implementation details.

## Hooks

Claudekit hooks include code quality, testing, checkpointing, codebase mapping, and more. Triggering is determined by project state and transcript history, with per-session controls. See [hook creation guide](internals/creating-hooks.md) for implementation details.

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

#### [/validate-and-fix](../src/commands/validate-and-fix.md)

Runs quality checks and automatically fixes discovered issues using parallel execution with specialized subagents, organized into risk-based phases.

**Tools**: `Bash, Task, TodoWrite, Read, Edit, MultiEdit`

**Context collection**: Available validation commands from AGENTS.md, package.json scripts, README.md, and common project patterns (lint, typecheck, test, build commands)

**Processing flow**:
1. Discovers and categorizes available quality checks by priority (Critical → High → Medium → Low)
2. Executes parallel validation using Bash to capture full output with file paths and error details
3. Assesses risks and maps issue dependencies before fixing
4. Applies fixes in phases: safe quick wins → functionality fixes → critical issues with confirmation
5. Creates git stash checkpoints between phases and verifies each fix immediately
6. Routes specialized tasks to domain expert subagents
7. Re-runs all checks for final verification and provides fix/remaining issue summary

**Output**: Real-time progress updates, confirmation of each successful fix, summary report of resolved issues vs. remaining manual tasks, and rollback instructions if fixes cause problems

## Temporary file cleanup

### Commands

#### [/dev:cleanup](../src/commands/dev/cleanup.md)

Analyzes project workspace for debug files, test artifacts, and status reports created during development sessions, then proposes organized cleanup with .gitignore improvements.

**Tools**: `Task, Bash(git:*), Bash(echo:*), Bash(grep:*), Bash(ls:*), Bash(pwd:*), Bash(head:*), Bash(wc:*), Bash(test:*)`

**Context collection**: Git status including ignored files, working directory contents, current path, and committed files matching cleanup patterns (debug-*, test-*, *_SUMMARY.md, temp-*, etc.)

**Processing flow**:
1. Launches subagent to analyze git status output
2. Checks working directory state to determine cleanup scope (untracked/ignored only vs. including committed files)
3. Applies safety rules to identify cleanup candidates without touching core project files
4. Categorizes findings into untracked files, committed files, and temporary directories
5. Generates deletion proposals with appropriate commands (rm vs git rm)
6. Analyzes cleanup patterns to suggest .gitignore improvements
7. Requests explicit user approval before any file operations

**Output**: Categorized cleanup proposal with file lists, specific deletion commands, suggested .gitignore patterns to prevent future accumulation, and confirmation request before proceeding

## Thinking level

### Hooks

[thinking-level](guides/thinking-level.md)

## Agents.md

### Commands

#### [/agents-md:init](../src/commands/agents-md/init.md)

Analyzes codebase structure and creates comprehensive AGENTS.md file with universal AI assistant compatibility through symlink management and directory scaffolding.

**Tools**: `Write, Bash(ln:*), Bash(mkdir:*), Bash(test:*), Bash(echo:*), Read, Glob, Task`

**Context collection**: Repository metadata (package.json, documentation, GitHub workflows, code style configs), existing AI configuration files, source code patterns, test conventions, and project structure

**Processing flow**:
1. Gathers repository information using parallel Glob patterns across multiple project types and frameworks
2. Analyzes existing AI configuration files (.cursorrules, copilot-instructions.md) for content integration
3. Examines codebase patterns to infer coding conventions, testing frameworks, and build processes
4. Creates comprehensive AGENTS.md with project overview, build commands, code style guidelines, and testing philosophy
5. Establishes reports directory structure with organized naming conventions
6. Creates symlinks for all major AI assistants (Claude, Cursor, Windsurf, Copilot, etc.)
7. Validates symlink creation and documents compatibility notes

**Output**: Complete AGENTS.md file, reports directory structure with README documentation, symlinks for universal AI assistant compatibility, and setup confirmation summary

#### [/agents-md:migration](../src/commands/agents-md/migration.md)

Performs intelligent migration from existing AI configuration files to AGENTS.md standard with conflict detection, content merging, and backup preservation strategies.

**Tools**: `Bash(mv:*), Bash(ln:*), Bash(ls:*), Bash(test:*), Bash(grep:*), Bash(echo:*), Read`

**Context collection**: All existing AI configuration files (CLAUDE.md, .cursorrules, .clinerules, copilot-instructions.md, etc.), file sizes, content analysis, and conflict identification

**Processing flow**:
1. Discovers and catalogs all AI configuration files across different assistant ecosystems
2. Analyzes content differences to detect identical files, mergeable sections, and genuine conflicts
3. Applies smart migration strategy based on content analysis (simple move, auto-merge, or user-guided resolution)
4. Handles conflicts through multiple resolution approaches (automatic merging, selective migration, or manual guidance)
5. Creates AGENTS.md as single source of truth with preserved content integrity
6. Establishes universal symlink structure for all AI assistants
7. Generates backup files for conflicting content and provides git workflow guidance

**Output**: Migrated AGENTS.md with consolidated content, complete symlink ecosystem, backup files for conflicted content, and migration status report with cleanup recommendations

#### [/agents-md:cli](../src/commands/agents-md/cli.md)

Captures CLI tool help documentation through multiple flag attempts and integrates formatted output into AGENTS.md reference section with ANSI code cleanup.

**Tools**: `Bash(*:--help), Bash(*:-h), Bash(*:help), Bash(which:*), Bash(echo:*), Bash(sed:*), Edit, Read`

**Context collection**: CLI tool availability verification, help documentation output from multiple flag variations, and existing CLAUDE.md/AGENTS.md structure

**Processing flow**:
1. Verifies CLI tool installation and PATH availability
2. Attempts help documentation capture using progressive flag strategy (--help, -h, help)
3. Processes captured output to remove ANSI escape codes while preserving structure
4. Locates or creates CLI Tools Reference section in CLAUDE.md/AGENTS.md
5. Formats documentation as collapsible section with extracted key information
6. Updates file content with alphabetically ordered tool documentation
7. Provides integration summary and formatting verification guidance

**Output**: Updated AGENTS.md with formatted CLI tool documentation, integration location confirmation, and captured content summary

## Create commands and agents

### Commands

#### [/create-command](../src/commands/create-command.md)

Generates Claude Code slash commands with full feature support including security controls, dynamic arguments, bash execution, and file references through interactive template construction.

**Tools**: `Write, Read, Bash(mkdir:*)`

**Context collection**: User requirements for command functionality, target location (project vs personal), security requirements, and dynamic content needs (arguments, bash commands, file references)

**Processing flow**:
1. Determines command scope and installation target (project `.claude/commands/` vs user `~/.claude/commands/`)
2. Gathers command specifications including name, description, required tools, and feature requirements
3. Constructs YAML frontmatter with security controls via `allowed-tools` field and optional metadata
4. Generates command content supporting Claude Code features (dynamic arguments with `$ARGUMENTS`, bash execution with `!` prefix, file inclusion with `@` prefix)
5. Handles namespaced commands by creating subdirectory structures for colon-separated names
6. Creates markdown file with proper formatting and validates frontmatter structure
7. Provides usage examples and invocation guidance

**Output**: Created command file with full Claude Code feature support, installation location confirmation, usage instructions, and example invocations

#### [/create-subagent](../src/commands/create-subagent.md)

Creates domain expert subagents following concentrated expertise principles with delegation patterns, environmental detection, and quality validation to ensure robust problem-solving capabilities.

**Tools**: `Write, Bash(mkdir:*), Read`

**Context collection**: Domain expertise requirements, problem scope assessment (5-15 related problems), tool permissions, environmental adaptation needs, and delegation hierarchy relationships

**Processing flow**:
1. Assesses domain boundaries and validates expert scope through problem enumeration and domain coverage analysis
2. Determines installation location and tool permissions with security considerations for different expert types
3. Designs environmental detection strategies using internal tools (Read, Grep, Glob) over shell commands for performance
4. Constructs delegation patterns with clear escalation paths between broad domain experts and sub-domain specialists
5. Generates YAML frontmatter with proactive trigger conditions and categorical metadata
6. Creates structured markdown content with delegation-first architecture and progressive solution approaches
7. Validates expert criteria through quality checks including domain boundary tests and naming conventions

**Output**: Domain expert subagent with concentrated expertise, delegation architecture, environmental adaptation capabilities, proactive usage triggers, and comprehensive problem-solving framework

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
