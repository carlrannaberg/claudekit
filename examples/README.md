# Claudekit Configuration Examples

This directory contains example configuration files for the claudekit embedded hooks system.

## Configuration Files

### Hook Configuration (.claudekit/config.json)

These files customize the behavior of embedded hooks in your project:

- **[config-minimal.json](config-minimal.json)** - Bare minimum configuration to get started
- **[config-npm.json](config-npm.json)** - Configuration for npm-based projects
- **[config-yarn.json](config-yarn.json)** - Configuration for Yarn projects with workspace support
- **[config-custom.json](config-custom.json)** - Advanced configuration with custom scripts and pipelines

### Claude Settings (.claude/settings.json)

These files configure when hooks are triggered in Claude Code:

- **[claude-settings-embedded.json](claude-settings-embedded.json)** - Example showing matcher patterns for embedded hooks
- **[claude-settings-poc.json](claude-settings-poc.json)** - Proof-of-concept settings (legacy)

### Other Examples

- **[settings.user.example.json](settings.user.example.json)** - User-level settings (environment variables only)

## Quick Start

1. **Choose a configuration template** based on your project type
2. **Copy it to your project**:
   ```bash
   mkdir -p .claudekit
   cp examples/config-npm.json .claudekit/config.json
   ```
3. **Customize the settings** for your specific needs
4. **Update Claude settings** to use embedded hooks:
   ```bash
   cp examples/claude-settings-embedded.json .claude/settings.json
   ```

## Configuration Options

### Hook Configuration

Each hook supports these common options:
- `command` - Custom command to run (overrides built-in behavior)
- `timeout` - Maximum execution time in milliseconds
- `env` - Environment variables for the command

### Matcher Patterns

Claude settings support flexible matching:
- `"Write"` - Match single tool
- `"Write,Edit"` - Match multiple tools (OR)
- `"tools:Write AND file_paths:**/*.ts"` - Conditional matching
- `"*"` - Match all events

## Best Practices

1. **Start minimal** - Use the minimal configuration and add options as needed
2. **Set appropriate timeouts** - Balance between giving enough time and avoiding hangs
3. **Use specific matchers** - Target hooks to relevant file types
4. **Test incrementally** - Add one hook at a time and verify it works
5. **Check logs** - Review `.claudekit/hooks.log` for debugging

## Hook Types

### Available Hooks

- `typecheck` - TypeScript type checking
- `no-any` - Detect TypeScript 'any' usage
- `eslint` - JavaScript/TypeScript linting
- `run-related-tests` - Run tests for changed files
- `auto-checkpoint` - Create git checkpoints
- `project-validation` - Full project validation
- `validate-todo-completion` - Check todo list completion

### Custom Hooks

You can create custom hooks by:
1. Adding a new hook name in your config
2. Specifying a `command` to run
3. Configuring when it triggers in Claude settings

## Troubleshooting

If hooks aren't working:
1. Check that `claudekit-hooks` is in your PATH
2. Verify your configuration JSON is valid
3. Look for errors in `.claudekit/hooks.log`
4. Test hooks manually: `claudekit-hooks <hook-name>`