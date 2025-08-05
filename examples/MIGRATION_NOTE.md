# Migration Note: Example Files

The following example files have been deprecated as they used the old claudekit configuration format:
- `config-npm.json`
- `config-yarn.json`
- `config-custom.json`
- `config-minimal.json`

These have been replaced with new examples using the embedded hooks format:
- `settings.complete.json` - Comprehensive example with all common hooks
- `settings.minimal.json` - Minimal configuration to get started
- `settings.typescript.json` - TypeScript-focused configuration
- `settings.javascript.json` - JavaScript-only projects
- `settings.python.json` - Python projects example
- `settings.ci-cd.json` - CI/CD pipeline hooks
- `settings.example-with-comments.json` - Fully documented example

The main change is that hooks are now called using:
```json
{"type": "command", "command": "claudekit-hooks run <hook-name>"}
```

Instead of referencing `.sh` files or using the old configuration format.

See [Migration from Shell Hooks](../docs/migration-from-shell-hooks.md) for detailed migration instructions.