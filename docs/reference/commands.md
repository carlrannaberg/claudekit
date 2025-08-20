# Slash Commands Reference

This reference covers all slash commands available in Claude Code. For CLI commands, see [CLI Reference](cli.md).

## Command Categories

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

### `/agents-md:init`
Initialize or improve AGENTS.md file with intelligent codebase analysis.

**What it does:**
1. **Analyzes your codebase** to understand:
   - Project type and technologies
   - Build commands and scripts
   - Test frameworks and patterns
   - Code style conventions
   - Existing AI configurations
2. **Creates or improves AGENTS.md** with discovered information
3. **Adds directory structure** (reports/, temp/) and file organization guidelines
4. **Merges existing configs** from .cursorrules, copilot-instructions.md, etc.
5. **Sets up symlinks** for all AI assistants

**When to use:**
- **New projects** that need AGENTS.md
- **Existing projects** to improve/update existing AGENTS.md
- Want intelligent analysis of your codebase
- Need to add new features (directory structure, latest best practices)
- Replacing Claude's `/init` command

**Safety:**
✅ **Safe to run on existing AGENTS.md files** - it improves rather than overwrites
✅ **Can be run multiple times** to keep AGENTS.md updated
✅ **Preserves existing content** while adding enhancements

### `/agents-md:migration`
Convert other AI config files to AGENTS.md standard.

**What it does:**
1. **Analyzes all existing config files** (CLAUDE.md, .cursorrules, .windsurfrules, etc.)
2. **Detects content differences** and chooses appropriate migration strategy:
   - **Single file**: Simple move to AGENTS.md
   - **Identical files**: Move primary, symlink others
   - **Different content**: Smart merging or user-guided resolution
3. **Creates symlinks** so all AI tools use the same file
4. **Handles conflicts intelligently** with user guidance when needed

**Migration Strategies:**
- **🔄 Auto-merge**: Combines unique content from all files
- **📋 Backup approach**: Keeps primary file, backs up others (.bak extension)
- **🎯 Selective**: Interactive selection of content blocks
- **🛠️ Manual**: Step-by-step merge assistance

**When to use:**
- You have existing **CLAUDE.md** or **.cursorrules** files
- Want to migrate from tool-specific configs to universal AGENTS.md standard
- **Multiple AI config files** with different content that need merging
- **DO NOT use** if you already have AGENTS.md (use `/agents-md:init` instead)

**Not for:**
❌ Projects that already have AGENTS.md (use `/agents-md:init` instead)
❌ Creating AGENTS.md from scratch (use `/agents-md:init` instead)

### `/agents-md:cli [tool]`
Capture CLI tool help and add to AGENTS.md.
- Documents CLI tools in AGENTS.md
- Preserves formatting
- Creates collapsible sections
- Example: `/agents-md:cli npm`

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

## Agent Commands Comparison

| Feature | `/agents-md:init` | `/agents-md:migration` |
|---------|--------------|-------------------|
| Analyzes codebase | ✅ Smart analysis | ❌ Simple rename |
| Creates new AGENTS.md | ✅ Based on analysis | ❌ Uses existing content |
| Merges existing configs | ✅ Incorporates all | ❌ Just moves one |
| Best for | Any project | Simple migration |
| Intelligence | High - infers from code | Low - just renames |
| Symlinks created | All AI tools | All AI tools |

## Supported AI Assistants

Both agent commands create symlinks for:
- Claude Code (CLAUDE.md)
- Cline (.clinerules)
- Cursor (.cursorrules)
- Windsurf (.windsurfrules)
- GitHub Copilot (.github/copilot-instructions.md)
- Replit (.replit.md)
- Gemini CLI (GEMINI.md)
- OpenAI Codex (GEMINI.md)
- OpenCode (GEMINI.md)
- Firebase Studio (.idx/airules.md)

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

## Best Practices

1. **Review the content**: Whether using init or migration, review AGENTS.md to ensure it accurately reflects your project

2. **Keep it updated**: As your project evolves, update AGENTS.md with new conventions, commands, or architectural changes

3. **Team alignment**: Share AGENTS.md with your team and get agreement on conventions

4. **Version control**: Always commit AGENTS.md and its symlinks to your repository

5. **Regular updates**: Periodically review and update the file as tools and practices evolve