#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for typecheck.sh Hook                                            #
################################################################################

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_PATH="$SCRIPT_DIR/../../.claude/hooks/typecheck.sh"

# Source the test framework
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Test Cases                                                                   #
################################################################################

test_typecheck_blocks_any_type() {
    # Setup: Create mock git for project root
    create_mock_command "git" "
if [[ \"\$*\" == *\"rev-parse --show-toplevel\"* ]]; then
    echo '$PWD'
    exit 0
fi
"
    
    # Create mock npx for version check
    create_mock_command "npx" '
if [[ "$*" == *"tsc -v"* ]]; then
    echo "Version 5.4.5"
    exit 0
fi
'
    
    # Create test TypeScript file with any types
    create_test_file "src/index.ts" '
function processData(data: any) {
    return data;
}

export const handler = (value: any) => value;
'
    
    # Create a minimal tsconfig.json at project root
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
EOF
    
    # Execute hook - it should block on grep finding 'any' types
    echo '{"tool_input":{"file_path":"'$PWD'/src/index.ts"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # The hook blocks on any types before even running tsc
    assert_exit_code 2 $exit_code "Should block when any types are found"
}

test_typecheck_allows_clean_typescript() {
    # Setup: Create a mock tsc that succeeds
    create_mock_command "tsc" "exit 0"
    
    # Create clean TypeScript file
    create_test_file "src/clean.ts" '
interface User {
    id: number;
    name: string;
}

export function getUser(id: number): User {
    return { id, name: "Test User" };
}
'
    
    # Create tsconfig.json
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "strict": true
  }
}
EOF
    
    # Execute hook
    echo '{"tool_input":{"file_path":"'$PWD'/src/clean.ts"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should allow clean TypeScript code"
}

test_typecheck_skips_non_typescript_files() {
    # Create non-TypeScript files
    create_test_file "script.js" 'console.log("JavaScript file");'
    create_test_file "style.css" 'body { margin: 0; }'
    create_test_file "doc.md" '# Documentation'
    
    # Test each non-TypeScript file
    for file in script.js style.css doc.md; do
        echo '{"tool_input":{"file_path":"'$PWD'/'$file'"}}' | "$HOOK_PATH" 2>&1
        local exit_code=$?
        assert_exit_code 0 $exit_code "Should skip $file"
    done
}

test_typecheck_handles_missing_file() {
    # Execute hook with non-existent file
    echo '{"tool_input":{"file_path":"/nonexistent/path/file.ts"}}' | "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    # Assertions
    assert_exit_code 0 $exit_code "Should gracefully handle missing files"
}

test_typecheck_handles_missing_tsconfig() {
    # Setup: Create mock tsc that complains about missing tsconfig
    create_mock_command "tsc" "
echo 'error TS5058: The specified path does not exist: '\''tsconfig.json'\''.'
exit 1
"
    
    # Create TypeScript file without tsconfig
    create_test_file "src/no-config.ts" 'export const x = 1;'
    
    # Execute hook
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/no-config.ts"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Assertions - should handle gracefully
    assert_exit_code 0 $exit_code "Should handle missing tsconfig.json"
}

test_typecheck_handles_invalid_json_input() {
    # Test with malformed JSON
    local output=$(echo 'not valid json' | "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle invalid JSON gracefully"
    
    # Test with empty input
    output=$(echo '' | "$HOOK_PATH" 2>&1)
    exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle empty input gracefully"
}

test_typecheck_respects_project_root() {
    # Setup: Create a nested project structure
    create_test_file "project/src/index.ts" 'export const x: any = 1;'
    create_test_file "project/tsconfig.json" '{"compilerOptions": {"strict": true}}'
    
    # Create mock tsc that checks current directory
    create_mock_command "tsc" "
if [[ -f tsconfig.json ]]; then
    echo 'Found tsconfig.json in current directory'
    exit 0
else
    echo 'No tsconfig.json found'
    exit 1
fi
"
    
    # The hook should find and use the project root
    cd project
    local output=$(echo '{"tool_input":{"file_path":"'$PWD'/src/index.ts"}}' | \
        "$HOOK_PATH" 2>&1)
    local exit_code=$?
    
    # Should succeed if it properly found project root
    assert_equals 0 $exit_code "Should find project root with tsconfig.json"
}

test_typecheck_handles_spaces_in_paths() {
    # Create a directory with spaces
    mkdir -p "my project/src"
    
    # Create files in directory with spaces
    create_test_file "my project/src/file with spaces.ts" 'export const x = 1;'
    create_test_file "my project/tsconfig.json" '{"compilerOptions": {}}'
    
    # Create mock tsc
    create_mock_command "tsc" "exit 0"
    
    # Execute hook with path containing spaces
    echo '{"tool_input":{"file_path":"'$PWD'/my project/src/file with spaces.ts"}}' | \
        "$HOOK_PATH" 2>&1
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "Should handle paths with spaces"
}

# REMOVED: test_typecheck_typescript_version_detection - Low value test of version detection mock

################################################################################
# Run all tests if executed directly                                           #
################################################################################

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_tests_in_file "${BASH_SOURCE[0]}"
fi