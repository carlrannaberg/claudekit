# claudekit Configuration Examples

This directory contains example configurations for various project types and scenarios.

## Quick Reference

### Basic Examples

- **`settings.minimal.json`** - Bare minimum configuration with just TypeScript checking
- **`settings.complete.json`** - Comprehensive setup with all common hooks
- **`settings.example-with-comments.json`** - Fully documented example explaining each option

### Language-Specific

- **`settings.typescript.json`** - TypeScript projects with strict type checking
- **`settings.javascript.json`** - JavaScript-only projects with ESLint and Prettier
- **`settings.python.json`** - Python project example (requires Python-specific hooks)

### Special Use Cases

- **`settings.ci-cd.json`** - CI/CD pipeline validation (GitHub Actions, Docker, Jenkins)
- **`settings.user.example.json`** - User-level environment variables (goes in `~/.claude/`)

### Legacy Examples

- **`claude-settings-embedded.json`** - Comprehensive embedded hooks example
- **`claude-settings-poc.json`** - Proof of concept configuration

## How to Use These Examples

1. **Choose an example** that matches your project type
2. **Copy to your project**:
   ```bash
   cp examples/settings.typescript.json .claude/settings.json
   ```
3. **Customize as needed** - adjust matchers, add/remove hooks
4. **Test your configuration**:
   ```bash
   claudekit list --verbose
   ```

## Configuration Structure

All settings files follow this structure:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "matcher-pattern",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run hook-name"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run auto-checkpoint"}
        ]
      }
    ]
  }
}
```

## Key Concepts

### Matchers

Matchers determine when hooks run:

- `"Write|Edit|MultiEdit"` - TypeScript files only
- `"Write,Edit,MultiEdit"` - Any file modification
- `"*"` - Universal (matches everything)
- `"Notebook.*"` - Regex pattern for Notebook tools

### Hook Commands

All hooks use the embedded format:
```json
{"type": "command", "command": "claudekit-hooks run <hook-name>"}
```

Available hooks:
- `typecheck` - TypeScript type checking
- `no-any` - Forbid 'any' types
- `eslint` - ESLint validation
- `prettier` - Code formatting
- `auto-checkpoint` - Automatic git checkpoints
- `run-related-tests` - Run tests for modified files
- `validate-todo-completion` - Check todo completion
- `project-validation` - Full project validation

## Customizing for Your Project

1. **Start with a template** - Pick the closest match
2. **Adjust file patterns** - Update matchers for your file types
3. **Add project-specific hooks** - Include additional validations
4. **Configure hook settings** - Create `.claudekit/config.json` for hook options

Example `.claudekit/config.json`:
```json
{
  "hooks": {
    "typecheck": {
      "timeout": 60000,
      "tsconfig": "tsconfig.strict.json"
    },
    "eslint": {
      "fix": true,
      "cache": true
    }
  }
}
```

## Migration from Old Format

If you have old configuration files using shell scripts, see [MIGRATION_NOTE.md](MIGRATION_NOTE.md) for upgrade instructions.

## Getting Help

- See the [Installation Guide](../docs/getting-started/installation.md)
- Read the [Configuration Guide](../docs/getting-started/configuration.md)
- Check [Hooks Documentation](../docs/reference/hooks.md)
- Review [Commands Reference](../docs/reference/commands.md)