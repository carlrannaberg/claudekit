# Commands Reference

## CLI Commands

### `claudekit setup`
Initialize claudekit in your project.

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

### `claudekit-hooks`
Manage and execute embedded hooks system.

```bash
claudekit-hooks <command> [options]

Commands:
  run <hook>      Run a specific hook
  list            List all available hooks
  stats           Show hook execution statistics
  recent [limit]  Show recent hook executions (default: 20)

Options:
  --config <path>  Path to config file (default: .claudekit/config.json)
  --debug          Enable debug logging

Examples:
  claudekit-hooks run typecheck-changed
  claudekit-hooks list
  claudekit-hooks stats
  claudekit-hooks recent 10
```

### `claudekit install`
Install hooks and commands into your project.

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
```

### `claudekit list`
List installed hooks, commands, and configuration.

```bash
claudekit list [options]

Options:
  -t, --type <type>    List specific type: hooks, commands, or all
  -v, --verbose        Show detailed information
```

### `claudekit lint-subagents`
Lint subagent markdown files for issues.

```bash
claudekit lint-subagents [directory] [options]

Options:
  -q, --quiet      Suppress suggestions, show only errors
  -v, --verbose    Show all files including valid ones

Examples:
  claudekit lint-subagents              # Lint .claude/agents
  claudekit lint-subagents src/agents   # Lint specific directory
```

### `claudekit lint-commands`
Lint slash command markdown files.

```bash
claudekit lint-commands [directory] [options]

Options:
  -q, --quiet      Suppress suggestions, show only errors
  -v, --verbose    Show all files including valid ones

Examples:
  claudekit lint-commands               # Lint .claude/commands
  claudekit lint-commands src/commands  # Lint specific directory
```

### `claudekit validate`
Validate installation and configuration.

```bash
claudekit validate [options]

Options:
  -q, --quiet      Only show errors
  -v, --verbose    Show detailed validation information

Examples:
  claudekit validate           # Check installation
  claudekit validate --verbose # Show detailed results
```

## Slash Commands in Claude Code

### Git & Checkpoints

### `/checkpoint:create [description]`
Create a git stash checkpoint with optional description.
- Saves current working state without modifying files
- Uses timestamp if no description provided
- Keeps changes in working directory (non-destructive)
- Example: `/checkpoint:create "before major refactor"`

### `/checkpoint:restore [n]`
Restore to a previous checkpoint.
- `n` specifies how many checkpoints back (default: 1)
- Non-destructive - uses `git stash apply`
- Maintains checkpoint for future use
- Example: `/checkpoint:restore 2`

### `/checkpoint:list`
List all checkpoints created by Claude.
- Shows only claude-prefixed checkpoints
- Displays timestamp and description
- Shows stash index for manual restoration

### `/git:commit`
Smart commit following project conventions.
- Analyzes recent commits to match style
- Stages changes intelligently
- Creates conventional commit message
- Adds Claude Code signature

### `/git:status`
Intelligent git status analysis.
- Shows current branch and state
- Identifies uncommitted changes
- Provides actionable insights
- Suggests next steps

### `/git:push`
Safe push with pre-flight checks.
- Verifies branch tracking
- Checks for uncommitted changes
- Runs tests if configured
- Pushes to remote safely

## Development Tools

### `/validate-and-fix`
Run all quality checks and auto-fix issues.
- TypeScript validation
- ESLint with auto-fix
- Test suite execution
- Comprehensive error reporting

### `/spec:create [feature]`
Generate comprehensive specification.
- Creates detailed implementation spec
- Includes acceptance criteria
- Generates test scenarios
- Optional: Fetches library docs with MCP

### `/spec:validate [file]`
Analyze specification completeness.
- Checks for missing sections
- Validates acceptance criteria
- Identifies ambiguities
- Suggests improvements

### `/spec:decompose [file]`
Break down spec into tasks.
- Creates TaskMaster-compatible tasks
- Identifies dependencies
- Estimates complexity
- Generates implementation order

### `/spec:execute [file]`
Execute specification with concurrent agents.
- Orchestrates multiple AI agents
- Runs tasks in parallel where possible
- Manages dependencies
- Reports progress

### `/dev:cleanup`
Clean up debug files and development artifacts.
- Removes temporary debug scripts
- Cleans test artifacts
- Identifies misplaced files
- Suggests proper locations

## Agent Management

### `/agent:init`
Initialize AGENT.md file.
- Sets up AI assistant configuration
- Configures proactive subagent usage
- Documents project conventions
- Creates reports directory structure

### `/agent:migration`
Migrate from other AI configs.
- Converts .cursorrules to AGENT.md
- Preserves existing instructions
- Adds claudekit enhancements
- Maintains backward compatibility

### `/agent:cli [tool]`
Capture CLI tool help.
- Documents CLI tools in AGENT.md
- Preserves formatting
- Creates collapsible sections
- Example: `/agent:cli npm`

### `/create-subagent`
Create custom AI assistant.
- Interactive agent creation wizard
- Sets up proper frontmatter
- Configures tool permissions
- Adds to appropriate directory

### `/create-command`
Create custom slash command.
- Interactive command creation
- Generates proper structure
- Sets tool permissions
- Adds to commands directory

## GitHub Integration

### `/gh:repo-init [name]`
Create GitHub repository.
- Creates new repo on GitHub
- Sets up local git
- Configures remote
- Creates initial commit
- Requires: GitHub CLI (`gh`)

## Configuration

### `/config:bash-timeout [duration] [scope]`
Configure bash command timeout.
- Duration: e.g., "10min", "20min", "600s"
- Scope: "user" or "project" (default: user)
- Example: `/config:bash-timeout 20min project`

## Advanced Commands

### `/generate-checkpoints-report`
Analyze checkpoint usage patterns.
- Shows checkpoint frequency
- Identifies restoration patterns
- Suggests workflow improvements

### `/analyze-hooks-performance`
Profile hook execution times.
- Identifies slow hooks
- Shows execution frequency
- Suggests optimizations

## Command Options

Most commands support additional options through arguments:

```bash
# Checkpoint with detailed description
/checkpoint:create "before removing authentication - keeping old auth.js"

# Restore specific checkpoint by number
/checkpoint:restore 3

# Create spec for specific feature
/spec:create "user authentication with OAuth"

# Initialize repository with description
/gh:repo-init "my-awesome-project"
```

## Tips

1. **Chain Commands**: Some commands work well together
   ```
   /spec:create authentication
   /spec:decompose specs/authentication.md
   /spec:execute specs/authentication.md
   ```

2. **Use Checkpoints Liberally**: They're cheap and can save hours
   ```
   /checkpoint:create "working state"
   # Try risky refactor
   /checkpoint:restore  # If it goes wrong
   ```

3. **Validate Before Committing**:
   ```
   /validate-and-fix
   /git:commit
   ```

4. **Configure for Your Workflow**: Adjust timeouts for long operations
   ```
   /config:bash-timeout 30min project  # For large test suites
   ```