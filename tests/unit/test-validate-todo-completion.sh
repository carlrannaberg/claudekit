#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for validate-todo-completion.sh Hook                              #
################################################################################

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_PATH="$SCRIPT_DIR/../../.claude/hooks/validate-todo-completion.sh"

# Source the test framework
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Test Cases                                                                   #
################################################################################

test_todo_blocks_incomplete_items() {
    # Create a transcript with incomplete todos in the correct format
    create_test_file "transcript.jsonl" '
{"type":"other","data":"some other entry"}
{"type":"toolUse","toolName":"TodoWrite","toolInput":{"todos":[{"id":"1","content":"Write tests","status":"pending","priority":"high"},{"id":"2","content":"Update docs","status":"completed","priority":"medium"}]}}
{"toolUseResult":{"newTodos":[{"id":"1","content":"Write tests","status":"pending","priority":"high"},{"id":"2","content":"Update docs","status":"completed","priority":"medium"}]}}
'
    
    # Execute hook
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should exit with 0"
    assert_json_field "$output" "decision" "block" "Should decide to block"
    assert_contains "$output" "incomplete todo items" "Should mention incomplete todos"
    assert_contains "$output" "Write tests" "Should list the incomplete todo"
    assert_not_contains "$output" "Update docs" "Should not list completed todos"
}

test_todo_allows_all_completed() {
    # Create a transcript with all todos completed
    create_test_file "transcript.jsonl" '
{"type":"toolUseResult","toolName":"TodoWrite","newTodos":[{"id":"1","content":"Task 1","status":"completed","priority":"high"},{"id":"2","content":"Task 2","status":"completed","priority":"medium"}]}
'
    
    # Execute hook
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should exit with 0"
    assert_equals "" "$output" "Should produce no output when allowing stop"
}

test_todo_handles_empty_transcript() {
    # Create empty transcript
    touch transcript.jsonl
    
    # Execute hook
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should handle empty transcript"
    assert_equals "" "$output" "Should allow stop with empty transcript"
}

test_todo_handles_missing_transcript() {
    # Execute hook with non-existent transcript
    local output=$(echo '{"transcript_path":"/nonexistent/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should handle missing transcript"
    assert_equals "" "$output" "Should allow stop with missing transcript"
}

test_todo_prevents_infinite_loop() {
    # Create a transcript with incomplete todos
    create_test_file "transcript.jsonl" '
{"type":"toolUseResult","newTodos":[{"id":"1","content":"Incomplete task","status":"pending","priority":"high"}]}
'
    
    # Execute hook with stop_hook_active set to true
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":true}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should exit with 0"
    assert_equals "" "$output" "Should produce no output when stop_hook_active is true"
}

test_todo_handles_malformed_json_in_transcript() {
    # Create transcript with malformed JSON
    create_test_file "transcript.jsonl" '
{"type":"toolUseResult","newTodos":[{"id":"1","content":"Task 1","status":"pending"}]}
this is not json
{"type":"toolUseResult","newTodos":[{"id":"2","content":"Task 2","status":"completed"}]}
'
    
    # Execute hook - should handle gracefully
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should still process valid lines
    assert_exit_code 0 $exit_code "Should handle malformed JSON lines"
}

test_todo_reads_most_recent_todo_state() {
    # Create transcript with multiple todo updates in correct format
    create_test_file "transcript.jsonl" '
{"toolUseResult":{"newTodos":[{"id":"1","content":"Task 1","status":"pending","priority":"high"}]}}
{"toolUseResult":{"newTodos":[{"id":"1","content":"Task 1","status":"completed","priority":"high"}]}}
{"toolUseResult":{"newTodos":[{"id":"1","content":"Task 1","status":"completed","priority":"high"},{"id":"2","content":"Task 2","status":"pending","priority":"medium"}]}}
'
    
    # Execute hook - should use the most recent state
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should exit with 0"
    assert_json_field "$output" "decision" "block" "Should block based on most recent state"
    assert_contains "$output" "Task 2" "Should reference the pending task from most recent update"
    assert_not_contains "$output" "Task 1" "Should not mention completed task"
}

test_todo_handles_path_with_tilde() {
    # Create test file in home directory
    local test_file="$HOME/.claude-test-transcript.jsonl"
    create_test_file "$test_file" '
{"type":"toolUseResult","newTodos":[{"id":"1","content":"Test","status":"completed"}]}
'
    
    # Execute hook with ~ in path
    local output=$(echo '{"transcript_path":"~/.claude-test-transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Cleanup
    rm -f "$test_file"
    
    # Assertions
    assert_exit_code 0 $exit_code "Should handle ~ in path"
    assert_equals "" "$output" "Should allow stop with completed todos"
}

test_todo_debug_mode_logging() {
    # Enable debug mode
    setup_debug_mode
    
    # Remove any existing log
    rm -f ~/.claude/stop-hook.log
    
    # Create transcript
    create_test_file "transcript.jsonl" '
{"type":"toolUseResult","newTodos":[{"id":"1","content":"Test","status":"pending"}]}
'
    
    # Execute hook
    echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1
    
    # Check if log was created
    assert_file_exists ~/.claude/stop-hook.log "Debug log should be created"
    assert_file_contains ~/.claude/stop-hook.log "STOP HOOK TRIGGERED" "Log should contain trigger message"
    
    # Cleanup log
    rm -f ~/.claude/stop-hook.log
}

test_todo_no_logging_without_debug() {
    # Ensure debug mode is off
    cleanup_debug_mode
    
    # Remove any existing log
    rm -f ~/.claude/stop-hook.log
    
    # Create transcript
    create_test_file "transcript.jsonl" '
{"type":"toolUseResult","newTodos":[{"id":"1","content":"Test","status":"pending"}]}
'
    
    # Execute hook
    echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1
    
    # Check that no log was created
    assert_file_not_exists ~/.claude/stop-hook.log "No debug log should be created without debug mode"
}

test_todo_handles_empty_newTodos_array() {
    # Create transcript with empty todo array
    create_test_file "transcript.jsonl" '
{"type":"toolUseResult","newTodos":[]}
'
    
    # Execute hook
    local output=$(echo '{"transcript_path":"'$PWD'/transcript.jsonl","stop_hook_active":false}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should allow stop with empty todo list
    assert_exit_code 0 $exit_code "Should handle empty todo array"
    assert_equals "" "$output" "Should allow stop with empty todo list"
}

test_todo_handles_invalid_input_json() {
    # Test with completely invalid JSON
    local output=$(echo 'not json at all' | "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle invalid input JSON"
    assert_equals "" "$output" "Should allow stop on invalid input"
    
    # Test with empty input
    output=$(echo '' | "$HOOK_PATH" 2>&1)
    exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle empty input"
    assert_equals "" "$output" "Should allow stop on empty input"
}

################################################################################
# Run all tests if executed directly                                           #
################################################################################

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi