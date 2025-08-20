# Contributing to claudekit

We welcome contributions! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/claudekit.git
   cd claudekit
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Create symlinks for development:
   ```bash
   npm run symlinks
   ```

## Development Workflow

### Building

After making changes to TypeScript files:
```bash
npm run build
```

### Testing

Run tests before submitting:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:unit
npm run test:integration
npm run test:commands
```

### Linting

Validate your contributions before submitting:

#### Lint Commands
```bash
# Lint slash command markdown files
claudekit lint-commands               # Lint .claude/commands
claudekit lint-commands src/commands  # Lint source commands
claudekit lint-commands --quiet       # Show only errors

# Validates:
# - Allowed-tools declarations
# - MCP tool support format
# - Model specifications
# - Argument hints
# - File references
```

#### Lint Subagents
```bash
# Lint subagent markdown files
claudekit lint-subagents              # Lint .claude/agents
claudekit lint-subagents src/agents   # Lint source agents
claudekit lint-subagents --verbose    # Show all files

# Validates:
# - Required fields (name, description)
# - Tool declarations
# - Category and naming conventions
# - CSS color values
# - Unused fields
```

#### Validate Installation
```bash
# Check overall installation and configuration
claudekit doctor             # Basic validation
claudekit doctor --verbose   # Detailed validation
```

### Creating New Components

#### New Hook
1. Create TypeScript file in `cli/hooks/`
2. Follow self-contained pattern (include all functions)
3. Add to embedded hooks system
4. Test with: `claudekit-hooks run <hook-name>`

#### New Command
1. Use `/create-command` in Claude Code for guided creation
2. Or manually create in `src/commands/`
3. Follow markdown + YAML frontmatter structure
4. Specify `allowed-tools` for security

#### New Subagent
1. Use `/create-subagent` in Claude Code
2. Or create in `src/agents/[category]/`
3. Include proper frontmatter
4. Add to setup.ts agent list

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow existing patterns in codebase
- Include proper error handling
- Add JSDoc comments for public APIs

### Shell Scripts
- Start with `#!/usr/bin/env bash`
- Include `set -euo pipefail`
- Add descriptive headers
- Support both jq and fallback methods

### Markdown Commands
- Include clear descriptions
- Specify all required tools in `allowed-tools`
- Provide usage examples
- Document arguments with `argument-hint`

## Commit Guidelines

We use conventional commits:
```
feat: add new checkpoint command
fix: resolve TypeScript hook timeout issue
docs: update troubleshooting guide
test: add unit tests for lint hook
refactor: simplify hook registration
chore: update dependencies
```

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request with:
   - Clear description of changes
   - Any breaking changes noted
   - Tests for new functionality
   - Documentation updates

## Contributing Agents

When contributing new subagents:

1. Place in appropriate category under `src/agents/`
2. Include comprehensive frontmatter:
   ```yaml
   name: agent-name
   description: When to use this agent
   tools: List of required tools
   category: agent category
   displayName: Human-friendly name
   color: UI theme color
   ```
3. Provide detailed expertise documentation
4. Include usage examples
5. Test with real scenarios

## Testing Requirements

- All new features must include tests
- Maintain or improve code coverage
- Test edge cases and error conditions
- Include integration tests for commands

## Documentation

Update documentation when:
- Adding new features
- Changing existing behavior
- Adding new configuration options
- Contributing new agents or commands

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.