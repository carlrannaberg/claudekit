#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for run-related-tests.sh Hook                                    #
################################################################################

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_PATH="$SCRIPT_DIR/../../.claude/hooks/run-related-tests.sh"

# Source the test framework
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Test Cases                                                                   #
################################################################################

test_run_tests_finds_standard_test_file() {
    # Setup project with standard test file naming
    create_test_file "src/math.js" '
export function add(a, b) {
    return a + b;
}
'
    
    create_test_file "src/math.test.js" '
import { add } from "./math.js";
test("adds numbers", () => {
    expect(add(1, 2)).toBe(3);
});
'
    
    create_test_file "package.json" '{"scripts": {"test": "jest"}}'
    
    # Mock successful test run
    create_mock_command "npm" '
if [[ "$1" == "test" ]] && [[ "$*" == *"math.test.js"* ]]; then
    echo "PASS src/math.test.js"
    echo "  ✓ adds numbers (5ms)"
    echo ""
    echo "Test Suites: 1 passed, 1 total"
    exit 0
fi
'
    
    # Execute hook
    echo '{"tool_input":{"file_path":"'$PWD'/src/math.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should pass when tests succeed"
}

test_run_tests_blocks_on_failure() {
    # Setup project with failing test
    create_test_file "src/calculator.ts" 'export const multiply = (a: number, b: number) => a * b;'
    create_test_file "src/calculator.test.ts" 'test("multiply", () => expect(multiply(2, 3)).toBe(7));'
    create_test_file "package.json" '{"scripts": {"test": "jest"}}'
    
    # Mock failing test
    create_mock_command "npm" '
if [[ "$1" == "test" ]]; then
    echo "FAIL src/calculator.test.ts"
    echo "  ✕ multiply (10ms)"
    echo ""
    echo "  ● multiply"
    echo ""
    echo "    expect(received).toBe(expected)"
    echo ""
    echo "    Expected: 7"
    echo "    Received: 6"
    echo ""
    echo "Test Suites: 1 failed, 1 total"
    exit 1
fi
'
    
    # Execute hook
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/calculator.ts"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 2 $exit_code "Should block when tests fail"
    assert_contains "$output" "Tests failed" "Should report test failure"
    assert_contains "$output" "calculator.test.ts" "Should mention failing test file"
}

test_run_tests_finds_spec_files() {
    # Test with .spec.js naming convention
    create_test_file "lib/utils.js" 'export const isEmpty = (arr) => arr.length === 0;'
    create_test_file "lib/utils.spec.js" 'describe("utils", () => { it("works", () => {}); });'
    create_test_file "package.json" '{"scripts": {"test": "mocha"}}'
    
    # Mock test discovery
    local found_test_file=""
    create_mock_command "npm" '
if [[ "$*" == *"utils.spec.js"* ]]; then
    echo "Found spec file"
    exit 0
else
    echo "No spec file found"
    exit 1
fi
'
    
    # Execute hook
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/lib/utils.js"}}' | \
        "$HOOK_PATH" 2>&1)
    
    assert_contains "$output" "Found spec file" "Should find .spec.js files"
}

test_run_tests_finds_tests_in_test_directory() {
    # Test with __tests__ directory structure
    create_test_file "src/components/Button.tsx" 'export const Button = () => <button />;'
    create_test_file "src/components/__tests__/Button.test.tsx" 'test("Button", () => {});'
    create_test_file "package.json" '{"scripts": {"test": "jest"}}'
    
    create_mock_command "npm" '
if [[ "$*" == *"__tests__/Button.test.tsx"* ]]; then
    echo "Running tests from __tests__ directory"
    exit 0
fi
'
    
    # Execute hook
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/components/Button.tsx"}}' | \
        "$HOOK_PATH" 2>&1)
    
    assert_contains "$output" "Running tests from __tests__ directory" \
        "Should find tests in __tests__ directory"
}

test_run_tests_handles_no_test_file() {
    # Create file with no associated tests
    create_test_file "src/config.js" 'export const API_URL = "https://api.example.com";'
    create_test_file "package.json" '{"scripts": {"test": "jest"}}'
    
    # Execute hook - should skip gracefully
    echo '{"tool_input":{"file_path":"'$PWD'/src/config.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should skip files without tests"
}

test_run_tests_skips_non_js_ts_files() {
    # Create non-JavaScript/TypeScript files
    create_test_file "styles.css" 'body { margin: 0; }'
    create_test_file "data.json" '{"key": "value"}'
    create_test_file "README.md" '# Docs'
    
    # Test each file type
    for file in styles.css data.json README.md; do
        echo '{"tool_input":{"file_path":"'$PWD'/'$file'"}}' | "$HOOK_PATH" 2>&1
        local exit_code=$?
        assert_exit_code 0 $exit_code "Should skip $file"
    done
}

test_run_tests_handles_missing_npm_test_script() {
    # Create package.json without test script
    create_test_file "src/index.js" 'console.log("hello");'
    create_test_file "src/index.test.js" 'test("dummy", () => {});'
    create_test_file "package.json" '{"name": "test-project"}'
    
    # Mock npm error
    create_mock_command "npm" '
if [[ "$1" == "test" ]]; then
    echo "npm ERR! Missing script: \"test\""
    echo "npm ERR! To see a list of scripts, run:"
    echo "npm ERR!   npm run"
    exit 1
fi
'
    
    # Execute hook - should handle gracefully
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/index.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should exit 0 when no test script exists
    assert_exit_code 0 $exit_code "Should handle missing test script"
}

test_run_tests_handles_invalid_json_input() {
    # Test with malformed JSON
    local output=$(echo 'not valid json' | "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle invalid JSON gracefully"
    
    # Test with empty input
    output=$(echo '' | "$HOOK_PATH" 2>&1)
    exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle empty input gracefully"
}

test_run_tests_handles_missing_file() {
    # Execute hook with non-existent file
    echo '{"tool_input":{"file_path":"/nonexistent/file.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should gracefully handle missing files"
}

test_run_tests_multiple_test_patterns() {
    # Create file with multiple test file variations
    create_test_file "src/validator.js" 'export const isEmail = (email) => /@/.test(email);'
    
    # Create multiple test files
    create_test_file "src/validator.test.js" 'test("test variant", () => {});'
    create_test_file "src/validator.spec.js" 'test("spec variant", () => {});'
    create_test_file "src/__tests__/validator.test.js" 'test("tests dir variant", () => {});'
    
    create_test_file "package.json" '{"scripts": {"test": "jest"}}'
    
    # Mock that captures which test files are run
    create_mock_command "npm" '
echo "Running tests for: $*"
if [[ "$*" == *"validator"* ]]; then
    echo "Found validator tests"
    exit 0
fi
'
    
    # Execute hook
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/validator.js"}}' | \
        "$HOOK_PATH" 2>&1)
    
    assert_contains "$output" "validator" "Should find at least one test file"
}

test_run_tests_handles_spaces_in_paths() {
    # Create directory with spaces
    mkdir -p "my project/src"
    
    # Create files in directory with spaces
    create_test_file "my project/src/app with spaces.js" 'export const app = {};'
    create_test_file "my project/src/app with spaces.test.js" 'test("app", () => {});'
    create_test_file "my project/package.json" '{"scripts": {"test": "jest"}}'
    
    # Mock npm
    create_mock_command "npm" '
if [[ "$*" == *"app with spaces.test.js"* ]]; then
    echo "Handled spaces correctly"
    exit 0
fi
'
    
    # Execute hook with path containing spaces
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/my project/src/app with spaces.js"}}' | \
        "$HOOK_PATH" 2>&1)
    
    assert_contains "$output" "Handled spaces correctly" "Should handle paths with spaces"
}

test_run_tests_project_root_detection() {
    # Create nested project structure
    create_test_file "project/src/deep/nested/file.js" 'export const x = 1;'
    create_test_file "project/src/deep/nested/file.test.js" 'test("x", () => {});'
    create_test_file "project/package.json" '{"scripts": {"test": "jest"}}'
    
    # Mock npm that checks current directory
    create_mock_command "npm" '
if [[ -f package.json ]]; then
    echo "Found package.json in current directory"
    if [[ "$*" == *"file.test.js"* ]]; then
        exit 0
    fi
fi
exit 1
'
    
    # Hook should find project root
    cd project
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/deep/nested/file.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should find project root with package.json"
}

test_run_tests_handles_test_file_itself() {
    # When editing a test file directly
    create_test_file "src/feature.test.js" 'test("feature", () => { expect(1).toBe(1); });'
    create_test_file "package.json" '{"scripts": {"test": "jest"}}'
    
    # Mock test run
    create_mock_command "npm" '
if [[ "$*" == *"feature.test.js"* ]]; then
    echo "Running the test file itself"
    exit 0
fi
'
    
    # Execute hook on test file
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/feature.test.js"}}' | \
        "$HOOK_PATH" 2>&1)
    
    assert_contains "$output" "Running the test file itself" \
        "Should run test when editing test file directly"
}

################################################################################
# Run all tests if executed directly                                           #
################################################################################

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi