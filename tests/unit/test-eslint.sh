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

test_eslint_blocks_errors() {
    # Setup: Create mock npx that reports ESLint errors
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]]; then
    echo "/Users/test/project/src/index.js"
    echo "  1:10  error  Unexpected token  unexpected-token"
    echo "  5:1   error  Missing semicolon semi"
    echo ""
    echo "✖ 2 problems (2 errors, 0 warnings)"
    exit 1
fi
'
    
    # Create test JavaScript file
    create_test_file "src/index.js" '
var x = 1;;
function test() {
    console.log("test")
}
'
    
    # Create ESLint config
    create_test_file ".eslintrc.json" '{
  "rules": {
    "semi": ["error", "always"]
  }
}'
    
    # Execute hook
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/index.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions
    assert_exit_code 2 $exit_code "Should block when ESLint finds errors"
    assert_contains "$output" "ESLint issues found" "Should report ESLint issues"
    assert_contains "$output" "2 problems" "Should show problem count"
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

test_eslint_handles_warnings() {
    # Setup: Create mock npx that reports warnings (but no errors with --max-warnings 0)
    create_mock_command "npx" '
if [[ "$*" == *"--max-warnings 0"* ]]; then
    echo "src/warning.js"
    echo "  1:1  warning  Unexpected console statement  no-console"
    echo ""
    echo "✖ 1 problem (0 errors, 1 warning)"
    echo ""
    echo "ESLint found too many warnings (maximum: 0)."
    exit 1
fi
'
    
    create_test_file "src/warning.js" 'console.log("debug");'
    create_test_file ".eslintrc.json" '{"rules": {"no-console": "warn"}}'
    
    # Execute hook
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/warning.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should block because of --max-warnings 0
    assert_exit_code 2 $exit_code "Should block on warnings with --max-warnings 0"
    assert_contains "$output" "ESLint issues found" "Should report issues"
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

test_eslint_handles_typescript_files() {
    # Setup mock for TypeScript files
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]] && [[ "$*" == *".tsx"* ]]; then
    echo "src/component.tsx"
    echo "  10:5  error  React Hook useEffect has a missing dependency"
    exit 1
fi
'
    
    create_test_file "src/component.tsx" '
import React, { useEffect } from "react";
export function Component() {
    useEffect(() => {}, []);
    return <div />;
}
'
    
    create_test_file ".eslintrc.json" '{}'
    
    # Execute hook on TypeScript file
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/component.tsx"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 2 $exit_code "Should process TypeScript files"
    assert_contains "$output" "missing dependency" "Should show TypeScript-specific errors"
}

test_eslint_handles_missing_file() {
    # Execute hook with non-existent file
    echo '{"tool_input":{"file_path":"/nonexistent/file.js"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should gracefully handle missing files"
}

test_eslint_handles_missing_config() {
    # Setup mock that fails due to missing config
    create_mock_command "npx" '
if [[ "$1" == "eslint" ]]; then
    echo "Oops! Something went wrong! :("
    echo "ESLint couldn'\''t find a configuration file."
    exit 1
fi
'
    
    create_test_file "no-config.js" 'const x = 1;'
    
    # Execute hook - should handle gracefully
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/no-config.js"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should still block but with helpful message
    assert_exit_code 2 $exit_code "Should block on missing config"
    assert_contains "$output" "configuration file" "Should mention config issue"
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

test_eslint_cache_usage() {
    # Setup mock that shows cache behavior
    create_mock_command "npx" '
if [[ "$*" == *"--cache"* ]]; then
    echo "Using ESLint cache"
    exit 0
else
    echo "Not using cache"
    exit 0
fi
'
    
    create_test_file "cached.js" 'const x = 1;'
    create_test_file ".eslintrc.json" '{}'
    
    # Execute hook - should use cache
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/cached.js"}}' | \
        "$HOOK_PATH" 2>&1)
    
    assert_contains "$output" "Using ESLint cache" "Should use cache for performance"
}

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