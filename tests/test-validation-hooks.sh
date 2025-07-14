#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Suite for Validation Hooks                                              #
# Tests the shared validation library and individual hooks                     #
################################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test setup
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/.." && pwd)"
TEMP_DIR=$(mktemp -d)

# Cleanup on exit
trap 'rm -rf "$TEMP_DIR"' EXIT

# Test helper functions
test_start() {
  local test_name="$1"
  echo -e "${YELLOW}Running:${NC} $test_name"
  TESTS_RUN=$((TESTS_RUN + 1))
}

test_pass() {
  echo -e "${GREEN}✓ PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

test_fail() {
  local message="$1"
  echo -e "${RED}✗ FAILED:${NC} $message"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Create a mock project structure
setup_mock_project() {
  local mock_dir="$TEMP_DIR/mock-project"
  mkdir -p "$mock_dir"
  cd "$mock_dir"
  
  # Initialize git repo
  git init --quiet
  
  # Create package.json
  cat > package.json <<'EOF'
{
  "name": "mock-project",
  "scripts": {
    "test": "echo 'All tests passed!'",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  }
}
EOF
  
  # Create tsconfig.json
  cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true
  }
}
EOF
  
  # Create .eslintrc.json
  cat > .eslintrc.json <<'EOF'
{
  "rules": {
    "no-console": "error"
  }
}
EOF
  
  echo "$mock_dir"
}

# Source the validation library once at the beginning
source "$PROJECT_ROOT/.claude/validation-lib.sh"

# Test 1: Validation library functions
# Purpose: Verify find_project_root correctly identifies git repository root
# from a subdirectory. This ensures hooks can find project root regardless
# of where they're executed from.
test_start "Validation library - find_project_root"
found_root=$(find_project_root "$PROJECT_ROOT/tests")
if [[ "$found_root" == "$PROJECT_ROOT" ]]; then
  test_pass
else
  test_fail "Expected $PROJECT_ROOT, got $found_root"
fi

# Test 2: TypeScript detection
# Purpose: Verify has_typescript requires BOTH tsconfig.json AND tsc binary.
# This prevents hooks from attempting to run TypeScript validation when only
# config exists but TypeScript isn't installed.
test_start "Validation library - has_typescript"
mock_dir=$(setup_mock_project)
# Test that has_typescript returns false when tsc isn't available
# This is the expected behavior - it should require both config AND binary
if ! has_typescript "$mock_dir"; then
  test_pass
else
  test_fail "Should return false when TypeScript binary not available"
fi

# Test 3: ESLint detection with config file
# Purpose: Verify has_eslint behavior when config exists. Tests that function
# correctly handles cases where config exists but binary might not be available.
# This ensures we don't try to run ESLint when it's not properly installed.
test_start "Validation library - has_eslint behavior"
cd "$mock_dir"
# Test the actual function, not just file existence
# Since ESLint binary might not be available, we expect false
if ! has_eslint "$mock_dir"; then
  test_pass  # Expected: config exists but no binary
else
  # If it returns true, ESLint must be globally available
  if command -v npx &>/dev/null && npx --quiet eslint --version &>/dev/null; then
    test_pass  # ESLint is actually available
  else
    test_fail "has_eslint returned true but ESLint binary not found"
  fi
fi

# Test 3b: ESLint detection without config
# Purpose: Verify has_eslint returns false when no config files exist.
# This ensures ESLint validation is skipped for projects without ESLint setup.
test_start "Validation library - has_eslint without config"
rm -f .eslintrc.json .eslintrc.js .eslintrc.yml
# Should return false when no config exists
if ! has_eslint "$mock_dir"; then
  test_pass
else
  test_fail "Should return false when no ESLint config files exist"
fi

# Test 4: Test detection
# Purpose: Verify has_tests correctly detects when npm test script is configured.
# This ensures test validation hooks only run for projects with actual tests.
test_start "Validation library - has_tests"
if has_tests "$mock_dir"; then
  test_pass
else
  test_fail "Should detect test script in package.json"
fi

# Test 5: JSON parsing
# Purpose: Verify parse_json_field correctly extracts values from JSON strings.
# This is critical for hooks that need to parse Claude Code's JSON payloads.
# Must work with both jq and fallback sed parsing.
test_start "Validation library - parse_json_field"
test_json='{"field1": "value1", "field2": "value2"}'
parsed_value=$(parse_json_field "$test_json" "field1" "default")
if [[ "$parsed_value" == "value1" ]]; then
  test_pass
else
  test_fail "Expected 'value1', got '$parsed_value'"
fi

# Test 5b: Test format_validation_output function
# Purpose: Verify format_validation_output produces consistent output formatting
# for both pass/fail states. This ensures all validation messages look uniform.
test_start "Validation library - format_validation_output"
pass_output=$(format_validation_output "Test Check" "pass" "")
fail_output=$(format_validation_output "Test Check" "fail" "Error details")
if [[ "$pass_output" == *"✅ Test Check passed"* ]] && [[ "$fail_output" == *"❌ Test Check failed"* ]]; then
  test_pass
else
  test_fail "format_validation_output not working correctly"
fi

# Test 6: TypeScript hook - skips when no TypeScript configured
# Purpose: Verify TypeScript hook correctly skips validation when no tsconfig.json
# exists. This prevents errors in non-TypeScript projects and ensures graceful
# degradation when TypeScript isn't set up.
test_start "TypeScript hook - skips without TypeScript"
cd "$mock_dir"
rm -f tsconfig.json  # Remove TypeScript config
echo "const x: any = 42;" > test-any.ts
hook_input='{"tool_input": {"file_path": "'$mock_dir'/test-any.ts"}}'
output=$(echo "$hook_input" | "$PROJECT_ROOT/.claude/hooks/typecheck.sh" 2>&1 || true)
if echo "$output" | grep -q "No TypeScript configuration found, skipping check"; then
  test_pass
else
  test_fail "Should skip when TypeScript not configured (got: $output)"
fi

# Test 7: Test grep patterns for various 'any' types
# Purpose: Verify the regex pattern used to detect forbidden 'any' types catches
# all common TypeScript patterns where 'any' appears. This ensures comprehensive
# type safety enforcement across different 'any' usage patterns.
test_start "Validation - 'any' type detection patterns"
cd "$mock_dir"
# Test various 'any' patterns that should be caught
test_patterns=(
  "const x: any = 42"
  "let arr: any[] = []"
  "function test(): any {}"
  "value as any"
  "type Foo = any"
)
all_found=true
for pattern in "${test_patterns[@]}"; do
  echo "$pattern" > test-pattern.ts
  if ! grep -q ': any\|: any\[\]\|<any>\|as any\|= any' test-pattern.ts; then
    echo "Failed to match: $pattern"
    all_found=false
  fi
done
if [[ "$all_found" == "true" ]]; then
  test_pass
else
  test_fail "Some 'any' patterns were not detected"
fi

# Test 8: ESLint hook - skips when no ESLint
# Purpose: Verify ESLint hook correctly skips validation when no ESLint config
# exists. This prevents errors in projects without ESLint setup and ensures
# hooks don't break non-linted codebases.
test_start "ESLint hook - skips without ESLint binary"
cd "$mock_dir"
# Remove ESLint config to ensure it skips
rm -f .eslintrc.json
echo "const x = 42;" > test.js
hook_input='{"tool_input": {"file_path": "'$mock_dir'/test.js"}}'
output=$(echo "$hook_input" | "$PROJECT_ROOT/.claude/hooks/eslint.sh" 2>&1 || true)
if echo "$output" | grep -q "ESLint not configured, skipping"; then
  test_pass
else
  test_fail "Should skip when ESLint not configured (got: $output)"
fi

# Test 9: Project validation hook - runs without errors
# Purpose: Verify project validation hook runs successfully on projects without
# TypeScript/ESLint/test configurations. This ensures the hook gracefully handles
# projects that don't use these tools rather than failing.
test_start "Project validation hook - runs without errors"
# Test that the hook runs successfully even with no validations configured
# This is expected behavior for projects without TS/ESLint/tests
hook_input='{"stop_hook_active": false}'
output=$(echo "$hook_input" | "$PROJECT_ROOT/.claude/hooks/project-validation.sh" 2>&1)
exit_code=$?
if [[ $exit_code -eq 0 ]] && [[ "$output" == *"All validations passed"* ]]; then
  test_pass
else
  test_fail "Hook should run successfully (exit code: $exit_code)"
fi

# Test 10: Stop hook active check
# Purpose: Verify project validation hook prevents infinite loops by exiting
# immediately when stop_hook_active is true. This is critical for preventing
# hooks from triggering themselves recursively.
test_start "Project validation hook - stop_hook_active prevents loop"
hook_input='{"stop_hook_active": true}'
output=$(echo "$hook_input" | "$PROJECT_ROOT/.claude/hooks/project-validation.sh" 2>&1 || true)
if [[ -z "$output" ]]; then
  test_pass
else
  test_fail "Should exit silently when stop_hook_active is true"
fi

# Test 11: JSON parsing with missing field
# Purpose: Verify parse_json_field returns default values for missing fields.
# This ensures hooks don't crash when Claude Code's JSON payload is missing
# expected fields, providing graceful fallback behavior.
test_start "Validation library - parse_json_field with default"
test_json='{"field1": "value1"}'
parsed_value=$(parse_json_field "$test_json" "missing_field" "default_value")
if [[ "$parsed_value" == "default_value" ]]; then
  test_pass
else
  test_fail "Should return default for missing field, got '$parsed_value'"
fi

# Summary
echo
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo

# Exit with appropriate code
if [[ $TESTS_FAILED -eq 0 ]]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi