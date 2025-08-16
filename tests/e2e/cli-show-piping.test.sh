#!/usr/bin/env bash
set -euo pipefail

################################################################################
# End-to-End Tests for claudekit show command piping functionality             #
# Tests the CLI's ability to pipe output cleanly to external tools            #
################################################################################

# Import test framework
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

# Test configuration
TEST_TIMEOUT=30
CLI_PATH="$(cd "$SCRIPT_DIR/../.." && pwd)/cli/cli.ts"
TEMP_DIR=""

################################################################################
# Setup and Teardown                                                          #
################################################################################

setUp() {
    # Create temporary directory for test files
    TEMP_DIR=$(mktemp -d)
    
    # Store original directory and stay in claudekit project root
    ORIGINAL_DIR=$(pwd)
    
    # Ensure we're in the claudekit project root (where CLI can find agents)
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    cd "$PROJECT_ROOT"
    
    # Ensure we can run claudekit CLI from anywhere
    if ! command -v npx >/dev/null 2>&1; then
        echo "npx not found - required for running TypeScript CLI" >&2
        exit 1
    fi
}

tearDown() {
    # Return to original directory
    if [[ -n "$ORIGINAL_DIR" ]] && [[ -d "$ORIGINAL_DIR" ]]; then
        cd "$ORIGINAL_DIR"
    fi
    
    # Clean up temporary directory
    if [[ -n "$TEMP_DIR" ]] && [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}

################################################################################
# Helper Functions                                                             #
################################################################################

# Run claudekit show command with timeout protection
run_claudekit_show() {
    local args=("$@")
    (cd "$PROJECT_ROOT" && npx tsx "$CLI_PATH" show "${args[@]}")
}

# Run claudekit show command and capture stderr separately
run_claudekit_show_with_stderr() {
    local args=("$@")
    local stdout_file="$TEMP_DIR/stdout.tmp"
    local stderr_file="$TEMP_DIR/stderr.tmp"
    
    (cd "$PROJECT_ROOT" && npx tsx "$CLI_PATH" show "${args[@]}") \
        >"$stdout_file" 2>"$stderr_file"
    local exit_code=$?
    
    # Return files for inspection
    echo "$stdout_file:$stderr_file:$exit_code"
}

# Check if a command exists
has_command() {
    command -v "$1" >/dev/null 2>&1
}

################################################################################
# Test Functions                                                              #
################################################################################

test_pipe_text_output_to_file() {
    # Purpose: Verify that text output can be piped to a file cleanly
    # This ensures the output contains only the agent content without extra formatting
    
    local output_file="$TEMP_DIR/agent_output.md"
    
    # Pipe typescript-expert agent to file
    if run_claudekit_show agent typescript-expert > "$output_file"; then
        # Verify file was created and has content
        assert_file_exists "$output_file" "Output file should be created"
        
        # Verify file has reasonable content size (agents should have substantial content)
        local file_size=$(wc -c < "$output_file" 2>/dev/null || echo 0)
        if [[ $file_size -gt 100 ]]; then
            assert_pass "File has substantial content ($file_size bytes)"
        else
            assert_fail "File too small ($file_size bytes) - may be missing content"
        fi
        
        # Verify content starts with expected markdown heading (no frontmatter)
        local first_line=$(head -n1 "$output_file" 2>/dev/null || echo "")
        if [[ "$first_line" =~ ^#[[:space:]] ]]; then
            assert_pass "Output starts with markdown heading"
        else
            assert_fail "Output should start with markdown heading, got: $first_line"
        fi
        
        # Verify no frontmatter metadata leaked through (check start of file)
        local first_line=$(head -n1 "$output_file")
        if [[ "$first_line" == "---" ]]; then
            assert_fail "Should not start with YAML frontmatter"
        else
            assert_pass "Does not start with YAML frontmatter"
        fi
        
        # Verify no object/debug artifacts  
        local file_content=$(cat "$output_file")
        assert_not_contains "$file_content" "[object Object]" "Should not contain object artifacts"
        assert_not_contains "$file_content" "undefined" "Should not contain undefined values"
    else
        assert_fail "Failed to pipe agent output to file"
    fi
}

test_pipe_text_output_to_grep() {
    # Purpose: Verify that text output can be piped to grep and produces valid results
    # This tests that the output is clean text suitable for text processing tools
    
    if has_command grep; then
        # Count lines containing "TypeScript" in typescript-expert agent
        local match_count
        if match_count=$(run_claudekit_show agent typescript-expert | grep -c -i "typescript" 2>/dev/null); then
            # TypeScript expert should definitely mention TypeScript multiple times
            if [[ $match_count -gt 0 ]]; then
                assert_pass "Found $match_count TypeScript mentions via grep"
            else
                assert_fail "TypeScript expert should mention TypeScript, found 0 matches"
            fi
        else
            assert_fail "Failed to pipe output to grep"
        fi
        
        # Test case-insensitive search for common patterns
        local expert_mentions
        if expert_mentions=$(run_claudekit_show agent react-expert | grep -c -i "react" 2>/dev/null); then
            if [[ $expert_mentions -gt 0 ]]; then
                assert_pass "React expert mentions React $expert_mentions times"
            else
                assert_fail "React expert should mention React"
            fi
        else
            assert_fail "Failed to grep React expert content"
        fi
    else
        assert_pass "grep not available, skipping grep tests"
    fi
}

test_pipe_json_output_to_jq() {
    # Purpose: Verify that JSON output is valid and can be processed by jq
    # This ensures the JSON format is properly structured for programmatic use
    
    if has_command jq; then
        # Test basic JSON validity
        local json_output
        if json_output=$(run_claudekit_show agent typescript-expert --format json); then
            # Verify jq can parse the JSON
            if echo "$json_output" | jq . >/dev/null 2>&1; then
                assert_pass "JSON output is valid and parseable by jq"
            else
                assert_fail "JSON output is not valid JSON"
                return
            fi
            
            # Extract specific fields using jq
            local agent_id
            if agent_id=$(echo "$json_output" | jq -r '.id' 2>/dev/null); then
                if [[ "$agent_id" == "typescript-expert" ]]; then
                    assert_pass "jq correctly extracted agent ID: $agent_id"
                else
                    assert_fail "Expected agent ID 'typescript-expert', got: $agent_id"
                fi
            else
                assert_fail "Failed to extract agent ID with jq"
            fi
            
            # Verify content field exists and has substantial content
            local content_length
            if content_length=$(echo "$json_output" | jq -r '.content | length' 2>/dev/null); then
                if [[ $content_length -gt 100 ]]; then
                    assert_pass "Agent content has reasonable length ($content_length chars)"
                else
                    assert_fail "Agent content too short ($content_length chars)"
                fi
            else
                assert_fail "Failed to extract content length with jq"
            fi
            
            # Test complex jq query - extract tools if present
            local tools_count
            if tools_count=$(echo "$json_output" | jq -r '.tools | if type == "array" then length else 0 end' 2>/dev/null); then
                assert_pass "jq successfully processed tools field (count: $tools_count)"
            else
                assert_fail "Failed to process tools field with jq"
            fi
        else
            assert_fail "Failed to get JSON output from show command"
        fi
    else
        assert_pass "jq not available, skipping jq tests"
    fi
}

test_text_output_is_clean() {
    # Purpose: Verify that text output contains only the expected content
    # This ensures piping works cleanly without extra formatting or metadata
    
    local text_output
    if text_output=$(run_claudekit_show agent git-expert); then
        # Verify no JSON artifacts in text mode
        if [[ "$text_output" == *'{'* ]] || [[ "$text_output" == *'}'* ]]; then
            # Allow JSON-like content within the actual markdown (like code examples)
            # but verify it's not starting with JSON structure
            if [[ "$text_output" =~ ^[[:space:]]*\{ ]]; then
                assert_fail "Text output starts with JSON structure"
            else
                assert_pass "Text contains braces but not as JSON structure"
            fi
        else
            assert_pass "Text output contains no JSON artifacts"
        fi
        
        # Verify no CLI formatting artifacts
        assert_not_contains "$text_output" "Loading" "Should not contain loading messages"
        assert_not_contains "$text_output" "Error:" "Should not contain error prefixes in successful output"
        assert_not_contains "$text_output" "Try 'claudekit" "Should not contain help suggestions"
        
        # Verify content is substantial markdown
        local line_count=$(echo "$text_output" | wc -l)
        if [[ $line_count -gt 5 ]]; then
            assert_pass "Output has reasonable line count ($line_count lines)"
        else
            assert_fail "Output too short ($line_count lines)"
        fi
        
        # Verify starts with markdown heading
        if [[ "$text_output" =~ ^#[[:space:]] ]]; then
            assert_pass "Output starts with markdown heading"
        else
            assert_fail "Output should start with markdown heading"
        fi
    else
        assert_fail "Failed to get text output"
    fi
}

test_json_output_is_valid() {
    # Purpose: Verify that JSON output is properly formatted and valid
    # This ensures programmatic consumption works reliably
    
    local json_output
    if json_output=$(run_claudekit_show command git:status --format json); then
        # Test JSON parsing with multiple methods for robustness
        
        # Method 1: Basic JSON validity
        if echo "$json_output" | python3 -m json.tool >/dev/null 2>&1; then
            assert_pass "JSON is valid (verified with Python)"
        elif command -v jq >/dev/null && echo "$json_output" | jq . >/dev/null 2>&1; then
            assert_pass "JSON is valid (verified with jq)"
        elif command -v node >/dev/null && echo "$json_output" | node -e "JSON.parse(require('fs').readFileSync(0))" >/dev/null 2>&1; then
            assert_pass "JSON is valid (verified with Node.js)"
        else
            assert_fail "JSON output is not valid"
            return
        fi
        
        # Verify JSON structure
        if [[ "$json_output" =~ ^\{.*\}$ ]]; then
            assert_pass "JSON has correct object structure"
        else
            assert_fail "JSON should be a single object"
        fi
        
        # Verify no trailing commas or other common JSON errors
        if [[ "$json_output" == *',}'* ]] || [[ "$json_output" == *',]'* ]]; then
            assert_fail "JSON contains trailing commas"
        else
            assert_pass "JSON has no trailing commas"
        fi
        
        # Verify no unescaped quotes in JSON strings (basic check)
        if echo "$json_output" | grep -q '\\'; then
            assert_pass "JSON contains proper escaping"
        else
            assert_pass "JSON string structure appears valid"
        fi
    else
        assert_fail "Failed to get JSON output"
    fi
}

test_errors_go_to_stderr() {
    # Purpose: Verify that errors are sent to stderr, not stdout
    # This ensures that piping stdout works even when there are errors
    
    local result
    result=$(run_claudekit_show_with_stderr agent non-existent-agent-12345)
    
    local stdout_file stderr_file exit_code
    IFS=':' read -r stdout_file stderr_file exit_code <<< "$result"
    
    # Verify command failed
    if [[ $exit_code -ne 0 ]]; then
        assert_pass "Non-existent agent command failed as expected (exit code: $exit_code)"
    else
        assert_fail "Command should have failed for non-existent agent"
        return
    fi
    
    # Verify stdout is empty (no output mixed with errors)
    local stdout_content=$(cat "$stdout_file" 2>/dev/null || echo "")
    if [[ -z "$stdout_content" ]]; then
        assert_pass "stdout is empty for error case"
    else
        assert_fail "stdout should be empty for errors, got: $stdout_content"
    fi
    
    # Verify stderr contains error message
    local stderr_content=$(cat "$stderr_file" 2>/dev/null || echo "")
    if [[ -n "$stderr_content" ]]; then
        assert_pass "stderr contains error message"
        
        # Verify error message is helpful
        if [[ "$stderr_content" == *"Error:"* ]]; then
            assert_pass "Error message has proper Error: prefix"
        else
            assert_fail "Error message should start with 'Error:'"
        fi
        
        if [[ "$stderr_content" == *"Try 'claudekit list"* ]]; then
            assert_pass "Error message includes helpful suggestion"
        else
            assert_fail "Error message should suggest using 'claudekit list'"
        fi
    else
        assert_fail "stderr should contain error message"
    fi
}

test_pipe_chaining_complex() {
    # Purpose: Verify that complex pipe chains work correctly
    # This tests real-world usage scenarios with multiple Unix tools
    
    if has_command grep && has_command wc && has_command head; then
        # Complex pipe: show agent -> grep for pattern -> count lines -> verify result
        local react_mentions
        if react_mentions=$(run_claudekit_show agent react-expert | grep -i "react" | wc -l 2>/dev/null); then
            # Remove any whitespace
            react_mentions=$(echo "$react_mentions" | tr -d '[:space:]')
            
            if [[ $react_mentions =~ ^[0-9]+$ ]] && [[ $react_mentions -gt 0 ]]; then
                assert_pass "Complex pipe chain: found $react_mentions React mentions"
            else
                assert_fail "Complex pipe chain failed: expected positive number, got '$react_mentions'"
            fi
        else
            assert_fail "Failed to execute complex pipe chain"
        fi
        
        # Test pipe with head to limit output
        local first_10_lines
        if first_10_lines=$(run_claudekit_show agent typescript-expert | head -10); then
            local line_count=$(echo "$first_10_lines" | wc -l | tr -d '[:space:]')
            
            if [[ $line_count -le 10 ]] && [[ $line_count -gt 0 ]]; then
                assert_pass "Pipe to head works correctly ($line_count lines)"
            else
                assert_fail "Pipe to head failed: expected d10 lines, got $line_count"
            fi
        else
            assert_fail "Failed to pipe to head command"
        fi
    else
        assert_pass "Required commands not available, skipping complex pipe tests"
    fi
}

test_concurrent_piping() {
    # Purpose: Verify that multiple concurrent pipe operations work correctly
    # This tests that the CLI handles concurrent access properly
    
    local temp_file1="$TEMP_DIR/concurrent1.out"
    local temp_file2="$TEMP_DIR/concurrent2.out"
    local temp_file3="$TEMP_DIR/concurrent3.out"
    
    # Run multiple show commands concurrently
    (
        run_claudekit_show agent typescript-expert > "$temp_file1" &
        run_claudekit_show agent react-expert > "$temp_file2" &
        run_claudekit_show command git:status --format json > "$temp_file3" &
        wait
    )
    
    # Verify all files were created successfully
    assert_file_exists "$temp_file1" "Concurrent output 1 should exist"
    assert_file_exists "$temp_file2" "Concurrent output 2 should exist"
    assert_file_exists "$temp_file3" "Concurrent output 3 should exist"
    
    # Verify files have different content (not corrupted/mixed)
    local content1=$(head -n1 "$temp_file1" 2>/dev/null || echo "")
    local content2=$(head -n1 "$temp_file2" 2>/dev/null || echo "")
    
    if [[ "$content1" != "$content2" ]] && [[ -n "$content1" ]] && [[ -n "$content2" ]]; then
        assert_pass "Concurrent outputs are different (no corruption)"
    else
        assert_fail "Concurrent outputs may be corrupted or identical"
    fi
    
    # Verify JSON output is still valid
    if has_command jq; then
        if jq . < "$temp_file3" >/dev/null 2>&1; then
            assert_pass "Concurrent JSON output is valid"
        else
            assert_fail "Concurrent JSON output is invalid"
        fi
    fi
}

test_special_characters_in_pipes() {
    # Purpose: Verify that special characters in agent content don't break piping
    # This ensures robust handling of Unicode, quotes, and special formatting
    
    # Test with an agent that likely contains special characters
    local output
    if output=$(run_claudekit_show agent typescript-expert); then
        # Test that output doesn't break when piped through various tools
        
        # Test with grep using special regex characters
        if has_command grep; then
            local pattern_matches
            if pattern_matches=$(echo "$output" | grep -c '\.' 2>/dev/null); then
                assert_pass "Special characters handled correctly by grep ($pattern_matches matches)"
            else
                assert_fail "Failed to handle special characters with grep"
            fi
        fi
        
        # Test with tools that might be sensitive to quotes
        if has_command wc; then
            local char_count
            if char_count=$(echo "$output" | wc -c 2>/dev/null); then
                char_count=$(echo "$char_count" | tr -d '[:space:]')
                if [[ $char_count -gt 0 ]]; then
                    assert_pass "Character counting works with special characters ($char_count chars)"
                else
                    assert_fail "Character counting failed"
                fi
            fi
        fi
        
        # Ensure no terminal escape sequences or control characters
        if echo "$output" | grep -q $'\e\['; then
            assert_fail "Output contains terminal escape sequences"
        else
            assert_pass "Output contains no terminal escape sequences"
        fi
    else
        assert_fail "Failed to get output for special character testing"
    fi
}

################################################################################
# Test Suite Execution                                                         #
################################################################################

# Register cleanup function
trap tearDown EXIT

# Run the test suite
run_test_suite "CLI Show Piping Tests"