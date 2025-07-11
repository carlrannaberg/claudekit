# Claude Code Hooks Documentation

This document describes the hooks included in claudekit and their functionality.

## PostToolUse Hooks

### typecheck-lint.sh

**Purpose:** Enforces TypeScript type checking and ESLint standards after file modifications.

**Triggers on:** Write, Edit, MultiEdit tools (TypeScript/TSX files only)

**Features:**
- Blocks usage of `any` types - enforces strict typing
- Runs TypeScript compiler with incremental builds
- Runs ESLint with caching for performance
- Provides detailed instructions for fixing issues
- Suggests using concurrent agents for multiple errors

**Requirements:**
- TypeScript project with tsconfig.json
- ESLint configuration (optional, will skip if not found)
- Node.js/npm environment

### run-related-tests.sh

**Purpose:** Automatically runs tests related to modified files.

**Triggers on:** Write, Edit, MultiEdit tools (TS/TSX/JS/JSX files)

**Features:**
- Finds test files matching common patterns:
  - `{filename}.test.{ts,tsx,js,jsx}`
  - `{filename}.spec.{ts,tsx,js,jsx}`
  - `__tests__/{filename}.{test,spec}.{ts,tsx,js,jsx}`
- Runs tests and blocks on failure
- Provides detailed fixing instructions
- Suggests concurrent agents for multiple test failures

**Requirements:**
- npm test command configured
- Test files following standard naming conventions

## Stop Hooks

### auto-checkpoint.sh

**Purpose:** Automatically creates a git checkpoint when Claude Code stops.

**Features:**
- Creates checkpoint only if there are uncommitted changes
- Uses git stash create/store to preserve working directory
- Silent operation (suppresses output)
- Adds timestamp to checkpoint message

**Requirements:**
- Git repository
- Write permissions to .git directory

### validate-todo-completion.sh

**Purpose:** Prevents Claude Code from stopping if there are incomplete todos.

**Features:**
- Reads Claude Code transcript to find TodoWrite entries
- Checks for incomplete todos (status != "completed")
- Blocks stop with detailed message listing incomplete items
- Prevents infinite loops with stop_hook_active check
- Logs activity to ~/.claude/stop-hook.log

**Requirements:**
- Claude Code with TodoWrite tool
- jq command (optional, has fallbacks)

## Configuration

All hooks are configured in `.claude/settings.json`. The setup script handles installation and merging with existing settings.

## Customization

To customize these hooks for your project:

1. Copy the hook files to your project's `.claude/hooks/` directory
2. Modify the scripts as needed (e.g., different test patterns, linting rules)
3. Update `.claude/settings.json` with your project-specific configuration

## Troubleshooting

### Hook not running
- Check that the hook file is executable: `chmod +x .claude/hooks/*.sh`
- Verify the path in settings.json matches the hook location
- Run Claude Code with `--debug` flag to see hook execution

### TypeScript version issues
- typecheck-lint.sh detects TypeScript version and uses appropriate flags
- For TS < 5.4, incremental compilation covers all files
- For TS >= 5.4, uses --changedFiles for better performance

### Test discovery issues
- Ensure test files follow standard naming conventions
- Modify TEST_PATTERNS array in run-related-tests.sh for custom patterns
- Check that npm test command accepts file arguments

### Stop hook infinite loop
- validate-todo-completion.sh checks stop_hook_active to prevent loops
- Check ~/.claude/stop-hook.log for debugging information