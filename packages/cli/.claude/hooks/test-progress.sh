#!/usr/bin/env bash
set -euo pipefail

################################################################################
# test-progress Hook                                                                 #
# Description: Add your hook description here                                 #
################################################################################

# Read JSON payload from stdin
PAYLOAD=$(cat)

# Extract relevant fields using jq or fallback methods
if command -v jq &> /dev/null; then
    # Use jq for JSON parsing
    TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // empty')
else
    # Fallback to sed/grep
    TOOL_NAME=$(echo "$PAYLOAD" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
fi

# Your hook logic here
echo "Hook test-progress executed for tool: $TOOL_NAME" >&2

# Exit with appropriate code
# 0 = allow operation
# 2 = block with error message
exit 0
