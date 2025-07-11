#!/usr/bin/env bash
set -euo pipefail

################################################################################
# ESLint Hook                                                                  #
# Enforces code style and quality standards                                    #
################################################################################

# Parse Claude-Code JSON payload
INPUT="$(cat)"

if command -v jq &>/dev/null; then
  FILE_PATH=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")
else
  FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p' | head -1)
fi

[[ -z $FILE_PATH ]] && exit 0
[[ ! -f $FILE_PATH ]] && exit 0

# Check file extension - ESLint can handle JS/TS/JSX/TSX
if [[ ! $FILE_PATH =~ \.(js|jsx|ts|tsx)$ ]]; then
  exit 0
fi

# Figure out the project root reliably
ROOT_DIR=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || true)
[[ -z $ROOT_DIR ]] && ROOT_DIR=$(dirname "$FILE_PATH")

ESLINTCACHE="$ROOT_DIR/.eslintcache"

# Check if ESLint is configured
if [[ ! -f "$ROOT_DIR/eslint.config.js" && ! -f "$ROOT_DIR/.eslintrc.js" && ! -f "$ROOT_DIR/.eslintrc.json" ]]; then
  echo "⚠️  ESLint not configured, skipping lint check" >&2
  exit 0
fi

echo "🔍 Running ESLint on $FILE_PATH..." >&2
ESLINT_LOG=$(mktemp)

# Run ESLint with caching for performance
if ! npx eslint --max-warnings 0 --cache --cache-location "$ESLINTCACHE" "$FILE_PATH" >"$ESLINT_LOG" 2>&1; then
  cat >&2 <<EOF
BLOCKED: ESLint check failed.

MANDATORY INSTRUCTIONS:
You MUST fix ALL lint errors and warnings in the entire project.
Even if errors seem unrelated to your changes, you are responsible for fixing them.

REQUIRED ACTIONS:
1. Run: npm run lint
2. Review ALL errors and warnings (not just in this file)
3. Fix every single lint issue
4. Use AgentTool to spawn concurrent agents if there are many issues:
   - Group lint errors by type or file
   - Launch multiple agents to fix different groups in parallel
   - Each agent should verify their fixes pass linting

Current lint errors:
$(cat "$ESLINT_LOG")

After fixing, run npm run lint again to ensure ALL issues are resolved.
EOF
  rm -f "$ESLINT_LOG"
  exit 2
fi

rm -f "$ESLINT_LOG"
echo "✅ ESLint check passed!" >&2