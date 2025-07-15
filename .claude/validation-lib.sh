#!/usr/bin/env bash
# shellcheck disable=SC2034  # Variables are used by sourcing scripts

################################################################################
# Shared Validation Library                                                    #
################################################################################

# Determine project root
find_project_root() {
  local start_dir="${1:-$(pwd)}"
  git -C "$start_dir" rev-parse --show-toplevel 2>/dev/null || pwd
}

# Check if TypeScript is available and configured
has_typescript() {
  local root_dir="${1:-$(pwd)}"
  [[ -f "$root_dir/tsconfig.json" ]] && command -v npx &>/dev/null && npx --quiet tsc --version &>/dev/null
}

# Check if ESLint is available and configured
has_eslint() {
  local root_dir="${1:-$(pwd)}"
  ([[ -f "$root_dir/.eslintrc.json" ]] || [[ -f "$root_dir/.eslintrc.js" ]] || [[ -f "$root_dir/.eslintrc.yml" ]]) && \
    command -v npx &>/dev/null && npx --quiet eslint --version &>/dev/null
}

# Check if project has tests configured
has_tests() {
  local root_dir="${1:-$(pwd)}"
  [[ -f "$root_dir/package.json" ]] && grep -q '"test"' "$root_dir/package.json"
}

# Run TypeScript validation on specific file
validate_typescript_file() {
  local file_path="$1"
  local root_dir="$2"
  local output=""

  # Check for forbidden "any" types (excluding comments and expect.any())
  # First filter out comment lines and expect.any() usage
  local filtered_content=$(grep -v '^\s*//' "$file_path" | grep -v '^\s*\*' | grep -v 'expect\.any(' | grep -v '\.any(')
  if echo "$filtered_content" | grep -qE ':\s*any\b|:\s*any\[\]|<any>|as\s+any\b|=\s*any\b'; then
    output="❌ File contains forbidden 'any' types. Use specific types instead."
    echo "$output"
    return 1
  fi

  # Run TypeScript compiler
  local ts_version="$(npx --quiet tsc -v | awk '{print $2}')"
  local ts_log=$(mktemp)
  local tsbuildinfo="$root_dir/.tsbuildinfo"

  # Check if --changedFiles is supported (TS >= 5.4)
  IFS='.' read -r ts_major ts_minor _ <<<"$ts_version"
  if [[ $ts_major -gt 5 || ( $ts_major -eq 5 && $ts_minor -ge 4 ) ]]; then
    npx tsc --noEmit --skipLibCheck --incremental \
      --tsBuildInfoFile "$tsbuildinfo" -p "$root_dir/tsconfig.json" \
      --changedFiles "$file_path" 2>"$ts_log" || true
  else
    npx tsc --noEmit --skipLibCheck --incremental \
      --tsBuildInfoFile "$tsbuildinfo" -p "$root_dir/tsconfig.json" \
      2>"$ts_log" || true
    grep -F "$file_path" "$ts_log" >"${ts_log}.f" || true
    mv "${ts_log}.f" "$ts_log"
  fi

  if grep -qE '^.+error TS[0-9]+' "$ts_log"; then
    output=$(cat "$ts_log")
    rm -f "$ts_log"
    echo "$output"
    return 1
  fi

  rm -f "$ts_log"
  return 0
}

# Run TypeScript validation on entire project
validate_typescript_project() {
  local root_dir="$1"
  local output=""

  cd "$root_dir"
  output=$(npx tsc --noEmit 2>&1 || true)

  if [[ -n "$output" ]]; then
    echo "$output"
    return 1
  fi

  return 0
}

# Run ESLint validation on specific file
validate_eslint_file() {
  local file_path="$1"
  local root_dir="$2"
  local output=""

  cd "$root_dir"
  output=$(npx eslint "$file_path" 2>&1 || true)

  if echo "$output" | grep -q "error"; then
    echo "$output"
    return 1
  fi

  return 0
}

# Run ESLint validation on entire project
validate_eslint_project() {
  local root_dir="$1"
  local output=""

  cd "$root_dir"
  output=$(npx eslint . --ext .js,.jsx,.ts,.tsx 2>&1 || true)

  if echo "$output" | grep -q "error"; then
    echo "$output"
    return 1
  fi

  return 0
}

# Run tests for the project
validate_tests() {
  local root_dir="$1"
  local output=""

  cd "$root_dir"
  output=$(npm test 2>&1 || true)

  if echo "$output" | grep -qE "(FAIL|failed|Error:|failing)"; then
    echo "$output"
    return 1
  fi

  return 0
}

# Format validation output with header
format_validation_output() {
  local check_name="$1"
  local status="$2"  # "pass" or "fail"
  local output="$3"

  if [[ "$status" == "pass" ]]; then
    echo "✅ $check_name passed"
  else
    echo "❌ $check_name failed:"
    echo "$output" | sed 's/^/  /'
  fi
}

# Safe JSON parsing helper
parse_json_field() {
  local json="$1"
  local field="$2"
  local default="${3:-}"

  if command -v jq &>/dev/null; then
    echo "$json" | jq -r ".$field // \"$default\"" 2>/dev/null || echo "$default"
  else
    # Fallback: extract field using sed
    local value=$(echo "$json" | sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1)
    echo "${value:-$default}"
  fi
}