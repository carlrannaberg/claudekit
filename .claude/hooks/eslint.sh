#!/usr/bin/env bash
set -euo pipefail

################################################################################
# ESLint Hook                                                                  #
# Enforces code style and quality standards                                    #
################################################################################

# Source the shared validation library
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HOOK_DIR/../validation-lib.sh"

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
2. Run npm run lint to verify all issues are resolved
3. Common fixes:
   - Missing semicolons or trailing commas
   - Unused variables (remove or use them)
   - Console.log statements (remove from production code)
   - Improper indentation or spacing
EOF
  exit 2
fi

echo "✅ ESLint check passed!" >&2