# Claudekit Hooks Testing Plan

## Overview

This document outlines a comprehensive testing strategy for claudekit hooks, inspired by the excellent testing approach in autonomous-agents-template. Our goal is to ensure all hooks are robust, handle edge cases gracefully, and work reliably across different environments.

## Testing Framework Design

### 1. Core Test Framework (`tests/test-framework.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Core assertion functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Assertion failed}"
    
    if [[ "$expected" == "$actual" ]]; then
        pass "$message"
    else
        fail "$message: expected '$expected', got '$actual'"
    fi
}

assert_json_field() {
    local json="$1"
    local field="$2"
    local expected="$3"
    local message="${4:-JSON field assertion failed}"
    
    local actual=$(echo "$json" | jq -r ".$field" 2>/dev/null || echo "PARSE_ERROR")
    assert_equals "$expected" "$actual" "$message"
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Exit code assertion failed}"
    
    assert_equals "$expected" "$actual" "$message"
}

assert_file_contains() {
    local file="$1"
    local pattern="$2"
    local message="${3:-File content assertion failed}"
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        pass "$message"
    else
        fail "$message: pattern '$pattern' not found in $file"
    fi
}

# Test lifecycle management
init_test() {
    local test_name="$1"
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR"
    ORIGINAL_PATH="$PATH"
}

cleanup_test() {
    cd - > /dev/null
    rm -rf "$TEST_DIR"
    PATH="$ORIGINAL_PATH"
}

run_test() {
    local test_name="$1"
    local test_function="$2"
    
    init_test "$test_name"
    
    # Run the test in a subshell to isolate failures
    if (set -e; $test_function); then
        cleanup_test
    else
        cleanup_test
        return 1
    fi
}

# Mock creation utilities
create_mock_command() {
    local command="$1"
    local content="$2"
    
    cat > "$command" << EOF
#!/bin/bash
$content
EOF
    chmod +x "$command"
    export PATH="$PWD:$PATH"
}
```

### 2. Mock Strategies for External Dependencies

#### Git Mock
```bash
create_mock_git() {
    local scenario="$1"  # success, uncommitted, no-repo, etc.
    
    create_mock_command "git" "
case \"\$1\" in
    status)
        case '$scenario' in
            uncommitted)
                echo 'On branch main'
                echo 'Changes not staged for commit:'
                echo '  modified: src/index.ts'
                ;;
            clean)
                echo 'On branch main'
                echo 'nothing to commit, working tree clean'
                ;;
        esac
        ;;
    stash)
        if [[ \"\$2\" == 'create' ]]; then
            echo 'a1b2c3d4e5f6'
        elif [[ \"\$2\" == 'store' ]]; then
            echo 'Saved working directory and index state'
        fi
        ;;
esac
"
}
```

#### NPM/TypeScript/ESLint Mocks
```bash
create_mock_npm() {
    local test_result="$1"  # pass, fail, error
    
    create_mock_command "npm" "
if [[ \"\$1\" == 'test' ]]; then
    case '$test_result' in
        pass)
            echo 'All tests passed'
            exit 0
            ;;
        fail)
            echo 'Test failed: math.test.js'
            echo '  Expected: 4'
            echo '  Received: 3'
            exit 1
            ;;
    esac
fi
"
}

create_mock_tsc() {
    local has_errors="$1"
    
    create_mock_command "tsc" "
if [[ '$has_errors' == 'true' ]]; then
    echo 'src/index.ts(10,5): error TS2322: Type any is not assignable'
    exit 1
else
    exit 0
fi
"
}
```

## Test Organization

```
tests/
├── test-framework.sh           # Core testing utilities
├── run-tests.sh               # Main test runner
├── mocks/                     # Reusable mock templates
│   ├── git-mock.sh
│   ├── npm-mock.sh
│   └── claude-mock.sh
├── fixtures/                  # Test data files
│   ├── valid-transcript.jsonl
│   ├── incomplete-todos.jsonl
│   └── typescript-errors.ts
├── unit/                      # Unit tests for each hook
│   ├── test-typecheck.sh
│   ├── test-eslint.sh
│   ├── test-run-related-tests.sh
│   ├── test-auto-checkpoint.sh
│   └── test-validate-todo-completion.sh
├── integration/               # Integration tests
│   ├── test-posttooluse-workflow.sh
│   └── test-stop-workflow.sh
└── README.md                  # Test documentation
```

## Specific Test Cases

### 1. TypeScript Hook Tests (`test-typecheck.sh`)

```bash
test_typecheck_blocks_any_type() {
    # Setup
    create_mock_tsc "true"
    echo 'const data: any = {};' > test.ts
    
    # Execute
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/test.ts"}}' | \
        "$HOOK_DIR/typecheck.sh" 2>&1)
    local exit_code=$?
    
    # Assert
    assert_exit_code 2 $exit_code "Should block on any type"
    assert_contains "$output" "any types found" "Should mention any types"
}

test_typecheck_allows_clean_code() {
    # Setup
    create_mock_tsc "false"
    echo 'const data: string = "test";' > test.ts
    
    # Execute
    echo '{"tool_input":{"file_path":"'$PWD'/test.ts"}}' | \
        "$HOOK_DIR/typecheck.sh" 2>&1
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should allow clean TypeScript"
}

test_typecheck_handles_missing_file() {
    # Execute
    echo '{"tool_input":{"file_path":"/nonexistent/file.ts"}}' | \
        "$HOOK_DIR/typecheck.sh" 2>&1
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should allow missing files"
}

test_typecheck_handles_non_typescript_files() {
    # Setup
    echo 'print("hello")' > test.py
    
    # Execute
    echo '{"tool_input":{"file_path":"'$PWD'/test.py"}}' | \
        "$HOOK_DIR/typecheck.sh" 2>&1
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should skip non-TypeScript files"
}
```

### 2. ESLint Hook Tests (`test-eslint.sh`)

```bash
test_eslint_blocks_errors() {
    # Setup
    create_mock_command "npx" "
echo 'test.js'
echo '  1:10  error  Unexpected token'
exit 1
"
    echo 'var x = 1;;' > test.js
    
    # Execute
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/test.js"}}' | \
        "$HOOK_DIR/eslint.sh" 2>&1)
    local exit_code=$?
    
    # Assert
    assert_exit_code 2 $exit_code "Should block on ESLint errors"
    assert_contains "$output" "ESLint issues found" "Should report ESLint issues"
}

test_eslint_cache_handling() {
    # Setup
    mkdir -p .eslintcache
    touch .eslintcache/cache.json
    
    # Test that cache is used appropriately
    # ...
}
```

### 3. Todo Validation Hook Tests (`test-validate-todo-completion.sh`)

```bash
test_todo_blocks_incomplete_items() {
    # Setup
    cat > transcript.jsonl << 'EOF'
{"toolUseResult":{"newTodos":[{"id":"1","content":"Fix bug","status":"pending","priority":"high"}]}}
EOF
    
    # Execute
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_DIR/validate-todo-completion.sh")
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should exit 0 but with blocking JSON"
    assert_json_field "$output" "decision" "block" "Should decide to block"
    assert_contains "$output" "incomplete todo items" "Should mention incomplete todos"
}

test_todo_prevents_infinite_loop() {
    # Execute
    local output=$(echo '{"transcript_path":"test.jsonl","stop_hook_active":true}' | \
        "$HOOK_DIR/validate-todo-completion.sh")
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should allow stop when hook is active"
    assert_equals "" "$output" "Should produce no output"
}

test_todo_debug_mode() {
    # Setup
    touch ~/.claude/hooks-debug
    
    # Execute hook and check for log file
    # ...
    
    # Cleanup
    rm -f ~/.claude/hooks-debug
}
```

### 4. Auto-checkpoint Hook Tests (`test-auto-checkpoint.sh`)

```bash
test_checkpoint_creates_stash() {
    # Setup
    create_mock_git "uncommitted"
    
    # Execute
    "$HOOK_DIR/auto-checkpoint.sh"
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should succeed"
    # Verify git stash create was called
}

test_checkpoint_skips_clean_repo() {
    # Setup
    create_mock_git "clean"
    
    # Execute
    "$HOOK_DIR/auto-checkpoint.sh"
    local exit_code=$?
    
    # Assert
    assert_exit_code 0 $exit_code "Should succeed without stashing"
}
```

## Integration Tests

### PostToolUse Workflow Test
```bash
test_posttooluse_multiple_hooks() {
    # Test that multiple PostToolUse hooks can run in sequence
    # Setup TypeScript file with any type AND ESLint errors
    # Verify appropriate hook blocks first
}
```

### Stop Hook Workflow Test
```bash
test_stop_hooks_sequential_execution() {
    # Test that auto-checkpoint runs before todo validation
    # Verify both hooks execute in correct order
}
```

## Test Runner (`run-tests.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-framework.sh"

# Configuration
HOOK_DIR="$SCRIPT_DIR/../.claude/hooks"
VERBOSE=false
RUN_INTEGRATION=true
SPECIFIC_TEST=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --no-integration)
            RUN_INTEGRATION=false
            shift
            ;;
        --test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run tests
echo "🧪 Running claudekit hook tests..."

# Unit tests
for test_file in "$SCRIPT_DIR"/unit/test-*.sh; do
    if [[ -n "$SPECIFIC_TEST" ]] && [[ ! "$test_file" =~ "$SPECIFIC_TEST" ]]; then
        continue
    fi
    
    source "$test_file"
    run_all_tests_in_file "$test_file"
done

# Integration tests
if [[ "$RUN_INTEGRATION" == "true" ]]; then
    for test_file in "$SCRIPT_DIR"/integration/test-*.sh; do
        if [[ -n "$SPECIFIC_TEST" ]] && [[ ! "$test_file" =~ "$SPECIFIC_TEST" ]]; then
            continue
        fi
        
        source "$test_file"
        run_all_tests_in_file "$test_file"
    done
fi

# Summary
echo -e "\n📊 Test Summary:"
echo -e "  Total:  $TESTS_RUN"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi
```

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/test-hooks.yml`)

```yaml
name: Test Hooks

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Install dependencies
      run: |
        sudo apt-get update
        sudo apt-get install -y jq
    
    - name: Run tests
      run: |
        chmod +x tests/run-tests.sh
        tests/run-tests.sh --verbose
    
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: tests/results/
```

## Key Testing Principles

1. **Isolation**: Each test runs in its own temporary directory
2. **Mocking**: All external dependencies are mocked for predictability
3. **Coverage**: Test both success and failure scenarios
4. **Edge Cases**: Handle missing files, invalid JSON, missing dependencies
5. **Performance**: Tests should run quickly (< 1 minute total)
6. **Clarity**: Clear test names and assertion messages
7. **Maintainability**: Reusable mocks and utilities

## Implementation Phases

### Phase 1: Core Framework (Week 1)
- [ ] Create test-framework.sh with basic assertions
- [ ] Set up test directory structure
- [ ] Create run-tests.sh runner
- [ ] Write first unit test for typecheck.sh

### Phase 2: Unit Tests (Week 2)
- [ ] Complete typecheck.sh tests
- [ ] Complete eslint.sh tests
- [ ] Complete run-related-tests.sh tests
- [ ] Complete auto-checkpoint.sh tests
- [ ] Complete validate-todo-completion.sh tests

### Phase 3: Mocks & Integration (Week 3)
- [ ] Build comprehensive mock library
- [ ] Create integration tests
- [ ] Add debug mode testing
- [ ] Test cross-platform compatibility

### Phase 4: CI/CD & Documentation (Week 4)
- [ ] Set up GitHub Actions
- [ ] Write comprehensive test documentation
- [ ] Add code coverage reporting
- [ ] Create contributor guidelines

## Success Metrics

- All hooks have >90% code coverage
- Tests run in under 60 seconds
- Zero flaky tests
- Clear documentation for adding new tests
- CI/CD pipeline catches regressions

## Future Enhancements

1. **Parallel test execution** for faster runs
2. **Property-based testing** for JSON parsing
3. **Mutation testing** to verify test quality
4. **Performance benchmarks** for hook execution
5. **Cross-shell compatibility** (bash, zsh, sh)