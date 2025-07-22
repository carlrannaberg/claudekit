#!/usr/bin/env bash

# Test command validation (slash commands)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Test Setup                                                                  #
################################################################################

setUp() {
    # Create temporary directory for test
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR"
    
    # Create mock .claude/commands directory
    mkdir -p .claude/commands
}

tearDown() {
    # Clean up
    cd /
    rm -rf "$TEST_DIR"
}

################################################################################
# Test Cases                                                                  #
################################################################################

test_command_has_valid_frontmatter() {
    # Test various command files have valid YAML frontmatter
    local commands=(
        "../../src/commands/agent/init.md"
        "../../src/commands/agent/migration.md"
        "../../src/commands/checkpoint/create.md"
        "../../src/commands/git/commit.md"
        "../../src/commands/spec/create.md"
    )
    
    for cmd_file in "${commands[@]}"; do
        local full_path="${BASH_SOURCE%/*}/$cmd_file"
        if [[ -f "$full_path" ]]; then
            # Check for frontmatter markers
            assert_file_contains "$full_path" "^---" "Command $cmd_file should have frontmatter"
            assert_file_contains "$full_path" "description:" "Command $cmd_file should have description"
        fi
    done
}

test_command_has_allowed_tools() {
    # Test that commands specify allowed tools
    local commands=(
        "../../src/commands/agent/init.md"
        "../../src/commands/agent/migration.md"
        "../../src/commands/checkpoint/create.md"
    )
    
    for cmd_file in "${commands[@]}"; do
        local full_path="${BASH_SOURCE%/*}/$cmd_file"
        if [[ -f "$full_path" ]]; then
            # Check for allowed-tools in frontmatter
            assert_file_contains "$full_path" "allowed-tools:" "Command $cmd_file should specify allowed-tools"
        fi
    done
}

test_command_structure_validation() {
    # Test that commands follow proper structure
    local test_command=".claude/commands/test-command.md"
    
    # Create a valid command file using helper function
    create_command_file "$test_command" "Test command for validation" "Read, Write"
    
    # Validate the command structure
    assert_file_exists "$test_command" "Command file should exist"
    assert_file_contains "$test_command" "description:" "Command should have description"
    assert_file_contains "$test_command" "allowed-tools:" "Command should have allowed-tools"
    assert_file_contains "$test_command" "Instructions for Claude" "Command should have header"
}

test_command_security_validation() {
    # Test that commands don't have unsafe tool permissions
    local test_command=".claude/commands/unsafe-command.md"
    
    # Create a command with unsafe permissions using helper function
    create_command_file "$test_command" "Unsafe command" "Bash"
    
    # Check that the command has unsafe permissions
    assert_file_contains "$test_command" "allowed-tools: Bash" "Command should have Bash permission"
    
    # This would be flagged in a real security audit
    # For testing purposes, we just verify we can detect it
    local content=$(cat "$test_command")
    if echo "$content" | grep -q "allowed-tools: Bash"; then
        assert_pass "Detected unrestricted Bash access"
    else
        assert_fail "Should detect unrestricted Bash access"
    fi
}

test_command_markdown_validation() {
    # Test that commands have proper markdown structure
    local commands=(
        "../../src/commands/agent/init.md"
        "../../src/commands/checkpoint/create.md"
        "../../src/commands/git/commit.md"
    )
    
    for cmd_file in "${commands[@]}"; do
        local full_path="${BASH_SOURCE%/*}/$cmd_file"
        if [[ -f "$full_path" ]]; then
            # Check for proper markdown headers
            assert_file_contains "$full_path" "# " "Command $cmd_file should have h1 header"
        fi
    done
}

################################################################################
# Run Tests                                                                   #
################################################################################

run_test_suite "test-command-validation.sh"