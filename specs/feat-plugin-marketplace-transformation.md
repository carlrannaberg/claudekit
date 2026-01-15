# Plugin Marketplace Transformation

**Status**: Draft
**Authors**: Claude, 2025-01-15
**Type**: Feature / Architecture

## Overview

Transform claudekit from a standalone CLI tool with project-specific commands and hooks into a **plugin marketplace** that distributes versioned, namespaced plugins through Claude Code's native plugin system. This includes converting high-value commands to **Skills** for automatic model-invoked execution.

## Background/Problem Statement

### Current State

claudekit currently operates as:
- **Standalone CLI**: `npm install -g claudekit` installs globally
- **Project-specific configuration**: Commands copied to `.claude/commands/`
- **Embedded hooks system**: `claudekit-hooks run <hook-name>`
- **Manual distribution**: Users must manually set up each project

### Limitations

| Aspect | Current Limitation |
|--------|-------------------|
| **Distribution** | Manual copy/paste or npm install |
| **Versioning** | No semantic versioning for components |
| **Discoverability** | Not listed in plugin registries |
| **Invocation** | All commands require explicit `/command` |
| **Namespacing** | Potential conflicts with other tools |
| **Modularity** | All-or-nothing installation |
| **Updates** | Manual reinstallation required |

### Desired State

Transform claudekit into a plugin marketplace where:
- Users install via `/plugin marketplace add claudekit/plugins`
- Individual plugins can be installed selectively
- Commands are namespaced (`/ck-git:commit`)
- Skills auto-invoke based on natural language ("commit my changes")
- Version updates handled through plugin system
- Components are discoverable in community registries

## Goals

- **Plugin Structure**: Convert claudekit to native Claude Code plugin format
- **Marketplace Creation**: Create `marketplace.json` catalog of plugins
- **Skills Conversion**: Transform high-value commands to model-invoked Skills
- **Modular Distribution**: Allow selective installation of plugin groups
- **Version Management**: Semantic versioning for all components
- **Community Integration**: List on claude-plugins.dev and other registries

## Non-Goals

- **MCP Server Integration**: Not creating MCP servers (separate concern)
- **LSP Server Integration**: Not creating language servers
- **Breaking Changes**: Maintain command functionality during transition
- **CLI Deprecation**: The claudekit CLI continues for hook execution
- **Enterprise Features**: Focus on open-source community distribution

## Deprecated Components (Delete During Migration)

The following claudekit components are **redundant** due to built-in Claude Code features added since claudekit was created:

### ck-checkpoint - DELETE

**Reason**: Claude Code 2.0+ has native checkpointing that supersedes this functionality.

| Claudekit | Built-in Equivalent |
|-----------|---------------------|
| `/checkpoint:create` | Automatic per-prompt checkpoints |
| `/checkpoint:list` | Esc+Esc opens rewind menu with history |
| `/checkpoint:restore` | `/rewind` command or Esc+Esc menu |

**Built-in features**:
- Automatic checkpoint on every user prompt
- `/rewind` slash command
- Esc+Esc keyboard shortcut for rewind menu
- Options: rewind conversation only, code only, or both
- 30-day persistence across sessions

**Migration action**:
1. Do NOT create ck-checkpoint plugin
2. Delete `src/commands/checkpoint/` directory
3. Remove checkpoint hooks from `cli/hooks/`
4. Update CLAUDE.md to reference built-in `/rewind` instead

### validate-and-fix - DELETE

**Reason**: Claude Code's built-in hook system handles quality checks automatically. The `/validate-and-fix` command was a workaround before hooks existed.

**Built-in replacement**:
- Configure hooks in `.claude/settings.json` for automatic linting/typechecking
- PostToolUse hooks run automatically after file edits
- No need for a manual "fix issues" command

**Migration action**:
1. Delete `src/commands/validate-and-fix.md`
2. Ensure quality hooks are configured in ck-quality plugin
3. Users get automatic validation without explicit commands

### ck-experts - DELETE ENTIRELY

**Reason**: "Expert" agents are just role-playing prompts. They tell Claude to "act as an expert in X" - but Claude already knows TypeScript, React, testing, databases, git, and DevOps. They add no real value.

**Current subagents** (30+):
```
webpack-expert, vite-expert, typescript-expert, typescript-build-expert,
typescript-type-expert, react-expert, react-performance-expert, css-styling-expert,
accessibility-expert, nextjs-expert, testing-expert, jest-testing-expert,
vitest-testing-expert, playwright-expert, database-expert, postgres-expert,
mongodb-expert, docker-expert, github-actions-expert, devops-expert, git-expert,
nodejs-expert, linting-expert, oracle, code-search, triage-expert, cli-expert,
ai-sdk-expert, research-expert, refactoring-expert, code-review-expert,
nestjs-expert, loopback-expert, kafka-expert
```

#### Why Delete All

| Agent | Reality |
|-------|---------|
| typescript-expert | "Be really good at TypeScript" - Claude already is |
| react-expert | "Be really good at React" - Claude already is |
| testing-expert | "Be really good at testing" - Claude already is |
| database-expert | "Be really good at SQL" - Claude already is |
| devops-expert | "Be really good at Docker/CI" - Claude already is |
| git-expert | "Be really good at git" - Claude already is |
| All others | Same issue - just role-playing prompts |

#### Keep as Skills (in ck-quality)

Only skills with **actual workflows** are worth keeping:

| Skill | Why It's Different |
|-------|-------------------|
| `code-review` | Multi-step process: security → performance → maintainability → testing |
| `refactor` | Systematic approach: identify smells → apply patterns → verify behavior |

**Result**: 30+ agents → 0 agents, 2 skills moved to ck-quality

**Migration action**:
1. Do NOT create ck-experts plugin
2. Delete entire `src/agents/` directory
3. Move code-review and refactor workflows to ck-quality skills
4. Update CLAUDE.md to remove subagent references

### Components to Keep (Not Built-in)

| Component | Reason to Keep |
|-----------|----------------|
| **ck-git** | No built-in git commands |
| **ck-spec** | Plan Mode is exploration only, not formal specs |
| **ck-quality** | Built-in `/review` is minimal; includes code-review & refactor skills |
| **ck-agents-md** | AGENTS.md pattern not native |
| **ck-dev** | Cleanup utilities not built-in |

## Technical Dependencies

### Claude Code Requirements

- Claude Code v2.0.12+ (plugin marketplace support)
- Plugin manifest format (`.claude-plugin/plugin.json`)
- Skill specification format (`SKILL.md`)
- Marketplace specification (`marketplace.json`)

### External Registries

- [claude-plugins.dev](https://claude-plugins.dev/) - Community registry
- [Claude Market](https://github.com/claude-market/marketplace) - Open source marketplace
- [Anthropic Skills](https://github.com/anthropics/skills) - Official skills repository

## Architecture

### Canonical Identifiers

**Repository**: `github.com/claudekit/plugins`
**Marketplace Name**: `claudekit`
**Plugin Prefix**: `ck-` (to avoid conflicts with generic names like "git" or "checkpoint")

All documentation, commands, and metadata use consistent identifiers:
- Marketplace add: `/plugin marketplace add claudekit/plugins`
- Plugin install: `/plugin install ck-git@claudekit`
- Command invocation: `/ck-git:commit`

### Plugin vs Standalone Comparison

| Aspect | Standalone (Current) | Plugin (Target) |
|--------|---------------------|-----------------|
| Installation | `npm install -g claudekit` | `/plugin install ck-git@claudekit` |
| Commands | `/git:commit` | `/ck-git:commit` |
| Skills | N/A | Auto-invoke on "commit my changes" |
| Sharing | Manual setup | One-command install |
| Versioning | npm version | Semantic in manifest |
| Scope | Project-bound | User/Project/Managed |
| Dependencies | Shared codebase | Self-contained |

### Directory Structure Transformation

```
# CURRENT STRUCTURE
claudekit/
├── src/
│   ├── commands/           # Slash commands
│   │   ├── git/
│   │   ├── checkpoint/
│   │   ├── spec/
│   │   └── ...
│   └── agents/             # Subagents
├── cli/                    # TypeScript CLI
│   ├── hooks/              # Hook implementations
│   └── ...
└── .claude/                # Project config

# TARGET STRUCTURE (Plugin Marketplace)
# Repository: github.com/claudekit/plugins
# Note: As of Claude Code v2.1.3, commands and skills are unified.
# All are skills - use disable-model-invocation: true for explicit-only.
claudekit-plugins/
├── .claude-plugin/
│   └── marketplace.json    # Marketplace catalog
├── plugins/
│   ├── ck-git/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   ├── commit.md           # Model-invocable
│   │   │   ├── push.md             # disable-model-invocation: true
│   │   │   ├── status.md           # disable-model-invocation: true
│   │   │   └── checkout.md         # disable-model-invocation: true
│   │   └── hooks/
│   │       └── hooks.json
│   │   # NOTE: ck-checkpoint DELETED - use built-in /rewind
│   ├── ck-spec/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── skills/
│   │       ├── create.md           # Model-invocable
│   │       ├── validate.md         # disable-model-invocation: true
│   │       ├── decompose.md        # disable-model-invocation: true
│   │       └── execute.md          # disable-model-invocation: true
│   ├── ck-quality/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   # validate-and-fix DELETED - use built-in hooks instead
│   │   │   ├── code-review.md      # Model-invocable (from code-review-expert)
│   │   │   ├── refactor.md         # Model-invocable (from refactoring-expert)
│   │   │   └── verify-setup.md     # disable-model-invocation: true
│   │   └── hooks/
│   │       └── hooks.json
│   ├── ck-agents-md/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── skills/
│   │       ├── init.md             # disable-model-invocation: true
│   │       ├── migration.md        # disable-model-invocation: true
│   │       └── cli.md              # disable-model-invocation: true
│   ├── ck-dev/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   ├── cleanup.md          # disable-model-invocation: true
│   │   │   └── verify-setup.md     # disable-model-invocation: true
│   │   └── hooks/
│   │       └── hooks.json
│   │   # NOTE: ck-experts DELETED - "expert" agents are just role-playing prompts
│   │   # code-review and refactor skills moved to ck-quality
└── README.md
```

**Note**: No `shared/` directory. Each plugin is fully self-contained because plugins are copied to cache on installation - symlinks and external references won't survive packaging.

**Note**: As of Claude Code v2.1.3, slash commands and skills are unified. All items in `skills/` can be invoked with `/skill-name`. Add `disable-model-invocation: true` to frontmatter to prevent automatic model invocation.

## Detailed Design

### 1. Marketplace Manifest

**File**: `.claude-plugin/marketplace.json`

```json
{
  "name": "claudekit",
  "owner": {
    "name": "claudekit",
    "email": "maintainer@claudekit.dev"
  },
  "metadata": {
    "description": "Development workflow tools for Claude Code - Git automation, checkpointing, specifications, code quality, and domain experts",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "ck-git",
      "source": "./plugins/ck-git",
      "description": "Smart git commands with conventional commit support. Use when committing, pushing, or managing git workflow."
    },
    {
      "name": "ck-spec",
      "source": "./plugins/ck-spec",
      "description": "Specification creation, validation, and execution. Use when planning features or documenting requirements."
    },
    {
      "name": "ck-quality",
      "source": "./plugins/ck-quality",
      "description": "Code quality checks and fixes. Use when reviewing code or fixing lint/type issues. Note: hooks require npm install -g claudekit"
    },
    {
      "name": "ck-agents-md",
      "source": "./plugins/ck-agents-md",
      "description": "AGENTS.md configuration management. Use when setting up AI assistant configuration."
    },
    {
      "name": "ck-dev",
      "source": "./plugins/ck-dev",
      "description": "Development utilities and cleanup. Use when cleaning debug files or development artifacts. Note: hooks require npm install -g claudekit"
    }
  ]
}
```

### 2. Plugin Manifest Structure

Official Anthropic plugins use **minimal manifests**. Based on analysis of `claude-plugins-official`, most plugins only include `name` and `description`. Additional fields are optional.

**File**: `plugins/ck-git/.claude-plugin/plugin.json`

```json
{
  "name": "ck-git",
  "description": "Smart git commands following project conventions"
}
```

**Extended manifest** (when additional metadata is useful):

```json
{
  "name": "ck-quality",
  "description": "Code quality checks and automated fixes",
  "author": {
    "name": "claudekit"
  },
  "repository": "https://github.com/claudekit/plugins"
}
```

**Pattern from official plugins**: Commands, skills, agents, and hooks are auto-discovered from standard directories - no need to declare paths in manifest.

### 3. Patterns from Official Plugins

Analysis of `anthropics/claude-plugins-official` revealed key patterns to follow:

#### Skill Description Triggers

Official skills use specific description patterns that help the model know when to invoke them:

| Plugin | Description Pattern |
|--------|-------------------|
| code-review | "Use when reviewing code changes, pull requests, or discussing code quality" |
| commit-commands | "Use when user wants to commit changes following project conventions" |
| feature-dev | "Use when developing new features that require planning and implementation" |

**Pattern**: Descriptions should include "Use when..." phrases that map to natural language requests.

#### Hook Event Patterns

| Hook Type | Purpose | Example Plugin |
|-----------|---------|----------------|
| `SessionStart` | Modify behavior at session start | output-style (sets formatting preferences) |
| `PreToolUse` | Validate before tool execution | security-guidance (security checks) |
| `PostToolUse` | React after tool execution | hookify (quality checks) |
| `Stop` | Execute on conversation stop | ralph-loop (iterative workflows) |

**SessionStart Example** (from output-style plugins):
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "echo 'Applying concise output style...'" }
        ]
      }
    ]
  }
}
```

**PreToolUse Example** (for validation):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "security-check ${file_path}" }
        ]
      }
    ]
  }
}
```

#### Agent Example Blocks

Official plugins include example invocation patterns in skill descriptions:

```markdown
## Example Usage

<agent-example>
User: Review my recent changes for security issues
Assistant: I'll analyze your changes for potential security vulnerabilities...
</agent-example>
```

This helps train the model on expected invocation patterns.

### 4. Skills Architecture

As of Claude Code v2.1.3, **commands and skills are unified**. Everything is a skill:
- All skills can be invoked with `/skill-name`
- By default, the model can also invoke skills automatically based on context
- Add `disable-model-invocation: true` to frontmatter to require explicit `/skill-name` invocation

This simplifies the mental model: one format, one directory, one concept.

#### Model Invocation Control

```yaml
---
name: commit
description: Create commits following project conventions. Use when user wants to commit changes.
allowed-tools: Bash, Read
# Omit disable-model-invocation to allow automatic invocation
---
```

```yaml
---
name: push
description: Push commits to remote repository
allowed-tools: Bash
disable-model-invocation: true  # Explicit /push only - too dangerous for auto-invoke
---
```

#### Safety: Consent Gates for Destructive Operations

**Critical**: Model-invocable skills that perform potentially destructive operations MUST include user confirmation steps. Since skills auto-invoke based on natural language, users may not realize what actions will be taken.

Required consent gates:
- **Staging files**: Confirm before `git add -A` (could stage unintended files)
- **Creating commits**: Show staged changes and proposed message before committing
- **Pushing**: Always confirm before pushing to remote
- **Deleting/overwriting**: Explicit confirmation for any destructive operation

#### Skill Execution Modes

Skills support two execution modes via the `context` frontmatter field:

| Mode | Frontmatter | Behavior |
|------|-------------|----------|
| **Inline** (default) | (none) | Runs in main conversation, shares history |
| **Forked** | `context: fork` | Runs in isolated sub-agent with own history |

**Use `context: fork` when:**
- Skill performs complex multi-step operations
- Intermediate work would clutter main conversation
- Skill generates reports or detailed analysis

**Use inline (default) when:**
- Skill provides guidance applied to current task
- Results should integrate naturally into conversation
- Skill is simple and focused

The `agent` field specifies which agent type runs the forked context (only works with `context: fork`):
- `Explore` - For exploratory analysis
- `Plan` - For planning and strategy
- `general-purpose` - Default

#### Skill Structure

```
skills/
└── git-commit/
    ├── SKILL.md           # Main skill definition
    ├── examples.md        # Usage examples (optional)
    └── reference.md       # Detailed reference (optional)
```

#### Skill Definition Format

**File**: `plugins/ck-git/skills/git-commit/SKILL.md`

```yaml
---
name: git-commit
description: Create commits following project conventions. Use when user wants to commit changes, save work, or create a checkpoint of current state.
allowed-tools: Bash, Read, Grep
user-invocable: true
---

# Git Commit Skill

## When to Use

Automatically invoke this skill when the user:
- Says "commit my changes" or "save my work"
- Asks to "create a commit" or "checkpoint my progress"
- Wants to "push my changes" (commit first, then push)
- Mentions committing with a specific message

## Instructions

### 1. Analyze Current State

First, understand what needs to be committed:

```bash
git status --porcelain
git diff --stat
```

### 2. Determine Commit Style

Check the project's commit conventions:

```bash
git log --oneline -10
```

Look for patterns:
- Conventional commits (`feat:`, `fix:`, `docs:`)
- Ticket prefixes (`PROJ-123:`)
- Scope patterns (`feat(auth):`)

### 3. User Confirmation (REQUIRED)

**Before staging or committing**, show the user and wait for response:
1. List of files that will be staged
2. Proposed commit message
3. Wait for explicit "yes" or approval before proceeding

Example output:
```
I'll stage and commit the following changes:
- src/auth.ts (modified)
- src/utils.ts (new file)

Proposed commit message:
  feat(auth): add login validation

Should I proceed with this commit?
```

**Do not continue until the user confirms.** This is a natural conversational confirmation - no special tool needed.

### 4. Stage Changes (After Confirmation)

Only after user confirms:
- If user specifies files, stage only those
- Otherwise, stage changes shown in confirmation

### 5. Create Commit

Generate a commit message that:
- Follows the project's established style
- Uses imperative mood ("add", not "added")
- Summarizes the "why" not just the "what"
- Includes Co-Authored-By trailer

```bash
git commit -m "$(cat <<'EOF'
type(scope): brief description

Optional body with more details.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 6. Verify Success

```bash
git log -1 --oneline
git status
```

## Examples

**User**: "commit my changes"
**Action**: Show changes, propose message, wait for confirmation, then commit

**User**: "commit the auth changes with message 'add login feature'"
**Action**: Show auth files, confirm message, wait for confirmation, then commit

**User**: "save my work on the API"
**Action**: Show API files, propose descriptive message, wait for confirmation
```

#### Forked Skill Example (Complex Analysis)

**File**: `plugins/ck-quality/skills/code-review/SKILL.md`

```yaml
---
name: code-review
description: Comprehensive code review with security, performance, and maintainability analysis. Use when user wants thorough code review or PR analysis.
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob, Bash
user-invocable: true
---

# Code Review Skill

This skill runs in an isolated context to perform comprehensive analysis without cluttering the main conversation.

## When to Use

Automatically invoke when user:
- Says "review my code" or "check my changes"
- Asks for "code review" or "PR review"
- Wants "security review" or "performance analysis"

## Instructions

### 1. Identify Scope

Determine what to review:
- Recent changes: `git diff HEAD~1`
- Staged changes: `git diff --cached`
- Specific files: as mentioned by user

### 2. Multi-Aspect Analysis

Review for:
- **Security**: Input validation, injection risks, auth issues
- **Performance**: N+1 queries, unnecessary loops, memory leaks
- **Maintainability**: Code clarity, duplication, complexity
- **Testing**: Coverage gaps, edge cases

### 3. Generate Report

Return structured findings with:
- Severity (critical/warning/suggestion)
- Location (file:line)
- Issue description
- Recommended fix

## Output Format

The forked context returns a clean summary to the main conversation.
```

#### Model Invocation Decision Matrix

With unified commands/skills, the decision is whether to allow model invocation:

| Scenario | Model Invocation | Frontmatter |
|----------|------------------|-------------|
| Natural language trigger useful ("commit my work") | ✅ Enabled | (default) |
| Dangerous if auto-invoked (push, delete) | ❌ Disabled | `disable-model-invocation: true` |
| Requires specific arguments | ❌ Disabled | `disable-model-invocation: true` |
| One-time setup operations | ❌ Disabled | `disable-model-invocation: true` |
| Context-dependent behavior helpful | ✅ Enabled | (default) |

#### Skills by Model Invocation Setting

| Skill | Plugin | Model Invocation | Context Mode | Trigger Phrases |
|-------|--------|------------------|--------------|-----------------|
| `commit` | ck-git | ✅ Enabled | inline | "commit changes", "save work" |
| `push` | ck-git | ❌ Disabled | - | - |
| `status` | ck-git | ❌ Disabled | - | - |
| `checkout` | ck-git | ❌ Disabled | - | - |
| ~~`create`~~ | ~~ck-checkpoint~~ | - | - | DELETED - use built-in `/rewind` |
| `create` | ck-spec | ✅ Enabled | `fork` + Plan | "create spec", "write specification" |
| `validate` | ck-spec | ❌ Disabled | - | - |
| `decompose` | ck-spec | ❌ Disabled | - | - |
| `execute` | ck-spec | ❌ Disabled | - | - |
| `code-review` | ck-quality | ✅ Enabled | `fork` + Explore | "review code", "check my changes" |
| ~~`validate-and-fix`~~ | ~~ck-quality~~ | - | - | DELETED - use built-in hooks |
| `verify-setup` | ck-quality | ❌ Disabled | - | - |
| `init` | ck-agents-md | ❌ Disabled | - | - |
| `migration` | ck-agents-md | ❌ Disabled | - | - |
| `cli` | ck-agents-md | ❌ Disabled | - | - |
| `cleanup` | ck-dev | ❌ Disabled | - | - |
| `verify-setup` | ck-dev | ❌ Disabled | - | - |

Skills with `context: fork` run in isolated sub-agents, keeping complex analysis separate from the main conversation.

### 5. Hooks in Plugins

Hooks are bundled within plugins and use the `${CLAUDE_PLUGIN_ROOT}` variable for paths since plugins are copied to cache on installation.

**IMPORTANT**: Hooks require `claudekit-hooks` CLI to be installed globally. The plugin system cannot bundle executables.

**File**: `plugins/ck-quality/hooks/hooks.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run typecheck-changed || echo '[claudekit] Hook failed - ensure claudekit is installed: npm install -g claudekit'"
          },
          {
            "type": "command",
            "command": "claudekit-hooks run lint-changed || echo '[claudekit] Hook failed - ensure claudekit is installed: npm install -g claudekit'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run check-todos || echo '[claudekit] Hook failed - ensure claudekit is installed: npm install -g claudekit'"
          }
        ]
      }
    ]
  }
}
```

**Hook Dependency Enforcement**:

Each plugin with hooks includes a setup verification command:

**File**: `plugins/ck-quality/commands/verify-setup.md`

```yaml
---
description: Verify claudekit-hooks is installed for hook functionality
allowed-tools: Bash
---

# Verify Claudekit Setup

Check if claudekit-hooks is available for hook functionality:

```bash
if ! command -v claudekit-hooks &> /dev/null; then
  echo "⚠️  claudekit-hooks not found!"
  echo ""
  echo "Hooks in this plugin require claudekit to be installed globally."
  echo "Install with: npm install -g claudekit"
  echo ""
  echo "Without claudekit, the following features won't work:"
  echo "  - Automatic TypeScript type checking on file save"
  echo "  - Automatic linting on file save"
  echo "  - Todo completion validation on stop"
  exit 1
else
  echo "✅ claudekit-hooks is installed and ready"
  claudekit-hooks --version
fi
```

**File**: `plugins/ck-dev/commands/verify-setup.md`

```yaml
---
description: Verify claudekit-hooks is installed for hook functionality
allowed-tools: Bash
---

# Verify Claudekit Setup

Check if claudekit-hooks is available for hook functionality:

```bash
if ! command -v claudekit-hooks &> /dev/null; then
  echo "⚠️  claudekit-hooks not found!"
  echo ""
  echo "Hooks in this plugin require claudekit to be installed globally."
  echo "Install with: npm install -g claudekit"
  echo ""
  echo "Without claudekit, the following features won't work:"
  echo "  - Automatic checkpoint creation on stop"
  echo "  - Codebase map generation"
  exit 1
else
  echo "✅ claudekit-hooks is installed and ready"
  claudekit-hooks --version
fi
```

### 6. Subagents as Plugin Agents

**File**: `plugins/ck-experts/.claude-plugin/plugin.json`

```json
{
  "name": "ck-experts",
  "description": "Specialized AI subagents for technical domains",
  "version": "1.0.0",
  "agents": "./agents/"
}
```

Agents are markdown files defining specialized expertise:

**File**: `plugins/ck-experts/agents/typescript-expert.md`

```markdown
---
name: typescript-expert
description: TypeScript and JavaScript expert with deep knowledge of type-level programming, performance optimization, and modern tooling
---

# TypeScript Expert

You are a TypeScript expert specializing in:
- Type-level programming and advanced generics
- Build optimization and module resolution
- Migration strategies and monorepo management
- Performance debugging and optimization

## Capabilities

[Existing agent content...]
```

### 7. Skill Namespace Migration

Skills move from flat structure to namespaced plugin structure. All plugins use `ck-` prefix to avoid conflicts. With the unified command/skill model, all invocations use `/plugin:skill` format:

| Current | Plugin | Invocation |
|---------|--------|------------|
| `/git:commit` | ck-git | `/ck-git:commit` |
| `/git:push` | ck-git | `/ck-git:push` |
| `/git:status` | ck-git | `/ck-git:status` |
| ~~`/checkpoint:create`~~ | - | DELETED → use built-in `/rewind` |
| ~~`/checkpoint:list`~~ | - | DELETED → use Esc+Esc |
| ~~`/checkpoint:restore`~~ | - | DELETED → use built-in `/rewind` |
| `/spec:create` | ck-spec | `/ck-spec:create` |
| `/spec:validate` | ck-spec | `/ck-spec:validate` |
| `/spec:decompose` | ck-spec | `/ck-spec:decompose` |
| `/spec:execute` | ck-spec | `/ck-spec:execute` |
| ~~`/validate-and-fix`~~ | - | DELETED - use built-in hooks |
| `/code-review` | ck-quality | `/ck-quality:code-review` |
| `/agents-md:init` | ck-agents-md | `/ck-agents-md:init` |
| `/agents-md:migration` | ck-agents-md | `/ck-agents-md:migration` |
| `/agents-md:cli` | ck-agents-md | `/ck-agents-md:cli` |
| `/dev:cleanup` | ck-dev | `/ck-dev:cleanup` |

## User Experience

### Installation Flow

```bash
# One-time: Add claudekit marketplace
/plugin marketplace add claudekit/plugins

# Install specific plugins
/plugin install ck-git@claudekit
/plugin install ck-quality@claudekit
# Note: Checkpoints are built-in - use /rewind instead

# Or install all plugins
/plugin install ck-git@claudekit ck-spec@claudekit ck-quality@claudekit ck-agents-md@claudekit ck-dev@claudekit

# For hooks functionality, also install claudekit CLI
npm install -g claudekit
```

### Usage Patterns

**Explicit Skill Invocation**:
```
User: /ck-git:commit
Claude: [Executes commit skill with prompts]
```

**Natural Language (Model Auto-Invocation)**:
```
User: commit my changes with a good message
Claude: I'll use the commit skill. Here are the changes that will be staged:
- src/auth.ts (modified)
- src/utils.ts (new file)

Proposed commit message:
  feat(auth): add login validation

Proceed with this commit?
User: yes
Claude: [Creates commit after confirmation]
```

**Subagent Delegation**:
```
User: Help me fix this TypeScript error
Claude: I'll delegate to the typescript-expert for this...
[Uses Task tool with ck-experts plugin agent]
```

### Team Configuration

Teams can pre-configure plugins in `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claudekit": {
      "source": {
        "source": "github",
        "repo": "claudekit/plugins"
      }
    }
  },
  "enabledPlugins": {
    "ck-git@claudekit": true,
    "ck-checkpoint@claudekit": true,
    "ck-quality@claudekit": true,
    "ck-experts@claudekit": true
  }
}
```

## Migration Strategy

### Phase 1: Structure Creation

1. Create `claudekit/plugins` repository on GitHub
2. Set up marketplace manifest with consistent naming
3. Create plugin directory structure with `ck-` prefix
4. Move existing commands to `skills/` directory (unified format)

### Phase 2: Skill Configuration

1. Add `disable-model-invocation: true` to skills that should be explicit-only
2. Add "Use when..." trigger descriptions to model-invocable skills
3. Add confirmation gates to destructive model-invocable skills
4. Test model auto-invocation and explicit `/skill` invocation

### Phase 3: Hook Integration

1. Create hooks.json for relevant plugins
2. Add fallback error messages for missing claudekit-hooks
3. Create verify-setup skills for each plugin with hooks
4. Document claudekit-hooks dependency prominently

### Phase 4: Agent Migration

1. Move subagent definitions to ck-experts plugin
2. Update agent references in CLAUDE.md
3. Test Task tool delegation

### Phase 5: Publishing

1. Push to GitHub repository (`claudekit/plugins`)
2. Submit to claude-plugins.dev
3. Update documentation
4. Announce to community

## Compatibility Considerations

### Backward Compatibility

The transformation maintains compatibility through:

1. **Dual Distribution**: Both npm package and plugin marketplace
2. **CLI Preservation**: `claudekit-hooks` CLI remains for hooks
3. **Skill Aliases**: Consider creating aliases for old skill names
4. **Documentation**: Clear migration guide for existing users

### Hook Execution Requirements

**Critical**: Hooks require the claudekit CLI to be installed globally.

| Component | Plugin-Only Install | Plugin + CLI Install |
|-----------|--------------------|--------------------|
| Skills | ✅ Works | ✅ Works |
| Agents | ✅ Works | ✅ Works |
| Hooks | ❌ Fails with error message | ✅ Works |

**Installation guidance** (shown in README and plugin descriptions):

```
⚠️  HOOKS REQUIRE ADDITIONAL SETUP

Plugins with automatic hooks (ck-quality, ck-dev) require:
  npm install -g claudekit

Without this, hooks will show: "[claudekit] Hook failed - ensure claudekit is installed"

Run /ck-quality:verify-setup to check your installation.
```

### Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Skill namespacing | `/git:commit` → `/ck-git:commit` | Document mapping, consider aliases |
| Model invocation | Some skills auto-invoke by default | Add `disable-model-invocation: true` where needed |
| Plugin installation | New workflow | Provide migration script |

## Testing Strategy

### Plugin Validation

1. Validate all plugin manifests with JSON schema
2. Test skill execution from plugin context (explicit `/skill`)
3. Test model auto-invocation for enabled skills
4. Verify `disable-model-invocation: true` prevents auto-invocation
5. Test hook execution with `${CLAUDE_PLUGIN_ROOT}` references
6. Test hook failure messaging when claudekit-hooks not installed

### Integration Testing

1. Install marketplace from GitHub (`claudekit/plugins`)
2. Install individual plugins
3. Execute skills explicitly (`/ck-git:commit`)
4. Trigger model-invocable skills via natural language
5. Verify `disable-model-invocation` skills don't auto-invoke
6. Verify hook execution
7. Test confirmation gates in model-invocable skills

### Regression Testing

1. Compare skill output: standalone vs plugin
2. Verify explicit invocation matches model invocation behavior
3. Test hook execution in both modes

## Documentation Updates

### Required Documentation

1. **Plugin Installation Guide**: How to add marketplace and install plugins
2. **Skill Reference**: List of skills with trigger phrases
3. **Migration Guide**: Upgrading from standalone to plugins
4. **Hook Requirements**: Explaining claudekit-hooks dependency (prominent!)

### README Structure

```markdown
# claudekit Plugin Marketplace

## Quick Start

```bash
# Add marketplace
/plugin marketplace add claudekit/plugins

# Install plugins
/plugin install ck-git@claudekit
```

## ⚠️ Hook Setup Required

Plugins with hooks (ck-quality, ck-dev) require claudekit CLI:
```bash
npm install -g claudekit
```

Verify with: `/ck-quality:verify-setup`

## Available Plugins

| Plugin | Description | Skills | Model-Invocable | Hooks |
|--------|-------------|--------|-----------------|-------|
| ck-git | Git automation | commit, push, status, checkout | commit | No |
| ck-spec | Specifications | create, validate, decompose, execute | create | No |
| ck-quality | Code quality | code-review, refactor, verify-setup | code-review, refactor | **Yes** |
| ck-agents-md | AI config | init, migration, cli | - | No |
| ck-dev | Development utilities | cleanup, verify-setup | - | **Yes** |

> **Note**: Checkpoints are built-in to Claude Code. Use `/rewind` or Esc+Esc.

## Model-Invocable Skills

Just describe what you want (confirmation required for changes):
- "commit my changes" → commit skill (confirms before staging)
- "review my code" → code-review skill
- "refactor this code" → refactor skill
```

## Open Questions

1. **Repository Structure**
   - ✅ **Decision**: Single repo `claudekit/plugins` for easier maintenance

2. **Versioning Strategy**
   - ✅ **Decision**: Independent plugin versions, marketplace tracks compatibility

3. **Hook Distribution**
   - ✅ **Decision**: Keep in claudekit CLI, document dependency prominently

4. **Skill Granularity**
   - ✅ **Decision**: Broader skills for natural language, commands for precision

5. **Community Submission**
   - ✅ **Decision**: Both official and community registries

6. **Plugin Naming**
   - ✅ **Decision**: Use `ck-` prefix to avoid conflicts (ck-git, ck-checkpoint, etc.)

## Success Metrics

1. **Adoption**: Number of marketplace installations
2. **Plugin Usage**: Individual plugin install counts
3. **Skill Invocations**: Natural language trigger success rate
4. **Community Feedback**: GitHub stars, issues, PRs
5. **Registry Presence**: Listed on major registries

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- Create `claudekit/plugins` repository
- Migrate commands to plugin format with `ck-` prefix
- Create marketplace.json

### Phase 2: Skills (Week 2)
- Develop SKILL.md for top 5 commands
- Implement confirmation gates for destructive operations
- Test skill auto-invocation
- Iterate on trigger descriptions

### Phase 3: Integration (Week 3)
- Configure hooks for plugins with fallback error messages
- Add verify-setup commands
- Migrate subagents to ck-experts plugin
- End-to-end testing

### Phase 4: Publishing (Week 4)
- Publish to GitHub
- Submit to registries
- Update documentation
- Announce release

## References

### Claude Code Documentation
- [Create Plugins](https://code.claude.com/docs/en/plugins)
- [Skills Documentation](https://code.claude.com/docs/en/skills)
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Discover Plugins](https://code.claude.com/docs/en/discover-plugins)

### Community Resources
- [claude-plugins.dev](https://claude-plugins.dev/) - Community registry
- [Anthropic Skills](https://github.com/anthropics/skills) - Official skills
- [Claude Market](https://github.com/claude-market/marketplace) - Open source marketplace
- [secondsky/claude-skills](https://github.com/secondsky/claude-skills) - Production skills examples

### Internal References
- [Embedded Hooks System Spec](./archive/feat-embedded-hooks-system.md)
- [Domain Expert Subagents Spec](./archive/feat-domain-expert-subagents.md)

## Appendix: Official Plugins Analysis

Analysis of `anthropics/claude-plugins-official` repository (15+ plugins) revealed these implementation patterns:

### Plugin Categories Analyzed

| Category | Plugins | Key Features |
|----------|---------|--------------|
| **Reference** | example-plugin | Minimal structure, documentation |
| **Git Workflow** | commit-commands | Skill triggers, commit conventions |
| **Code Review** | code-review, pr-review-toolkit | Multi-aspect analysis, fork context |
| **Development** | feature-dev, plugin-dev | Planning workflows, skill chaining |
| **Hooks** | hookify | PostToolUse quality checks |
| **LSP** | *-lsp plugins | Language server integration |
| **Output Style** | output-style-* | SessionStart behavior modification |
| **Loops** | ralph-loop | Stop hook for iteration |
| **Security** | security-guidance | PreToolUse validation |
| **Other** | agent-sdk-dev, code-simplifier, frontend-design | Domain-specific expertise |

### Key Takeaways

1. **Minimal Manifests**: Most official plugins use only `name` and `description` in plugin.json
2. **Trigger Patterns**: Descriptions include "Use when..." phrases for model invocation
3. **Self-Contained**: No shared libraries between plugins
4. **Hook Variety**: SessionStart, PreToolUse, PostToolUse, and Stop hooks all have valid use cases
5. **Agent Examples**: Include `<agent-example>` blocks in skill descriptions for training
6. **Fork Context**: Complex analysis skills use `context: fork` for clean output
