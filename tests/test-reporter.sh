#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Reporter - Counts test results from output                              #
################################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Count occurrences in output
count_pattern() {
    local pattern="$1"
    local file="${2:-}"
    
    if [[ -n "$file" ]]; then
        grep -c "$pattern" "$file" 2>/dev/null || echo 0
    else
        grep -c "$pattern" 2>/dev/null || echo 0
    fi
}

# Process test output from stdin or file
process_output() {
    local input_file="${1:-}"
    local output=""
    
    if [[ -n "$input_file" ]]; then
        output=$(cat "$input_file")
    else
        output=$(cat)
    fi
    
    # Count test results
    local passed=$(echo "$output" | count_pattern "✓")
    local failed=$(echo "$output" | count_pattern "✗")
    local total=$((passed + failed))
    
    # Check if we're in silent mode
    if [[ "${SILENT:-false}" == "true" ]]; then
        # In silent mode, only output if there are failures or errors
        if [[ $total -eq 0 ]]; then
            echo -e "${YELLOW}⚠️  No tests were run${NC}"
            return 1
        elif [[ $failed -gt 0 ]]; then
            echo -e "${RED}❌ Tests failed: $failed${NC}"
            return 1
        fi
        # If all tests passed, return silently
        return 0
    fi
    
    # Normal (non-silent) output summary
    echo -e "\n================================"
    echo "📊 Test Summary"
    echo "================================"
    echo -e "  Total Tests:  $total"
    echo -e "  ${GREEN}Passed:      $passed${NC}"
    echo -e "  ${RED}Failed:      $failed${NC}"
    
    if [[ $total -eq 0 ]]; then
        echo -e "\n${YELLOW}⚠️  No tests were run${NC}"
        return 1
    elif [[ $failed -eq 0 ]]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
        return 0
    else
        echo -e "\n${RED}❌ Some tests failed${NC}"
        echo -e "${RED}   Please fix the failing tests before committing${NC}"
        return 1
    fi
}

# Main
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    process_output "$@"
fi