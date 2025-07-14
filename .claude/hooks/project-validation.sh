#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Project Validation Hook                                                      #
# Runs project-wide validation when an agent completes (Stop/SubagentStop)     #
# Ensures code quality before allowing agent to finish                         #
################################################################################

# Source the shared validation library
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HOOK_DIR/../validation-lib.sh"

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
  cat >&2 <<EOF
████ Project Validation Failed ████

Your implementation has validation errors that must be fixed:

$VALIDATION_OUTPUT

REQUIRED ACTIONS:
1. Fix all errors shown above
2. Run validation commands locally to verify:
   - npm run typecheck (if available)
   - npm run lint (if available)
   - npm test (if available)
3. Make necessary corrections
4. The validation will run again automatically
EOF
  exit 2
fi

# All validations passed
echo "✅ All validations passed! Great work!" >&2
exit 0