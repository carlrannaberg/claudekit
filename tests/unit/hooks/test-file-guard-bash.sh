#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Unit Tests for File Guard Hook (Bash tool)
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/../../test-framework.sh"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CLI_PATH="$PROJECT_ROOT/dist/hooks-cli.cjs"
TEMP_PROJECT_DIR=""

setUp() {
  TEMP_PROJECT_DIR=$(mktemp -d)
  cd "$TEMP_PROJECT_DIR"
  echo "FOO=bar" > .env
  echo "KEY=xyz" > .env.local

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

run_file_guard_bash() {
  local command_str="$1"
  # JSON-escape the command string (backslashes and quotes)
  local cmd_json
  cmd_json=$(printf '%s' "$command_str" | sed -e 's/\\/\\\\/g' -e 's/\"/\\\"/g')
  local payload="{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$cmd_json\"}}"
  echo "$payload" | node "$CLI_PATH" run file-guard
}

test_block_bash_access_to_env() {
  local output
  output=$(run_file_guard_bash "grep 'KEY' .env.local | cut -d'=' -f2" 2>/dev/null || true)
  if echo "$output" | grep -q '"permissionDecision":"deny"'; then
    assert_pass "Denied Bash access to .env.local"
  else
    assert_fail "Should deny Bash reading .env.local, got: $output"
  fi
}

test_allow_bash_without_sensitive_paths() {
  local output
  output=$(run_file_guard_bash "echo 'hello world'" 2>/dev/null || true)
  if echo "$output" | grep -q '"permissionDecision":"allow"'; then
    assert_pass "Allowed harmless Bash command"
  else
    assert_fail "Should allow harmless Bash command, got: $output"
  fi
}

test_block_bash_absolute_path() {
  local abs="$TEMP_PROJECT_DIR/.env"
  local output
  output=$(run_file_guard_bash "cat $abs" 2>/dev/null || true)
  if echo "$output" | grep -q '"permissionDecision":"deny"'; then
    assert_pass "Denied Bash using absolute sensitive path"
  else
    assert_fail "Should deny Bash reading absolute .env, got: $output"
  fi
}

test_block_bash_var_assignment_and_use() {
  local output
  output=$(run_file_guard_bash "FILE=.env; cat \$FILE" 2>/dev/null || true)
  if echo "$output" | grep -q '"permissionDecision":"deny"'; then
    assert_pass "Denied Bash var assignment + use (.env)"
  else
    assert_fail "Should deny FILE=.env; cat var, got: $output"
  fi
}

test_block_bash_double_quoted_var() {
  local output
  output=$(run_file_guard_bash "FILENAME=\".env\" && cat \"\$FILENAME\"" 2>/dev/null || true)
  if echo "$output" | grep -q '"permissionDecision":"deny"'; then
    assert_pass "Denied Bash with double-quoted var expanding to .env"
  else
    assert_fail "Should deny double-quoted var expansion, got: $output"
  fi
}

test_block_bash_simple_concatenation() {
  local output
  output=$(run_file_guard_bash "E=\"env\"; cat \".\$E\"" 2>/dev/null || true)
  if echo "$output" | grep -q '"permissionDecision":"deny"'; then
    assert_pass "Denied Bash concatenation to .env"
  else
    assert_fail "Should deny concatenated .env via .$, got: $output"
  fi
}

trap tearDown EXIT

run_test_suite "File Guard Hook Bash Tests"
