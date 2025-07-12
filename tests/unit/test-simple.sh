#!/usr/bin/env bash
set -euo pipefail

# Simple test to verify test counting

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

test_simple_pass() {
    assert_equals 1 1 "One equals one"
}

test_simple_fail() {
    assert_equals 1 2 "One should not equal two"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi