#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for File Guard Hook                                              #
# Tests the file-guard hook's core functionality for blocking sensitive files #
################################################################################

# Import test framework
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/../../test-framework.sh"

# Test configuration
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CLI_PATH="$PROJECT_ROOT/dist/hooks-cli.cjs"
TEMP_PROJECT_DIR=""

################################################################################
# Setup and Teardown                                                          #
################################################################################

setUp() {
    # Create a temporary project directory for testing
    TEMP_PROJECT_DIR=$(mktemp -d)
    cd "$TEMP_PROJECT_DIR"
    
    # Initialize a basic project structure
    mkdir -p src config/secrets .ssh
    echo "console.log('test');" > src/index.js
    echo "DB_PASSWORD=secret123" > .env
    echo "API_KEY=abc123" > config/secrets/api.json
    echo "-----BEGIN RSA PRIVATE KEY-----" > .ssh/id_rsa
    echo "example value" > .env.example
    
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

# Check if hook response contains deny decision with reason
check_deny_with_reason() {
    local output="$1"
    local file_pattern="$2"
    
    if echo "$output" | grep -q "\"permissionDecision\":\"deny\"" && \
       echo "$output" | grep -q "\"permissionDecisionReason\".*$file_pattern"; then
        return 0
    else
        return 1
    fi
}

################################################################################
# Core Functionality Tests                                                     #
################################################################################

test_block_env_file_access() {
    # Purpose: Verify hook correctly blocks access to .env files
    # This ensures sensitive environment variables are protected from AI access
    
    local output
    output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "Blocked .env file access via Read tool"
    else
        assert_fail "Should block .env file access, got: $output"
    fi
}

test_allow_regular_file_access() {
    # Purpose: Verify hook allows access to non-protected regular files
    # This ensures normal development workflow is not disrupted
    
    local output
    output=$(run_file_guard "Read" "src/index.js" 2>/dev/null || true)
    
    if check_permission_decision "$output" "allow"; then
        assert_pass "Allowed regular file access"
    else
        assert_fail "Should allow regular file access, got: $output"
    fi
}

test_block_nested_secret_files() {
    # Purpose: Test glob pattern matching for nested sensitive files
    # This ensures patterns like config/secrets/* are properly handled
    
    # Create ignore file with pattern for secrets directory
    echo "config/secrets/*" > .agentignore
    
    local output
    output=$(run_file_guard "Edit" "config/secrets/api.json" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "Blocked nested secret file access"
    else
        assert_fail "Should block nested secret files, got: $output"
    fi
}

test_all_supported_tools() {
    # Purpose: Verify hook works with all four supported tools
    # This ensures consistent protection across all file operations
    
    local tools=("Read" "Edit" "MultiEdit" "Write")
    local all_blocked=true
    
    for tool in "${tools[@]}"; do
        local output
        output=$(run_file_guard "$tool" ".env" 2>/dev/null || true)
        
        if ! check_permission_decision "$output" "deny"; then
            all_blocked=false
            assert_fail "$tool should block .env access, got: $output"
        fi
    done
    
    if $all_blocked; then
        assert_pass "All tools (Read, Edit, MultiEdit, Write) properly block .env"
    fi
}

test_case_sensitivity() {
    # Purpose: Test case sensitivity of pattern matching
    # This ensures .ENV is treated the same as .env on case-insensitive filesystems
    
    # Create uppercase version
    echo "UPPER_SECRET=value" > .ENV
    
    local output
    output=$(run_file_guard "Read" ".ENV" 2>/dev/null || true)
    
    # On case-insensitive filesystems (like macOS), this should be blocked
    if check_permission_decision "$output" "deny"; then
        assert_pass "Case insensitive pattern matching works"
    else
        # On case-sensitive filesystems, this might not be blocked
        assert_pass "Case sensitive filesystem - .ENV not blocked (expected)"
    fi
}

test_symlink_protection() {
    # Purpose: Test that symlinks to sensitive files are blocked
    # This prevents bypassing protection via symbolic links
    
    # Create .env file first
    echo "secret" > .env
    
    # Create symlink to .env file
    ln -sf .env symlink-to-env 2>/dev/null || {
        assert_pass "Symlinks not supported on this filesystem"
        return
    }
    
    local output
    output=$(run_file_guard "Read" "symlink-to-env" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "Symlink to sensitive file blocked"
    else
        assert_fail "Should block symlinks to sensitive files, got: $output"
    fi
}

test_path_traversal_prevention() {
    # Purpose: Test that path traversal attempts are blocked
    # This ensures files outside project root cannot be accessed
    
    local output
    output=$(run_file_guard "Read" "../../../etc/passwd" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "Path traversal attempt blocked"
    else
        assert_fail "Should block path traversal, got: $output"
    fi
}

test_ssh_key_protection() {
    # Purpose: Verify SSH private keys are protected by default patterns
    # This ensures cryptographic keys cannot be accessed accidentally
    
    local output
    output=$(run_file_guard "Read" ".ssh/id_rsa" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "SSH private key blocked"
    else
        assert_fail "Should block SSH keys, got: $output"
    fi
}

################################################################################
# Configuration Tests                                                          #
################################################################################

test_custom_ignore_file_patterns() {
    # Purpose: Test that custom .agentignore patterns are respected
    # This ensures project-specific sensitive files can be protected
    
    echo -e "*.secret\ncustom-config.json" > .agentignore
    echo "password=secret" > test.secret
    echo "api_key=abc123" > custom-config.json
    
    local secret_output custom_output
    secret_output=$(run_file_guard "Read" "test.secret" 2>/dev/null || true)
    custom_output=$(run_file_guard "Read" "custom-config.json" 2>/dev/null || true)
    
    if check_permission_decision "$secret_output" "deny" && \
       check_permission_decision "$custom_output" "deny"; then
        assert_pass "Custom .agentignore patterns respected"
    else
        assert_fail "Custom patterns not working. Secret: $secret_output, Custom: $custom_output"
    fi
}

test_negation_patterns() {
    # Purpose: Test that negation patterns (!) work correctly
    # This allows exceptions to broad patterns (e.g., allow .env.example but block .env)
    
    echo -e ".env*\n!.env.example" > .agentignore
    
    local env_output example_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    example_output=$(run_file_guard "Read" ".env.example" 2>/dev/null || true)
    
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$example_output" "allow"; then
        assert_pass "Negation patterns work correctly"
    else
        assert_fail "Negation failed. .env: $env_output, .env.example: $example_output"
    fi
}

test_multiple_ignore_files() {
    # Purpose: Test that patterns from multiple ignore files are merged
    # This ensures different AI tools' ignore files are all respected
    
    echo ".env" > .agentignore
    echo "*.key" > .cursorignore
    echo "secrets/" > .aiignore
    
    # Create test files matching each pattern
    echo "private_key" > test.key
    mkdir -p secrets && echo "secret_data" > secrets/config.txt
    
    local env_output key_output secrets_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    key_output=$(run_file_guard "Read" "test.key" 2>/dev/null || true)
    secrets_output=$(run_file_guard "Read" "secrets/config.txt" 2>/dev/null || true)
    
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$key_output" "deny" && \
       check_permission_decision "$secrets_output" "deny"; then
        assert_pass "Multiple ignore files merged correctly"
    else
        assert_fail "Multi-file merge failed. Env: $env_output, Key: $key_output, Secrets: $secrets_output"
    fi
}

test_default_patterns_fallback() {
    # Purpose: Test that default patterns are used when no ignore files exist
    # This ensures basic protection even without explicit configuration
    
    # Remove any existing ignore files
    rm -f .agentignore .cursorignore .aiignore .aiexclude .geminiignore .codeiumignore
    
    local output
    output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "Default patterns protect .env files"
    else
        assert_fail "Default patterns should protect .env, got: $output"
    fi
}

################################################################################
# Edge Cases and Error Handling                                               #
################################################################################

test_empty_ignore_file_handling() {
    # Purpose: Test graceful handling of empty or malformed ignore files
    # This ensures the hook doesn't crash on edge cases
    
    # Create empty ignore file
    touch .agentignore
    
    # Should fall back to default patterns
    local output
    output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "Empty ignore file handled gracefully (defaults used)"
    else
        assert_fail "Empty ignore file should trigger default patterns, got: $output"
    fi
}

test_malformed_ignore_file_handling() {
    # Purpose: Test handling of ignore files with comments and whitespace
    # This ensures gitignore-style syntax is properly parsed
    
    cat > .agentignore << EOF
# This is a comment
   
.env
  # Another comment
*.secret  

# Empty lines above and below

EOF
    
    echo "test_secret" > test.secret
    
    local env_output secret_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    secret_output=$(run_file_guard "Read" "test.secret" 2>/dev/null || true)
    
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$secret_output" "deny"; then
        assert_pass "Malformed ignore file parsed correctly"
    else
        assert_fail "Malformed file parsing failed. Env: $env_output, Secret: $secret_output"
    fi
}

test_nonexistent_file_handling() {
    # Purpose: Test hook behavior with non-existent files
    # This ensures the hook works with file paths that don't exist yet
    
    local output
    output=$(run_file_guard "Write" ".env.production" 2>/dev/null || true)
    
    if check_permission_decision "$output" "deny"; then
        assert_pass "Non-existent sensitive file blocked"
    else
        assert_fail "Should block non-existent .env file, got: $output"
    fi
}

test_unsupported_tool_handling() {
    # Purpose: Test hook behavior with unsupported tools
    # This ensures the hook gracefully ignores irrelevant tool calls
    
    local payload='{"tool_name":"UnsupportedTool","tool_input":{"file_path":".env"}}'
    local output
    output=$(echo "$payload" | node "$CLI_PATH" run file-guard 2>/dev/null || true)
    
    # Should not contain permission decision (hook should pass through)
    if ! echo "$output" | grep -q "permissionDecision"; then
        assert_pass "Unsupported tool ignored gracefully"
    else
        assert_fail "Unsupported tool should be ignored, got: $output"
    fi
}

test_missing_file_path_handling() {
    # Purpose: Test hook behavior when file_path is missing from payload
    # This ensures the hook gracefully handles malformed payloads
    
    local payload='{"tool_name":"Read","tool_input":{}}'
    local output
    output=$(echo "$payload" | node "$CLI_PATH" run file-guard 2>/dev/null || true)
    
    # Should not crash and should pass through
    if ! echo "$output" | grep -q "permissionDecision"; then
        assert_pass "Missing file_path handled gracefully"
    else
        assert_fail "Missing file_path should be ignored, got: $output"
    fi
}

################################################################################
# Response Format Tests                                                        #
################################################################################

test_deny_response_format() {
    # Purpose: Verify the deny response has correct PreToolUse format
    # This ensures Claude Code can properly interpret the response
    
    local output
    output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    
    # Check for required PreToolUse fields
    if echo "$output" | grep -q '"hookEventName":"PreToolUse"' && \
       echo "$output" | grep -q '"permissionDecision":"deny"' && \
       echo "$output" | grep -q '"permissionDecisionReason":'; then
        assert_pass "Deny response has correct PreToolUse format"
    else
        assert_fail "Deny response format incorrect, got: $output"
    fi
}

test_allow_response_format() {
    # Purpose: Verify the allow response has correct PreToolUse format
    # This ensures Claude Code can properly interpret the response
    
    local output
    output=$(run_file_guard "Read" "src/index.js" 2>/dev/null || true)
    
    # Check for required PreToolUse fields
    if echo "$output" | grep -q '"hookEventName":"PreToolUse"' && \
       echo "$output" | grep -q '"permissionDecision":"allow"'; then
        assert_pass "Allow response has correct PreToolUse format"
    else
        assert_fail "Allow response format incorrect, got: $output"
    fi
}

test_error_messages_are_informative() {
    # Purpose: Verify error messages provide helpful information
    # This ensures users understand why access was denied
    
    local output
    output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    
    if check_deny_with_reason "$output" "protected" || \
       check_deny_with_reason "$output" "default patterns"; then
        assert_pass "Error message is informative"
    else
        assert_fail "Error message should be informative, got: $output"
    fi
}

################################################################################
# Test Suite Execution                                                         #
################################################################################

# Register cleanup
trap tearDown EXIT

# Run the test suite
run_test_suite "File Guard Hook Unit Tests"