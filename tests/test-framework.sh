#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Framework for Claudekit Hooks                                           #
# Simple test framework for shell scripts                                      #
################################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
CURRENT_TEST=""

# Test directories
TEST_DIR=""
ORIGINAL_PATH=""
CLEANUP_FUNCTIONS=()

################################################################################
# Core Functions                                                               #
################################################################################

pass() {
    local message="$1"
    ((TESTS_PASSED++))
    echo -e "  ${GREEN}✓${NC} $message"
}

fail() {
    local message="$1"
    ((TESTS_FAILED++))
    echo -e "  ${RED}✗${NC} $message"
    echo -e "    ${RED}in test: $CURRENT_TEST${NC}"
}

assert_pass() {
    local message="${1:-Test passed}"
    pass "$message"
}

assert_fail() {
    local message="${1:-Test failed}"
    fail "$message"
}

################################################################################
# Assertion Functions                                                          #
################################################################################

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ "$expected" == "$actual" ]]; then
        pass "$message"
    else
        fail "$message: expected '$expected', got '$actual'"
    fi
}

assert_not_equals() {
    local unexpected="$1"
    local actual="$2"
    local message="${3:-Assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ "$unexpected" != "$actual" ]]; then
        pass "$message"
    else
        fail "$message: expected not to be '$unexpected'"
    fi
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Exit code assertion failed}"
    
    assert_equals "$expected" "$actual" "$message"
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-String contains assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ "$haystack" == *"$needle"* ]]; then
        pass "$message"
    else
        fail "$message: '$needle' not found in output"
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-String not contains assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ "$haystack" != *"$needle"* ]]; then
        pass "$message"
    else
        fail "$message: '$needle' unexpectedly found in output"
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-File exists assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ -f "$file" ]]; then
        pass "$message"
    else
        fail "$message: file '$file' does not exist"
    fi
}

assert_file_not_exists() {
    local file="$1"
    local message="${2:-File not exists assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ ! -f "$file" ]]; then
        pass "$message"
    else
        fail "$message: file '$file' exists but shouldn't"
    fi
}

assert_file_contains() {
    local file="$1"
    local pattern="$2"
    local message="${3:-File content assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ -f "$file" ]] && grep -q "$pattern" "$file" 2>/dev/null; then
        pass "$message"
    else
        if [[ ! -f "$file" ]]; then
            fail "$message: file '$file' does not exist"
        else
            fail "$message: pattern '$pattern' not found in $file"
        fi
    fi
}

################################################################################
# Test Lifecycle Management                                                    #
################################################################################

init_test() {
    local test_name="$1"
    CURRENT_TEST="$test_name"
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR"
    ORIGINAL_PATH="$PATH"
    CLEANUP_FUNCTIONS=()
}

cleanup_test() {
    # Run any registered cleanup functions
    if [[ ${#CLEANUP_FUNCTIONS[@]} -gt 0 ]]; then
        for cleanup_func in "${CLEANUP_FUNCTIONS[@]}"; do
            $cleanup_func || true
        done
    fi
    
    # Return to original directory and clean up
    cd - > /dev/null 2>&1 || true
    rm -rf "$TEST_DIR"
    PATH="$ORIGINAL_PATH"
    CURRENT_TEST=""
}

################################################################################
# Test Discovery and Execution                                                 #
################################################################################

discover_tests() {
    local file="$1"
    # Find all functions that start with "test_"
    grep -E "^test_[a-zA-Z0-9_]+\(\)" "$file" | sed 's/().*//'
}

run_all_tests_in_file() {
    local test_file="$1"
    local test_functions=$(discover_tests "$test_file")
    
    echo -e "\n${BLUE}Test Suite: $(basename "$test_file")${NC}"
    
    for test_func in $test_functions; do
        run_test "$test_func" "$test_func" || true
    done
}

run_test() {
    local test_name="$1"
    local test_function="$2"
    
    init_test "$test_name"
    
    # Run the test in a subshell to isolate failures
    if (set -e; $test_function); then
        cleanup_test
        return 0
    else
        cleanup_test
        return 1
    fi
}

################################################################################
# Test Suite Execution                                                         #
################################################################################

run_test_suite() {
    local suite_name="$1"
    local exit_code=0
    
    echo -e "\n${BLUE}📋 Unit Tests${NC}"
    echo "================"
    echo ""
    echo -e "${BLUE}Test Suite: $suite_name${NC}"
    echo ""
    
    # Reset counters for this suite
    TESTS_RUN=0
    TESTS_PASSED=0
    TESTS_FAILED=0
    
    # Run setUp if it exists
    if declare -f setUp &>/dev/null; then
        setUp || {
            echo -e "${RED}✗ setUp failed${NC}"
            exit 1
        }
    fi
    
    # Discover and run all test functions
    local test_functions=$(declare -F | grep "declare -f test_" | cut -d' ' -f3)
    
    for test_func in $test_functions; do
        init_test "$test_func"
        
        # Run the test function
        if $test_func 2>&1; then
            true # Test function handles its own pass/fail
        else
            exit_code=1
        fi
        
        cleanup_test
    done
    
    # Run tearDown if it exists
    if declare -f tearDown &>/dev/null; then
        tearDown || {
            echo -e "${RED}✗ tearDown failed${NC}"
            exit 1
        }
    fi
    
    # Print summary
    echo ""
    echo "==============================================="
    echo -e "Tests run: ${YELLOW}$TESTS_RUN${NC}"
    echo -e "Passed:    ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed:    ${RED}$TESTS_FAILED${NC}"
    echo "==============================================="
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
    else
        echo -e "${RED}Some tests failed.${NC}"
        exit_code=1
    fi
    
    exit $exit_code
}

################################################################################
# Mock Creation Utilities                                                      #
################################################################################

create_mock_command() {
    local command="$1"
    local content="$2"
    
    cat > "$command" << EOF
#!/usr/bin/env bash
$content
EOF
    chmod +x "$command"
    export PATH="$PWD:$PATH"
}

create_mock_git() {
    local scenario="$1"  # success, uncommitted, no-repo, etc.
    
    create_mock_command "git" "
case \"\$1\" in
    status)
        case '$scenario' in
            uncommitted)
                echo 'On branch main'
                echo 'Changes not staged for commit:'
                echo '  modified: src/index.ts'
                exit 0
                ;;
            clean)
                echo 'On branch main'
                echo 'nothing to commit, working tree clean'
                exit 0
                ;;
            no-repo)
                echo 'fatal: not a git repository'
                exit 128
                ;;
        esac
        ;;
    stash)
        case \"\$2\" in
            create)
                case '$scenario' in
                    uncommitted)
                        echo 'a1b2c3d4e5f6'
                        exit 0
                        ;;
                    clean)
                        echo ''
                        exit 0
                        ;;
                esac
                ;;
            store)
                echo 'Saved working directory and index state'
                echo '{\"suppressOutput\": true}'
                exit 0
                ;;
        esac
        ;;
    add|commit|push|pull|clone|init)
        # Common git commands - just succeed
        exit 0
        ;;
    *)
        echo \"git: '\$1' is not a git command. See 'git --help'.\" >&2
        exit 1
        ;;
esac
"
}

################################################################################
# Utility Functions                                                            #
################################################################################

create_test_file() {
    local filename="$1"
    local content="$2"
    
    mkdir -p "$(dirname "$filename")"
    echo -e "$content" > "$filename"
    chmod +r "$filename"
}

create_command_file() {
    local filename="$1"
    local description="$2"
    local allowed_tools="${3:-Read,Write}"
    
    mkdir -p "$(dirname "$filename")"
    cat > "$filename" << EOF
---
description: $description
allowed-tools: $allowed_tools
---

## Instructions for Claude:

1. Read the user's request
2. Perform the requested action

This is a test command.
EOF
    chmod +r "$filename"
}