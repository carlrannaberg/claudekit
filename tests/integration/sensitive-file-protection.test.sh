#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Integration Tests for Sensitive File Protection                             #
# Tests the complete file-guard hook integration with multiple ignore files   #
################################################################################

# Import test framework
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

# Test configuration
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLI_PATH="$PROJECT_ROOT/dist/hooks-cli.cjs"
TEMP_PROJECT_DIR=""

################################################################################
# Setup and Teardown                                                          #
################################################################################

setUp() {
    # Create a temporary project directory for testing
    TEMP_PROJECT_DIR=$(mktemp -d)
    cd "$TEMP_PROJECT_DIR"
    
    # Ensure claudekit CLI is built
    cd "$PROJECT_ROOT"
    if [[ ! -f "$CLI_PATH" ]]; then
        npm run build >/dev/null 2>&1
    fi
    
    cd "$TEMP_PROJECT_DIR"
}

tearDown() {
    if [[ -n "$TEMP_PROJECT_DIR" ]] && [[ -d "$TEMP_PROJECT_DIR" ]]; then
        rm -rf "$TEMP_PROJECT_DIR"
    fi
}

################################################################################
# Helper Functions                                                             #
################################################################################

# Run file-guard hook with JSON payload
run_file_guard() {
    local tool_name="$1"
    local file_path="$2"
    local payload="{\"tool_name\":\"$tool_name\",\"tool_input\":{\"file_path\":\"$file_path\"}}"
    
    echo "$payload" | node "$CLI_PATH" run file-guard
}

# Check if hook response contains specific decision
check_permission_decision() {
    local output="$1"
    local expected_decision="$2"
    
    if echo "$output" | grep -q "\"permissionDecision\":\"$expected_decision\""; then
        return 0
    else
        return 1
    fi
}

################################################################################
# Integration Tests                                                            #
################################################################################

test_pattern_merging_from_multiple_files() {
    # Purpose: Test pattern merging from multiple ignore files
    
    # Create test files
    echo "secret" > .env
    echo "private_key" > test.key
    echo "secret_data" > test.secret
    
    # Create multiple ignore files
    echo ".env" > .agentignore
    echo "*.key" > .cursorignore
    echo "*.secret" > .aiignore
    
    # Test that ALL patterns are active
    local env_output key_output secret_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    key_output=$(run_file_guard "Read" "test.key" 2>/dev/null || true) 
    secret_output=$(run_file_guard "Read" "test.secret" 2>/dev/null || true)
    
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$key_output" "deny" && \
       check_permission_decision "$secret_output" "deny"; then
        assert_pass "Pattern merging from multiple files works"
    else
        assert_fail "Pattern merging failed"
    fi
}

test_default_patterns_fallback() {
    # Purpose: Test default patterns when no ignore files exist
    
    # Create test files
    echo "secret" > .env
    echo "private_key" > test.key
    
    # Ensure no ignore files exist
    rm -f .agentignore .cursorignore .aiignore .aiexclude .geminiignore .codeiumignore
    
    local env_output key_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    key_output=$(run_file_guard "Read" "test.key" 2>/dev/null || true)
    
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$key_output" "deny"; then
        assert_pass "Default patterns provide protection"
    else
        assert_fail "Default patterns failed"
    fi
}

################################################################################
# Test Suite Execution                                                         #
################################################################################

# Register cleanup
trap tearDown EXIT

# Run the test suite
run_test_suite "Sensitive File Protection Integration Tests"
