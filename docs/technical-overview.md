# Technical overview

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
  - [Commands](#commands)
  - [Subagents](#subagents)
  - [Hooks](#hooks)
  - [CLI](#cli)
  - [Configuration](#configuration)
  - [Release pipeline](#release-pipeline)
- [Basic utilities](#basic-utilities)
  - [Validate and fix issues](#validate-and-fix-issues)
  - [Temporary file cleanup](#temporary-file-cleanup)
  - [Thinking level](#thinking-level)
  - [Agents.md](#agentsmd)
  - [Create commands and agents](#create-commands-and-agents)
  - [Session-based hook control](#session-based-hook-control)
  - [Bash tool timeout config](#bash-tool-timeout-config)
- [Expert subagents](#expert-subagents)
  - [Generic](#generic)
  - [Technology focused](#technology-focused)
- [Workflows](#workflows)
  - [Git](#git-1)
  - [GitHub](#github)
  - [Code review](#code-review)
  - [Research](#research)
  - [Spec-driven development](#spec-driven-development)
  - [Checkpointing](#checkpointing)
  - [Codebase map](#codebase-map)
  - [File guard](#file-guard)
  - [Quality checks](#quality-checks)
  - [Typescript type checking](#typescript-type-checking)
  - [Linting](#linting)
  - [Test running](#test-running)
  - [Self-review](#self-review)
- [Advanced utilities](#advanced-utilities)
  - [Doctor](#doctor)
  - [Claude files linter](#claude-files-linter)
  - [Hook profiler](#hook-profiler)
  - [Exposed prompts for external use](#exposed-prompts-for-external-use)

# Prerequisites

To understand claudekit's architecture, you should first be familiar with these Claude Code concepts:

- **[Commands](https://docs.claude.com/en/docs/claude-code/slash-commands)** - Slash commands in markdown format that Claude interprets as instructions. Claudekit extends Claude Code with custom commands for git workflows, checkpointing, spec-driven development, and more.

- **[Subagents](https://docs.claude.com/en/docs/claude-code/sub-agents)** - Specialized experts that handle specific technical domains. Claudekit provides 30+ expert subagents for TypeScript, React, databases, testing, and other specialized areas.

- **[Hooks](https://docs.claude.com/en/docs/claude-code/hooks)** - Event-triggered scripts that run automatically during Claude Code sessions. Claudekit's core automation comes from hooks that validate code, run tests, create checkpoints, and maintain code quality.

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

[`scripts/prepare-release.sh`](../scripts/prepare-release.sh) - Bash script that automates version bumping, testing, and release commits. Uses Claude Code in non-interactive mode to analyze code changes and update README.md and CHANGELOG.md with accurate documentation.

### Release GitHub action

[`.github/workflows/release.yml`](../.github/workflows/release.yml) - Automated workflow that publishes releases when version changes are detected. Validates builds, creates git tags, publishes to npm, and generates GitHub releases with extracted changelog content.

# Basic utilities

## Validate and fix issues

Project validation and automated issue resolution.

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

Repository cleanup of temporary files and debug artifacts.

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

Automatic keyword injection that replaces the need to manually prompt Claude with thinking keywords.

```
User Input: "Help me fix this bug"
     │
     ▼
[Check configured level: 2]
     │
     ▼
[Map level to keyword: "megathink"]
     │
     ▼
[Prepend to prompt: "megathink\nHelp me fix this bug"]
     │
     ▼
[Send to Claude processing]
```

**Architecture**: Level configuration (0-3) maps to thinking keywords: 0=none, 1=think, 2=megathink, 3=ultrathink. Keywords are prepended with newline before Claude receives the prompt. Token usage increases with level: level 2 approximately 2.5x baseline, level 3 approximately 8x baseline.

### Hooks

#### [thinking-level](guides/thinking-level.md)

Prepends thinking keywords to user prompts before processing.

**Triggers**: `UserPromptSubmit` events with universal matcher

**Implementation**: Maps configured level (0-3) to thinking keywords (none, think, megathink, ultrathink), prepends keyword with newline to user prompt, validates level bounds with fallback to default level 2

**Behavior**: Modifies prompts before Claude processing without changing user interface, configurable performance impact (level 2: ~2.5x tokens, level 3: ~8x tokens), operates transparently during normal workflow

## Agents.md

AGENTS.md management: creation, migration from existing configs, and enhancement with CLI tool documentation.

### Commands

#### [/agents-md:init](../src/commands/agents-md/init.md)

Analyzes codebase structure and creates AGENTS.md file with universal AI assistant compatibility through symlink management and directory scaffolding.

**Tools**: `Write, Bash(ln:*), Bash(mkdir:*), Bash(test:*), Bash(echo:*), Read, Glob, Task`

**Context collection**: Repository metadata (package.json, documentation, GitHub workflows, code style configs), existing AI configuration files, source code patterns, test conventions, and project structure

**Processing flow**:
1. Gathers repository information using parallel Glob patterns across multiple project types and frameworks
2. Analyzes existing AI configuration files (.cursorrules, copilot-instructions.md) for content integration
3. Examines codebase patterns to infer coding conventions, testing frameworks, and build processes
4. Creates AGENTS.md with project overview, build commands, code style guidelines, and testing philosophy
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

Creating Claude Code slash commands and subagents.

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

**Output**: Domain expert subagent with concentrated expertise, delegation architecture, environmental adaptation capabilities, proactive usage triggers, and problem-solving framework

## Session-based hook control

Hook execution control during Claude Code sessions that preserves repository settings while allowing individual preferences.

```
Repository Config: .claude/settings.json
     │        [hooks: enabled globally]
     ▼
[Claude Code Session Start]
     │
     ▼
~/.claudekit/sessions/uuid.json
     │  {
     │    "disabledHooks": ["typecheck"],
     │    "sessionId": "abc123"
     │  }
     ▼
[Session-specific behavior]
     │  • typecheck disabled for this user
     │  • repository config unchanged
     ▼
[Session End] ──► [State cleared]
                       │
                       ▼
                 [Back to repository defaults]
```

**Architecture**: Session state is tracked in `~/.claudekit/sessions/[uuid].json` files that override repository settings without modifying them. When Claude Code sessions end, the temporary state is cleared and behavior reverts to repository defaults.

### Commands

#### [/hook:disable](../src/commands/hook/disable.md)


https://github.com/user-attachments/assets/794fec2a-d952-4f37-ab91-55c730e8a47a


Disables specified hook execution for the current Claude Code session without affecting global configuration.

**Implementation**: Creates session-specific override in UUID-tracked file that claudekit-hooks consults before executing hooks.

**Tools**: `Bash(claudekit-hooks:*)`

**Context collection**: Hook name or partial name from user arguments

**Processing flow**:
1. Accepts hook name or partial name as argument
2. Calls claudekit-hooks disable with provided hook identifier
3. Updates session-level hook state to prevent execution

**Output**: Confirmation of hook disabled status for current session

#### [/hook:enable](../src/commands/hook/enable.md)

Re-enables previously disabled hook execution for the current Claude Code session.

**Tools**: `Bash(claudekit-hooks:*)`

**Context collection**: Hook name or partial name from user arguments

**Processing flow**:
1. Accepts hook name or partial name as argument
2. Calls claudekit-hooks enable with provided hook identifier
3. Updates session-level hook state to restore execution

**Output**: Confirmation of hook enabled status for current session

#### [/hook:status](../src/commands/hook/status.md)

Shows current execution status of hooks within the active Claude Code session.

**Tools**: `Bash(claudekit-hooks:*)`

**Context collection**: Optional hook name or partial name from user arguments for filtering

**Processing flow**:
1. Accepts optional hook name or partial name as argument
2. Calls claudekit-hooks status with provided filter or shows all hooks
3. Retrieves session-level hook execution states

**Output**: Hook status report showing enabled/disabled state for current session

## Bash tool timeout config

Bash command timeout configuration for Claude Code settings.

### Commands

#### [/config:bash-timeout](../src/commands/config/bash-timeout.md)

Configures bash command timeout values in Claude Code settings.json files with duration parsing and scope selection for user or project level.

**Tools**: `Read, Edit, Write`

**Context collection**: Current user and project settings files, timeout duration and scope arguments, existing configuration preservation requirements

**Processing flow**:
1. Parses duration argument (minutes, seconds) and optional scope (user/project)
2. Converts duration specifications to milliseconds for Claude Code environment variables
3. Determines target settings file path based on scope selection
4. Reads existing settings to preserve hooks and other configuration
5. Updates or adds env section with BASH_DEFAULT_TIMEOUT_MS and BASH_MAX_TIMEOUT_MS values
6. Sets maximum timeout to double the default value with minimum 20-minute ceiling
7. Writes updated settings maintaining JSON structure and existing configuration

**Output**: Updated settings file with new timeout values, configuration confirmation, and scope-specific application details

# Expert subagents

## Generic

#### [code-search](../src/agents/code-search.md)


https://github.com/user-attachments/assets/90a3f8b1-8536-46df-839f-784f3cedec30


Codebase search agent that uses parallel tool calls instead of the main agent's sequential searches. Responses are optimized for brevity by providing relative file paths instead of absolute paths.

**Tools**: `Read, Grep, Glob, LS`

**Specialization**: Simultaneous pattern variations and naming convention searches, relative path output to reduce token generation, constrained response format returning only relevant paths with optional short descriptions, and tool-restricted focus preventing analysis distraction

#### [triage-expert](../src/agents/triage-expert.md)

Context gathering and initial problem diagnosis specialist for routing issues to appropriate domain experts.

**Tools**: `Read, Grep, Glob, Bash, Edit`

**Specialization**: Root cause analysis, comprehensive context gathering, expert routing recommendations, and actionable problem assessment before specialized intervention

#### [refactoring-expert](../src/agents/refactoring/refactoring-expert.md)

Systematic code refactoring and code smell detection specialist with structural optimization focus.

**Tools**: `Read, Grep, Glob, Edit, MultiEdit, Bash`

**Specialization**: Code smell detection, refactoring techniques without changing external behavior, structural optimization, and proven refactoring patterns application

#### [documentation-expert](../src/agents/documentation/documentation-expert.md)

Documentation structure, cohesion, and information architecture specialist for developer experience optimization.

**Tools**: `Read, Grep, Glob, Bash, Edit, MultiEdit`

**Specialization**: Documentation anti-pattern detection, content organization, user experience optimization, navigation improvement, and readability enhancement

#### [cli-expert](../src/agents/cli-expert.md)

Command-line interface and npm package development specialist with Unix philosophy and project root detection.

**Tools**: All available tools

**Specialization**: CLI tool development, npm package creation, argument parsing, interactive/non-interactive modes, automatic project root detection, and Unix-style tool implementation

## Technology focused

### Build tools

#### [vite-expert](../src/agents/build-tools/build-tools-vite-expert.md)

Vite build optimization specialist with ESM-first development and HMR optimization expertise.

**Tools**: `Read, Edit, MultiEdit, Bash, Grep, Glob`

**Specialization**: ESM-first development patterns, HMR optimization, plugin ecosystem, production builds, library mode, SSR configuration, and modern ESM patterns

#### [webpack-expert](../src/agents/build-tools/build-tools-webpack-expert.md)

Webpack build optimization specialist with configuration patterns and bundle analysis expertise.

**Tools**: `Read, Edit, MultiEdit, Bash, Grep, Glob`

**Specialization**: Configuration patterns, bundle analysis, code splitting, module federation, performance optimization, custom plugins/loaders, and modern architecture patterns

### Code quality

#### [linting-expert](../src/agents/code-quality/code-quality-linting-expert.md)

Code linting, formatting, and static analysis specialist across multiple languages and tools.

**Tools**: All available tools

**Specialization**: Static analysis patterns, coding standards enforcement, linter configuration, formatting consistency, and cross-language quality validation

### Database

#### [database-expert](../src/agents/database/database-expert.md)

Cross-database optimization and schema design specialist with performance analysis expertise.

**Tools**: `Bash(psql:*), Bash(mysql:*), Bash(mongosh:*), Bash(sqlite3:*),
Read, Grep, Edit`
**Specialization**: Database performance optimization, schema design, query performance analysis, connection management, transaction handling across PostgreSQL, MySQL, MongoDB, and SQLite with ORM integration

#### [mongodb-expert](../src/agents/database/database-mongodb-expert.md)

MongoDB specialist with document modeling and aggregation pipeline optimization expertise.

**Tools**: `Bash(mongosh:*), Bash(mongo:*), Read, Grep, Edit`

**Specialization**: Document modeling, aggregation pipeline optimization, sharding strategies, replica set configuration, connection pool management, indexing strategies, and NoSQL performance patterns

#### [postgres-expert](../src/agents/database/database-postgres-expert.md)

PostgreSQL specialist with advanced indexing and JSONB operations expertise.

**Tools**: `Bash(psql:*), Bash(pg_dump:*), Bash(pg_restore:*), Bash
(pg_basebackup:*), Read, Grep, Edit`
**Specialization**: Query optimization, JSONB operations, advanced indexing strategies, partitioning, connection management, and database administration with PostgreSQL-specific expertise

### Devops

#### [devops-expert](../src/agents/devops/devops-expert.md)

DevOps and infrastructure specialist with comprehensive CI/CD and deployment expertise.

**Tools**: All available tools

**Specialization**: CI/CD pipelines, containerization, orchestration, infrastructure as code, monitoring, security, performance optimization, and operational excellence

#### [docker-expert](../src/agents/infrastructure/infrastructure-docker-expert.md)

Docker containerization specialist with multi-stage builds and image optimization expertise.

**Tools**: All available tools

**Specialization**: Multi-stage builds, image optimization, container security, Docker Compose orchestration, production deployment patterns, networking, and container architecture

#### [github-actions-expert](../src/agents/infrastructure/infrastructure-github-actions-expert.md)

GitHub Actions specialist with workflow automation and custom actions development expertise.

**Tools**: All available tools

**Specialization**: CI/CD pipeline optimization, workflow automation, custom actions development, security best practices, and scalable software delivery

### E2E testing

#### [playwright-expert](../src/agents/e2e/e2e-playwright-expert.md)

Playwright end-to-end testing specialist with cross-browser automation and visual regression testing expertise.

**Tools**: `Bash, Read, Write, Edit, MultiEdit, Grep, Glob`

**Specialization**: Cross-browser automation, visual regression testing, CI/CD integration, test architecture, and reliable test patterns

### Framework

#### [ai-sdk-expert](../src/agents/ai-sdk-expert.md)

Vercel AI SDK specialist with streaming and model integration expertise.

**Tools**: All available tools

**Specialization**: Streaming implementation, model integration, tool calling, hooks, state management, edge runtime, prompt engineering, and production AI application patterns

#### [nestjs-expert](../src/agents/nestjs-expert.md)

Nest.js framework specialist with module architecture and dependency injection expertise.

**Tools**: All available tools

**Specialization**: Module architecture, dependency injection, middleware, guards, interceptors, testing with Jest/Supertest, TypeORM/Mongoose integration, and Passport.js authentication

#### [nextjs-expert](../src/agents/framework/framework-nextjs-expert.md)

Next.js framework specialist with App Router and Server Components expertise.

**Tools**: `Read, Grep, Glob, Bash, Edit, MultiEdit, Write`

**Specialization**: App Router patterns, Server Components, performance optimization, full-stack patterns, routing architecture, hydration optimization, and deployment strategies

### Frontend

#### [accessibility-expert](../src/agents/frontend/frontend-accessibility-expert.md)

WCAG compliance and accessibility specialist with screen reader optimization expertise.

**Tools**: `Read, Grep, Glob, Bash, Edit, MultiEdit, Write`

**Specialization**: WCAG 2.1/2.2 compliance, WAI-ARIA implementation, screen reader optimization, keyboard navigation, accessibility testing automation, and inclusive design patterns

#### [css-styling-expert](../src/agents/frontend/frontend-css-styling-expert.md)

CSS architecture and modern styling specialist with responsive design expertise.

**Tools**: `Read, Edit, MultiEdit, Grep, Glob, Bash, LS`

**Specialization**: CSS architecture, responsive design, CSS-in-JS optimization, performance optimization, accessibility integration, design systems, and cross-browser compatibility

### Git

#### [git-expert](../src/agents/git/git-expert.md)

Git workflow and repository management specialist with merge conflict resolution expertise.

**Tools**: All available tools

**Specialization**: Merge conflict resolution, branching strategies, repository recovery, performance optimization, collaboration patterns, and repository management

### Node.js

#### [nodejs-expert](../src/agents/nodejs/nodejs-expert.md)

Node.js runtime and ecosystem specialist with async patterns and performance optimization expertise.

**Tools**: `Read, Write, Edit, Bash, Grep, Glob`

**Specialization**: Async patterns, module systems, performance optimization, filesystem operations, process management, networking, event loop debugging, memory leak detection, and stream processing

### React

#### [react-expert](../src/agents/react/react-expert.md)

React component patterns and hooks specialist with state management expertise.

**Tools**: `Read, Grep, Glob, Bash, Edit, MultiEdit, Write`

**Specialization**: Component patterns, hooks architecture, state management, React patterns, component design, and modern React development practices

#### [react-performance-expert](../src/agents/react/react-performance-expert.md)

React performance optimization specialist with DevTools Profiler and memoization expertise.

**Tools**: `Read, Grep, Glob, Bash, Edit, MultiEdit, Write`

**Specialization**: DevTools Profiler analysis, memoization strategies, Core Web Vitals optimization, bundle optimization, virtualization, performance bottleneck identification, and render optimization

### Testing

#### [testing-expert](../src/agents/testing/testing-expert.md)

Cross-framework testing specialist with mocking strategies and coverage analysis expertise.

**Tools**: `Read, Edit, Bash, Grep, Glob`

**Specialization**: Test structure design, mocking strategies, async testing patterns, coverage analysis, framework migration, testing architecture, and cross-framework debugging

#### [jest-expert](../src/agents/testing/jest-testing-expert.md)

Jest testing framework specialist with advanced mocking and TypeScript integration expertise.

**Tools**: All available tools

**Specialization**: Jest framework mastery, advanced mocking strategies, snapshot testing, async patterns, TypeScript integration, and performance optimization

#### [vitest-expert](../src/agents/testing/vitest-testing-expert.md)

Vitest testing framework specialist with modern testing patterns and configuration expertise.

**Tools**: All available tools

**Specialization**: Vitest configuration, modern testing patterns, ESM integration, performance optimization, and TypeScript testing workflows

### Typescript

#### [typescript-expert](../src/agents/typescript/typescript-expert.md)

General TypeScript and JavaScript development specialist with modern language features expertise.

**Tools**: All available tools

**Specialization**: TypeScript language features, JavaScript ecosystem integration, modern development patterns, type safety implementation, and full-stack TypeScript development

#### [typescript-build-expert](../src/agents/typescript/typescript-build-expert.md)

TypeScript build system specialist with compiler configuration and module resolution expertise.

**Tools**: `Read, Bash, Glob, Grep, Edit, MultiEdit, Write`

**Specialization**: Compiler configuration, build optimization, module resolution, build tool integration, performance tuning, and TypeScript toolchain management

#### [typescript-type-expert](../src/agents/typescript/typescript-type-expert.md)

Advanced TypeScript type system specialist for complex generics and type-level programming.

**Tools**: All available tools

**Specialization**: Complex generics, conditional types, template literals, type inference, performance optimization, recursive types, brand types, utility type authoring, and advanced type system error patterns

# Workflows

## Git

Git operations: branches, commits, status, and .gitignore management.

### Commands

#### [/git:ignore-init](../src/commands/git/ignore-init.md)

Initializes or updates .gitignore with Claude Code specific patterns and common development artifact exclusions.

**Tools**: `Read, Edit, Write, Bash(echo:*), Bash(cat:*), Bash(test:*)`

**Context collection**: Current .gitignore file contents, existing patterns, and Claude Code configuration patterns

**Processing flow**:
1. Checks for existing .gitignore file and analyzes current patterns
2. Identifies missing Claude Code specific patterns (local settings, temporary files)
3. Adds development artifact patterns (debug scripts, test directories, temporary folders)
4. Preserves existing entries and comments while adding new sections
5. Organizes patterns by category with descriptive comments

**Output**: Updated .gitignore file with Claude Code patterns and development artifacts, report of added patterns

#### [/git:status](../src/commands/git/status.md)

https://github.com/user-attachments/assets/bcc330b6-0a99-4faa-b1b3-a26a0739630b

Analyzes git repository state with intelligent insights about changes, branch status, and suggested actions.

**Tools**: `Bash(git:*), Task`

**Context collection**: Git status output, diff statistics, branch tracking information, recent commit history, and cached changes

**Processing flow**:
1. Executes combined git commands for status analysis
2. Parses output sections separated by markers for different git information
3. Groups modified files by type (documentation, code, tests, configuration)
4. Analyzes branch relationship to remote and tracking status
5. Evaluates change patterns and suggests appropriate actions
6. Provides insights about commit grouping and critical file modifications

**Output**: Concise status summary with grouped file changes, branch status, uncommitted changes analysis, and actionable suggestions

#### [/git:checkout](../src/commands/git/checkout.md)

Creates or switches branches with conventional naming patterns, intelligent base selection, and branch type-specific configuration.

**Tools**: `Bash(git:*), Read`

**Context collection**: Current branch status, available local and remote branches, branch argument specification, and working directory state

**Processing flow**:
1. Parses branch argument to determine type and name following conventional patterns
2. Validates branch name against git conventions and suggests corrections
3. Checks branch existence locally and on remote with appropriate checkout strategy
4. Applies branch type-specific configuration (hotfix from main, feature from develop)
5. Sets up upstream tracking and provides setup guidance
6. Handles special cases for different branch types with appropriate base selection

**Output**: Branch creation or switch confirmation, upstream tracking status, and next step suggestions

#### [/git:commit](../src/commands/git/commit.md)

https://github.com/user-attachments/assets/9e1a2c15-e577-402c-a982-cd932117a77a

Creates commits following project conventions with change validation, documentation updates, and quality checks.

**Tools**: `Bash(git:*), Bash(echo:*), Bash(head:*), Bash(wc:*), Bash(test:*), Bash([:[*), Bash(grep:*), Read, Edit, Task`

**Context collection**: Git status and changes, commit history for convention analysis, project documentation files, and previous git:status results for efficiency

**Processing flow**:
1. Reuses recent git:status results or executes combined git analysis commands
2. Reviews changes for sensitive information, debugging code, and temporary files
3. Analyzes existing commit history to determine or apply project conventions
4. Identifies documentation update requirements based on changes
5. Executes quality checks (tests, linting) if available and needed
6. Stages relevant files and creates commit with conventional message format
7. Verifies commit success and considers post-commit actions

**Output**: Created commit with conventional message, quality check results, documentation update confirmations, and post-commit guidance

#### [/git:push](../src/commands/git/push.md)

Pushes commits to remote with safety checks, branch tracking setup, and intelligent conflict resolution suggestions.

**Tools**: `Bash(git:*), Task`

**Context collection**: Working directory status, branch tracking information, remote repository details, and commits pending push

**Processing flow**:
1. Executes safety check commands to assess repository state
2. Validates uncommitted changes and branch tracking status
3. Determines appropriate push strategy (tracked branch vs new branch with upstream)
4. Handles special cases (diverged branches, force push requirements, protected branches)
5. Executes push with appropriate flags and upstream configuration
6. Provides error handling and resolution suggestions for failed pushes

**Output**: Push operation results with success confirmation, error details with resolution suggestions, or safety warnings with required actions

## GitHub

GitHub repository creation and setup.

### Commands

#### [/gh:repo-init](../src/commands/gh/repo-init.md)

Creates new GitHub repository with directory setup, git initialization, and remote configuration using GitHub CLI.

**Tools**: `Bash, Write, TodoWrite`

**Context collection**: Repository name from user arguments, GitHub user information for remote URL construction, and directory creation requirements

**Processing flow**:
1. Creates local directory with specified repository name
2. Initializes git repository in the new directory
3. Creates private GitHub repository using gh CLI with provided name
4. Generates basic README.md with repository title and description
5. Makes initial commit with README file
6. Configures remote origin using SSH URL with authenticated user context
7. Sets main branch and pushes initial commit to GitHub

**Output**: Created GitHub repository with local directory, initialized git repository, initial README commit, configured remote, and successful push confirmation

## Code review

Reviews code for quality issues and generates report.

### Commands

#### [/code-review](../src/commands/code-review.md)

https://github.com/user-attachments/assets/ebbe3c95-7ce7-460f-9a74-b0ed97dad477

Coordinates multiple concurrent code-review-expert agents across six specialized aspects (architecture, code quality, security, performance, testing, documentation) using Claude Code's Task tool to enable simultaneous analysis without conflicts.

**Tools**: `Task, Bash(git status:*), Bash(git diff:*), Bash(git log:*)`

```
                     [Code Review Command]
                              │
          ┌───────┬───────┬───┴───┬───────┬───────┐
          │       │       │       │       │       │
          ▼       ▼       ▼       ▼       ▼       ▼
    [Security] [Perf] [Arch] [Test] [Docs] [Quality]
     Expert   Expert  Expert Expert Expert  Expert
          │       │       │       │       │       │
          └───────┼───────┼───────┼───────┼───────┘
                  │       │       │       │
                  └───────┼───────┼───────┘
                          │       │
                          ▼       ▼
                    [Main Coordinator]
                          │
                          ▼
              [Consolidated Report with
               Cross-Pattern Analysis]
```

**Architecture**: Each specialist agent runs in separate execution context via Claude Code's Task tool. Agents focus on single aspects (security expert analyzes only security, performance expert only performance) to enable deep expertise without conflicts. The coordinator synthesizes all findings into a unified report.

**Context collection**: Current repository state including git status, diff statistics, recent commit history, review target specification from arguments, and impact assessment for system dependencies

**Processing flow**:
1. Analyzes repository state and performs pre-review impact assessment for system implications
2. Determines review strategy based on file types and scope (documentation, tests, config, source code)
3. Launches appropriate subset of six parallel review agents (Architecture, Code Quality, Security, Performance, Testing, Documentation)
4. Applies enhanced thinking triggers with alternative hypothesis analysis for security and architecture reviews
5. Consolidates findings across multiple review aspects into structured priority-based report
6. Performs cross-pattern analysis to identify competing solutions and intentional trade-offs
7. Generates report with critical issues, quality metrics, and actionable recommendations

**Output**: Consolidated code review report with prioritized issues by severity, quality metrics table, strengths identification, systemic issue patterns, and specific file locations with code examples

### Subagents

#### [code-review-expert](../src/agents/code-review-expert.md)

Single-focus code review subagent that gets launched multiple times concurrently by `/code-review` command, with each instance specializing in one review aspect rather than handling all aspects simultaneously.

**Tools**: `Read, Grep, Glob, Bash`
**Specialization**: Cross-file intelligence analysis, evolutionary pattern tracking, solution-oriented feedback with working code examples, dynamic integration with domain experts, and context-aware pattern detection with impact-based prioritization within assigned focus area

## Research

https://github.com/user-attachments/assets/b188fabc-0d8f-4896-949c-04953057ee6c

Orchestrator-worker research coordination using query classification and artifact-based synthesis to enable complex parallel investigation.

```
Query Analysis:
User Query → [Classify: breadth/depth/factual] → [Determine agent count]
     │                   │                            │
     ▼                   ▼                            ▼
[Complex topic?]  [Research strategy]         [Spawn 3-10 agents]

Parallel Execution:
Lead Agent → [research-expert A: angle 1] → [artifact-A.md]
     │       [research-expert B: angle 2] → [artifact-B.md]
     │       [research-expert C: angle 3] → [artifact-C.md]
     ▼
[Read all artifacts] → [Synthesize findings] → [Final report]
```

**Architecture**: Uses orchestrator-worker pattern where lead agent analyzes query complexity and spawns specialized research-expert subagents with distinct investigation angles. Subagents write findings to filesystem artifacts rather than direct return, enabling larger research volumes and preserving individual agent reports for user inspection. Lead agent synthesizes all artifacts into final report.

**Inspiration**: Based on Anthropic's [multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) architecture, adapted for Claude Code.

### Commands

#### [/research](../src/commands/research.md)

Orchestrates parallel research across multiple subagents with query classification, concurrent execution, and filesystem artifact synthesis.

**Tools**: `Task, Read, Write, Edit, Grep, Glob`

**Context collection**: Research query analysis for breadth-first, depth-first, or factual classification, available subagent capacity, and synthesis requirements

**Processing flow**:
1. Classifies query type to determine research strategy (breadth-first, depth-first, or simple factual)
2. Spawns appropriate number of research-expert subagents concurrently with mode indicators (quick verification, focused investigation, or deep research)
3. Assigns specific research angles to each subagent with overlapping perspectives for depth-first or independent aspects for breadth-first queries
4. Collects filesystem artifact references from each subagent rather than full reports
5. Reads and synthesizes findings from all research artifact files
6. Consolidates sources, deduplicates information, and identifies cross-report themes
7. Generates final comprehensive report with merged insights and consolidated bibliography

**Output**: Executive summary with synthesized findings, path to comprehensive final report file, key insights, and consolidated source references

### Subagents

#### [research-expert](../src/agents/research-expert.md)

Mode-driven research subagent with progressive search refinement that writes reports to filesystem artifacts.

**Implementation**: Outputs detailed findings to markdown files rather than direct return to overcome size limitations and enable user access to individual agent research. Mode-sensitive depth determines tool call budget (quick: 3-5, focused: 5-10, deep: 10-15 calls).

**Tools**: `WebSearch, WebFetch, Read, Write, Edit, Grep, Glob`
**Specialization**: Parallel search execution with progressive refinement, authoritative source prioritization, cross-reference verification, research gap identification, source quality hierarchy evaluation, and report generation while preserving findings in accessible artifact files

## Spec-driven development

Specification creation, validation, decomposition, and execution with task management integration.

```
Spec Workflow:
Feature Request → [/spec:create] → [17-section spec] → [/spec:validate]
      │                │                │                    │
      ▼                ▼                ▼                    ▼
[First-principles] [Library docs]  [Overengineering    [Ready assessment]
 [problem analysis] [integration]   detection]              │
                                        │                    ▼
                                        ▼              [/spec:decompose]
                                   [YAGNI analysis]          │
                                                            ▼
                                                    [STM tasks with
                                                     implementation details]
                                                            │
                                                            ▼
                                                    [/spec:execute]
                                                            │
                                                            ▼
                                                    [Concurrent specialists
                                                     + quality reviews]
```

**Architecture**: Creates specifications with 17 standardized sections including technical dependencies, implementation phases, and testing strategy. Validation includes overengineering detection using YAGNI principles. Decomposition preserves complete implementation details in STM tasks. Execution coordinates specialist agents with mandatory quality reviews.

### Commands

#### [/spec:create](../src/commands/spec/create.md)

Generates comprehensive specification documents with first-principles problem analysis, library documentation integration, and progressive validation checkpoints.

**Tools**: `Read, Write, Grep, Glob, TodoWrite, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, Bash(ls:*), Bash(echo:*), Bash(command:*), Bash(npm:*), Bash(claude:*)`

**Context collection**: Feature or bugfix requirements from arguments, existing specs directory analysis, Context7 availability for library documentation, codebase patterns via specialized subagents, and technical feasibility assessment

**Processing flow**:
1. Validates core problem from first principles with assumption auditing and goal decomposition
2. Performs mandatory pre-creation verification including context discovery via specialized subagents
3. Analyzes request scope and technical dependencies with library documentation integration
4. Maps complete system integration including data flow tracing and cross-system impact analysis
5. Generates 17-section specification document with progressive validation checkpoints
6. Applies final quality validation requiring 8+ out of 10 implementability score
7. Saves spec file with descriptive naming convention based on feature type

**Output**: Comprehensive specification document with technical dependencies, implementation phases, testing strategy, and library integration examples

#### [/spec:validate](../src/commands/spec/validate.md)

Analyzes specification completeness for autonomous implementation readiness while detecting overengineering and unnecessary complexity.

**Tools**: `Task, Read, Grep`

**Context collection**: Specification document analysis for WHY (intent/purpose), WHAT (scope/requirements), and HOW (implementation details), specialized subagent consultation for domain-specific validation, and overengineering pattern detection

**Processing flow**:
1. Evaluates specification across three fundamental aspects: intent clarity, scope definition, and implementation completeness
2. Consults specialized subagents for domain-specific technical validation and pattern analysis
3. Applies overengineering detection using YAGNI principles and core value alignment analysis
4. Identifies premature optimization, feature creep, over-abstraction, infrastructure overhead, and testing extremism
5. Generates completeness assessment with critical gaps and missing implementation details
6. Provides simplification recommendations and features to cut entirely
7. Delivers ready/not-ready assessment with specific improvement actions

**Output**: Implementation readiness assessment with critical gaps identification, overengineering analysis, features to cut, essential scope definition, and specific improvement recommendations

#### [/spec:decompose](../src/commands/spec/decompose.md)

Breaks down validated specifications into actionable STM tasks with complete implementation details preserved and dependency tracking.

**Tools**: `Read, Task, Write, TodoWrite, Bash(mkdir:*), Bash(cat:*), Bash(grep:*), Bash(echo:*), Bash(basename:*), Bash(date:*), Bash(claudekit:status stm), Bash(stm:*)`

**Context collection**: Validated specification analysis for major components and dependencies, STM availability assessment, task breakdown requirements with content preservation mandates, and implementation phase organization

**Processing flow**:
1. Reads and validates specification extracting major features, technical requirements, and component dependencies
2. Creates comprehensive task breakdown document preserving all implementation details, code examples, and acceptance criteria
3. Generates foundation tasks for core infrastructure followed by feature tasks for vertical slices
4. Copies complete technical requirements and code blocks into STM tasks using temporary files for large content
5. Establishes task dependencies and parallel execution opportunities with clear success criteria
6. Validates task completeness ensuring no summary phrases or spec references
7. Saves task breakdown document and creates STM entries with preserved implementation details

**Output**: Detailed task breakdown document, populated STM task list with complete implementation details, dependency mapping, and execution strategy with parallel work identification

#### [/spec:execute](../src/commands/spec/execute.md)

Implements validated specifications by orchestrating concurrent specialist agents with task management integration and mandatory quality reviews.

**Tools**: `Task, Read, TodoWrite, Grep, Glob, Bash(claudekit:status stm), Bash(stm:*), Bash(jq:*)`

**Context collection**: Specification components and dependencies analysis, STM task availability, specialist agent capabilities from claudekit list, and implementation workflow requirements

**Processing flow**:
1. Analyzes specification to understand components, dependencies, testing requirements, and success criteria
2. Loads STM tasks or creates TodoWrite tasks for component tracking and progress management
3. Implements each task using specialist agents with STM task detail integration
4. Executes mandatory code review for both completeness verification and quality assessment
5. Applies fix cycles for incomplete implementations or critical issues until standards met
6. Creates atomic commits following project conventions after successful completion
7. Tracks implementation progress with task status updates and completion verification

**Output**: Complete implementation with passing tests, quality-reviewed code, updated documentation, and atomic commits following project conventions

## Checkpointing

Git-based state preservation system that creates perfect snapshots without modifying working directory files, solving the workflow disruption problem of traditional git stash operations.

```
Traditional Stash (Disruptive):
Working Directory: [your changes]
        │
        ▼
[git stash push] ──► Working Directory: [clean, changes lost]
        │                     │
        ▼                     ▼
Stash List: [saved]    [context disrupted]

Claudekit Approach (Non-Destructive):
Working Directory: [your changes] ──► [unchanged throughout]
        │
        ▼
[git add -A] ──► Index: [staged temporarily]
        │
        ▼
[git stash create] ──► Stash Object: [perfect snapshot]
        │
        ▼
[git stash store] ──► Stash List: [checkpoint saved]
        │
        ▼
[git reset] ──► Index: [restored to original]
        │
        ▼
Working Directory: [still your changes, context preserved]
```

**Architecture**: The git stash create/store pattern creates stash objects without modifying the working directory. Files are temporarily staged to create a complete snapshot, then the index is reset while the stash object is preserved in the stash list. This enables fearless experimentation with perfect recovery points.

### Hooks

#### [create-checkpoint](guides/checkpoint.md)

Automatic backup system for Claude Code sessions using git stash create/store pattern to preserve work without disrupting workflow.

**Triggers**: `Stop` and `SubagentStop` events with universal matcher

**Implementation**: Git status detection, temporary staging, stash object creation, index reset, and automatic cleanup of aged checkpoints

**Behavior**: Silent execution without workflow interruption, provides backup safety net without modifying working directory

### Commands

#### [/checkpoint:create](../src/commands/checkpoint/create.md)

Manual checkpoint creation using git stash create/store pattern with working directory preservation and descriptive messaging.

**Tools**: `Bash(git stash:*), Bash(git add:*), Bash(git status:*)`

**Context collection**: Current working directory status and uncommitted changes analysis

**Processing flow**:
1. Analyzes current git status to determine if checkpoint is needed
2. Generates descriptive checkpoint message from arguments or timestamp
3. Temporarily stages all files using git add for snapshot creation
4. Creates stash object without affecting working directory using git stash create
5. Stores stash in stash list with descriptive message using git stash store
6. Resets index to restore original working directory state
7. Confirms checkpoint creation and displays saved content summary

**Output**: Checkpoint confirmation with descriptive message and preserved working directory state

#### [/checkpoint:restore](../src/commands/checkpoint/restore.md)

Restores checkpoints with automatic backup of current changes and conflict resolution.

**Tools**: `Bash(git stash:*), Bash(git status:*), Bash(git reset:*), Bash(grep:*), Bash(head:*)`

**Context collection**: Available claude-checkpoint stashes, current working directory status, and target checkpoint specification from arguments

**Processing flow**:
1. Parses argument to determine target checkpoint (latest, specific number, or validation error)
2. Checks for uncommitted changes and creates automatic backup stash if needed
3. Applies target checkpoint using git stash apply while preserving checkpoint in stash list
4. Handles merge conflicts gracefully with informative error reporting
5. Provides recovery instructions for backed-up changes if restoration conflicts occur
6. Displays restoration confirmation with checkpoint details and backup information

**Output**: Restoration confirmation with checkpoint details, backup stash references for recovery, and conflict resolution guidance

#### [/checkpoint:list](../src/commands/checkpoint/list.md)

Lists all Claude Code checkpoints with formatted metadata display.

**Tools**: `Bash(git stash:*)`

**Context collection**: Git stash list analysis for claude-checkpoint entries and timestamp extraction

**Processing flow**:
1. Retrieves complete git stash list and filters for claude-checkpoint entries
2. Parses stash entries to extract stash index, branch name, and checkpoint descriptions
3. Queries git log for accurate timestamp information for each checkpoint stash
4. Formats checkpoint data into readable table with index numbers, timestamps, descriptions, and branch context
5. Handles empty checkpoint list with helpful guidance for creating first checkpoint

**Output**: Formatted checkpoint list with stash indices, timestamps, descriptions, and branch information, or guidance for creating first checkpoint

## Codebase map

Context injection system that provides code structure overview at session start with incremental updates on file changes.

```
Session Start:
[Generate codebase map] → [Session tracking] → [9000 char limit]
        │                        │                     │
        ▼                        ▼                     ▼
[Include/exclude      [Prevent duplicate      [Truncate if
 patterns]             injection]              needed]

File Changes During Session:
File Edit → [5-second debounce] → [Update specific file index]
     │              │                        │
     ▼              ▼                        ▼
[Filter: code   [Prevent rapid         [Index maintained
 files only]     regeneration]          for next session]
```

**Architecture**: Session tracking prevents duplicate context injection. Incremental updates modify index entries for changed files rather than full regeneration. 5-second debouncing prevents excessive updates during rapid editing. 9000 character limits with truncation ensure consistent performance.

### Hooks

#### [codebase-map](guides/codebase-map.md)

https://github.com/user-attachments/assets/19a767d5-bc95-441c-9015-73d099391be0

Session-based context provider that generates and injects codebase structure overview once per session with configurable filtering and format options.

**Triggers**: `SessionStart` and `UserPromptSubmit` events with universal matcher

**Implementation**: Generates codebase map using configurable include/exclude patterns and format options, implements session tracking to prevent duplicate context injection, includes performance limits and truncation for large codebases, supports both DSL and tree output formats

**Behavior**: Provides context once per session with 9000 character limit for UserPromptSubmit events, sessions are tracked to avoid duplicate injection, graceful fallback on generation failures without blocking user workflow

#### [codebase-map-update](guides/codebase-map.md)

Incremental codebase map updater that maintains index freshness by updating specific files on modification with debouncing to prevent excessive regeneration.

**Triggers**: `PostToolUse` events matching `Write|Edit|MultiEdit`

**Implementation**: Debounces updates with 5-second delay, filters for code file extensions (ts, tsx, js, jsx, mjs, cjs), updates specific files in codebase-map index rather than full regeneration, silent failure handling to avoid workflow disruption

**Behavior**: Updates index file incrementally without interrupting development workflow, skips updates if codebase-map tool unavailable or no index exists, maintains index accuracy for subsequent session starts

## File guard

Analyzes bash commands and extracts file paths before tool execution, preventing access to sensitive files through dynamic command parsing rather than static pattern matching.

```
Static Permissions (Claude Code built-in):
User: "find . -name '*.env' | xargs cat"
       │
       ▼
[Pattern Check: Read(./.env)] ──► ALLOWED (doesn't match exact pattern)
       │
       ▼
[Tool executes, sensitive data exposed]

Dynamic Analysis (Claudekit):
User: "find . -name '*.env' | xargs cat"
       │
       ▼
[Parse bash command] ──► [Extract: find, xargs cat]
       │                        │
       ▼                        ▼
[Analyze pipeline] ──► [Predicted paths: .env files]
       │
       ▼
[Check against patterns] ──► BLOCKED (.env matches protection)
       │
       ▼
[Access denied before execution]
```

**Architecture**: Parses bash command syntax to extract file path operations before tool execution. Handles pipeline operations, glob expansion, and variable substitution that static deny patterns cannot catch. Uses ignore file patterns for protection rules while understanding command semantics.

### Hooks

#### [file-guard](guides/file-guard.md)

Blocks AI file access operations before execution by analyzing bash commands and extracting target file paths.

**Triggers**: `PreToolUse` events matching `Read|Edit|MultiEdit|Write|Bash`

**Implementation**: Loads ignore file patterns for protection rules, parses bash commands to extract file path candidates, applies security heuristics to detect sensitive pipeline operations, validates file paths against protection patterns, provides detailed denial reasons with pattern sources

**Behavior**: Blocks access before tool execution with informative error messages, allows non-sensitive file operations to proceed normally, special handling for bash commands with path extraction and pipeline analysis

## Quality checks

Code quality validation hooks that detect common anti-patterns and incomplete work during development.

### Hooks

#### check-unused-parameters

Detects lazy refactoring patterns where function parameters are prefixed with underscores instead of being properly removed.

**Triggers**: `PostToolUse` events matching `Edit|MultiEdit`

**Implementation**: Scans edited code for underscore-prefixed parameters in function declarations, arrow functions, methods, and constructors using regex patterns for TypeScript and JavaScript syntax variations

**Behavior**: Blocks commits when underscore-prefixed parameters are detected in code edits, encourages proper parameter removal over lazy underscore prefixing

#### [check-comment-replacement](guides/check-comment-replacement.md)

Detects incomplete development work where functional code has been replaced with placeholder comments.

**Triggers**: `PostToolUse` events matching `Edit|MultiEdit`

**Implementation**: Analyzes edit operations to identify when code is replaced with comment lines, supports multiple comment syntaxes (single-line, block, hash, SQL, HTML), validates edit patterns for comment replacement violations

**Behavior**: Blocks operations when code-to-comment replacement is detected, prevents incomplete refactoring from being committed, provides specific feedback about violated lines

#### check-todos

Response completion validator that ensures all todo items are finished before Claude stops responding.

**Triggers**: `Stop` and `SubagentStop` events with universal matcher

**Implementation**: Parses transcript to extract latest todo state, identifies incomplete tasks by status analysis, blocks Claude from stopping when unfinished todos exist

**Behavior**: Prevents Claude from finishing responses when tasks remain incomplete, enforces task completion discipline with detailed list of incomplete items, allows Claude to stop only when all todos are completed

## Typescript type checking

TypeScript type safety validation through compilation checks and 'any' type detection.

### Hooks

#### [check-any-changed](../cli/hooks/check-any-changed.ts)

https://github.com/user-attachments/assets/d270f706-c316-468a-9bb1-968726c3f6ae

Forbids 'any' types in TypeScript files through content parsing and pattern detection.

**Triggers**: `PostToolUse` events with `Write|Edit|MultiEdit` matcher

**Implementation**: Content cleaning to remove strings and comments, regex pattern matching for forbidden 'any' type declarations, line-by-line analysis with test utility exclusions

**Behavior**: Blocks execution when 'any' types detected, provides specific line numbers and replacement suggestions with proper type examples

#### [typecheck-changed](../cli/hooks/typecheck-changed.ts)

Runs TypeScript compiler validation on individual file changes using tsc --noEmit pattern.

**Triggers**: `PostToolUse` events with `Write|Edit|MultiEdit` matcher

**Implementation**: TypeScript availability detection via tsconfig.json, configurable tsc command execution, file extension filtering for .ts/.tsx files

**Behavior**: Validates only on TypeScript file changes, blocks on compilation errors with full compiler output, skips gracefully when TypeScript not configured

#### [typecheck-project](../cli/hooks/typecheck-project.ts)

Project-wide TypeScript validation using compiler checks after Claude finishes responding.

**Triggers**: `Stop` and `SubagentStop` events with universal matcher

**Implementation**: Full project tsc --noEmit execution, error formatting with file paths and line numbers, configurable timeout and command overrides

**Behavior**: Comprehensive type checking after each response completion, formatted error output for easy navigation, blocks Claude from stopping on type errors

## Linting

Code quality validation through multiple linting tools with automatic detection and error formatting.

### Hooks

#### [lint-changed](../cli/hooks/lint-changed.ts)

Runs linting validation on individual file changes using project-configured tools like Biome and ESLint.

**Triggers**: `PostToolUse` events with `Write|Edit|MultiEdit` matcher

**Implementation**: Tool detection via configuration files, parallel execution of multiple linters, file extension filtering with configurable patterns, automatic fix application when enabled

**Behavior**: Validates only modified files, supports both Biome and ESLint simultaneously, formatted error output with file paths and line numbers, blocks on any linting violations

#### [lint-project](../cli/hooks/lint-project.ts)

Project-wide linting validation using full codebase scans after Claude finishes responding.

**Triggers**: `Stop` and `SubagentStop` events with universal matcher

**Implementation**: Full project linting with configurable timeouts, tool availability detection, formatted error aggregation across multiple linters

**Behavior**: Comprehensive code quality validation after response completion, combined error reporting for easy navigation, blocks Claude from stopping on lint violations

## Test running

Automated test execution for changed files and full project validation with intelligent test discovery.

### Hooks

#### [test-changed](../cli/hooks/test-changed.ts)

Runs tests related to modified files using pattern-based test discovery and execution.

**Triggers**: `PostToolUse` events with `Write|Edit|MultiEdit` matcher

**Implementation**: Related test file discovery through naming patterns, test file exclusion to prevent recursive execution, configurable file extensions and test commands

**Behavior**: Targets only tests related to changed files, suggests test file creation when none found, provides detailed failure guidance with fix recommendations, blocks on any test failures

#### [test-project](../cli/hooks/test-project.ts)

Full test suite execution with timeout handling and comprehensive error reporting.

**Triggers**: `Stop` and `SubagentStop` events with universal matcher

**Implementation**: Package.json script detection, configurable test commands and timeouts, robust timeout handling with actionable recommendations

**Behavior**: Complete project test validation after response completion, timeout protection with configuration guidance, formatted test output for debugging, blocks Claude from stopping on test failures

## Self-review


https://github.com/user-attachments/assets/f5ad0963-aeb0-4daf-bc61-acbae9d0a67c


Prompts Claude to check its own work against common pitfalls and best practices using conversation transcript as session state and fully customizable question rotation.

```
Stop Event Triggered:
        │
        ▼
[Check transcript for last review marker]
        │
        ├─── No marker found ────┐
        │                        ▼
        │              [Check last 200 entries
        │               for code file changes]
        │                        │
        ▼                        │
[Marker found: check            │
 changes since marker] ─────────┘
        │
        ▼
[Code files changed?]
        │
   ┌────┼────┐
   ▼         ▼
[Yes]     [No: Skip]
   │
   ▼
[Apply file patterns]
   │
┌──┼───────────────┐
▼                  ▼
[Default:         [Custom:
*.ts,*.js,        user-defined
*.py,*.go...]     patterns]
   │                  │
   └────┬─────────────┘
        ▼
[Select one random question
 from each focus area]
        │
        ▼
[Block Claude until answered]
```

**Architecture**: Parses conversation transcript to track review markers and file changes. Selects one random question from each focus area (default: Implementation Completeness, Code Quality, Integration & Refactoring, Codebase Consistency). Custom focus areas completely replace defaults. Fully configurable file patterns and question pools enable team-specific review workflows.

### Hooks

#### [self-review](guides/self-review.md)

Prompts Claude with randomized critical questions from configurable focus areas when file changes are detected since the last review marker in conversation transcript.

**Triggers**: `Stop` and `SubagentStop` events with universal matcher

**Implementation**: Transcript parsing to detect file changes since last review marker, randomized question selection from built-in focus areas (integration issues, error handling, edge cases, performance, security, testing) plus user-defined custom topics and questions, integration detection with code-review-expert subagent, stop hook loop prevention, target pattern filtering

**Behavior**: Blocks Claude from stopping until self-review questions are addressed, tracks review completion with unique transcript markers, suggests code-review-expert subagent when available, skips when no file changes detected, fully customizable focus areas and question pools for team-specific review patterns

### Subagents

#### [code-review-expert](../src/agents/code-review-expert.md)

Comprehensive code review specialist suggested by self-review hook for deeper analysis of identified concerns across six focus areas.

**Tools**: `Read, Grep, Glob, Bash`
**Specialization**: Root cause analysis for self-review concerns, cross-file intelligence to identify related issues, solution-oriented feedback with working code examples, pattern detection for implementation completeness and codebase consistency validation

# Advanced utilities

## Doctor

Validates project setup, configuration integrity, and claudekit installation health with detailed diagnostic reporting.

```bash
claudekit doctor
```

## Claude files linter

Validates slash command and subagent markdown files against formatting standards and schema requirements.

```bash
claudekit lint-commands
claudekit lint-agents
```

## Hook profiler

Measures hook execution performance, output token usage, and timing against Claude Code limits.

```bash
claudekit-hooks profile
claudekit-hooks profile <hook>
```

## Exposed prompts for external use

Displays raw command and subagent prompts for integration with external AI systems or debugging.

```bash
claudekit show command <command>
claudekit show agent <subagent>
```
