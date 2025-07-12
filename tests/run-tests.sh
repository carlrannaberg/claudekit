#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Runner for Claudekit Hooks                                              #
# Executes all unit and integration tests                                      #
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-framework.sh"

# Configuration
HOOK_DIR="$SCRIPT_DIR/../.claude/hooks"
VERBOSE=false
RUN_INTEGRATION=true
SPECIFIC_TEST=""

# Ensure hook directory exists
if [[ ! -d "$HOOK_DIR" ]]; then
    echo "Error: Hook directory not found at $HOOK_DIR"
    exit 1
fi

################################################################################
# Parse Arguments                                                              #
################################################################################

usage() {
    cat << EOF
Usage: $0 [options]

Options:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output
    --no-integration    Skip integration tests
    --test NAME         Run only tests matching NAME
    
Examples:
    $0                      # Run all tests
    $0 --no-integration     # Run only unit tests
    $0 --test typecheck     # Run only typecheck tests
    $0 -v                   # Run with verbose output
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --no-integration)
            RUN_INTEGRATION=false
            shift
            ;;
        --test)
            if [[ -z "${2:-}" ]]; then
                echo "Error: --test requires an argument"
                usage
                exit 1
            fi
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

################################################################################
# Main Test Execution                                                          #
################################################################################

echo "🧪 Running claudekit hook tests..."
echo "================================"

# Create unit test directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/unit"

# Run unit tests
echo -e "\n${BLUE}📋 Unit Tests${NC}"
echo "---------------"

unit_test_files=()
if [[ -d "$SCRIPT_DIR/unit" ]]; then
    while IFS= read -r -d '' file; do
        unit_test_files+=("$file")
    done < <(find "$SCRIPT_DIR/unit" -name "test-*.sh" -type f -print0 | sort -z)
fi

if [[ ${#unit_test_files[@]} -eq 0 ]]; then
    echo "No unit tests found in $SCRIPT_DIR/unit/"
else
    for test_file in "${unit_test_files[@]}"; do
        # Skip if specific test requested and doesn't match
        if [[ -n "$SPECIFIC_TEST" ]] && [[ ! "$test_file" =~ $SPECIFIC_TEST ]]; then
            continue
        fi
        
        # Make test file executable
        chmod +x "$test_file"
        
        # Source and run the test file
        source "$test_file"
        run_all_tests_in_file "$test_file"
    done
fi

# Run integration tests if enabled
if [[ "$RUN_INTEGRATION" == "true" ]]; then
    echo -e "\n${BLUE}🔄 Integration Tests${NC}"
    echo "--------------------"
    
    integration_test_files=()
    if [[ -d "$SCRIPT_DIR/integration" ]]; then
        while IFS= read -r -d '' file; do
            integration_test_files+=("$file")
        done < <(find "$SCRIPT_DIR/integration" -name "test-*.sh" -type f -print0 | sort -z)
    fi
    
    if [[ ${#integration_test_files[@]} -eq 0 ]]; then
        echo "No integration tests found in $SCRIPT_DIR/integration/"
    else
        for test_file in "${integration_test_files[@]}"; do
            # Skip if specific test requested and doesn't match
            if [[ -n "$SPECIFIC_TEST" ]] && [[ ! "$test_file" =~ $SPECIFIC_TEST ]]; then
                continue
            fi
            
            # Make test file executable
            chmod +x "$test_file"
            
            # Source and run the test file
            source "$test_file"
            run_all_tests_in_file "$test_file"
        done
    fi
fi

################################################################################
# Test Summary                                                                 #
################################################################################

# Since tests run in subshells, we need to count from output
# Create a temporary file to capture all output
TEMP_OUTPUT=$(mktemp)
trap "rm -f $TEMP_OUTPUT" EXIT

# Re-run the script capturing output
if [[ "${COUNTING_RUN:-}" != "true" ]]; then
    COUNTING_RUN=true "$0" "$@" 2>&1 | tee "$TEMP_OUTPUT"
    
    # Now process the output for summary
    chmod +x "$SCRIPT_DIR/test-reporter.sh"
    "$SCRIPT_DIR/test-reporter.sh" "$TEMP_OUTPUT"
    exit $?
fi