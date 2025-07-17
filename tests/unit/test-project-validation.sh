#!/usr/bin/env bash

# Test project validation hook

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

HOOK_PATH="${BASH_SOURCE%/*}/../../src/hooks/project-validation.sh"

################################################################################
# Test Setup                                                                  #
################################################################################

setUp() {
    # Create temporary directory for test
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR"
    
    # Mock git for clean repository
    create_mock_command "git" "
if [[ \"\$1\" == \"status\" ]]; then
    echo ''
    exit 0
fi
"
}

tearDown() {
    # Clean up
    cd /
    rm -rf "$TEST_DIR"
}

################################################################################
# Test Cases                                                                  #
################################################################################

test_project_validation_passes_clean_repo() {
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should succeed with clean repository
    assert_exit_code 0 $exit_code "Should succeed with clean repository"
}

test_project_validation_handles_uncommitted_changes() {
    # Mock git to show uncommitted changes
    create_mock_command "git" "
if [[ \"\$1\" == \"status\" ]]; then
    echo 'Changes not staged for commit:'
    echo '  modified: file.txt'
    exit 0
fi
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should still succeed (project validation is informational)
    assert_exit_code 0 $exit_code "Should handle uncommitted changes"
}

test_project_validation_handles_non_git_directory() {
    # Mock git to fail
    create_mock_command "git" "
echo 'fatal: not a git repository'
exit 128
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should handle non-git directories gracefully
    assert_exit_code 0 $exit_code "Should handle non-git directories gracefully"
}

test_project_validation_handles_git_not_installed() {
    # Remove git command
    create_mock_command "git" "
echo 'git: command not found'
exit 127
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should handle missing git command
    assert_exit_code 0 $exit_code "Should handle missing git command"
}

test_project_validation_produces_json_output() {
    # Execute hook and capture output
    local output
    output=$("$HOOK_PATH" 2>&1)
    
    # Should produce JSON output
    assert_contains "$output" '"suppressOutput"' "Should produce JSON output"
}

################################################################################
# Run Tests                                                                   #
################################################################################

run_test_suite "test-project-validation.sh"