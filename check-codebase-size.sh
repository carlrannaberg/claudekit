#!/usr/bin/env bash
#
# Check codebase-map output size to ensure it stays under 9,000 character limit
# This helps ensure thinking-level hook has room to inject its keywords

set -euo pipefail

echo "======================================"
echo "Codebase-map Size Checker"
echo "======================================"
echo ""

# Test the exact configuration from .claudekit/config.json
echo "Testing configuration:"
echo "  Format: dsl"
echo "  Include: cli/hooks/**, cli/commands/**, cli/types/**"
echo "  Exclude: **/*.test.ts, **/*.test.js"
echo ""

# Calculate size using the actual command
SIZE=$(codebase-map format --format dsl \
  --include "cli/hooks/**" \
  --include "cli/commands/**" \
  --include "cli/types/**" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.test.js" \
  2>/dev/null | wc -c | tr -d ' ')

echo "📊 Output size: $SIZE characters"
echo ""

# Check against limit
if [ "$SIZE" -lt 9000 ]; then
  ROOM=$((9000 - SIZE))
  PERCENT=$((SIZE * 100 / 9000))
  echo "✅ Under 9,000 character limit"
  echo "   Using $PERCENT% of available space"
  echo "   Room for $ROOM more characters"
  echo ""
  echo "💡 This leaves space for thinking-level hook to add:"
  echo "   - 'think' (5 chars)"
  echo "   - 'think hard' (10 chars)"
  echo "   - 'think harder' (12 chars)"
  echo "   - 'ultrathink' (10 chars)"
else
  OVER=$((SIZE - 9000))
  echo "❌ OVER 9,000 character limit by $OVER characters!"
  echo ""
  echo "📉 Suggestions to reduce size:"
  echo ""
  echo "Option 1: Remove types folder (saves ~2,900 chars)"
  echo "  include: [\"cli/hooks/**\", \"cli/commands/**\"]"
  echo ""
  echo "Option 2: Use tree format instead of dsl (usually 30-50% smaller)"
  echo "  format: \"tree\""
  echo ""
  echo "Option 3: Add more exclusions"
  echo "  exclude: [..., \"cli/examples/**\", \"cli/constants/**\"]"
  echo ""
  echo "Option 4: Focus on just hooks"
  echo "  include: [\"cli/hooks/**\"]"
fi

echo ""
echo "======================================"
echo "To update configuration, edit:"
echo "  .claudekit/config.json"
echo ""
echo "To test in Claude Code:"
echo "  1. Start new session"
echo "  2. Type any message"
echo "  3. Check if both hooks work"
echo "======================================"