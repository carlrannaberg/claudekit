#!/usr/bin/env bash
set -euo pipefail

# Get script directory and source test framework
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

# Get absolute path to project root from script location
PROJECT_ROOT="$(cd "$(dirname "$0")/../../" && pwd)"
AGENT_FILE="$PROJECT_ROOT/src/agents/typescript/typescript-expert.md"

################################################################################
# Comprehensive Agent Validation Functions (Task 127)                         #
################################################################################

# Validate agent structure
validate_agent_structure() {
  local agent_file="$1"
  local errors=0
  
  # Check YAML frontmatter
  if ! grep -q "^---$" "$agent_file"; then
    echo "ERROR: Missing YAML frontmatter in $agent_file"
    ((errors++))
  fi
  
  # Check required fields
  if ! grep -q "^name:" "$agent_file"; then
    echo "ERROR: Missing 'name' field in $agent_file"
    ((errors++))
  fi
  
  if ! grep -q "^description:.*PROACTIVELY" "$agent_file"; then
    echo "ERROR: Description should include 'Use PROACTIVELY' trigger in $agent_file"
    ((errors++))
  fi
  
  if ! grep -q "^tools:" "$agent_file"; then
    echo "ERROR: Missing 'tools' field in $agent_file"
    ((errors++))
  fi
  
  # Check comprehensive prompt (50+ lines)
  local line_count=$(wc -l < "$agent_file")
  if [ "$line_count" -lt 50 ]; then
    echo "ERROR: Agent prompt too short ($line_count lines) in $agent_file"
    ((errors++))
  fi
  
  # Check for problem playbooks
  if ! grep -q "## Problem Playbooks\|## When Invoked" "$agent_file"; then
    echo "ERROR: Missing problem playbooks section in $agent_file"
    ((errors++))
  fi
  
  # Check for documentation links
  if ! grep -q "https://" "$agent_file"; then
    echo "WARNING: No documentation links found in $agent_file"
  fi
  
  return $errors
}

# Validate agent safety
validate_agent_safety() {
  local agent_file="$1"
  local errors=0
  
  # Check for watch/serve commands
  if grep -q "npm run watch\|npm run serve\|npm start" "$agent_file"; then
    echo "ERROR: Agent contains watch/serve commands in $agent_file"
    ((errors++))
  fi
  
  # Check for one-shot diagnostics
  if ! grep -q "npm run build\|npm test\|npm run lint" "$agent_file"; then
    echo "WARNING: Agent should prefer one-shot diagnostic commands in $agent_file"
  fi
  
  # Check for optional tool guards
  if grep -q "command -v.*&>" "$agent_file"; then
    echo "INFO: Agent properly guards optional tools in $agent_file"
  fi
  
  return $errors
}

# Validate hierarchical recommendations
validate_hierarchical_recommendations() {
  local agent_file="$1"
  local agent_name=$(basename "$agent_file" .md)
  
  # Broad experts should recommend sub-domain experts
  if [[ "$agent_name" =~ -expert$ ]] && [[ ! "$agent_name" =~ -(type|build|performance|jest|vitest|playwright|postgres|mongodb|docker|github-actions|webpack|vite|nextjs)-expert$ ]]; then
    if ! grep -q "Step 0:.*Recommend.*Stop" "$agent_file"; then
      echo "WARNING: Broad expert missing Step 0 recommendations in $agent_file"
    fi
  fi
}

# Main test runner for all agents
run_agent_tests() {
  local total_errors=0
  
  echo "🔍 Running comprehensive agent validation tests..."
  
  # Find all agent files
  for agent_file in "$PROJECT_ROOT"/src/agents/**/*.md; do
    # Skip README files
    if [[ "$(basename "$agent_file")" == "README.md" ]]; then
      continue
    fi
    
    echo "Testing: $agent_file"
    
    validate_agent_structure "$agent_file"
    total_errors=$((total_errors + $?))
    
    validate_agent_safety "$agent_file"
    total_errors=$((total_errors + $?))
    
    validate_hierarchical_recommendations "$agent_file"
  done
  
  if [ $total_errors -eq 0 ]; then
    echo "✅ All agent tests passed!"
  else
    echo "❌ Found $total_errors errors in agent validation"
    exit 1
  fi
}

################################################################################
# Original Test Functions (TypeScript Expert Specific)                        #
################################################################################

test_file_exists() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]]; then
        assert_pass "TypeScript agent file exists"
    else
        assert_fail "TypeScript expert agent not found"
    fi
}

test_valid_frontmatter() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]]; then
        # Extract frontmatter (between first two --- lines)
        FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$AGENT_FILE")
        
        # Check required fields
        if echo "$FRONTMATTER" | grep -q "^name:" && \
           echo "$FRONTMATTER" | grep -q "^description:" && \
           echo "$FRONTMATTER" | grep -q "^tools:"; then
            assert_pass "TypeScript agent has valid frontmatter"
        else
            assert_fail "Missing required frontmatter fields"
        fi
    else
        assert_fail "Agent file not found"
    fi
}

test_agent_name_format() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]] && grep -q "^name: typescript-expert$" "$AGENT_FILE"; then
        assert_pass "Agent name follows convention"
    else
        assert_fail "Agent name should be 'typescript-expert'"
    fi
}

test_meaningful_description() {
    ((TESTS_RUN++))
    DESC_LINE=$(grep "^description:" "$AGENT_FILE" 2>/dev/null || echo "")
    DESC_LENGTH=${#DESC_LINE}
    if [[ $DESC_LENGTH -gt 30 ]]; then
        assert_pass "Agent has meaningful description"
    else
        assert_fail "Description too short or missing (${DESC_LENGTH} chars)"
    fi
}

test_required_tools() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]] && \
       grep -q "^tools:.*Read" "$AGENT_FILE" && \
       grep -q "^tools:.*Edit" "$AGENT_FILE"; then
        assert_pass "Agent specifies required tools"
    else
        assert_fail "Agent should specify at least Read and Edit tools"
    fi
}

test_comprehensive_prompt() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]]; then
        # Count lines after frontmatter using awk
        PROMPT_LINES=$(awk '/^---$/{if(++c==2) next} c>=2' "$AGENT_FILE" | wc -l)
        if [[ $PROMPT_LINES -gt 50 ]]; then
            assert_pass "System prompt is comprehensive"
        else
            assert_fail "System prompt too short (${PROMPT_LINES} lines, need >50)"
        fi
    else
        assert_fail "Agent file not found"
    fi
}

test_expertise_sections() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]] && \
       grep -q "## Core Expertise" "$AGENT_FILE" && \
       grep -q "## Approach" "$AGENT_FILE"; then
        assert_pass "Agent defines expertise areas"
    else
        assert_fail "Missing expertise or approach sections"
    fi
}

test_practical_examples() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]] && \
       (grep -q "tsc --" "$AGENT_FILE" || grep -q "\`\`\`" "$AGENT_FILE"); then
        assert_pass "Agent includes practical commands"
    else
        assert_fail "Agent should include practical examples or commands"
    fi
}

test_file_permissions() {
    ((TESTS_RUN++))
    if [[ -f "$AGENT_FILE" ]] && [[ -r "$AGENT_FILE" ]]; then
        assert_pass "Agent file has correct permissions"
    else
        assert_fail "Agent file not readable"
    fi
}

################################################################################
# Comprehensive Agent Validation Test (Task 127)                              #
################################################################################

test_comprehensive_agent_validation() {
    ((TESTS_RUN++))
    
    # Count agent files to validate there are agents to test
    local agent_count=0
    for agent_file in "$PROJECT_ROOT"/src/agents/**/*.md; do
        # Skip README files
        if [[ "$(basename "$agent_file")" == "README.md" ]]; then
            continue
        fi
        if [[ -f "$agent_file" ]]; then
            ((agent_count++))
        fi
    done
    
    if [[ $agent_count -eq 0 ]]; then
        assert_fail "No agent files found for comprehensive validation"
        return
    fi
    
    # Run comprehensive validation in a subshell to capture output
    local output
    local exit_code=0
    
    output=$(run_agent_tests 2>&1) || exit_code=$?
    
    if [[ ${exit_code:-0} -eq 0 ]]; then
        assert_pass "Comprehensive agent validation passed ($agent_count agents tested)"
    else
        assert_fail "Comprehensive agent validation failed: Found validation issues in agents"
    fi
}

################################################################################
# Run Tests                                                                    #
################################################################################

# Run tests if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Check if --comprehensive flag is provided
    if [[ "${1:-}" == "--comprehensive" ]]; then
        # Run only comprehensive validation
        run_agent_tests
    else
        # Run the standard test suite
        run_test_suite "Subagent Format Validation"
    fi
fi