#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Reporter - Counts test results from stdin                              #
################################################################################

# Read stdin and count test results
total=0
passed=0

while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*✓ ]]; then
        ((passed++))
        ((total++))
    elif [[ "$line" =~ ^[[:space:]]*✗ ]]; then
        ((total++))
    fi
done

# Output results
echo ""
echo "================================"
echo "Test Summary:"
echo "  Total:  $total"
echo "  Passed: $passed"
echo "  Failed: $((total - passed))"
echo "================================"