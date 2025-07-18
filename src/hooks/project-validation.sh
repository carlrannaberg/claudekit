#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Project Validation Hook                                                      #
# Runs project-wide validation when an agent completes (Stop/SubagentStop)     #
# Ensures code quality before allowing agent to finish                         #
# Self-contained validation hook with all dependencies included                #
################################################################################

# This hook is self-contained and includes all necessary validation functions.
# No external dependencies required - just copy this file and it works.

# === Inlined Helper Functions ===

find_project_root() {
  local start_dir="${1:-$(pwd)}"
  git -C "$start_dir" rev-parse --show-toplevel 2>/dev/null || pwd
}

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

# === Package Manager Detection (inlined for self-containment) ===

detect_package_manager() {
    if [[ -f "pnpm-lock.yaml" ]]; then
        echo "pnpm"
    elif [[ -f "yarn.lock" ]]; then
        echo "yarn"
    elif [[ -f "package-lock.json" ]]; then
        echo "npm"
    elif [[ -f "package.json" ]]; then
        if command -v jq &> /dev/null; then
            local pkg_mgr=$(jq -r '.packageManager // empty' package.json 2>/dev/null)
            if [[ -n "$pkg_mgr" ]]; then
                echo "${pkg_mgr%%@*}"
                return
            fi
        fi
        echo "npm"
    else
        echo ""
    fi
}

get_package_manager_exec() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm) echo "npx" ;;
        yarn) echo "yarn dlx" ;;
        pnpm) echo "pnpm dlx" ;;
        *) echo "npx" ;;
    esac
}

get_package_manager_test() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm) echo "npm test" ;;
        yarn) echo "yarn test" ;;
        pnpm) echo "pnpm test" ;;
        *) echo "npm test" ;;
    esac
}

# === Inlined Detection Functions ===

has_typescript() {
  local root_dir="${1:-$(pwd)}"
  [[ -f "$root_dir/tsconfig.json" ]] || return 1
  
  # Check if package manager's exec command is available
  local pkg_exec=$(get_package_manager_exec)
  if ! command -v "${pkg_exec%% *}" &>/dev/null; then
    return 1
  fi
  
  # Try to run tsc
  cd "$root_dir" && $pkg_exec --quiet tsc --version &>/dev/null
}

has_eslint() {
  local root_dir="${1:-$(pwd)}"
  if ! ([[ -f "$root_dir/.eslintrc.json" ]] || [[ -f "$root_dir/.eslintrc.js" ]] || [[ -f "$root_dir/.eslintrc.yml" ]]); then
    return 1
  fi
  
  # Check if package manager's exec command is available
  local pkg_exec=$(get_package_manager_exec)
  if ! command -v "${pkg_exec%% *}" &>/dev/null; then
    return 1
  fi
  
  # Try to run eslint
  cd "$root_dir" && $pkg_exec --quiet eslint --version &>/dev/null
}

has_tests() {
  local root_dir="${1:-$(pwd)}"
  [[ -f "$root_dir/package.json" ]] && grep -q '"test"' "$root_dir/package.json"
}

# === Inlined Validation Functions ===

validate_typescript_project() {
  local root_dir="$1"
  local output=""
  local pkg_exec=$(get_package_manager_exec)

  cd "$root_dir"
  output=$($pkg_exec tsc --noEmit 2>&1 || true)

  if [[ -n "$output" ]]; then
    echo "$output"
    return 1
  fi

  return 0
}

validate_eslint_project() {
  local root_dir="$1"
  local output=""
  local pkg_exec=$(get_package_manager_exec)

  cd "$root_dir"
  output=$($pkg_exec eslint . --ext .js,.jsx,.ts,.tsx 2>&1 || true)

  if echo "$output" | grep -q "error"; then
    echo "$output"
    return 1
  fi

  return 0
}

validate_tests() {
  local root_dir="$1"
  local output=""
  local pkg_test=$(get_package_manager_test)

  cd "$root_dir"
  output=$($pkg_test 2>&1 || true)

  if echo "$output" | grep -qE "(FAIL|failed|Error:|failing)"; then
    echo "$output"
    return 1
  fi

  return 0
}

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

# === Main Hook Logic ===

# Parse Claude-Code JSON payload
INPUT="$(cat)"

# Check if we're already in a stop hook to prevent infinite loops
STOP_HOOK_ACTIVE=$(parse_json_field "$INPUT" "stop_hook_active" "false")
[[ "$STOP_HOOK_ACTIVE" == "true" ]] && exit 0

# Determine project root
ROOT_DIR=$(find_project_root)
cd "$ROOT_DIR"

# Track if any checks fail
VALIDATION_FAILED=false
VALIDATION_OUTPUT=""

# Run TypeScript check if available
if has_typescript "$ROOT_DIR"; then
  VALIDATION_OUTPUT+="📘 Running TypeScript validation..."$'\n'
  if TS_OUTPUT=$(validate_typescript_project "$ROOT_DIR"); then
    VALIDATION_OUTPUT+=$(format_validation_output "TypeScript validation" "pass" "")$'\n'
  else
    VALIDATION_FAILED=true
    VALIDATION_OUTPUT+=$(format_validation_output "TypeScript validation" "fail" "$TS_OUTPUT")$'\n'
  fi
  VALIDATION_OUTPUT+=$'\n'
fi

# Run ESLint if available
if has_eslint "$ROOT_DIR"; then
  VALIDATION_OUTPUT+="🔍 Running ESLint validation..."$'\n'
  if ESLINT_OUTPUT=$(validate_eslint_project "$ROOT_DIR"); then
    VALIDATION_OUTPUT+=$(format_validation_output "ESLint validation" "pass" "")$'\n'
  else
    VALIDATION_FAILED=true
    VALIDATION_OUTPUT+=$(format_validation_output "ESLint validation" "fail" "$ESLINT_OUTPUT")$'\n'
  fi
  VALIDATION_OUTPUT+=$'\n'
fi

# Run tests if available
if has_tests "$ROOT_DIR"; then
  VALIDATION_OUTPUT+="🧪 Running test suite..."$'\n'
  if TEST_OUTPUT=$(validate_tests "$ROOT_DIR"); then
    VALIDATION_OUTPUT+=$(format_validation_output "Test suite" "pass" "")$'\n'
  else
    VALIDATION_FAILED=true
    VALIDATION_OUTPUT+=$(format_validation_output "Test suite" "fail" "$TEST_OUTPUT")$'\n'
  fi
  VALIDATION_OUTPUT+=$'\n'
fi

# If validation failed, block and provide feedback
if [[ "$VALIDATION_FAILED" == "true" ]]; then
  # Build list of failed validations
  FAILED_CHECKS=""
  if echo "$VALIDATION_OUTPUT" | grep -q "❌ TypeScript validation failed"; then
    FAILED_CHECKS+="- Type checking command\n"
  fi
  if echo "$VALIDATION_OUTPUT" | grep -q "❌ ESLint validation failed"; then
    FAILED_CHECKS+="- Lint command\n"
  fi
  if echo "$VALIDATION_OUTPUT" | grep -q "❌ Test suite failed"; then
    FAILED_CHECKS+="- Test command\n"
  fi
  
  cat >&2 <<EOF
████ Project Validation Failed ████

Your implementation has validation errors that must be fixed:

$VALIDATION_OUTPUT

REQUIRED ACTIONS:
1. Fix all errors shown above
2. Run the failed validation commands to verify fixes:
$(echo -e "$FAILED_CHECKS")   (Check AGENT.md/CLAUDE.md or package.json scripts for exact commands)
3. Make necessary corrections
4. The validation will run again automatically
EOF
  exit 2
fi

# All validations passed
echo "✅ All validations passed! Great work!" >&2
exit 0