# Getting Started with claudekit

A comprehensive guide to setting up and using claudekit with Claude Code.

## What is claudekit?

claudekit is a powerful toolkit that enhances Claude Code with:
- **Automated code quality checks** - TypeScript, ESLint, and more
- **Git workflow commands** - Smart commits, checkpoints, and status
- **Specification tools** - Generate and validate feature specifications
- **Development utilities** - File cleanup, todo tracking, and more

## Prerequisites

- **Node.js** 20 or higher
- **Claude Code** installed and configured
- **Git** for version control features
- A JavaScript/TypeScript project (other languages have limited support)

## Installation Options

### Global Installation (Recommended)

```bash
npm install -g claudekit
```

This installs:
- `claudekit` - Main CLI tool
- `claudekit-hooks` - Embedded hooks executable

### Project-Level Installation

```bash
npm install --save-dev claudekit
```

Then use with `npx`:
```bash
npx claudekit setup
```

## Setting Up Your First Project

### Step 1: Initialize claudekit

Navigate to your project and run:

```bash
claudekit setup
```

This command will:
1. Analyze your project structure
2. Detect TypeScript, ESLint, testing frameworks
3. Create `.claude/settings.json` with recommendations
4. Set up the necessary directories

Example output:
```
🚀 Initializing claudekit...

📊 Project Analysis:
  ✓ TypeScript detected (tsconfig.json found)
  ✓ ESLint configured (.eslintrc.json found)
  ✓ Jest testing framework detected
  ✓ Git repository initialized

📝 Created .claude/settings.json with recommended configuration
✅ claudekit setup complete!
```

### Step 2: Review the Configuration

Open `.claude/settings.json` to see your configuration:

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
    ]
  }
}
```

### Step 3: Test Your Setup

Test that hooks are working:

```bash
# List installed hooks
claudekit list

# Test a specific hook
claudekit-hooks test typecheck-changed --file src/index.ts
```

## Understanding Hooks

### What are Hooks?

Hooks are automated checks that run when you interact with files in Claude Code:

- **PostToolUse** - After file modifications
- **Stop** - When Claude Code session ends
- **PreToolUse** - Before operations (optional)

### Available Hooks

#### Code Quality Hooks
- `typecheck-changed` - TypeScript type checking on changed files
- `check-any-changed` - Forbid 'any' types in changed files
- `lint-changed` - ESLint validation on changed files
- `prettier` - Code formatting

#### Workflow Hooks
- `create-checkpoint` - Save work automatically
- `test-changed` - Run tests related to changed files
- `check-todos` - Check todo completion status
- Split into `typecheck-project`, `lint-project`, `test-project` - Full project checks

### Hook Matchers

Matchers determine when hooks run:

```json
// Run on TypeScript files only
"matcher": "Write|Edit|MultiEdit"

// Run on any JavaScript/TypeScript file
"matcher": "Write|Edit|MultiEdit"

// Run on any file modification
"matcher": "Write,Edit,MultiEdit"

// Run always (for Stop event)
"matcher": "*"
```

## Using Slash Commands

Slash commands are typed directly in Claude Code:

### Git Workflow

```bash
# Create a checkpoint before major changes
/checkpoint:create Starting refactor

# Check git status with insights
/git:status

# Create a conventional commit
/git:commit

# Push to remote (with safety checks)
/git:push
```

### Development Tools

```bash
# Run all validations and fix issues
/validate-and-fix

# Clean up temporary files
/dev:cleanup

# Generate a feature specification
/spec:create user authentication system
```

### Configuration

```bash
# Initialize AGENT.md for AI assistants
/agent:init

# Configure bash timeout
/config:bash-timeout 30s project
```

## Example Workflows

### Starting a New Feature

1. **Create a checkpoint**
   ```
   /checkpoint:create Starting user auth feature
   ```

2. **Generate specification**
   ```
   /spec:create user authentication with JWT
   ```

3. **Work on the feature**
   - claudekit automatically validates your code
   - Tests run when you modify files
   - TypeScript checks on .ts file saves

4. **Commit your work**
   ```
   /git:commit
   ```

### Debugging Issues

1. **Check what's wrong**
   ```
   /validate-and-fix
   ```

2. **Run specific validations**
   ```bash
   claudekit-hooks test lint-changed --file src/auth.js
   ```

3. **View logs**
   ```bash
   cat ~/.claude/hooks.log
   ```

## Configuring for Your Project

### TypeScript Projects

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
      }
    ]
  }
}
```

### JavaScript Projects

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run lint-changed"},
          {"type": "command", "command": "claudekit-hooks run prettier"}
        ]
      }
    ]
  }
}
```

### Full-Stack Projects

See `examples/settings.complete.json` for a comprehensive configuration.

## Hook Configuration

Customize hook behavior in `.claudekit/config.json`:

```json
{
  "hooks": {
    "typecheck-changed": {
      "timeout": 60000,
      "tsconfig": "tsconfig.strict.json",
      "incremental": true
    },
    "lint-changed": {
      "fix": true,
      "cache": true,
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "quiet": false
    },
    "create-checkpoint": {
      "prefix": "my-project",
      "maxCheckpoints": 20,
      "includeUntracked": true
    }
  }
}
```

## Troubleshooting

### Common Issues

#### "Hook not found"
- Run `claudekit list` to see installed hooks
- Ensure claudekit is installed globally
- Check PATH includes npm global bin directory

#### "Command not found: claudekit-hooks"
```bash
# Reinstall claudekit globally
npm uninstall -g claudekit
npm install -g claudekit
```

#### Hooks not triggering
1. Check matcher patterns in `.claude/settings.json`
2. Verify file extensions match
3. Test manually: `claudekit-hooks test <hook>`

#### TypeScript errors but no tsconfig.json
```bash
# Create a basic tsconfig.json
npx tsc --init
```

### Getting Help

- Check logs: `~/.claude/hooks.log`
- Run with verbose mode: `CLAUDEKIT_VERBOSE=true`
- Test hooks individually
- Review [documentation](../README.md)

## Best Practices

1. **Start Simple** - Begin with typecheck-changed and create-checkpoint
2. **Test Incrementally** - Add one hook at a time
3. **Use Checkpoints** - Create checkpoints before major changes
4. **Configure Timeouts** - Adjust timeouts for large projects
5. **Review Logs** - Check logs when hooks behave unexpectedly

## Next Steps

- Explore [all available hooks](hooks-reference.md)
- Learn to [create custom commands](create-command-documentation.md)
- Set up [AGENT.md](agent-commands-documentation.md) for your project
- Read about [advanced configuration](claude-code-configuration.md)