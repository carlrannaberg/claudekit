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
SILENT=false
RUN_INTEGRATION=true
SPECIFIC_TEST=""

# Note: Hook directory check removed to support e2e tests that don't require hooks

################################################################################
# Parse Arguments                                                              #
################################################################################

usage() {
    cat << EOF
Usage: $0 [options]

Options:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output
    -s, --silent        Silent mode - only show failures and summary
    --no-integration    Skip integration tests
    --test NAME         Run only tests matching NAME
    
Examples:
    $0                      # Run all tests
    $0 --no-integration     # Run only unit tests
    $0 --test typecheck     # Run only typecheck tests
    $0 -v                   # Run with verbose output
    $0 -s                   # Run in silent mode
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
        -s|--silent)
            SILENT=true
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

# Export SILENT flag so test framework can access it
export SILENT

################################################################################
# Main Test Execution                                                          #
################################################################################

if [[ "${SILENT:-false}" != "true" ]]; then
    echo "🧪 Running claudekit hook tests..."
    echo "================================"
fi

# Create unit test directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/unit"

# Run unit tests
if [[ "${SILENT:-false}" != "true" ]]; then
    echo -e "\n${BLUE}📋 Unit Tests${NC}"
    echo "---------------"
fi

unit_test_files=()
if [[ -d "$SCRIPT_DIR/unit" ]]; then
    while IFS= read -r -d '' file; do
        # Skip the failure detection test unless explicitly requested
        if [[ ! "$file" =~ test-framework-failure-detection.sh ]]; then
            unit_test_files+=("$file")
        fi
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
    if [[ "${SILENT:-false}" != "true" ]]; then
        echo -e "\n${BLUE}🔄 Integration Tests${NC}"
        echo "--------------------"
    fi
    
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

# Run e2e tests if enabled
if [[ "$RUN_INTEGRATION" == "true" ]]; then
    if [[ "${SILENT:-false}" != "true" ]]; then
        echo -e "\n${BLUE}🌐 End-to-End Tests${NC}"
        echo "--------------------"
    fi
    
    e2e_test_files=()
    if [[ -d "$SCRIPT_DIR/e2e" ]]; then
        while IFS= read -r -d '' file; do
            e2e_test_files+=("$file")
        done < <(find "$SCRIPT_DIR/e2e" -name "*.test.sh" -type f -print0 | sort -z)
    fi
    
    if [[ ${#e2e_test_files[@]} -eq 0 ]]; then
        echo "No e2e tests found in $SCRIPT_DIR/e2e/"
    else
        for test_file in "${e2e_test_files[@]}"; do
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
    if [[ -f "$SCRIPT_DIR/test-reporter.sh" ]]; then
        chmod +x "$SCRIPT_DIR/test-reporter.sh"
        cat "$TEMP_OUTPUT" | "$SCRIPT_DIR/test-reporter.sh"
    else
        # Simple fallback summary
        if [[ "${SILENT:-false}" != "true" ]]; then
            echo ""
            echo "================================"
            echo "Test Summary:"
            PASSES=$(grep -c "✓" "$TEMP_OUTPUT" || echo 0)
            FAILS=$(grep -c "✗" "$TEMP_OUTPUT" || echo 0)
            echo "  Passed: $PASSES"
            echo "  Failed: $FAILS"
            echo "  Total:  $((PASSES + FAILS))"
            echo "================================"
        fi
    fi
    exit $?
fi