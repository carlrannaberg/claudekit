---
description: Implement a validated specification by orchestrating concurrent agents
category: validation
allowed-tools: Task, Read, TodoWrite, Grep, Glob, Bash(command:*), Bash(stm:*), Bash(jq:*), Bash(which:*), Bash(test:*), Bash(echo:*)
argument-hint: "<path-to-spec-file>"
---

# Implement Specification

Implement the specification at: $ARGUMENTS

!which stm &> /dev/null && test -d .simple-task-master && echo "STM_STATUS: Available and initialized" || (which stm &> /dev/null && echo "STM_STATUS: Available but not initialized" || echo "STM_STATUS: Not installed")

## MANDATORY PRE-EXECUTION VALIDATION

Before launching ANY subagents:

### 0. Task Management System
- Check the STM_STATUS output above
- If status is "Available but not initialized", STOP and inform user to run `/spec:decompose` first
- If status is "Available and initialized", use STM for task retrieval
- If status is "Not installed", fall back to TodoWrite

### 1. Specification Readiness
- Verify spec file exists and is complete
- Check all dependencies and prerequisites are available
- STOP if spec quality is insufficient

### 2. Environment Preparation
- Verify all required tools are available
- Check for conflicting processes or locks
- Validate project state is clean (no uncommitted changes that could interfere)

### 3. Execution Plan Validation
- Break down spec into non-overlapping subagent tasks
- Identify critical path and dependencies between tasks
- Validate task assignments won't conflict

**CRITICAL: If any validation fails, STOP immediately and request clarification.**

## Implementation Process

### 1. Analyze Specification

Read the specification to extract:
- Implementation phases
- Technical components to build
- Dependencies between components
- Testing requirements
- Success criteria

### 2. Create or Load Task List

If STM is available:
```bash
# Export pending tasks to JSON for processing
stm list --status pending -f json > pending-tasks.json

# Get task count
TASK_COUNT=$(stm list --status pending -f json | jq 'length')

# For each task, extract details:
stm show <task-id> # Shows full task details including 'details' and 'validation' sections
```

Otherwise, use TodoWrite to create a comprehensive task list that includes:
- Foundation tasks (no dependencies)
- Core implementation tasks
- Integration tasks
- Testing and validation tasks
- Documentation updates

Organize tasks by:
- **Priority**: Critical path vs. parallel work
- **Dependencies**: What must complete before this task
- **Assignability**: Can multiple agents work on it

### 3. Iterative Implementation Workflow

**OPERATING PROCEDURE**: Each task follows a quality-assured implementation cycle:

#### Phase 1: Initial Implementation
For each task (process sequentially for dependent tasks, in parallel for independent ones):

**Available Specialized Agents:**
!claudekit list agents || echo "Using general-purpose agent (no specialized agents found)"

1. **Prepare Task Brief**:
   - Clear scope and boundaries
   - Expected deliverables
   - Files to modify/create
   - Quality requirements

2. **MANDATORY: Launch Implementation Subagent**:
   YOU MUST launch a specialized subagent using the Task tool.
   - Select from the specialists listed above that match the task domain
   - Use `general-purpose` only if no specialist matches
   
   If using STM, launch with EXACTLY this format:
   ```
   Task tool invocation:
   - description: "Implement [component]"  
   - subagent_type: [SELECT FROM AVAILABLE AGENTS ABOVE]
   - prompt: |
     CRITICAL: You MUST first run this exact command to get the full task details:
     stm show [INSERT-ACTUAL-STM-TASK-ID-HERE]
     
     Then implement the component based on the ACTUAL task details retrieved from STM.
     Do NOT paraphrase or summarize - use the exact details from STM.
     
     Additional Requirements:
     - Follow project code style guidelines
     - Implement complete functionality
     - Add appropriate error handling
     - Document complex logic
     
     IMPORTANT: Report back when complete. Do NOT mark the STM task as done.
   ```
   
   If using TodoWrite:
   ```
   Task: "Implement component"  
   Subagent: [REQUIRED: select appropriate specialist from available agents above]
   Prompt: |
     Implement the component with these requirements:
     - Follow specification reference
     - Meet technical requirements
     - Follow code style guidelines
     - Add error handling
     
     REPORT BACK when implementation is complete.
   ```

#### Phase 2: Test Writing
After implementation subagent reports back:

**Available Testing Experts:**
!claudekit list agents | grep -i "testing-expert" || echo "Use general-purpose agent for test writing"

1. **MANDATORY: Launch Testing Expert**:
   YOU MUST launch a testing expert using the Task tool IMMEDIATELY after implementation is complete.
   
   Launch with EXACTLY this format:
   ```
   Task tool invocation:
   - description: "Write tests"
   - subagent_type: [SELECT testing-expert, jest-testing-expert, or vitest-testing-expert FROM LIST ABOVE]
   - prompt: |
     CRITICAL: You MUST first run this exact command to get the full task details:
     stm show [INSERT-ACTUAL-STM-TASK-ID-HERE]
     
     Then write comprehensive tests for the implemented component based on the ACTUAL task details from STM.
     Do NOT paraphrase - use the exact implementation details from STM.
     
     Requirements:
     - Test all functions/methods with unit tests
     - Cover edge cases and error conditions  
     - Test integration points
     - Achieve >80% coverage
     
     Follow project testing conventions.
     IMPORTANT: Report back when complete. Do NOT mark the STM task as done.
   ```

2. **Run Tests**:
   - Execute test suite for the component
   - Verify all tests pass
   - Check coverage metrics

#### Phase 3: Code Review
After tests are written and passing:

**Available Code Review Agents:**
!claudekit list agents | grep -i "code-review" || echo "Use general-purpose agent for code review"

1. **MANDATORY: Launch Code Review Agent**:
   YOU MUST launch code-review-expert using the Task tool IMMEDIATELY after tests pass.
   
   Launch with EXACTLY this format:
   ```
   Task tool invocation:
   - description: "Review code"
   - subagent_type: code-review-expert [or general-purpose if not available]
   - prompt: |
     CRITICAL: You MUST first run this exact command to get the full task details:
     stm show [INSERT-ACTUAL-STM-TASK-ID-HERE]
     
     Then perform comprehensive code review based on the ACTUAL task requirements from STM.
     
     Review the implementation AND tests for:
     * Architecture & design patterns
     * Code quality and maintainability
     * Security vulnerabilities
     * Performance considerations
     * Error handling completeness
     * Test coverage adequacy
     
     Provide specific, actionable feedback for any issues found.
     Categorize as: CRITICAL (must fix), IMPORTANT (should fix), MINOR (nice to have).
     IMPORTANT: Report back with findings. Do NOT mark the STM task as done.
   ```

2. **Analyze Review Results**:
   - Critical issues (must fix)
   - Important improvements (should fix)
   - Minor suggestions (nice to have)

#### Phase 4: Iterative Improvement
If issues are found:

**Available Specialist Agents for Fixes:**
!claudekit list agents | grep -E "typescript|react|security|performance" || echo "Use general-purpose agent for fixes"

1. **MANDATORY: Fix Critical Issues**:
   If code review found CRITICAL issues, YOU MUST launch appropriate specialist to fix them.
   
   Launch with EXACTLY this format:
   ```
   Task tool invocation:
   - description: "Fix critical issues"
   - subagent_type: [SELECT specialist matching the issue type from available agents]
   - prompt: |
     CRITICAL: You MUST first run this exact command to get the full task details:
     stm show [INSERT-ACTUAL-STM-TASK-ID-HERE]
     
     Then fix these SPECIFIC critical issues from code review:
     [COPY EXACT CRITICAL ISSUES FROM REVIEW - DO NOT PARAPHRASE]
     
     Requirements:
     - Fix ONLY the critical issues listed
     - Ensure fixes align with original STM task requirements
     - Maintain existing functionality
     - Update tests if needed
     
     IMPORTANT: Report back when fixes complete. Do NOT mark the STM task as done.
   ```

2. **Re-Test After Fixes**:
   - Run test suite again to verify fixes
   - Ensure no regressions introduced

3. **MANDATORY: Re-Review After Fixes**:
   YOU MUST launch code-review-expert again to verify fixes.
   
   Launch with EXACTLY this format:
   ```
   Task tool invocation:
   - description: "Re-review fixes"
   - subagent_type: code-review-expert [or general-purpose if not available]
   - prompt: |
     CRITICAL: You MUST first run this exact command to get the full task details:
     stm show [INSERT-ACTUAL-STM-TASK-ID-HERE]
     
     Then verify that these critical issues have been resolved:
     [COPY EXACT CRITICAL ISSUES THAT WERE FIXED]
     
     Check:
     - Are all critical issues properly fixed?
     - Do fixes introduce any new problems?
     - Are tests still passing?
     
     Report: RESOLVED or STILL HAS ISSUES (with details).
     IMPORTANT: Report back with assessment. Do NOT mark the STM task as done.
   ```
   
   - Continue fix/review cycle until all critical issues are RESOLVED

4. **Update Task Status (Orchestrator Only)**:
   - Only after all subagents report back successfully:
   - If using STM: `stm update [task-id] --status done`
   - If using TodoWrite: Mark task as completed

#### Phase 5: Commit Changes
Once all critical issues are resolved and tests pass:

1. **Create Atomic Commit**:
   ```bash
   git add [relevant files]
   git commit -m "feat: [component name] - [brief description]
   
   - Implemented [key functionality]
   - Tests written and passing
   - Passed code review
   - Addresses spec requirements: [reference]
   
   🤖 Generated with Claude Code
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

2. **Verify Commit**:
   ```bash
   git log -1 --stat
   ```

#### Phase 6: Progress Tracking

**Monitor Overall Progress**:
- If using STM: `stm list --status in-progress --pretty`
- If using TodoWrite: Track task completion in session
- Identify blocked tasks
- Coordinate dependencies

**Track Quality Metrics**:
- Tasks implemented: X/Y
- Tests written: X/Y
- Test coverage: X%
- Code reviews passed: X/Y
- Issues fixed: Count
- Commits created: Count

### 4. Integration & Validation

After each component cycle completes:
- Run full test suite to check for regressions
- Verify integration with other components
- Update documentation as needed
- Validate against specification requirements

### 5. Final Integration

Once all tasks complete:
1. Run full test suite
2. Validate against original specification
3. Generate implementation report
4. Update project documentation

## Error Handling

If any agent encounters issues:
1. Mark task as blocked in TodoWrite
2. Identify the specific problem
3. Either:
   - Launch a specialized agent to resolve
   - Request user intervention
   - Adjust implementation approach

## Progress Tracking

If using STM:
```bash
# View all tasks by status
stm list --pretty

# View specific status
stm list --status pending --pretty
stm list --status in-progress --pretty
stm list --status done --pretty

# Search for specific tasks
stm grep "authentication"
```

If using TodoWrite:
- ✅ Completed tasks
- 🔄 In-progress tasks
- ⏸️ Blocked tasks
- 📋 Pending tasks

## Success Criteria

Implementation is complete when:
1. All tasks are marked complete (STM: `stm list --status done` shows all tasks)
2. Tests pass for all components
3. Integration tests verify system works as specified
4. Documentation is updated
5. Code follows project conventions
6. All validation criteria from tasks are met (STM only)

## Example Usage

```
/spec:execute specs/feat-user-authentication.md
```

This will:
1. Read the user authentication specification
2. Load tasks from STM (if available) or create them in TodoWrite
3. Launch concurrent agents to build components
4. Track progress in STM or TodoWrite
5. Validate the complete implementation
6. Update task statuses as work progresses