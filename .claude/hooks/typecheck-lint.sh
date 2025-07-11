#!/usr/bin/env bash
set -euo pipefail

################################################################################
# 0.  Parse Claude-Code JSON payload                                           #
################################################################################
INPUT="$(cat)"

if command -v jq &>/dev/null; then
  FILE_PATH=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")
else
  FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p' | head -1)
fi

[[ -z $FILE_PATH ]] && exit 0
[[ ! -f $FILE_PATH ]] && exit 0
[[ ! $FILE_PATH =~ \.(ts|tsx)$ ]] && exit 0   # only run on TS/TSX

################################################################################
# 1.  Figure out the project root reliably                                     #
################################################################################
ROOT_DIR=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || true)
[[ -z $ROOT_DIR ]] && ROOT_DIR=$(dirname "$FILE_PATH")

TSCONFIG="$ROOT_DIR/tsconfig.json"
TSBUILDINFO="$ROOT_DIR/.tsbuildinfo"
ESLINTCACHE="$ROOT_DIR/.eslintcache"

################################################################################
# 2.  Decide whether --changedFiles is supported (TS >= 5.4)                   #
################################################################################
TS_VERSION="$(npx --quiet tsc -v | awk '{print $2}')"
IFS='.' read -r TS_MAJOR TS_MINOR _ <<<"$TS_VERSION"
USE_CHANGED=false
if [[ $TS_MAJOR -gt 5 || ( $TS_MAJOR -eq 5 && $TS_MINOR -ge 4 ) ]]; then
  USE_CHANGED=true
fi

################################################################################
# 3.  Check for forbidden "any" types                                          #
################################################################################
if grep -q ': any\|: any\[\]\|<any>\|as any' "$FILE_PATH"; then
  cat >&2 <<EOF
BLOCKED: The file contains forbidden "any" types.

MANDATORY INSTRUCTIONS:
1. Replace ALL occurrences of "any" with proper types
2. Use specific interfaces, union types, or generics instead
3. If type is truly unknown, use "unknown" with proper type guards
4. Never use "any" as a shortcut - this codebase requires strict typing

Examples of fixes:
- Instead of: data: any → Define: interface Data { ... }
- Instead of: items: any[] → Use: items: Item[] or items: Array<{id: string, name: string}>
- Instead of: value: any → Use: value: string | number | boolean
- Instead of: response: any → Use: response: unknown (then add type guards)

Run these commands to find and fix all "any" usage:
1. grep -r ": any" src/ to find all instances
2. Fix each one with proper typing
3. Run npm run typecheck to verify
EOF
  exit 2
fi

################################################################################
# 4.  Run TypeScript compiler                                                  #
################################################################################
echo "📘 Type-checking $FILE_PATH (tsc $TS_VERSION)" >&2
TS_LOG=$(mktemp)

if $USE_CHANGED; then
  npx tsc --noEmit --skipLibCheck --incremental \
          --tsBuildInfoFile "$TSBUILDINFO" -p "$TSCONFIG" \
          --changedFiles "$FILE_PATH" 2>"$TS_LOG" || true
else
  npx tsc --noEmit --skipLibCheck --incremental \
          --tsBuildInfoFile "$TSBUILDINFO" -p "$TSCONFIG" \
          2>"$TS_LOG" || true
  grep -F "$FILE_PATH" "$TS_LOG" >"${TS_LOG}.f" || true
  mv "${TS_LOG}.f" "$TS_LOG"
fi

if grep -qE '^.+error TS[0-9]+' "$TS_LOG"; then
  cat >&2 <<EOF
BLOCKED: TypeScript compilation failed.

MANDATORY INSTRUCTIONS:
You MUST fix ALL TypeScript errors in the entire project, not just this file.
Even if errors seem unrelated to your changes, you are responsible for fixing them.

REQUIRED ACTIONS:
1. Run: npm run typecheck
2. Review ALL errors shown (not just in this file)
3. Fix every single TypeScript error
4. Use AgentTool to spawn concurrent agents if there are many errors:
    - Analyze errors and group by file or component
    - Launch multiple agents to fix different groups in parallel
    - Each agent should verify their fixes compile correctly

Current errors in this file:
$(cat "$TS_LOG")

After fixing, run npm run typecheck again to ensure ALL errors are resolved.
EOF
  exit 2
fi

################################################################################
# 5.  ESLint (single file, safe cache path)                                    #
################################################################################
# Check if ESLint is installed/configured
if [[ -f "$ROOT_DIR/eslint.config.js" || -f "$ROOT_DIR/.eslintrc.js" || -f "$ROOT_DIR/.eslintrc.json" ]]; then
  echo "🔍 Running ESLint…" >&2
  ESLINT_LOG=$(mktemp)
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
    exit 2
  fi
else
  echo "⚠️  ESLint not configured, skipping lint check" >&2
fi

echo "✅ All checks passed!" >&2
