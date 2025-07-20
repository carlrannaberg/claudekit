# @claudekit/cli

Command-line interface for ClaudeKit development workflow tools.

## Installation

```bash
npm install -g @claudekit/cli
```

## Usage

### Interactive Setup

```bash
claudekit setup
```

Launches an interactive wizard to configure ClaudeKit for your project.

### Non-Interactive Setup (CI/CD)

```bash
# Install with all defaults
claudekit setup --yes

# Install specific components only
claudekit setup --hooks typecheck,eslint --commands git-commit

# Install to specific project directory
claudekit setup --yes --project /path/to/project

# Install commands only (no project setup)
claudekit setup --commands-only

# Dry run to preview changes
claudekit setup --yes --dry-run
```

#### Setup Flags

- `--yes` / `-y` - Automatic yes to prompts (use defaults)
- `--commands <list>` - Comma-separated list of command IDs to install
- `--hooks <list>` - Comma-separated list of hook IDs to install  
- `--project <path>` - Target directory for project installation
- `--commands-only` - Install only commands in user directory (~/.claude)
- `--dry-run` / `-d` - Preview what would be installed without making changes
- `--quiet` / `-q` - Suppress all non-error output
- `--force` / `-f` - Overwrite existing configuration

See [Non-Interactive Setup Guide](./docs/non-interactive-setup.md) for detailed CI/CD examples.

### Validate Installation

```bash
claudekit validate
```

Checks that your ClaudeKit configuration is valid.

### List Available Components

```bash
# List all components
claudekit list

# List only commands
claudekit list commands

# List only hooks
claudekit list hooks
```

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Run tests

```bash
npm test
```

### Development mode

```bash
npm run dev
```

## Project Structure

```
src/
├── cli.ts              # CLI entry point
├── commands/           # Command implementations
│   ├── init.ts
│   └── validate.ts
├── types/              # TypeScript type definitions
│   └── config.ts
└── utils/              # Utility functions
    ├── config.ts
    └── logger.ts
```

## Scripts

- `build` - Build the project for distribution
- `dev` - Run in development mode with hot reload
- `test` - Run tests
- `lint` - Run ESLint
- `format` - Format code with Prettier
- `typecheck` - Check TypeScript types