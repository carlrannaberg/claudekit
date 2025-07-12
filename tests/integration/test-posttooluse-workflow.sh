#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Integration Tests for PostToolUse Hook Workflow                              #
# Tests multiple hooks working together in realistic scenarios                 #
################################################################################

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/../../.claude/hooks"

# Source the test framework
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Integration Test Cases                                                       #
################################################################################

test_typescript_project_workflow() {
    # Simulate a TypeScript project with multiple issues
    
    # Setup project structure
    create_test_file "package.json" '{
  "name": "test-project",
  "scripts": {
    "test": "jest"
  }
}'
    
    create_test_file "tsconfig.json" '{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}'
    
    create_test_file ".eslintrc.json" '{
  "rules": {
    "no-unused-vars": "error",
    "semi": ["error", "always"]
  }
}'
    
    # Create a file with both TypeScript and ESLint issues
    create_test_file "src/index.ts" '
const unused = 42
export function processData(data: any) {
    console.log(data)
}
'
    
    # Mock commands
    create_mock_command "tsc" '
echo "src/index.ts(2,33): error TS7006: Parameter '\''data'\'' implicitly has an '\''any'\'' type."
exit 1
'
    
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]]; then
    echo "src/index.ts"
    echo "  1:7  error  '\''unused'\'' is assigned a value but never used"
    echo "  3:23 error  Missing semicolon"
    exit 1
fi
'
    
    # Test TypeScript hook blocks first
    local ts_output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/index.ts"}}' | \
        "$HOOKS_DIR/typecheck.sh" 2>&1)
    local ts_exit=$?
    
    assert_exit_code 2 $ts_exit "TypeScript hook should block on any type"
    
    # Test ESLint hook would also block
    echo '{"tool_input":{"file_path":"'$PWD'/src/index.ts"}}' | \
        "$HOOKS_DIR/eslint.sh" 2>&1
    local eslint_exit=$?
    
    assert_exit_code 2 $eslint_exit "ESLint hook should block on errors"
}

test_test_file_modification_triggers_tests() {
    # Setup a simple test project
    create_test_file "package.json" '{"scripts": {"test": "jest"}}'
    
    create_test_file "src/math.js" '
export function add(a, b) {
    return a + b;
}
'
    
    create_test_file "src/math.test.js" '
import { add } from "./math.js";
test("adds 1 + 2 to equal 3", () => {
    expect(add(1, 2)).toBe(3);
});
'
    
    # Mock successful test run
    create_mock_command "npm" '
if [[ "$1" == "test" ]] && [[ "$2" == "--" ]]; then
    echo "PASS src/math.test.js"
    echo "Test Suites: 1 passed, 1 total"
    exit 0
fi
'
    
    # Modify the main file
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/math.js"}}' | \
        "$HOOKS_DIR/run-related-tests.sh" 2>&1)
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Tests should pass"
    
    # Now mock failing tests
    create_mock_command "npm" '
if [[ "$1" == "test" ]]; then
    echo "FAIL src/math.test.js"
    echo "Expected: 3"
    echo "Received: 4"
    exit 1
fi
'
    
    # Test again - should block
    echo '{"tool_input":{"file_path":"'$PWD'/src/math.js"}}' | \
        "$HOOKS_DIR/run-related-tests.sh" 2>&1
    exit_code=$?
    
    assert_exit_code 2 $exit_code "Should block when tests fail"
}

test_mixed_file_types_handling() {
    # Test that hooks properly handle different file types
    
    # Python file - all hooks should skip
    create_test_file "script.py" 'print("Hello, World!")'
    
    for hook in typecheck.sh eslint.sh run-related-tests.sh; do
        local output=$(echo '{"tool_input":{"file_path":"'$PWD'/script.py"}}' | \
            "$HOOKS_DIR/$hook" 2>&1)
        local exit_code=$?
        
        assert_exit_code 0 $exit_code "$hook should skip Python files"
    done
    
    # Markdown file - all hooks should skip
    create_test_file "README.md" '# Documentation'
    
    for hook in typecheck.sh eslint.sh run-related-tests.sh; do
        local output=$(echo '{"tool_input":{"file_path":"'$PWD'/README.md"}}' | \
            "$HOOKS_DIR/$hook" 2>&1)
        local exit_code=$?
        
        assert_exit_code 0 $exit_code "$hook should skip Markdown files"
    done
}

test_cascading_fixes_workflow() {
    # Simulate fixing issues one by one
    
    # Setup project
    create_test_file "tsconfig.json" '{"compilerOptions": {"strict": true}}'
    create_test_file ".eslintrc.json" '{"rules": {"semi": ["error", "always"]}}'
    
    # File with multiple issues
    create_test_file "src/component.tsx" '
export function Component(props: any) {
    const value = props.value
    return <div>{value}</div>
}
'
    
    # First run: TypeScript blocks
    create_mock_command "tsc" '
echo "src/component.tsx(1,34): error TS7006: Parameter '\''props'\'' implicitly has an '\''any'\'' type."
exit 1
'
    
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/component.tsx"}}' | \
        "$HOOKS_DIR/typecheck.sh" 2>&1)
    assert_exit_code 2 $? "TypeScript should block initially"
    
    # Fix TypeScript issue
    create_test_file "src/component.tsx" '
interface Props { value: string; }
export function Component(props: Props) {
    const value = props.value
    return <div>{value}</div>
}
'
    
    # Now TypeScript passes
    create_mock_command "tsc" 'exit 0'
    
    output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/component.tsx"}}' | \
        "$HOOKS_DIR/typecheck.sh" 2>&1)
    assert_exit_code 0 $? "TypeScript should pass after fix"
    
    # But ESLint still fails
    create_mock_command "npx" '
echo "src/component.tsx"
echo "  3:30 error  Missing semicolon"
exit 1
'
    
    output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/component.tsx"}}' | \
        "$HOOKS_DIR/eslint.sh" 2>&1)
    assert_exit_code 2 $? "ESLint should still block"
}

################################################################################
# Run all tests if executed directly                                           #
################################################################################

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi