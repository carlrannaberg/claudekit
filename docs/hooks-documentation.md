# Claude Code Hooks Documentation

This document describes the hooks included in claudekit and their functionality.

## Shared Validation Library

**Location:** `.claude/validation-lib.sh`

The validation library provides common functions used by multiple hooks:

**Functions:**
- `find_project_root()` - Locates the project root directory
- `has_typescript()` - Checks if TypeScript is configured
- `has_eslint()` - Checks if ESLint is configured
- `has_tests()` - Checks if tests are configured
- `validate_typescript_file()` - Runs TypeScript validation on a specific file
- `validate_typescript_project()` - Runs TypeScript validation on entire project
- `validate_eslint_file()` - Runs ESLint validation on a specific file
- `validate_eslint_project()` - Runs ESLint validation on entire project
- `validate_tests()` - Runs the project test suite
- `format_validation_output()` - Formats validation results consistently
- `parse_json_field()` - Safely parses JSON fields with fallback support

## PostToolUse Hooks

### typecheck.sh

**Purpose:** Enforces TypeScript type checking and strict typing standards.

**Triggers on:** Write, Edit, MultiEdit tools (TypeScript/TSX files only)

**Features:**
- Blocks usage of `any` types - enforces strict typing
- Runs TypeScript compiler with incremental builds
- Detects TypeScript version for optimal performance (uses --changedFiles for TS 5.4+)
- Provides detailed instructions for fixing type errors
- Suggests using concurrent agents for multiple errors

**Requirements:**
- TypeScript project with tsconfig.json
- Node.js/npm environment

### eslint.sh

**Purpose:** Enforces code style and quality standards using ESLint.

**Triggers on:** Write, Edit, MultiEdit tools (JS/JSX/TS/TSX files)

**Features:**
- Runs ESLint with caching for performance
- Enforces zero warnings policy (--max-warnings 0)
- Provides detailed instructions for fixing issues
- Suggests using concurrent agents for multiple issues

**Requirements:**
- ESLint configuration file (.eslintrc.js, .eslintrc.json, or eslint.config.js)
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
- Debug logging to ~/.claude/stop-hook.log (enable with: `touch ~/.claude/hooks-debug`)

**Requirements:**
- Claude Code with TodoWrite tool
- jq command (optional, has fallbacks)

### project-validation.sh

**Purpose:** Runs complete project validation when an agent completes work.

**Triggers on:** Stop and SubagentStop events

**Features:**
- Runs TypeScript validation on entire project
- Runs ESLint validation on all files
- Runs test suite if configured
- Uses shared validation library for consistency
- Prevents infinite loops with stop_hook_active check
- Provides consolidated feedback for all validation failures

**Requirements:**
- Same as individual validation hooks (TypeScript, ESLint, tests)
- Works for both main agent and subagent contexts

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
- typecheck.sh detects TypeScript version and uses appropriate flags
- For TS < 5.4, incremental compilation covers all files
- For TS >= 5.4, uses --changedFiles for better performance

### Test discovery issues
- Ensure test files follow standard naming conventions
- Modify TEST_PATTERNS array in run-related-tests.sh for custom patterns
- Check that npm test command accepts file arguments

### Stop hook infinite loop
- validate-todo-completion.sh checks stop_hook_active to prevent loops
- Enable debug logging: `touch ~/.claude/hooks-debug`
- Check ~/.claude/stop-hook.log for debugging information (when debug is enabled)

## Manual Command Line Testing

You can test hooks directly from the command line without Claude Code. All hooks expect JSON input via stdin.

### Testing PostToolUse Hooks

#### 1. TypeScript Hook
```bash
# Basic test
echo '{"tool_input": {"file_path": "/absolute/path/to/file.ts"}}' | ~/.claude/hooks/typecheck.sh

# Test with a file containing 'any' type
echo 'const data: any = {}; export default data;' > test.ts
echo '{"tool_input": {"file_path": "'$(pwd)'/test.ts"}}' | ~/.claude/hooks/typecheck.sh
```

#### 2. ESLint Hook
```bash
# Basic test
echo '{"tool_input": {"file_path": "/absolute/path/to/file.js"}}' | ~/.claude/hooks/eslint.sh

# Test with a file containing ESLint issues
echo 'var x = 1;;' > test.js
echo '{"tool_input": {"file_path": "'$(pwd)'/test.js"}}' | ~/.claude/hooks/eslint.sh
```

#### 3. Run Related Tests Hook
```bash
# Test with a file that has associated tests
echo '{"tool_input": {"file_path": "/absolute/path/to/component.tsx"}}' | ~/.claude/hooks/run-related-tests.sh

# Create a test scenario
echo 'export const add = (a, b) => a + b;' > math.js
echo 'test("add", () => expect(add(1, 2)).toBe(4));' > math.test.js
echo '{"tool_input": {"file_path": "'$(pwd)'/math.js"}}' | ~/.claude/hooks/run-related-tests.sh
```

### Testing Stop Hooks

#### 1. Auto-checkpoint Hook
```bash
# This hook doesn't read input, just run it directly
~/.claude/hooks/auto-checkpoint.sh

# It will only create a checkpoint if there are uncommitted changes
```

#### 2. Todo Validation Hook
```bash
# Test with default payload
echo '{"transcript_path": "~/.claude/transcripts/current.jsonl", "stop_hook_active": false}' | \
  ~/.claude/hooks/validate-todo-completion.sh

# The hook will check the transcript file for incomplete todos
```

### JSON Payload Format

PostToolUse hooks expect:
```json
{
  "tool_input": {
    "file_path": "/absolute/path/to/file"
  }
}
```

Stop hooks expect:
```json
{
  "transcript_path": "~/.claude/transcripts/conversation-id.jsonl",
  "stop_hook_active": false
}
```

### Testing Tips

1. **Use absolute paths** - Hooks expect absolute file paths
2. **Check permissions** - Ensure hooks are executable: `chmod +x ~/.claude/hooks/*.sh`
3. **Exit codes**:
   - `0` = Success/allow operation
   - `2` = Block with error message
   - Other = Unexpected errors
4. **Debug output** - Enable hook debug logging: `touch ~/.claude/hooks-debug`
   - Check logs in `~/.claude/stop-hook.log` (when debug is enabled)
   - Run Claude Code with `--debug` flag to see hook execution
5. **Create test files** - Make files with known issues to verify hook behavior