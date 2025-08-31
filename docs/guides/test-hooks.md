# Test Validation Hooks

## Overview

The test hooks provide comprehensive test validation through two complementary hooks: `test-changed` for running related tests when files are modified, and `test-project` for full test suite validation. Together, they ensure code changes don't break existing functionality and maintain test coverage.

## Installation

```bash
npm install -g claudekit && claudekit setup --yes --force --hooks test-changed,test-project
```

This configures both hooks in `.claude/settings.json`:
- `test-changed` runs on PostToolUse events for source file modifications
- `test-project` runs on Stop/SubagentStop events for comprehensive test validation

## How It Works

### test-changed Hook
1. **File Detection** - Monitors Write, Edit, and MultiEdit operations on source files (.js/.jsx/.ts/.tsx)
2. **Test Discovery** - Finds related test files using common naming patterns
3. **Targeted Testing** - Runs only tests related to the changed file
4. **Immediate Feedback** - Provides instant feedback on test failures with detailed guidance

### test-project Hook
1. **Session Completion** - Triggers when Claude Code session ends or subagent stops
2. **Full Suite** - Runs the complete test suite for the project
3. **Timeout Management** - Handles long-running test suites with smart timeout defaults
4. **Final Quality Gate** - Ensures no test failures remain before task completion

## Architecture

```
┌─────────────────────────────────────────────┐
│       Write/Edit/MultiEdit Tool Use        │
│    Source file changes (.js/.jsx/.ts/.tsx) │
│         (operation completes)              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│         test-changed (PostToolUse)         │
│  • Check if source file (not test file)    │
│  • Find related test files by patterns     │
│  • Run only tests for the changed file     │
│  • Report failures with fix instructions   │
└─────────────────────────────────────────────┘
                  
┌─────────────────────────────────────────────┐
│           Session End/Stop                  │
│      Claude Code stop or subagent end      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│       test-project (Stop/SubagentStop)     │
│  • Check if test script exists             │
│  • Run full test suite with timeout        │
│  • Handle timeout gracefully               │
│  • Report all test failures                │
└─────────────────────────────────────────────┘
```

## Test File Discovery

The `test-changed` hook finds related test files using these patterns:

**Same directory:**
- `filename.test.js`
- `filename.spec.js`

**Tests directory:**
- `__tests__/filename.test.js`
- `__tests__/filename.spec.js`

**Skipped files:**
- Test files themselves (*.test.* or *.spec.*)
- Non-source files (anything other than .js/.jsx/.ts/.tsx)

## What Claude Sees

### test-changed Success
```
✅ All related tests passed!
```

### test-changed No Tests Found
```
⚠️ No test files found for UserService.ts
⚠️ Consider creating tests in: src/services/UserService.test.ts
```

### test-changed Failures
```
BLOCKED: Tests failed for src/components/UserCard.tsx

 FAIL  src/components/UserCard.test.tsx
  ● UserCard › should render user name
    Expected "John Doe" but received "undefined"

MANDATORY INSTRUCTIONS:
1. You MUST fix ALL test failures, regardless of whether they seem related to your recent changes
2. First, examine the failing test output above to understand what's broken
3. Run the failing tests individually for detailed output: npm test -- src/components/UserCard.test.tsx
4. Then run ALL tests to ensure nothing else is broken: npm test
5. Fix ALL failing tests by:
6.   - Reading each test to understand its purpose
7.   - Determining if the test or the implementation is wrong
8.   - Updating whichever needs to change to match expected behavior
9.   - NEVER skip, comment out, or use .skip() to bypass tests
10. Common fixes to consider:
11.   - Update mock data to match new types/interfaces
12.   - Fix async timing issues with proper await/waitFor
13.   - Update component props in tests to match changes
14.   - Ensure test database/state is properly reset
15.   - Check if API contracts have changed
```

### test-project Success
```
✅ All tests passed!
```

### test-project Timeout
```
████ Test Suite Timeout ████

The test suite was terminated after 55000ms due to the hook timeout limit.

Current command: npm test

RECOMMENDED ACTIONS:
1. Configure a faster test command in .claudekit/config.json:

   {
     "hooks": {
       "test-project": {
         "command": "npm run test:fast"
       }
     }
   }

2. Disable test-project hook in .claude/settings.json
3. Increase the timeout if supported by your environment
4. Run tests manually when needed: npm test
```

## Configuration

Configure both hooks in `.claudekit/config.json`:

```json
{
  "hooks": {
    "test-changed": {
      "command": "npm run test:unit",
      "timeout": 30000
    },
    "test-project": {
      "command": "npm run test:fast",
      "timeout": 45000
    }
  }
}
```

### Hook Options

Both hooks support the same configuration options:

- **`command`** - Custom test command (default: package manager's test command)
- **`timeout`** - Maximum execution time in milliseconds (test-project default: 55000)

### Common Commands

**Standard npm test:**
```json
{
  "command": "npm test"
}
```

**Fast unit tests only:**
```json
{
  "command": "npm run test:unit"
}
```

**Jest with specific options:**
```json
{
  "command": "npx jest --passWithNoTests --silent"
}
```

**Vitest:**
```json
{
  "command": "npm run test -- --run"
}
```

## Usage Examples

### Related Test Execution (test-changed)
```typescript
// Edit src/utils/calculator.ts
export function add(a: number, b: number): number {
  return a + b; // Changed implementation
}

// Hook automatically finds and runs:
// - src/utils/calculator.test.ts
// - src/utils/__tests__/calculator.test.ts
// Only these related tests, not the entire suite
```

### Full Suite Validation (test-project)
When Claude Code session ends, the hook runs the complete test suite to ensure all tests still pass after all changes made during the session.

## Supported Test Frameworks

The hooks work with any test framework that can be run via npm scripts:

- **Jest** - Most common React/Node.js testing
- **Vitest** - Fast Vite-native testing  
- **Mocha** - Traditional Node.js testing
- **Cypress** - E2E testing (for project-wide runs)
- **Playwright** - Cross-browser testing

## Troubleshooting

### Hooks Not Running
Check if hooks are configured:
```bash
claudekit list hooks | grep test
```

### No Test Script Found
Ensure your package.json has a test script:
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:fast": "jest --maxWorkers=2"
  }
}
```

### Tests Timing Out
For slow test suites, configure faster commands:
```json
{
  "hooks": {
    "test-project": {
      "command": "npm run test:unit",
      "timeout": 30000
    }
  }
}
```

### Tests Not Found
Ensure test files follow naming conventions:
- `*.test.js` or `*.spec.js`
- Located in same directory as source file
- Or in `__tests__/` subdirectory

### Testing Hooks Manually
```bash
# Test test-changed
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/utils/helper.js"}}' | \
  claudekit-hooks run test-changed

# Test test-project
claudekit-hooks run test-project
```

## Integration with Development Workflow

### During Development
1. Edit source file (not test file)
2. `test-changed` finds and runs related tests
3. Receive immediate feedback on test failures
4. Fix failing tests before continuing
5. Get suggestions for creating tests if none exist

### Before Completion
1. Finish development work
2. Stop Claude Code session or subagent
3. `test-project` runs full test suite
4. Address any test failures across the entire project

## Test Failure Guidance

The hooks provide comprehensive guidance for fixing test failures:

### Understanding Test Purpose
- Read the test description and expectations
- Understand what behavior is being validated
- Determine if the test or implementation is incorrect

### Common Fixes
- **Mock data updates** - Update test data to match new interfaces
- **Async issues** - Add proper `await` or `waitFor` calls
- **Component props** - Update test props to match component changes
- **State management** - Ensure proper test setup/teardown
- **API changes** - Update test expectations for modified contracts

### What NOT to Do
- Never use `.skip()` to bypass failing tests
- Don't comment out failing tests
- Don't ignore test failures assuming they're unrelated

## Performance Optimization

### Fast Test Commands
Create separate npm scripts for different test scenarios:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:fast": "jest --maxWorkers=2 --bail",
    "test:changed": "jest --onlyChanged"
  }
}
```

### Timeout Management
- **test-changed**: Usually quick (single file's tests)
- **test-project**: May need longer timeout for full suites
- Default 55s timeout stays under Claude Code's 60s limit

## Limitations

- **Package.json dependency** - Requires test script in package.json
- **Pattern-based discovery** - May miss unconventional test file locations
- **Timeout constraints** - Large test suites may need custom timeout configuration
- **Source file focus** - Only triggers on .js/.jsx/.ts/.tsx files