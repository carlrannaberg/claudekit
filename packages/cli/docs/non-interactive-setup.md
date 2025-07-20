# Non-Interactive Setup Guide

This guide covers using ClaudeKit's setup command in non-interactive mode for automated installations in CI/CD pipelines or scripted deployments.

## Overview

The `claudekit setup` command supports several flags that enable fully automated installation without any user prompts. This is essential for:

- CI/CD pipelines
- Docker containers
- Automated development environment setup
- Batch installations across multiple projects

## Available Flags

### Core Automation Flags

#### `--yes` / `-y`
Automatically accepts all prompts with default values.

```bash
claudekit setup --yes
```

**Default behavior with --yes:**
- Installation type: Both (user and project)
- Project path: Current directory
- Components: All essential and recommended components
- Auto checkpoint: Enabled
- TODO validation: Enabled
- Run tests: Enabled if test framework detected
- Git integration: Enabled if git repository detected

#### `--commands <list>`
Install specific commands by ID (comma-separated).

```bash
claudekit setup --commands checkpoint-create,git-commit,spec-create
```

#### `--hooks <list>`
Install specific hooks by ID (comma-separated).

```bash
claudekit setup --hooks typecheck,eslint,auto-checkpoint
```

#### `--project <path>`
Specify the target directory for project installation.

```bash
claudekit setup --yes --project /path/to/my-project
```

#### `--commands-only`
Install only commands in the user directory (~/.claude), skip project setup.

```bash
claudekit setup --commands-only
```

### Additional Flags

#### `--dry-run` / `-d`
Preview what would be installed without making changes.

```bash
claudekit setup --yes --dry-run
```

#### `--quiet` / `-q`
Suppress all non-error output.

```bash
claudekit setup --yes --quiet
```

#### `--force` / `-f`
Overwrite existing configuration files.

```bash
claudekit setup --yes --force
```

## Component IDs

### Available Commands

- `checkpoint-create` - Create git checkpoints
- `checkpoint-restore` - Restore from checkpoints
- `checkpoint-list` - List available checkpoints
- `git-commit` - Smart git commits
- `git-status` - Enhanced git status
- `git-push` - Safe git push
- `spec-create` - Create specifications
- `spec-validate` - Validate specifications
- `spec-decompose` - Decompose specs to tasks
- `spec-execute` - Execute specifications
- `agent-init` - Initialize AGENT.md
- `agent-migration` - Migrate AI configs
- `agent-cli` - Capture CLI help
- `gh-repo-init` - GitHub repo setup
- `validate-and-fix` - Run quality checks
- `create-command` - Create new commands
- `dev-cleanup` - Clean development files
- `config-bash-timeout` - Configure timeouts

### Available Hooks

- `typecheck` - TypeScript type checking
- `eslint` - ESLint validation
- `prettier` - Code formatting (if available)
- `run-related-tests` - Run tests on file change
- `auto-checkpoint` - Auto-create git checkpoints
- `validate-todo-completion` - Check TODO completion
- `project-validation` - General project validation
- `package-manager-detect` - Detect package manager

## Usage Examples

### 1. Full Installation with Defaults

```bash
# Install everything with default options
claudekit setup --yes
```

### 2. CI/CD Pipeline Setup

```bash
# Silent installation for CI/CD
claudekit setup --yes --quiet

# With specific project directory
claudekit setup --yes --project ./my-app --quiet

# Dry run to test configuration
claudekit setup --yes --dry-run
```

### 3. Selective Component Installation

```bash
# Install only TypeScript and ESLint hooks
claudekit setup --hooks typecheck,eslint

# Install only git-related commands
claudekit setup --commands git-commit,git-status,git-push

# Install specific commands and hooks
claudekit setup --commands checkpoint-create,git-commit --hooks typecheck,eslint
```

### 4. User-Only Installation

```bash
# Install commands globally without project setup
claudekit setup --commands-only

# Install specific commands globally
claudekit setup --commands-only --commands checkpoint-create,git-commit
```

### 5. Docker Container Setup

```dockerfile
# In your Dockerfile
RUN claudekit setup --yes --quiet --project /app
```

### 6. GitHub Actions Workflow

```yaml
- name: Setup ClaudeKit
  run: |
    npm install -g @claudekit/cli
    claudekit setup --yes --quiet
```

### 7. Multiple Project Setup Script

```bash
#!/bin/bash
# setup-projects.sh

projects=(
  "/path/to/project1"
  "/path/to/project2"
  "/path/to/project3"
)

for project in "${projects[@]}"; do
  echo "Setting up ClaudeKit for $project"
  claudekit setup --yes --project "$project" --quiet
done
```

## Error Handling

The setup command will exit with non-zero status codes on errors:

- Exit code 1: General setup failure
- Exit code 2: Invalid component ID
- Exit code 3: Permission denied
- Exit code 4: Directory not found

### Common Errors

1. **Component not found**
   ```bash
   Error: Component not found: invalid-id
   ```
   Solution: Check component ID spelling and availability with `claudekit list`.

2. **Directory does not exist**
   ```bash
   Error: Project directory does not exist: /invalid/path
   ```
   Solution: Ensure the project directory exists before running setup.

3. **No write permission**
   ```bash
   Error: No write permission for directory: /restricted/path
   ```
   Solution: Run with appropriate permissions or choose a different directory.

## Validation

After automated setup, validate the installation:

```bash
# Check installation status
claudekit validate

# List installed components
claudekit list

# Test a specific command
claudekit checkpoint-create "Test checkpoint"
```

## Environment Variables

You can also control setup behavior through environment variables:

```bash
# Set project directory
export CLAUDEKIT_PROJECT=/path/to/project

# Enable quiet mode
export CLAUDEKIT_QUIET=true

# Then run setup
claudekit setup --yes
```

## Best Practices

1. **Always validate after automated setup**
   ```bash
   claudekit setup --yes && claudekit validate
   ```

2. **Use --dry-run first in production**
   ```bash
   claudekit setup --yes --dry-run
   ```

3. **Log output in CI/CD**
   ```bash
   claudekit setup --yes 2>&1 | tee setup.log
   ```

4. **Handle errors in scripts**
   ```bash
   if ! claudekit setup --yes --quiet; then
     echo "Setup failed"
     exit 1
   fi
   ```

5. **Use specific component lists for minimal installations**
   ```bash
   # Only what you need
   claudekit setup --hooks typecheck --commands git-commit
   ```

## Troubleshooting

### Setup hangs or takes too long

- Use `--quiet` to reduce output overhead
- Check network connectivity for component downloads
- Use `--dry-run` to identify slow steps

### Components not installing

- Verify component IDs with `claudekit list`
- Check file permissions in target directories
- Review logs for detailed error messages

### Conflicts with existing configuration

- Use `--force` to overwrite existing files
- Backup existing `.claude` directory first
- Manually merge configurations if needed

## See Also

- [ClaudeKit CLI Documentation](./README.md)
- [Component Documentation](./components.md)
- [Configuration Guide](./configuration.md)
- [CI/CD Integration Examples](./ci-cd-examples.md)