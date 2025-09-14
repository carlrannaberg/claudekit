# Technical overview

# Prerequisites

To understand claudekit's architecture, you should first be familiar with these Claude Code concepts:

- **[Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)** - Slash commands in markdown format that Claude interprets as instructions. Claudekit extends Claude Code with custom commands for git workflows, checkpointing, spec-driven development, and more.

- **[Subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)** - Specialized experts that handle specific technical domains. Claudekit provides 30+ expert subagents for TypeScript, React, databases, testing, and other specialized areas.

- **[Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)** - Event-triggered scripts that run automatically during Claude Code sessions. Claudekit's core automation comes from hooks that validate code, run tests, create checkpoints, and maintain code quality.

# Architecture

## Commands

Claude slash commands in markdown format.

## Subagents

Claude subagents in markdown format.

## Hooks

Hook scripts, which are configured to run on specific Claude Code events

## CLI

### claudekit

Interactive setup

### claudekit-hooks

Used for running hooks

## Configuration

.claude/settings.json - project hook configuration

.claude/commands/ - project commands

.claude/agents/ - project subagents

.claudekit/config.json - project claudekit config

~/.claude/settings.json - user hooks configuration

~/.claude/commands/ - user commands

~/.claude/agents/ - user subagents

~/.claudekit/config.json - user claudekit config

~/.claudekit/logs - hook executions

~/.claudekit/sessions - session id and context identifier mappings

## Release pipeline

### Prepare release script

### Release GitHub action

# Basic utilities

## Validate and fix issues

### Commands

/validate-and-fix

## Temporary file cleanup

### Commands

/dev:cleanup

## Thinking level

### Hooks

thinking-level

## Agents.md

### Commands

/agents-md:init

/agents-md:migration

/agents-md:cli

## Create commands and agents

### Commands

/create-command

/create-subagent

## Session-based hook control

### Commands

/hook:disable

/hook:enable

/hook:status

## Bash tool timeout config

### Commands

/config:bash-timeout

# Expert subagents

## Generic

triage-expert

refactoring-expert

documentation-expert

cli-expert

## Technology focused

### Build tools

vite-expert

webpack-expert

### Code quality

linting-expert

### Database

database-expert

mongodb-expert

postgres-expert

### Devops

devops-expert

docker-expert

github-actions-expert

### E2E testing

playwright-expert

### Framework

ai-sdk-expert

nestjs-expert

nextjs-expert

### Frontend

accessibility-expert

css-styling-expert

### Git

git-expert

### Node.js

nodejs-expert

### React

react-expert

react-performance-expert

### Testing

testing-expert

jest-expert

vitest-expert

### Typescript

typescript-expert

typescript-build-expert

typescript-type-expert

# Workflows

## Git

/git:ignore-init

/git:status

/git:checkout

/git:commit

/git:push

## GitHub

/gh:repo-init

## Code search

### Commands

/code-review

### Subagents

code-review-expert

## Research

### Commands

/research

### Subagents

research

## Spec-driven development

### Commands

/spec:create

/spec:validate

/spec:decompose

/spec:execute

## Checkpointing

### Hooks

create-checkpoint

### Commands

/checkpoint:create

/checkpoint:restore

/checkpoint:list

## Codebase map

### Hooks

codebase-map

codebase-map-update

## File guard

file-guard

## Quality checks

### Hooks

check-unused-parameters

check-comment-replacement

check-todos

## Typescript type checking

### Hooks

check-any-changed

typecheck-changed

type-check-project

## Linter checking

### Hooks

lint-changed

lint-project

## Test running

### Hooks

test-changed

test-project

## Self-review

### Hooks

self-review

### Subagents

code-review-expert

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
