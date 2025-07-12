#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for auto-checkpoint.sh Hook                                      #
################################################################################

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_PATH="$SCRIPT_DIR/../../.claude/hooks/auto-checkpoint.sh"

# Source the test framework
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Test Cases                                                                   #
################################################################################

test_checkpoint_creates_stash_with_changes() {
    # Setup: Mock git with uncommitted changes
    create_mock_git "uncommitted"
    
    # Track what git commands are called
    local git_commands_log="$PWD/git-commands.log"
    create_mock_command "git" "
echo \"\$*\" >> '$git_commands_log'
case \"\$1\" in
    status)
        echo 'On branch main'
        echo 'Changes not staged for commit:'
        echo '  modified: src/index.ts'
        exit 0
        ;;
    stash)
        case \"\$2\" in
            create)
                echo 'a1b2c3d4e5f6789'
                exit 0
                ;;
            store)
                echo 'Saved working directory and index state'
                exit 0
                ;;
        esac
        ;;
esac
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should succeed with uncommitted changes"
    assert_file_contains "$git_commands_log" "stash create" "Should call git stash create"
    assert_file_contains "$git_commands_log" "stash store" "Should call git stash store"
}

test_checkpoint_skips_clean_repository() {
    # Setup: Mock git with clean working tree
    # The hook should check status but not create stash
    local git_commands_log="$PWD/git-commands.log"
    create_mock_command "git" "
echo \"\$*\" >> '$git_commands_log'
case \"\$1\" in
    status)
        echo 'On branch main'
        echo 'nothing to commit, working tree clean'
        exit 0
        ;;
    stash)
        if [[ \"\$2\" == 'create' ]]; then
            # Return empty for clean repo
            echo ''
            exit 0
        fi
        ;;
esac
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should succeed with clean repository"
    # Hook will call git status, so log will exist
    assert_file_exists "$git_commands_log" "Should check git status"
    assert_file_contains "$git_commands_log" "status" "Should call git status"
    # Hook may call stash create, but won't call stash store if create returns empty
    assert_not_contains "$(cat "$git_commands_log")" "stash store" "Should not store empty stash"
}

test_checkpoint_handles_not_git_repository() {
    # Setup: Mock git that reports not a repository
    create_mock_command "git" "
case \"\$1\" in
    status)
        echo 'fatal: not a git repository (or any of the parent directories): .git' >&2
        exit 128
        ;;
esac
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should exit gracefully
    assert_exit_code 0 $exit_code "Should handle non-git directories gracefully"
}

test_checkpoint_includes_timestamp_in_message() {
    # Setup: Mock git with changes
    local stash_message=""
    create_mock_command "git" "
case \"\$1\" in
    status)
        echo 'Changes not staged for commit:'
        echo '  modified: file.txt'
        exit 0
        ;;
    stash)
        if [[ \"\$2\" == 'create' ]]; then
            echo 'abc123def456'
            exit 0
        elif [[ \"\$2\" == 'store' ]]; then
            # Capture the message
            echo \"Stash message: \$*\" >&2
            exit 0
        fi
        ;;
esac
"
    
    # Execute hook
    local output=$("$HOOK_PATH" 2>&1)
    
    # Should include timestamp in stash message
    assert_contains "$output" "claude-checkpoint:" "Should use claude-checkpoint prefix"
    assert_contains "$output" "Auto-save at" "Should include auto-save message"
}

test_checkpoint_handles_stash_create_failure() {
    # Setup: Mock git where stash create fails
    create_mock_command "git" "
case \"\$1\" in
    status)
        echo 'Changes not staged for commit:'
        echo '  modified: file.txt'
        exit 0
        ;;
    stash)
        if [[ \"\$2\" == 'create' ]]; then
            echo 'error: unable to create stash' >&2
            exit 1
        fi
        ;;
esac
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should handle failure gracefully
    assert_exit_code 0 $exit_code "Should not fail even if stash create fails"
}

test_checkpoint_handles_empty_stash_create() {
    # Setup: Mock git that returns empty from stash create (no changes to stash)
    create_mock_command "git" "
case \"\$1\" in
    status)
        echo 'Changes not staged for commit:'
        echo '  modified: file.txt'
        exit 0
        ;;
    stash)
        if [[ \"\$2\" == 'create' ]]; then
            # Return empty (no stash created)
            echo ''
            exit 0
        elif [[ \"\$2\" == 'store' ]]; then
            echo 'ERROR: Should not store empty stash'
            exit 1
        fi
        ;;
esac
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should handle empty stash gracefully
    assert_exit_code 0 $exit_code "Should handle empty stash create"
}

test_checkpoint_silent_operation() {
    # Setup: Mock git with changes - use our detailed mock
    local git_commands_log="$PWD/git-commands.log"
    create_mock_command "git" "
case \"\$1\" in
    status)
        echo 'On branch main'
        echo 'Changes not staged for commit:'
        echo '  modified: src/index.ts'
        exit 0
        ;;
    stash)
        case \"\$2\" in
            create)
                echo 'a1b2c3d4e5f6789'
                exit 0
                ;;
            store)
                # Store outputs the JSON message
                echo '{\"suppressOutput\": true}'
                exit 0
                ;;
        esac
        ;;
esac
"
    
    # Execute hook and capture all output
    local output=$("$HOOK_PATH" 2>&1)
    
    # The hook should only output the suppress message from git stash store
    assert_equals '{"suppressOutput": true}' "$output" "Should only output suppress message"
}

test_checkpoint_preserves_working_directory() {
    # The hook should not change the working directory state
    # Setup: Create actual files to test
    mkdir -p test-repo
    cd test-repo
    
    # Initialize git repo
    create_mock_command "git" "
case \"\$1\" in
    init)
        mkdir -p .git
        exit 0
        ;;
    status)
        if [[ -f modified.txt ]]; then
            echo 'Changes not staged for commit:'
            echo '  modified: modified.txt'
        else
            echo 'nothing to commit'
        fi
        exit 0
        ;;
    stash)
        if [[ \"\$2\" == 'create' ]]; then
            echo 'stash123'
            exit 0
        elif [[ \"\$2\" == 'store' ]]; then
            exit 0
        fi
        ;;
esac
"
    
    # Create and modify a file
    echo "original" > modified.txt
    local original_content=$(cat modified.txt)
    
    # Run checkpoint
    "$HOOK_PATH"
    
    # Verify file wasn't changed
    local after_content=$(cat modified.txt)
    assert_equals "$original_content" "$after_content" \
        "Working directory should remain unchanged"
}

test_checkpoint_handles_git_not_installed() {
    # Remove git from PATH
    PATH="/usr/bin:/bin"  # Minimal PATH without git
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should handle missing git gracefully
    assert_exit_code 0 $exit_code "Should handle missing git command"
}

test_checkpoint_handles_permission_issues() {
    # Setup: Mock git with permission error
    create_mock_command "git" "
case \"\$1\" in
    status)
        echo 'fatal: Unable to read current working directory: Permission denied' >&2
        exit 128
        ;;
esac
"
    
    # Execute hook
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should handle permission errors gracefully
    assert_exit_code 0 $exit_code "Should handle permission errors gracefully"
}

test_checkpoint_no_input_required() {
    # The hook should not read from stdin
    # Setup: Mock git
    create_mock_git "uncommitted"
    
    # Execute hook with no stdin
    exec 0</dev/null
    "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Should work without any input
    assert_exit_code 0 $exit_code "Should not require stdin input"
}

################################################################################
# Run all tests if executed directly                                           #
################################################################################

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi