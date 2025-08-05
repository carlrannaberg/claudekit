#!/bin/bash
# test-poc.sh - Manual test script for claudekit-hooks POC
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counter
TEST_NUM=0
PASS_COUNT=0
FAIL_COUNT=0

# Function to run a test
run_test() {
    local test_name="$1"
    local expected_exit="$2"
    shift 2
    
    TEST_NUM=$((TEST_NUM + 1))
    echo -e "\n${YELLOW}Test $TEST_NUM: $test_name${NC}"
    
    # Run the command and capture exit code
    set +e
    "$@"
    local actual_exit=$?
    set -e
    
    if [ "$actual_exit" -eq "$expected_exit" ]; then
        echo -e "${GREEN}✓ PASS${NC} (exit code: $actual_exit)"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (expected: $expected_exit, actual: $actual_exit)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

# Function to verify checkpoint was created
verify_checkpoint() {
    local prefix="$1"
    local count=$(git stash list | grep -c "^stash@{[0-9]\+}: ${prefix}")
    if [ "$count" -gt 0 ]; then
        echo "✓ Checkpoint created with prefix: $prefix"
        return 0
    else
        echo "✗ No checkpoint found with prefix: $prefix"
        return 1
    fi
}

# Function to count checkpoints
count_checkpoints() {
    local prefix="$1"
    git stash list | grep -c "^stash@{[0-9]\+}: ${prefix}" || echo "0"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up test environment...${NC}"
    cd ..
    rm -rf test-repo test-repo-no-git
    echo "Cleanup complete"
}

# Set trap for cleanup
trap cleanup EXIT

echo "================================"
echo "claudekit-hooks POC Test Script"
echo "================================"

# Check if claudekit-hooks is available
if ! command -v claudekit-hooks &> /dev/null; then
    echo -e "${RED}Error: claudekit-hooks not found in PATH${NC}"
    echo "Please ensure claudekit-hooks is built and in your PATH"
    exit 1
fi

# Setup: Create a git repo with changes
echo -e "\n${YELLOW}Setting up test repository...${NC}"
rm -rf test-repo
git init test-repo
cd test-repo
echo "test content" > file.txt
git add .
git commit -m "initial" > /dev/null 2>&1
echo "Git repository created with initial commit"

# Test 1: Auto-checkpoint with changes
echo "changed" >> file.txt
run_test "Auto-checkpoint with changes" 0 claudekit-hooks auto-checkpoint
verify_checkpoint "claude-checkpoint:"

# Test 2: No changes (after dropping stash)
git stash drop > /dev/null 2>&1
run_test "Auto-checkpoint with no changes" 0 claudekit-hooks auto-checkpoint
# Check output contains "No changes"
claudekit-hooks auto-checkpoint 2>&1 | grep -q "No changes" && echo "✓ Correctly reported no changes"

# Test 3: With custom config
mkdir -p .claudekit
cat > .claudekit/config.json << 'EOF'
{
  "hooks": {
    "auto-checkpoint": {
      "prefix": "test-checkpoint:",
      "maxCheckpoints": 5
    }
  }
}
EOF
echo "another change" >> file.txt
run_test "Auto-checkpoint with custom config" 0 claudekit-hooks auto-checkpoint
verify_checkpoint "test-checkpoint:"

# Test 4: Max checkpoints limit
echo -e "\n${YELLOW}Testing max checkpoints limit...${NC}"
# Create 5 more checkpoints to test the limit
for i in {1..5}; do
    echo "change $i" >> file.txt
    claudekit-hooks auto-checkpoint > /dev/null 2>&1
done

initial_count=$(count_checkpoints "test-checkpoint:")
echo "Checkpoint count: $initial_count"

# One more should maintain the limit
echo "final change" >> file.txt
claudekit-hooks auto-checkpoint > /dev/null 2>&1
final_count=$(count_checkpoints "test-checkpoint:")

if [ "$final_count" -le 5 ]; then
    echo -e "${GREEN}✓ PASS${NC} Max checkpoints respected (count: $final_count)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ FAIL${NC} Max checkpoints exceeded (count: $final_count)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 5: Non-git directory handling
cd ..
mkdir -p test-repo-no-git
cd test-repo-no-git
run_test "Non-git directory handling" 0 claudekit-hooks auto-checkpoint
# Should handle gracefully and not create checkpoint

# Test 6: Invalid config file handling
cd ../test-repo
echo "invalid json {" > .claudekit/config.json
echo "testing invalid config" >> file.txt
run_test "Invalid config file handling" 0 claudekit-hooks auto-checkpoint
# Should fall back to defaults and still work

# Test 7: Exit codes verification
echo -e "\n${YELLOW}Verifying exit codes...${NC}"
# Already tested in previous tests, but let's be explicit
cd ../test-repo-no-git
claudekit-hooks auto-checkpoint
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} Exit code 0 for non-git directory"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ FAIL${NC} Non-zero exit code for non-git directory"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test Summary
echo -e "\n================================"
echo "Test Summary"
echo "================================"
echo -e "Total Tests: $((TEST_NUM + 2))"  # +2 for max checkpoints and final exit code test
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo "================================"

# Exit with failure if any tests failed
if [ $FAIL_COUNT -gt 0 ]; then
    exit 1
else
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
fi