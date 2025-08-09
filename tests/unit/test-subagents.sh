#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/../test-framework.sh"

# Get absolute path to project root from script location
PROJECT_ROOT="$(cd "$(dirname "$0")/../../" && pwd)"
AGENT_FILE="$PROJECT_ROOT/src/agents/typescript/expert.md"

################################################################################
# Test Functions                                                               #
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
# Run Tests                                                                    #
################################################################################

run_test_suite "Subagent Format Validation"