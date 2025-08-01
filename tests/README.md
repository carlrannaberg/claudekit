# Claudekit Hook Testing

This directory contains a comprehensive testing framework for claudekit hooks, ensuring they are robust and handle edge cases gracefully.

## Quick Start

```bash
# Run all tests
./run-tests.sh

# Run only unit tests (skip integration)
./run-tests.sh --no-integration

# Run specific test suite
./run-tests.sh --test typecheck

# Run with verbose output
./run-tests.sh -v
```

## Directory Structure

```
tests/
├── test-framework.sh           # Core testing utilities
├── run-tests.sh               # Main test runner
├── unit/                      # Unit tests for each hook
│   ├── test-typecheck.sh
│   ├── test-eslint.sh
│   ├── test-run-related-tests.sh
│   ├── test-auto-checkpoint.sh
│   └── test-validate-todo-completion.sh
├── integration/               # Integration tests
│   ├── test-posttooluse-workflow.sh
│   └── test-stop-workflow.sh
├── fixtures/                  # Test data files
│   └── sample-transcript.jsonl
└── README.md                  # This file
```

## Writing Tests

### Basic Test Structure

```bash
#!/usr/bin/env bash
set -euo pipefail

# Get paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_PATH="$(which claudekit-hooks)"

# Source test framework
source "$SCRIPT_DIR/../test-framework.sh"

# Write test functions
test_hook_handles_valid_input() {
    # Setup
    create_test_file "input.json" '{"test": "data"}'
    
    # Execute
    local output=$(echo '{"tool_input":{"file_path":"test.ts"}}' | "$HOOK_PATH" run typecheck 2>&1)
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should handle valid input"
    assert_contains "$output" "expected text" "Should produce expected output"
}

# Allow running standalone
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi
```

### Available Assertions

```bash
# Basic assertions
assert_equals "expected" "$actual" "Description"
assert_not_equals "unexpected" "$actual" "Description"
assert_exit_code 0 $? "Should succeed"

# String assertions
assert_contains "$output" "substring" "Should contain substring"
assert_not_contains "$output" "substring" "Should not contain substring"

# File assertions
assert_file_exists "path/to/file" "File should exist"
assert_file_not_exists "path/to/file" "File should not exist"
assert_file_contains "file.txt" "pattern" "File should contain pattern"

# JSON assertions
assert_json_field "$json" "field.name" "expected_value" "JSON field check"
```

### Creating Mocks

```bash
# Mock git command
create_mock_git "uncommitted"  # or "clean", "no-repo"

# Mock npm command
create_mock_npm "pass"  # or "fail", "error"

# Custom mock
create_mock_command "mycommand" "
echo 'Mock output'
exit 0
"
```

### Test Lifecycle

Each test runs in an isolated temporary directory with these lifecycle hooks:

```bash
# Automatically called before each test
init_test "test_name"

# Register cleanup functions
after_each "cleanup_function_name"

# Automatically called after each test
cleanup_test
```

## Test Patterns

### Testing JSON Input/Output

```bash
test_hook_json_handling() {
    # Test valid JSON
    local output=$(echo '{"key":"value"}' | "$HOOK_PATH")
    assert_json_field "$output" "result" "success" "Should return success"
    
    # Test invalid JSON
    output=$(echo 'invalid json' | "$HOOK_PATH" 2>&1)
    assert_exit_code 0 $? "Should handle invalid JSON gracefully"
}
```

### Testing Error Conditions

```bash
test_hook_error_handling() {
    # Missing dependencies
    create_mock_command "required_tool" "exit 127"
    
    # File not found
    local output=$(echo '{"file":"/nonexistent"}' | "$HOOK_PATH" 2>&1)
    assert_exit_code 0 $? "Should handle missing files"
    
    # Permission denied
    touch forbidden.txt && chmod 000 forbidden.txt
    after_each "rm -f forbidden.txt"
    # ... test permission handling
}
```

### Testing Debug Mode

```bash
test_hook_debug_logging() {
    # Enable debug
    setup_debug_mode  # Creates ~/.claude/hooks-debug
    
    # Run hook
    "$HOOK_PATH" < input.json
    
    # Check logs
    assert_file_exists "$HOME/.claude/hook.log" "Should create log in debug mode"
}
```

## Running in CI/CD

Add to `.github/workflows/test.yml`:

```yaml
name: Test Hooks
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: sudo apt-get install -y jq
      - name: Run tests
        run: |
          chmod +x tests/run-tests.sh
          tests/run-tests.sh
```

## Best Practices

1. **Test Isolation**: Each test gets its own temporary directory
2. **Mock External Dependencies**: Never rely on actual git, npm, etc.
3. **Test Edge Cases**: Empty input, malformed data, missing files
4. **Clear Assertions**: Use descriptive messages for all assertions
5. **Fast Tests**: Keep tests under 100ms each when possible
6. **Deterministic**: Tests should not depend on timing or external state

## Debugging Failed Tests

1. Run with verbose flag: `./run-tests.sh -v`
2. Run specific test: `./run-tests.sh --test failing_test_name`
3. Add debug output in tests: `echo "DEBUG: $variable" >&2`
4. Check test temporary directory before cleanup
5. Use `set -x` in test function to trace execution

## Adding New Tests

1. Create `tests/unit/test-yourhook.sh`
2. Copy the basic structure from an existing test
3. Write test functions covering:
   - Happy path
   - Error conditions
   - Edge cases
   - Debug mode behavior
4. Run your tests: `./run-tests.sh --test yourhook`
5. Add to CI/CD if needed

## Test Coverage Goals

Each hook should have tests for:
- ✅ Valid input handling
- ✅ Invalid/malformed input
- ✅ Missing dependencies
- ✅ File system errors
- ✅ Debug mode on/off
- ✅ Exit codes
- ✅ JSON parsing with/without jq
- ✅ Path handling (spaces, special chars)
- ✅ Error messages and user feedback