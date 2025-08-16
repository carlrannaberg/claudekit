![claudekit banner](assets/banner.png)

# claudekit

> Intelligent guardrails and workflow automation for Claude Code - catch errors in real-time, save checkpoints, and enhance AI coding with 24+ expert subagents

[![npm version](https://img.shields.io/npm/v/claudekit.svg)](https://www.npmjs.com/package/claudekit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/claudekit.svg)](https://nodejs.org)

## 🚀 Installation

> **⚠️ Requires:** Claude Code **Max plan** (for optimal token usage) • Node.js 20+

```bash
npm install -g claudekit
# or: yarn global add claudekit
# or: pnpm add -g claudekit
```

## ⚡ Quick Start

```bash
# Initialize in your project
claudekit setup

# In Claude Code, try these commands:
/git:status                             # Groups changes by type & suggests commit strategy
/validate-and-fix                       # Runs lint, tests, typecheck & fixes issues
/spec:create "your next feature"        # Researches codebase & writes full spec
```

## 🎯 What It Does

Claudekit acts as your safety net while coding with Claude:

```
Before: Claude adds 'any' type → ❌ Lost type safety discovered in code review
After:  Claude adds 'any' type → ✅ Instant block: "Use specific type: User | null"

Before: Risky refactor fails → ❌ Git archaeology to find working version  
After:  Risky refactor fails → ✅ One command: /checkpoint:restore

Before: Claude breaks tests → ❌ You discover it after Claude finishes
After:  Claude breaks tests → ✅ Claude sees error immediately and fixes it
```

## Key Features

### 🛡️ Real-time Error Prevention
- **TypeScript Guard**: Blocks `any` types and type errors as Claude edits
- **Linting**: Catches style issues immediately  
- **Anti-patterns**: Prevents code replacement with comments
- **Test Runner**: Runs relevant tests on file changes

### 💾 Git Checkpoint System
- **Auto-save**: Creates checkpoints when Claude stops
- **Easy restore**: `/checkpoint:restore` to undo changes
- **Checkpoint management**: List, restore, or clean up checkpoints

### 🤖 24+ AI Subagents
- **Domain experts**: TypeScript, React, database, testing specialists
- **Proactive help**: Run `/agent-md:init` to update AGENT.md/CLAUDE.md for automatic subagent delegation
- **Deep debugging**: Oracle agent for complex problem analysis

### 📝 Smart Commands
- `/git:commit` - Creates commits following your project's conventions
- `/validate-and-fix` - Runs all quality checks and fixes issues
- `/spec:create` - Generates comprehensive specifications
- `/create-subagent` - Build custom AI assistants

## Commands

### CLI Commands

```bash
claudekit setup              # Interactive setup wizard
claudekit setup --yes        # Quick setup with defaults
claudekit setup --all        # Install everything (24+ agents)
claudekit list               # Show all components (hooks, commands, agents, config)
claudekit list agents        # List available agents with token counts
claudekit list commands      # List available commands with token counts
claudekit show agent <id>    # Display agent prompt for external use
claudekit show command <id>  # Display command prompt for external use
claudekit validate           # Check your installation
```

### Slash Commands in Claude Code

**Git & Checkpoints**
- `/checkpoint:create [msg]` - Save current state
- `/checkpoint:restore [n]` - Restore to checkpoint
- `/checkpoint:list` - View all checkpoints
- `/git:commit` - Smart commit with conventions
- `/git:status` - Intelligent git analysis

**Development Tools**
- `/validate-and-fix` - Run all quality checks
- `/spec:create [feature]` - Generate specifications
- `/agent-md:init` - Configure AI assistants
- `/create-subagent` - Build custom agents
- `/create-command` - Create custom commands

#### Show Command Examples

The `show` command extracts prompts for use with Claude Code's non-interactive mode:

```bash
# Get agent prompt in text format (default)
claudekit show agent typescript-expert

# Use with Claude Code non-interactive mode (primary use case)
EXPERT=$(claudekit show agent typescript-expert)
cat src/app.ts | claude -p --append-system-prompt "$EXPERT" "Review this code"

# Get metadata in JSON format
claudekit show agent react-performance-expert --format json

# Show command prompts
claudekit show command spec:create

# Pipe directly to Claude Code
claudekit show agent postgres-expert | \
  claude -p "Optimize: SELECT * FROM orders WHERE status='pending'"

# Use in CI/CD pipelines
git diff main..HEAD | claude -p \
  --append-system-prompt "$(claudekit show agent git-expert)" \
  --output-format json \
  "Review these changes"

# Extract specific fields with jq
claudekit show agent typescript-expert --format json | jq -r '.description'

# Works with other AI coding CLI tools
amp -x "$(claudekit show agent typescript-expert)

Fix all TypeScript strict mode errors in src/"
cat schema.sql | gemini -c "$(claudekit show agent postgres-expert). Add missing indexes"
opencode -p "$(claudekit show agent testing-expert)

Write unit tests for all untested functions" -q
```

**Compatible with:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code/cli), [Amp](https://ampcode.com/), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [Cursor CLI](https://cursor.com/cli), [Codex](https://github.com/openai/codex), [OpenCode](https://github.com/sst/opencode)

See the [usage guide](docs/guides/using-prompts-with-external-llms.md) for detailed integration examples.

[View all commands →](docs/reference/commands.md)

## Hooks

Hooks automatically enforce quality as Claude works:

### Available Hooks

**File Change Hooks** (PostToolUse - run on edit)
- `typecheck-changed` - Run TypeScript type checking on file changes
- `lint-changed` - Run ESLint validation on changed files
- `test-changed` - Run tests for changed files
- `check-any-changed` - Forbid any types in changed TypeScript files
- `check-comment-replacement` - Detect when code is replaced with comments
- `check-unused-parameters` - Detect lazy refactoring where parameters are prefixed with _ instead of being removed

**Project-Wide Hooks** (typically for Stop/SubagentStop events)
- `typecheck-project` - TypeScript validation on entire project
- `lint-project` - ESLint validation on entire project
- `test-project` - Run full test suite
- `create-checkpoint` - Git auto-checkpoint on stop
- `check-todos` - Validate todo completions
- `self-review` - Prompts a critical self-review to catch integration and refactoring issues

### Hook Events

**PostToolUse** - Triggered after file modifications (Write, Edit, MultiEdit)
**Stop** - Triggered when Claude Code stops or conversation ends
**SubagentStop** - Triggered when subagents complete their tasks

### List Available Hooks

```bash
# See all available hooks with descriptions
claudekit-hooks list
```

[Hook configuration →](docs/reference/hooks.md)

## Subagents

Specialized AI assistants for different domains:

**Popular Agents**
- `oracle` - Deep debugging with GPT-5 ([requires setup](docs/integrations/oracle.md))
- `typescript-expert` - TypeScript/JavaScript specialist
- `react-expert` - React patterns and performance
- `testing-expert` - Test architecture and patterns
- `database-expert` - Query optimization, schema design

**Usage**
```bash
# List all available agents with token counts
claudekit list agents

# Install specific agents
claudekit setup --agents typescript-expert,react-expert

# Or ask Claude directly
"Use the oracle agent to debug this issue"
```

[View all 24+ agents →](docs/reference/subagents.md)

## Configuration

Claudekit uses two configuration files:

**`.claude/settings.json`** - Project settings (hooks, commands)
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
    }],
    "Stop": [{
      "matcher": "*",
      "hooks": [{"type": "command", "command": "claudekit-hooks run create-checkpoint"}]
    }],
    "SubagentStop": [{
      "matcher": "*",
      "hooks": [{"type": "command", "command": "claudekit-hooks run create-checkpoint"}]
    }]
  }
}
```

**`.claudekit/config.json`** - Hook configuration
```json
{
  "hooks": {
    "typecheck-changed": {
      "command": "npm run typecheck"
    }
  }
}
```

[Configuration guide →](docs/getting-started/configuration.md)

## Getting Help

- **Documentation**: [Full docs](docs/)
- **Issues**: [GitHub Issues](https://github.com/claudekit/claudekit/issues)
- **Quick test**: `claudekit validate` to check setup

## Common Issues

**Hooks not triggering?**
```bash
claudekit validate              # Check configuration
npm list -g claudekit           # Verify installation
```

**Tests timing out?**
Configure faster test command in `.claudekit/config.json`:
```json
{
  "hooks": {
    "test-project": {
      "command": "npm run test:unit",
      "timeout": 50000
    }
  }
}
```

[Full troubleshooting →](docs/getting-started/troubleshooting.md)

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

## Development

```bash
# Clone and install
git clone https://github.com/claudekit/claudekit.git
cd claudekit
npm install

# Build
npm run build

# Test
npm test

# Create symlinks for development
npm run symlinks
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [claudekit contributors](https://github.com/carlrannaberg/claudekit/graphs/contributors)