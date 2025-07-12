#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Framework Validation - Ensures test framework is working correctly      #
################################################################################

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the test framework
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Basic Test Cases to Validate Framework                                       #
################################################################################

test_basic_assertions_work() {
    # Test equals
    assert_equals "hello" "hello" "Basic string equality"
    assert_equals 42 42 "Basic number equality"
    
    # Test not equals
    assert_not_equals "hello" "world" "Basic string inequality"
    
    # Test contains
    assert_contains "hello world" "world" "String contains"
    assert_not_contains "hello world" "foo" "String not contains"
}

test_exit_code_assertions() {
    # Test successful command
    true
    assert_exit_code 0 $? "True command should exit 0"
    
    # Test failing command
    local exit_code=0
    false || exit_code=$?
    assert_exit_code 1 $exit_code "False command should exit 1"
}

test_file_assertions() {
    # Create test file
    echo "test content" > test.txt
    
    assert_file_exists "test.txt" "File should exist"
    assert_file_contains "test.txt" "test content" "File should contain text"
    
    # Test non-existent file
    assert_file_not_exists "nonexistent.txt" "File should not exist"
}

test_json_assertions() {
    local json='{"name": "test", "value": 42, "nested": {"key": "value"}}'
    
    assert_json_field "$json" "name" "test" "Simple field"
    assert_json_field "$json" "value" "42" "Number field"
    assert_json_field "$json" "nested.key" "value" "Nested field"
}

test_mock_creation() {
    # Create a simple mock
    create_mock_command "echo_test" 'echo "mocked output"'
    
    local output=$(echo_test)
    assert_equals "mocked output" "$output" "Mock should work"
}

test_cleanup_functions() {
    # Create a file that should be cleaned up
    touch cleanup_test.txt
    after_each "rm -f cleanup_test.txt"
    
    assert_file_exists "cleanup_test.txt" "File should exist before cleanup"
    # File will be cleaned up after test
}

################################################################################
# Run all tests if executed directly                                           #
################################################################################

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi