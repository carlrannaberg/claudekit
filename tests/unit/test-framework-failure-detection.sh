#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Framework Failure Detection Validation                                  #
# This file intentionally contains a failing test to verify our test          #
# framework can properly detect and report failures.                           #
# Run this separately from the main test suite.                               #
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

test_framework_detects_failures() {
    # This test intentionally fails to verify failure detection
    assert_equals 1 2 "Intentional failure - framework should detect this"
}

test_framework_detects_passes() {
    # This test passes to show the framework works correctly
    assert_equals 1 1 "Framework correctly detects passing tests"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "================================================"
    echo "Running Test Framework Failure Detection Tests"
    echo "This should show 1 pass and 1 fail:"
    echo "================================================"
    run_all_tests_in_file "${BASH_SOURCE[0]}"
    echo ""
    echo "If you see 1 failure above, the test framework is working correctly!"
fi