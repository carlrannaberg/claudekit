#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for eslint.sh Hook                                               #
################################################################################

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_PATH="$SCRIPT_DIR/../../.claude/hooks/eslint.sh"

# Source the test framework
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Test Cases                                                                   #
################################################################################

test_eslint_blocks_errors_with_config() {
    # Setup: Create mock git to simulate project root
    create_mock_command "git" "
if [[ \"\$*\" == *\"rev-parse --show-toplevel\"* ]]; then
    echo '$PWD'
    exit 0
fi
"
    
    # Create mock npx that reports ESLint errors
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]] && [[ "$2" == "--version" ]]; then
    echo "v8.0.0"
    exit 0
elif [[ "$1" == "eslint" ]]; then
    echo "1:25  error  Missing semicolon  semi"
    exit 1
fi
'
    
    # Create test JavaScript file
    create_test_file "src/index.js" 'var x = 1;;'
    
    # Create ESLint config at project root
    create_test_file ".eslintrc.json" '{"rules": {"semi": ["error", "always"]}}'
    
    # Execute hook
    echo '{"tool_input":{"file_path":"'$PWD'/src/index.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Simple assertion - just check it blocks, not exact output
    assert_exit_code 2 $exit_code "Should block when ESLint finds errors with config present"
}

test_eslint_allows_clean_code() {
    # Setup: Create mock npx that reports no errors
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]]; then
    exit 0
fi
'
    
    # Create clean JavaScript file
    create_test_file "src/clean.js" '
function greet(name) {
    return `Hello, ${name}!`;
}

export default greet;
'
    
    # Create ESLint config
    create_test_file ".eslintrc.json" '{"rules": {}}'
    
    # Execute hook
    echo '{"tool_input":{"file_path":"'$PWD'/src/clean.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should allow clean JavaScript code"
}

test_eslint_skips_when_no_config() {
    # Setup: Don't create any ESLint config
    create_test_file "src/no-config.js" 'const x = 1;'
    
    # Execute hook - should skip gracefully
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/no-config.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should exit 0 and show warning
    assert_exit_code 0 $exit_code "Should skip gracefully when no config"
    assert_contains "$output" "ESLint not configured" "Should show configuration warning"
}

test_eslint_handles_warnings() {
    # Setup: Create mock git for project root
    create_mock_command "git" "
if [[ \"\$*\" == *\"rev-parse --show-toplevel\"* ]]; then
    echo '$PWD'
    exit 0
fi
"
    
    # When ESLint exits non-zero (even for warnings with --max-warnings 0), hook should block
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]] && [[ "$2" == "--version" ]]; then
    echo "v8.0.0"
    exit 0
elif [[ "$1" == "eslint" ]]; then
    echo "1:1  warning  Unexpected console statement  no-console"
    exit 1
fi
'
    
    create_test_file "src/warning.js" 'console.log("debug");'
    create_test_file ".eslintrc.json" '{"rules": {"no-console": "warn"}}'
    
    # Execute hook
    echo '{"tool_input":{"file_path":"'$PWD'/src/warning.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Simple behavior check
    assert_exit_code 2 $exit_code "Should block when ESLint fails (including warnings with --max-warnings 0)"
}

test_eslint_skips_non_js_files() {
    # Create non-JavaScript files
    create_test_file "style.css" 'body { margin: 0; }'
    create_test_file "data.json" '{"key": "value"}'
    create_test_file "script.py" 'print("Python")'
    create_test_file "README.md" '# Documentation'
    
    # Test each non-JS file
    for file in style.css data.json script.py README.md; do
        echo '{"tool_input":{"file_path":"'$PWD'/'$file'"}}' | "$HOOK_PATH" 2>&1
        local exit_code=$?
        assert_exit_code 0 $exit_code "Should skip $file"
    done
}

test_eslint_processes_typescript_files() {
    # Setup: Create mock git for project root
    create_mock_command "git" "
if [[ \"\$*\" == *\"rev-parse --show-toplevel\"* ]]; then
    echo '$PWD'
    exit 0
fi
"
    
    # Test that ESLint processes .ts and .tsx files when configured
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]] && [[ "$2" == "--version" ]]; then
    echo "v8.0.0"
    exit 0
elif [[ "$1" == "eslint" ]]; then
    echo "1:1  error  Missing return type  @typescript-eslint/explicit-function-return-type"
    exit 1
fi
'
    
    create_test_file "src/component.tsx" 'export function Component() { return <div />; }'
    create_test_file ".eslintrc.json" '{}'
    
    # Execute hook on TypeScript file
    echo '{"tool_input":{"file_path":"'$PWD'/src/component.tsx"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Just verify it processes the file and blocks on error
    assert_exit_code 2 $exit_code "Should process TypeScript files when ESLint is configured"
}

test_eslint_handles_missing_file() {
    # Execute hook with non-existent file
    echo '{"tool_input":{"file_path":"/nonexistent/file.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should gracefully handle missing files"
}

test_eslint_handles_missing_config() {
    # When no config exists, hook should skip gracefully
    create_test_file "no-config.js" 'const x = 1;'
    
    # Execute hook - should skip gracefully
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/no-config.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should exit 0 when no config found
    assert_exit_code 0 $exit_code "Should skip when no config found"
    assert_contains "$output" "ESLint not configured" "Should show skip message"
}

test_eslint_handles_invalid_json_input() {
    # Test with malformed JSON
    local output=$(echo 'not valid json' | "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle invalid JSON gracefully"
    
    # Test with empty input
    output=$(echo '' | "$HOOK_PATH" 2>&1)
    exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle empty input gracefully"
}

# REMOVED: test_eslint_cache_usage - Low value test that only tests mock behavior

test_eslint_handles_spaces_in_paths() {
    # Create directory with spaces
    mkdir -p "my project/src"
    
    # Create files in directory with spaces
    create_test_file "my project/src/file with spaces.js" 'const x = 1;'
    create_test_file "my project/.eslintrc.json" '{}'
    
    # Create mock npx
    create_mock_command "npx" 'exit 0'
    
    # Execute hook with path containing spaces
    echo '{"tool_input":{"file_path":"'$PWD'/my project/src/file with spaces.js"}}' | \
        "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle paths with spaces"
}

test_eslint_project_root_detection() {
    # Create nested project structure
    create_test_file "project/src/deep/file.js" 'const x = 1;'
    create_test_file "project/.eslintrc.json" '{"rules": {}}'
    create_test_file "project/package.json" '{"name": "test"}'
    
    # Mock npx that checks current directory
    create_mock_command "npx" '
if [[ -f .eslintrc.json ]]; then
    echo "Found ESLint config in current directory"
    exit 0
else
    echo "No ESLint config found"
    exit 1
fi
'
    
    # Hook should find project root
    cd project
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/deep/file.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should find project root with ESLint config"
}

test_eslint_multiple_file_extensions() {
    # Test various JavaScript/TypeScript extensions
    local extensions=("js" "jsx" "ts" "tsx" "mjs" "cjs")
    
    create_mock_command "npx" 'exit 0'
    create_test_file ".eslintrc.json" '{}'
    
    for ext in "${extensions[@]}"; do
        create_test_file "test.$ext" "export const test = 'test';"
        
        echo '{"tool_input":{"file_path":"'$PWD'/test.'$ext'"}}' | "$HOOK_PATH" 2>&1
        local exit_code=$?
        
        assert_exit_code 0 $exit_code "Should process .$ext files"
    done
}

################################################################################
# Run all tests if executed directly                                           #
################################################################################

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi