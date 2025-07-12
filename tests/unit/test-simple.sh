#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Simple Tests - All Passing                                                   #
# For failure detection validation, see test-framework-failure-detection.sh    #
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

test_simple_arithmetic() {
    assert_equals 1 1 "One equals one"
    assert_equals 2 2 "Two equals two"
    assert_equals $((1 + 1)) 2 "One plus one equals two"
}

test_simple_strings() {
    assert_equals "hello" "hello" "String equality works"
    assert_not_equals "hello" "world" "String inequality works"
    assert_contains "hello world" "world" "String contains works"
    assert_not_contains "hello world" "foo" "String not contains works"
}

test_simple_exit_codes() {
    local exit_code
    
    # Test successful command
    true
    exit_code=$?
    assert_exit_code 0 $exit_code "True command exits with 0"
    
    # Test failing command
    false || exit_code=$?
    assert_exit_code 1 $exit_code "False command exits with 1"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi