#!/usr/bin/env bash
set -euo pipefail

################################################################################
# ESLint Hook                                                                  #
# Enforces code style and quality standards                                    #
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

get_package_manager_run() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm) echo "npm run" ;;
        yarn) echo "yarn" ;;
        pnpm) echo "pnpm run" ;;
        *) echo "npm run" ;;
    esac
}

# === Inlined Validation Functions ===

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

validate_eslint_file() {
  local file_path="$1"
  local root_dir="$2"
  local output=""
  local pkg_exec=$(get_package_manager_exec)

  cd "$root_dir"
  output=$($pkg_exec eslint "$file_path" 2>&1 || true)

  if echo "$output" | grep -qE "(error|warning)"; then
    echo "$output"
    return 1
  fi

  return 0
}

# === Main Hook Logic ===

# Parse Claude-Code JSON payload
INPUT="$(cat)"
FILE_PATH=$(parse_json_field "$INPUT" "tool_input.file_path" "")

[[ -z $FILE_PATH ]] && exit 0
[[ ! -f $FILE_PATH ]] && exit 0

# Check file extension - ESLint can handle JS/TS/JSX/TSX
if [[ ! $FILE_PATH =~ \.(js|jsx|ts|tsx)$ ]]; then
  exit 0
fi

# Find project root
ROOT_DIR=$(find_project_root "$(dirname "$FILE_PATH")")

# Check if ESLint is configured
if ! has_eslint "$ROOT_DIR"; then
  echo "⚠️  ESLint not configured, skipping lint check" >&2
  exit 0
fi

echo "🔍 Running ESLint on $FILE_PATH..." >&2

# Run ESLint validation
if ! ESLINT_OUTPUT=$(validate_eslint_file "$FILE_PATH" "$ROOT_DIR"); then
  cat >&2 <<EOF
BLOCKED: ESLint check failed.

$ESLINT_OUTPUT

MANDATORY INSTRUCTIONS:
You MUST fix ALL lint errors and warnings shown above.

REQUIRED ACTIONS:
1. Fix all errors shown above
2. Run the project's lint command to verify all issues are resolved
   (Check AGENT.md/CLAUDE.md or package.json scripts for the exact command)
3. Common fixes:
   - Missing semicolons or trailing commas
   - Unused variables (remove or use them)
   - Console.log statements (remove from production code)
   - Improper indentation or spacing
EOF
  exit 2
fi

echo "✅ ESLint check passed!" >&2