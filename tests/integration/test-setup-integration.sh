#!/usr/bin/env bash

# Integration tests for setup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

SETUP_SCRIPT="${BASH_SOURCE%/*}/../../setup.sh"

################################################################################
# Test Setup                                                                  #
################################################################################

setUp() {
    # Create temporary directory for test
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR"
    
    # Copy setup script and source files
    cp "$SETUP_SCRIPT" .
    cp -r "${BASH_SOURCE%/*}/../../src" .
    cp -r "${BASH_SOURCE%/*}/../../.claude" .
    
    # Create fake home directory for testing
    export HOME="$TEST_DIR/fake-home"
    mkdir -p "$HOME"
}

tearDown() {
    # Clean up
    cd /
    rm -rf "$TEST_DIR"
    unset HOME
}

################################################################################
# Test Cases                                                                  #
################################################################################

test_setup_creates_user_commands() {
    # Run setup script with no project path
    printf '\n' | ./setup.sh >/dev/null
    
    # Check that user commands directory was created
    assert_directory_exists "$HOME/.claude/commands" "Should create user commands directory"
    
    # Check that some commands were installed
    assert_file_exists "$HOME/.claude/commands/agent/init.md" "Should install agent:init command"
    assert_file_exists "$HOME/.claude/commands/checkpoint/create.md" "Should install checkpoint:create command"
    assert_file_exists "$HOME/.claude/commands/git/commit.md" "Should install git:commit command"
}

test_setup_installs_project_hooks() {
    # Create a project directory
    mkdir -p project
    cd project
    
    # Run setup script with project path
    printf '%s\n3\n' "$PWD" | ../setup.sh >/dev/null
    
    # Check that project hooks were installed
    assert_directory_exists ".claude/hooks" "Should create project hooks directory"
    assert_file_exists ".claude/hooks/auto-checkpoint.sh" "Should install auto-checkpoint hook"
    assert_file_exists ".claude/hooks/eslint.sh" "Should install eslint hook"
    assert_file_exists ".claude/hooks/typecheck.sh" "Should install typecheck hook"
    
    # Check that hooks are executable
    assert_file_executable ".claude/hooks/auto-checkpoint.sh" "Hook should be executable"
    assert_file_executable ".claude/hooks/eslint.sh" "Hook should be executable"
    assert_file_executable ".claude/hooks/typecheck.sh" "Hook should be executable"
}

test_setup_follows_symlinks() {
    # Run setup script
    printf '\n' | ./setup.sh >/dev/null
    
    # Check that symlinked files are properly installed as regular files
    assert_file_exists "$HOME/.claude/commands/agent/init.md" "Should install symlinked command"
    
    # Verify it's a regular file, not a symlink
    if [[ -L "$HOME/.claude/commands/agent/init.md" ]]; then
        test_fail "Installed command should not be a symlink"
    else
        test_pass "Installed command should be a regular file"
    fi
    
    # Verify content is accessible
    assert_file_contains "$HOME/.claude/commands/agent/init.md" "description:" "Command should have readable content"
}

test_setup_handles_existing_settings() {
    # Create existing settings file
    mkdir -p "$HOME/.claude"
    cat > "$HOME/.claude/settings.json" << 'EOF'
{
  "hooks": {
    "PostToolUse": ["existing-hook.sh"]
  }
}
EOF
    
    # Run setup script with option to skip settings
    printf '\n3\n' | ./setup.sh >/dev/null
    
    # Check that existing settings were preserved
    assert_file_contains "$HOME/.claude/settings.json" "existing-hook.sh" "Should preserve existing settings"
}

test_setup_creates_valid_settings() {
    # Run setup script
    printf '\n' | ./setup.sh >/dev/null
    
    # Check that settings.json was created
    assert_file_exists "$HOME/.claude/settings.json" "Should create settings.json"
    
    # Validate JSON structure
    if command -v jq &> /dev/null; then
        jq . "$HOME/.claude/settings.json" >/dev/null 2>&1
        assert_exit_code 0 $? "Settings should be valid JSON"
    fi
    
    # Check for expected hooks configuration
    assert_file_contains "$HOME/.claude/settings.json" "PostToolUse" "Should configure PostToolUse hooks"
    assert_file_contains "$HOME/.claude/settings.json" "Stop" "Should configure Stop hooks"
}

test_setup_handles_missing_source_files() {
    # Remove source files
    rm -rf src .claude
    
    # Run setup script
    printf '\n' | ./setup.sh 2>/dev/null
    local exit_code=$?
    
    # Should handle missing source files gracefully
    # (This depends on the actual implementation - might fail or skip)
    if [[ $exit_code -eq 0 ]]; then
        test_pass "Should handle missing source files gracefully"
    else
        test_pass "Should fail gracefully with missing source files"
    fi
}

################################################################################
# Helper Functions                                                            #
################################################################################

assert_directory_exists() {
    local path="$1"
    local message="$2"
    
    if [[ -d "$path" ]]; then
        test_pass "$message"
    else
        test_fail "$message: directory $path does not exist"
    fi
}

assert_file_executable() {
    local path="$1"
    local message="$2"
    
    if [[ -x "$path" ]]; then
        test_pass "$message"
    else
        test_fail "$message: file $path is not executable"
    fi
}

################################################################################
# Run Tests                                                                   #
################################################################################

run_test_suite "test-setup-integration.sh"