#!/usr/bin/env bash
set -euo pipefail

################################################################################
# TypeScript Type Checking Hook                                                #
# Validates TypeScript compilation and enforces strict typing                  #
################################################################################

# Source the shared validation library
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HOOK_DIR/../validation-lib.sh"

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