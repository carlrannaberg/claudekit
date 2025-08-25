# CLI Reference

Command-line tools provided by claudekit for setup, management, and validation.

## Core Commands

### `claudekit setup`
Initialize claudekit in your project with interactive configuration.

```bash
claudekit setup [options]

Options:
  -f, --force               Overwrite existing .claude directory
  -y, --yes                 Automatic yes to prompts (use defaults)
  --all                     Install all features including all 24+ agents
  --skip-agents             Skip subagent installation
  --commands <list>         Comma-separated list of command IDs to install
  --hooks <list>            Comma-separated list of hook IDs to install  
  --agents <list>           Comma-separated list of agent IDs to install
  --user                    Install in user directory (~/.claude) instead of project
  --project <path>          Target directory for project installation
  --select-individual       Use legacy individual component selection
```

**Examples:**
```bash
# Interactive setup (recommended)
claudekit setup

# Install everything with defaults
claudekit setup --all --yes

# Install specific components
claudekit setup --commands git:commit,spec:create --hooks typecheck-changed

# Install for user globally
claudekit setup --user
```

### `claudekit install`
Install specific hooks and commands into your project.

```bash
claudekit install [component...] [options]

Options:
  -t, --type <type>         Component type: hook, command, or all
  -c, --category <category> Filter by category (e.g., validation, git)
  --essential               Install only essential components
  --dry-run                Show what would be installed

Examples:
  claudekit install                    # Install all recommended
  claudekit install typecheck eslint   # Install specific components
  claudekit install --type command     # Install all commands
  claudekit install --category git     # Install git-related components
```

### `claudekit list`
List installed hooks, commands, and configuration.

```bash
claudekit list [options]

Options:
  -t, --type <type>    List specific type: hooks, commands, or all
  -v, --verbose        Show detailed information

Examples:
  claudekit list                # Show all installed components
  claudekit list --type hooks   # Show only hooks
  claudekit list -v             # Show detailed information
```

### `claudekit doctor`
Run project validation checks to diagnose installation and configuration issues.

```bash
claudekit doctor [options]

Options:
  -q, --quiet         Only show errors
  -v, --verbose       Show detailed validation information
  --prerequisites     Check development prerequisites

Examples:
  claudekit doctor             # Check installation
  claudekit doctor --verbose   # Show detailed results
  claudekit doctor --quiet     # Only show problems
```

## Hook Management

### `claudekit-hooks`
Manage and execute the embedded hooks system.

```bash
claudekit-hooks <command> [options]

Commands:
  run <hook>      Run a specific hook
  list            List all available hooks
  stats           Show hook execution statistics
  recent [limit]  Show recent hook executions (default: 20)
  profile [hook]  Profile hook performance (time and output)

Options:
  --config <path>  Path to config file (default: .claudekit/config.json)
  --debug          Enable debug logging
  
Profile Options:
  -i, --iterations <n>  Number of iterations for averaging (default: 1)
```

**Examples:**
```bash
# Run a specific hook
claudekit-hooks run typecheck-changed

# List all available hooks
claudekit-hooks list

# Show execution statistics
claudekit-hooks stats

# View recent executions
claudekit-hooks recent 10

# Profile all configured hooks
claudekit-hooks profile

# Profile specific hook with multiple iterations
claudekit-hooks profile typecheck-changed --iterations 5
```

**Testing Hooks Directly:**
```bash
# Test TypeScript validation
echo '{"tool_input": {"file_path": "/path/to/file.ts"}}' | claudekit-hooks run typecheck-changed

# Test ESLint validation
echo '{"tool_input": {"file_path": "/path/to/file.js"}}' | claudekit-hooks run lint-changed

# Test auto-checkpoint (no input needed)
claudekit-hooks run create-checkpoint
```

## Linting Commands

### `claudekit lint-subagents`
Validate subagent markdown files for proper frontmatter and structure.

```bash
claudekit lint-subagents [directory] [options]

Options:
  -q, --quiet      Suppress suggestions, show only errors
  -v, --verbose    Show all files including valid ones

Examples:
  claudekit lint-subagents              # Lint .claude/agents
  claudekit lint-subagents src/agents   # Lint specific directory
  claudekit lint-subagents -q           # Only show errors
```

**What it checks:**
- Required frontmatter fields (name, description)
- Tools field validation (empty fields, proper syntax, valid tool names)
- Proper markdown structure
- File naming conventions
- Configuration best practices (warns about empty tools fields that grant no permissions)

### `claudekit lint-commands`
Validate slash command markdown files.

```bash
claudekit lint-commands [directory] [options]

Options:
  -q, --quiet      Suppress suggestions, show only errors
  -v, --verbose    Show all files including valid ones

Examples:
  claudekit lint-commands               # Lint .claude/commands
  claudekit lint-commands src/commands  # Lint specific directory
  claudekit lint-commands -v            # Show all files
```

**What it checks:**
- Required frontmatter (description, allowed-tools)
- Tool permission syntax
- Command structure and conventions
- Security restrictions

## Global Installation

When installed globally (`npm install -g claudekit`), commands are available system-wide:

```bash
# Available from any directory
claudekit setup
claudekit doctor
claudekit-hooks list
```

## Configuration Files

### Project Configuration
`.claude/settings.json` - Project-specific hook configuration
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{"type": "command", "command": "claudekit-hooks run typecheck-changed"}]
      }
    ]
  }
}
```

### User Configuration
`~/.claude/settings.json` - User-level environment variables
```json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "600000",
    "CUSTOM_VAR": "value"
  }
}
```

## Environment Variables

### Timeout Configuration
```bash
# Set default bash timeout (milliseconds)
export BASH_DEFAULT_TIMEOUT_MS=600000  # 10 minutes

# Set maximum allowed timeout
export BASH_MAX_TIMEOUT_MS=1200000     # 20 minutes
```

### Debug Mode
```bash
# Enable debug logging
export CLAUDEKIT_DEBUG=1

# Run with debug output
CLAUDEKIT_DEBUG=1 claudekit-hooks run typecheck-changed
```

## Common Workflows

### Initial Setup
```bash
# 1. Install claudekit globally
npm install -g claudekit

# 2. Navigate to your project
cd my-project

# 3. Run interactive setup
claudekit setup

# 4. Validate installation
claudekit doctor
```

### Adding to Existing Project
```bash
# Add specific features to existing project
claudekit install --type hooks --category validation
claudekit install git:commit checkpoint:create
```

### Debugging Issues
```bash
# Check installation status
claudekit doctor --verbose

# View recent hook executions
claudekit-hooks recent

# Test specific hook
echo '{"tool_input": {"file_path": "test.ts"}}' | claudekit-hooks run typecheck-changed --debug
```

## Tips and Best Practices

1. **Start with recommended defaults**: Use `claudekit setup` without flags for guided setup
2. **Test hooks before enabling**: Use `claudekit-hooks run` to test individual hooks
3. **Monitor performance**: Use `claudekit-hooks stats` to identify slow hooks
4. **Keep hooks fast**: Hooks should complete quickly to avoid disrupting workflow
5. **Use project-level settings**: Keep user settings minimal (environment vars only)
6. **Regular validation**: Run `claudekit doctor` after updates

## Troubleshooting

### Installation Issues
```bash
# Force reinstall
claudekit setup --force

# Check for conflicts
claudekit doctor --verbose
```

### Hook Not Triggering
```bash
# Check hook is configured
cat .claude/settings.json

# Test hook directly
claudekit-hooks run <hook-name> --debug

# Check recent executions
claudekit-hooks recent
```

### Performance Problems
```bash
# View execution statistics
claudekit-hooks stats

# Identify slow hooks
claudekit-hooks recent --verbose
```

## See Also

- [Slash Commands Reference](commands.md) - Claude Code slash commands
- [Hooks Reference](hooks.md) - Hook system documentation
- [Configuration Guide](../getting-started/configuration.md) - Detailed configuration options