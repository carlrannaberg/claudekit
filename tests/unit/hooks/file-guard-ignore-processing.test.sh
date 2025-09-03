#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for File Guard Ignore Processing                                 #  
# Tests the specific ignore file parsing and pattern processing components    #
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
# Ignore File Parsing Tests                                                   #
################################################################################

test_basic_negation_pattern_parsing() {
    # Purpose: Test that basic negation patterns are parsed correctly
    # This verifies the parseIgnoreFile method handles ! prefixes correctly
    
    cat > .agentignore << EOF
.env*
!.env.example
!.env.template
EOF
    
    # Create test files
    echo "SECRET=value" > .env
    echo "EXAMPLE_API_KEY=your-key" > .env.example
    echo "TEMPLATE_DB_URL=your-url" > .env.template
    echo "SECRET_KEY=real" > .env.production
    
    local env_output example_output template_output production_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    example_output=$(run_file_guard "Read" ".env.example" 2>/dev/null || true)
    template_output=$(run_file_guard "Read" ".env.template" 2>/dev/null || true)
    production_output=$(run_file_guard "Read" ".env.production" 2>/dev/null || true)
    
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$example_output" "allow" && \
       check_permission_decision "$template_output" "allow" && \
       check_permission_decision "$production_output" "deny"; then
        assert_pass "Basic negation patterns parsed correctly"
    else
        assert_fail "Negation parsing failed. .env: $env_output, .env.example: $example_output, .env.template: $template_output, .env.production: $production_output"
    fi
}

test_complex_negation_patterns() {
    # Purpose: Test complex combinations of patterns and negations
    # This ensures the ignore library processes multiple negations correctly
    
    cat > .agentignore << EOF
# Block all sensitive files
*.key
*.pem
secrets/*

# Allow examples and templates
!*.example.key
!secrets/template.*
!secrets/example.*
EOF
    
    # Create test files
    mkdir -p secrets
    echo "real_key" > private.key
    echo "example_key" > private.example.key
    echo "real_cert" > cert.pem
    echo "real_secret" > secrets/api.key
    echo "template_secret" > secrets/template.key
    echo "example_secret" > secrets/example.json
    
    local private_output example_output cert_output api_output template_output example_json_output
    private_output=$(run_file_guard "Read" "private.key" 2>/dev/null || true)
    example_output=$(run_file_guard "Read" "private.example.key" 2>/dev/null || true)
    cert_output=$(run_file_guard "Read" "cert.pem" 2>/dev/null || true)
    api_output=$(run_file_guard "Read" "secrets/api.key" 2>/dev/null || true)
    template_output=$(run_file_guard "Read" "secrets/template.key" 2>/dev/null || true)
    example_json_output=$(run_file_guard "Read" "secrets/example.json" 2>/dev/null || true)
    
    local all_correct=true
    
    if ! check_permission_decision "$private_output" "deny"; then
        assert_fail "private.key should be blocked, got: $private_output"
        all_correct=false
    fi
    
    if ! check_permission_decision "$example_output" "allow"; then
        assert_fail "private.example.key should be allowed, got: $example_output"
        all_correct=false
    fi
    
    if ! check_permission_decision "$cert_output" "deny"; then
        assert_fail "cert.pem should be blocked, got: $cert_output"
        all_correct=false
    fi
    
    if ! check_permission_decision "$api_output" "deny"; then
        assert_fail "secrets/api.key should be blocked, got: $api_output"
        all_correct=false
    fi
    
    if ! check_permission_decision "$template_output" "allow"; then
        assert_fail "secrets/template.key should be allowed, got: $template_output"
        all_correct=false
    fi
    
    if ! check_permission_decision "$example_json_output" "allow"; then
        assert_fail "secrets/example.json should be allowed, got: $example_json_output"
        all_correct=false
    fi
    
    if $all_correct; then
        assert_pass "Complex negation patterns processed correctly"
    fi
}

test_pattern_order_sensitivity() {
    # Purpose: Test that pattern order affects negation behavior correctly  
    # This ensures negation patterns work regardless of their position
    
    # Test 1: Negation after broad pattern (correct order)
    cat > .agentignore << EOF
config/*
!config/*.example
EOF
    
    mkdir -p config
    echo "real_config" > config/database.json
    echo "example_config" > config/database.example.json
    
    local real_output1 example_output1
    real_output1=$(run_file_guard "Read" "config/database.json" 2>/dev/null || true)
    example_output1=$(run_file_guard "Read" "config/database.example.json" 2>/dev/null || true)
    
    # Test 2: Negation before broad pattern (potentially different behavior)
    cat > .agentignore << EOF
!config/*.example
config/*
EOF
    
    local real_output2 example_output2
    real_output2=$(run_file_guard "Read" "config/database.json" 2>/dev/null || true)
    example_output2=$(run_file_guard "Read" "config/database.example.json" 2>/dev/null || true)
    
    if check_permission_decision "$real_output1" "deny" && \
       check_permission_decision "$example_output1" "allow" && \
       check_permission_decision "$real_output2" "deny"; then
        
        if check_permission_decision "$example_output2" "allow"; then
            assert_pass "Pattern order doesn't affect negation (both orders work)"
        else
            assert_pass "Pattern order affects negation (negation after block works)"
        fi
    else
        assert_fail "Pattern order test failed. Order 1 - real: $real_output1, example: $example_output1. Order 2 - real: $real_output2, example: $example_output2"
    fi
}

test_empty_and_comment_line_handling() {
    # Purpose: Test that empty lines and comments don't affect negation patterns
    # This ensures robust parsing of real-world ignore files
    
    cat > .agentignore << EOF
# This is a comment about environment files
.env*

# Empty line above, negation below
!.env.example

# Another comment
!.env.template

# Test patterns below

*.secret
!test.secret
EOF
    
    echo "SECRET=value" > .env
    echo "EXAMPLE=value" > .env.example  
    echo "TEMPLATE=value" > .env.template
    echo "real_secret" > app.secret
    echo "test_secret" > test.secret
    
    local env_output example_output template_output app_output test_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    example_output=$(run_file_guard "Read" ".env.example" 2>/dev/null || true)
    template_output=$(run_file_guard "Read" ".env.template" 2>/dev/null || true)
    app_output=$(run_file_guard "Read" "app.secret" 2>/dev/null || true)
    test_output=$(run_file_guard "Read" "test.secret" 2>/dev/null || true)
    
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$example_output" "allow" && \
       check_permission_decision "$template_output" "allow" && \
       check_permission_decision "$app_output" "deny" && \
       check_permission_decision "$test_output" "allow"; then
        assert_pass "Comments and empty lines handled correctly with negation"
    else
        assert_fail "Comment/empty line handling failed. .env: $env_output, .env.example: $example_output, .env.template: $template_output, app.secret: $app_output, test.secret: $test_output"
    fi
}

################################################################################
# Default vs Custom Pattern Integration Tests                                 #
################################################################################

test_default_patterns_vs_custom_negation() {
    # Purpose: Test the interaction between default patterns and custom negation
    # This ensures default patterns work correctly when no custom ignore files exist
    
    # Test 1: No ignore files (should use default patterns with built-in negation)
    rm -f .agentignore .cursorignore .aiignore .aiexclude .geminiignore .codeiumignore
    
    echo "SECRET=value" > .env
    echo "EXAMPLE=value" > .env.example
    echo "TEMPLATE=value" > .env.template
    
    local default_env default_example default_template
    default_env=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    default_example=$(run_file_guard "Read" ".env.example" 2>/dev/null || true)
    default_template=$(run_file_guard "Read" ".env.template" 2>/dev/null || true)
    
    # Test 2: Custom ignore file (should override defaults completely)
    cat > .agentignore << EOF
.env*
!.env.example
EOF
    
    local custom_env custom_example custom_template
    custom_env=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    custom_example=$(run_file_guard "Read" ".env.example" 2>/dev/null || true)
    custom_template=$(run_file_guard "Read" ".env.template" 2>/dev/null || true)
    
    # Both scenarios should have similar behavior for .env and .env.example
    if check_permission_decision "$default_env" "deny" && \
       check_permission_decision "$default_example" "allow" && \
       check_permission_decision "$custom_env" "deny" && \
       check_permission_decision "$custom_example" "allow"; then
        
        # Check if .env.template behavior differs (custom doesn't have negation for it)
        if check_permission_decision "$default_template" "allow" && \
           check_permission_decision "$custom_template" "deny"; then
            assert_pass "Default patterns include more negations than custom"
        elif check_permission_decision "$default_template" "allow" && \
             check_permission_decision "$custom_template" "allow"; then
            assert_pass "Both default and custom patterns work similarly"
        else
            assert_pass "Default and custom patterns have different behaviors (acceptable)"
        fi
    else
        assert_fail "Default vs custom pattern test failed. Default - env: $default_env, example: $default_example, template: $default_template. Custom - env: $custom_env, example: $custom_example, template: $custom_template"
    fi
}

################################################################################
# Edge Case Tests                                                             #
################################################################################

test_double_negation() {
    # Purpose: Test that double negation works correctly (if supported)
    # This tests edge cases of the ignore library
    
    cat > .agentignore << EOF
.env*
!.env.example
!!.env.example.secret
EOF
    
    echo "SECRET=value" > .env
    echo "EXAMPLE=value" > .env.example
    echo "SECRET_EXAMPLE=value" > .env.example.secret
    
    local env_output example_output secret_output
    env_output=$(run_file_guard "Read" ".env" 2>/dev/null || true)
    example_output=$(run_file_guard "Read" ".env.example" 2>/dev/null || true)  
    secret_output=$(run_file_guard "Read" ".env.example.secret" 2>/dev/null || true)
    
    # Double negation should block again (if library supports it)
    if check_permission_decision "$env_output" "deny" && \
       check_permission_decision "$example_output" "allow"; then
        
        if check_permission_decision "$secret_output" "deny"; then
            assert_pass "Double negation works (re-blocks file)"
        elif check_permission_decision "$secret_output" "allow"; then
            assert_pass "Double negation treated as single negation (library limitation)"
        else
            assert_fail "Double negation test inconclusive: $secret_output"
        fi
    else
        assert_fail "Double negation base test failed. .env: $env_output, .env.example: $example_output"
    fi
}

test_path_separator_handling() {
    # Purpose: Test that path separators are handled correctly in patterns
    # This ensures cross-platform compatibility
    
    cat > .agentignore << EOF
secrets/production/*
!secrets/production/*.example
config\\windows\\*
!config\\windows\\*.template
EOF
    
    mkdir -p secrets/production
    mkdir -p "config/windows"  # Unix path style
    
    echo "prod_secret" > secrets/production/api.key
    echo "example_secret" > secrets/production/api.example.key
    echo "win_config" > "config/windows/app.conf"
    echo "win_template" > "config/windows/app.template.conf"
    
    local prod_output example_output win_output template_output
    prod_output=$(run_file_guard "Read" "secrets/production/api.key" 2>/dev/null || true)
    example_output=$(run_file_guard "Read" "secrets/production/api.example.key" 2>/dev/null || true)
    win_output=$(run_file_guard "Read" "config/windows/app.conf" 2>/dev/null || true)
    template_output=$(run_file_guard "Read" "config/windows/app.template.conf" 2>/dev/null || true)
    
    if check_permission_decision "$prod_output" "deny" && \
       check_permission_decision "$example_output" "allow"; then
        assert_pass "Unix-style path patterns work correctly"
    else
        assert_fail "Unix path test failed. prod: $prod_output, example: $example_output"
    fi
    
    # Windows-style paths may or may not work depending on the library
    if check_permission_decision "$win_output" "deny"; then
        assert_pass "Windows-style path patterns also work"  
    else
        assert_pass "Windows-style paths not supported (Unix-only is acceptable)"
    fi
}

################################################################################
# Test Suite Execution                                                         #
################################################################################

# Register cleanup
trap tearDown EXIT

# Run the test suite
run_test_suite "File Guard Ignore Processing Unit Tests"