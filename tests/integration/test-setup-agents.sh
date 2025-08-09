#!/usr/bin/env bash
# Integration tests for agent installation in setup command

set -euo pipefail
source "$(dirname "$0")/../test-framework.sh"

test_suite_start "Setup Command Agent Integration"

# Setup test environment
TEST_DIR="/tmp/claudekit-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Test: Interactive setup includes agents
test_start "Interactive setup shows agent option"
# Create a mock input file for interactive prompts
# Selects: commands, hooks, agents, then typescript-expert
cat > test-input.txt << INPUT
commands
hooks
agents
typescript-expert
INPUT

# Run setup with input piped in
claudekit setup < test-input.txt 2>&1 | tee setup.log

if grep -q "Installing subagents" setup.log && \
   grep -q "typescript-expert" setup.log; then
  test_pass
else
  test_fail "Agents not included in setup"
fi

# Test: Agent file is copied correctly
test_start "TypeScript agent installed to .claude/agents/"
if [[ -f ".claude/agents/typescript-expert.md" ]]; then
  # Verify content matches source
  if grep -q "name: typescript-expert" ".claude/agents/typescript-expert.md"; then
    test_pass
  else
    test_fail "Agent file corrupted during copy"
  fi
else
  test_fail "Agent file not found after installation"
fi

# Test: --all flag installs agents
test_start "Setup --all installs agents"
rm -rf .claude
claudekit setup --all 2>&1 | tee setup-all.log

if [[ -f ".claude/agents/typescript-expert.md" ]]; then
  test_pass
else
  test_fail "--all flag did not install agents"
fi

# Test: Verify all features installed with --all
test_start "Setup --all installs commands, hooks, and agents"
if [[ -d ".claude/commands" ]] && \
   [[ -f ".claude/settings.json" ]] && \
   [[ -f ".claude/agents/typescript-expert.md" ]]; then
  test_pass
else
  test_fail "Not all features installed with --all"
fi

# Test: --skip-agents flag works
test_start "Setup --skip-agents excludes agents"
rm -rf .claude
claudekit setup --skip-agents --all 2>&1 | tee setup-skip.log

if [[ ! -d ".claude/agents" ]]; then
  test_pass
else
  test_fail "--skip-agents flag did not work"
fi

# Test: Completion message shows correct counts
test_start "Completion message includes agent count"
rm -rf .claude
claudekit setup --all 2>&1 | tee setup-complete.log

if grep -q "slash commands" setup-complete.log && \
   grep -q "automated hooks" setup-complete.log && \
   grep -q "subagent" setup-complete.log; then
  test_pass
else
  test_fail "Completion message missing agent count"
fi

# Test: Agent content integrity
test_start "Agent content preserved during installation"
claudekit setup --all > /dev/null 2>&1
ORIGINAL_MD5=$(md5sum "$(npm root -g)/claudekit/src/agents/typescript/expert.md" | cut -d' ' -f1)
INSTALLED_MD5=$(md5sum ".claude/agents/typescript-expert.md" | cut -d' ' -f1)

if [[ "$ORIGINAL_MD5" == "$INSTALLED_MD5" ]]; then
  test_pass
else
  test_fail "Agent content changed during installation"
fi

# Test: Multiple runs are idempotent
test_start "Multiple setup runs are idempotent"
# Run setup twice
claudekit setup --all > /dev/null 2>&1
FIRST_MD5=$(md5sum ".claude/agents/typescript-expert.md" | cut -d' ' -f1)
claudekit setup --all > /dev/null 2>&1
SECOND_MD5=$(md5sum ".claude/agents/typescript-expert.md" | cut -d' ' -f1)

if [[ "$FIRST_MD5" == "$SECOND_MD5" ]]; then
  test_pass
else
  test_fail "Agent file changed on repeated setup"
fi

# Test: Directory permissions
test_start "Agent directory has correct permissions"
if [[ -r ".claude/agents" ]] && [[ -x ".claude/agents" ]]; then
  test_pass
else
  test_fail "Agent directory permissions incorrect"
fi

# Cleanup
cd /
rm -rf "$TEST_DIR"

test_suite_end