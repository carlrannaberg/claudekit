# Quick Start Guide

Get up and running with claudekit in minutes!

## Installation

```bash
npm install -g claudekit
```

Or with other package managers:
```bash
yarn global add claudekit
pnpm add -g claudekit
```

## Initial Setup

### 1. Initialize claudekit in your project

```bash
cd your-project
claudekit setup
```

This will:
- Create a `.claude` directory
- Analyze your project for TypeScript, ESLint, testing frameworks
- Generate a recommended `settings.json` configuration
- Set up directories for hooks and commands

### 2. Test the installation

```bash
# List available hooks
claudekit-hooks list

# Test a hook manually
claudekit-hooks test typecheck-changed --file src/index.ts
```

## Basic Configuration

### Minimal Setup

For a simple TypeScript project, your `.claude/settings.json` might look like:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run create-checkpoint"}
        ]
      }
    ]
  }
}
```

### Common Configurations

#### TypeScript + ESLint + Testing

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": "claudekit-hooks run check-any-changed"}
        ]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run lint-changed"}
        ]
      },
      {
        "matcher": "Write,Edit,MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run test-changed"}
        ]
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

## Using Slash Commands

claudekit provides powerful slash commands for Claude Code:

### Essential Commands

```bash
# Create a git checkpoint
/checkpoint:create Working on new feature

# View git status with insights
/git:status

# Create a smart commit
/git:commit

# Validate and auto-fix code issues
/validate-and-fix
```

### Specification Commands

```bash
# Generate a feature specification
/spec:create user authentication

# Validate a specification
/spec:validate specs/auth.md

# Decompose into tasks
/spec:decompose specs/auth.md
```

## Common Workflows

### 1. Starting a New Feature

```bash
# Create a checkpoint before starting
/checkpoint:create Starting feature X

# Generate a specification
/spec:create feature X

# Work on the feature...
# Hooks will automatically validate your code
```

### 2. Committing Changes

```bash
# Check what will be committed
/git:status

# Create a commit following conventions
/git:commit
```

### 3. Debugging Hook Issues

```bash
# Test hooks outside Claude Code
claudekit-hooks test lint-changed --file src/problematic.js

# Check hook configuration
claudekit list --verbose
```

## Customizing Hooks

You can configure hooks in `.claudekit/config.json`:

```json
{
  "hooks": {
    "typecheck-changed": {
      "timeout": 60000,
      "tsconfig": "tsconfig.strict.json"
    },
    "lint-changed": {
      "fix": true,
      "cache": true
    },
    "create-checkpoint": {
      "prefix": "my-project",
      "maxCheckpoints": 20
    }
  }
}
```

## Troubleshooting

### Hook Not Running

1. Check the matcher pattern in `.claude/settings.json`
2. Verify the hook is installed: `claudekit list`
3. Test manually: `claudekit-hooks test <hook-name>`

### TypeScript Errors

1. Ensure TypeScript is installed in your project
2. Check for `tsconfig.json`
3. Test with: `claudekit-hooks test typecheck-changed`

### ESLint Issues

1. Verify ESLint configuration exists
2. Check supported file extensions
3. Test with: `claudekit-hooks test lint-changed`

## Next Steps

- Read the [full documentation](../README.md)
- Explore [available hooks](../reference/hooks.md)
- Learn about [custom commands](../reference/commands.md)
- Set up [AI assistant configuration](configuration.md)