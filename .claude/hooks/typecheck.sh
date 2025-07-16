#!/usr/bin/env bash
set -euo pipefail

################################################################################
# TypeScript Type Checking Hook                                                #
# Validates TypeScript compilation and enforces strict typing                  #
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

# === Inlined Validation Functions ===

has_typescript() {
  local root_dir="${1:-$(pwd)}"
  [[ -f "$root_dir/tsconfig.json" ]] && command -v npx &>/dev/null && npx --quiet tsc --version &>/dev/null
}

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

# === Main Hook Logic ===

# Parse Claude-Code JSON payload
INPUT="$(cat)"
FILE_PATH=$(parse_json_field "$INPUT" "tool_input.file_path" "")

[[ -z $FILE_PATH ]] && exit 0
[[ ! -f $FILE_PATH ]] && exit 0
[[ ! $FILE_PATH =~ \.(ts|tsx)$ ]] && exit 0   # only run on TS/TSX

# Find project root
ROOT_DIR=$(find_project_root "$(dirname "$FILE_PATH")")

# Check if TypeScript is configured
if ! has_typescript "$ROOT_DIR"; then
  echo "⚠️  No TypeScript configuration found, skipping check" >&2
  exit 0
fi

# Run TypeScript validation
echo "📘 Type-checking $FILE_PATH" >&2

if ! TS_OUTPUT=$(validate_typescript_file "$FILE_PATH" "$ROOT_DIR"); then
  cat >&2 <<EOF
BLOCKED: TypeScript validation failed.

$TS_OUTPUT

MANDATORY INSTRUCTIONS:
1. Fix ALL TypeScript errors shown above
2. Replace any 'any' types with proper types
3. Run npm run typecheck to verify all errors are resolved
4. Use specific interfaces, union types, or generics instead of 'any'

Examples of fixes:
- Instead of: data: any → Define: interface Data { ... }
- Instead of: items: any[] → Use: items: Item[] or items: Array<{id: string, name: string}>
- Instead of: value: any → Use: value: string | number | boolean
- Instead of: response: any → Use: response: unknown (then add type guards)
EOF
  exit 2
fi

echo "✅ TypeScript check passed!" >&2