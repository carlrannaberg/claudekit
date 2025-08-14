# Validate and Fix Documentation

The `/validate-and-fix` command provides automated code quality improvement by running all checks and fixing issues in parallel.

## Overview

This command revolutionizes code quality workflows by:
1. Running all quality checks simultaneously (not sequentially)
2. Analyzing and categorizing all discovered issues
3. Distributing fixes across multiple concurrent agents
4. Ensuring no conflicts between parallel fixes
5. Verifying all issues are resolved

## How It Works

### Phase 1: Discovery (Parallel)
The command runs all available quality checks at once:
- ESLint for code style
- TypeScript for type checking
- Jest/Vitest for tests
- Prettier for formatting
- Any custom checks in package.json

### Phase 2: Analysis
Intelligently analyzes all errors to:
- Group related issues
- Identify fix dependencies
- Prevent conflicting changes
- Optimize fix order

### Phase 3: Parallel Fixing
Launches multiple agents simultaneously, each handling:
- Specific file sets (no overlaps)
- Specific error categories
- Clear success criteria
- Verification of fixes

### Phase 4: Verification
Ensures quality by:
- Re-running all checks
- Confirming no new issues
- Generating fix summary

## Usage

```bash
/validate-and-fix
```

No arguments needed - the command automatically:
1. Detects available quality checks from package.json
2. Runs everything it finds
3. Fixes all fixable issues
4. Reports on manual fixes needed

## Performance Benefits

Traditional approach (sequential):
```
Lint (2m) → Fix lint → Type check (1m) → Fix types → Test (3m) → Fix tests
Total: ~10-15 minutes
```

Validate-and-fix approach (parallel):
```
All checks (3m) → Parallel fixes (2-3m) → Verify (3m)
Total: ~8-9 minutes
```

## Example Output

```
📊 Discovery Phase
Running 4 quality checks in parallel...
✓ ESLint: 23 errors, 45 warnings
✓ TypeScript: 12 errors
✓ Jest: 3 failing tests
✓ Prettier: 67 formatting issues

🔍 Analysis Phase
Categorizing 147 total issues...
- 15 import errors (can fix in parallel)
- 8 type errors (need sequential fixes)
- 3 test failures (need investigation)
- 67 formatting (bulk fix possible)

🚀 Launching 4 concurrent agents
Agent 1: Fixing imports in src/components/
Agent 2: Fixing types in src/utils/
Agent 3: Fixing formatting issues
Agent 4: Investigating test failures

✅ Verification Phase
All checks passing!
Fixed: 144/147 issues
Manual review needed: 3 issues (see summary)
```

## Best Practices

1. **Run regularly** - Use before commits or PRs
2. **Review changes** - Always review the fixes applied
3. **Check git diff** - Understand what changed
4. **Custom checks** - Add project-specific checks to package.json

## Supported Tools

The command automatically detects and uses:

### Linters
- ESLint
- TSLint (legacy)
- Prettier
- StyleLint

### Type Checkers
- TypeScript
- Flow

### Test Runners
- Jest
- Vitest
- Mocha
- Karma

### Build Tools
- Webpack
- Vite
- Rollup
- Parcel

## Configuration

The command respects all existing tool configurations:
- `.eslintrc.*`
- `tsconfig.json`
- `.prettierrc`
- `jest.config.js`
- etc.

## Limitations

Some issues require manual intervention:
- Business logic errors in tests
- Complex type errors requiring refactoring
- Lint rules that conflict with each other
- Build errors from missing dependencies

The command will clearly report these for manual review.

## Integration with Hooks

Works great with claudekit embedded hooks:
- `claudekit-hooks run typecheck-changed` - Prevents committing type errors
- `claudekit-hooks run lint-changed` - Enforces code style
- `claudekit-hooks run test-changed` - Ensures tests pass

Run `/validate-and-fix` before committing to ensure all hooks will pass!