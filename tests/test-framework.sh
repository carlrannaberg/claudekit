#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Framework for Claudekit Hooks                                           #
# Inspired by autonomous-agents-template testing approach                       #
################################################################################

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
CURRENT_TEST=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

assert_json_field() {
    local json="$1"
    local field="$2"
    local expected="$3"
    local message="${4:-JSON field assertion failed}"
    
    ((TESTS_RUN++))
    
    if command -v jq &>/dev/null; then
        local actual=$(echo "$json" | jq -r ".$field" 2>/dev/null || echo "PARSE_ERROR")
        if [[ "$actual" == "$expected" ]]; then
            pass "$message"
        else
            fail "$message: field '$field' expected '$expected', got '$actual'"
        fi
    else
        # Fallback to grep-based check
        if echo "$json" | grep -q "\"$field\".*\"$expected\""; then
            pass "$message"
        else
            fail "$message: could not verify field '$field' equals '$expected' (jq not available)"
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

after_each() {
    local cleanup_function="$1"
    CLEANUP_FUNCTIONS+=("$cleanup_function")
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

create_mock_npm() {
    local test_result="$1"  # pass, fail, error
    
    create_mock_command "npm" "
if [[ \"\$1\" == 'test' ]]; then
    case '$test_result' in
        pass)
            echo '> test'
            echo '> jest'
            echo ''
            echo 'PASS src/math.test.js'
            echo '  ✓ adds 1 + 2 to equal 3 (5ms)'
            echo ''
            echo 'Test Suites: 1 passed, 1 total'
            echo 'Tests:       1 passed, 1 total'
            exit 0
            ;;
        fail)
            echo '> test'
            echo '> jest'
            echo ''
            echo 'FAIL src/math.test.js'
            echo '  ✕ adds 1 + 2 to equal 3 (5ms)'
            echo ''
            echo '    Expected: 3'
            echo '    Received: 4'
            echo ''
            echo 'Test Suites: 1 failed, 1 total'
            echo 'Tests:       1 failed, 1 total'
            exit 1
            ;;
        error)
            echo 'npm ERR! Missing script: \"test\"'
            exit 1
            ;;
    esac
fi
"
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

################################################################################
# Utility Functions                                                            #
################################################################################

create_test_file() {
    local filename="$1"
    local content="$2"
    
    mkdir -p "$(dirname "$filename")"
    echo "$content" > "$filename"
}

setup_debug_mode() {
    touch ~/.claude/hooks-debug
    after_each "cleanup_debug_mode"
}

cleanup_debug_mode() {
    rm -f ~/.claude/hooks-debug
}