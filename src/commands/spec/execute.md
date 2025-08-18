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

### 3. Launch Concurrent Agents

**CRITICAL**: Include multiple Task tool calls in ONE message ONLY for independent, parallelizable tasks. Tasks with dependencies should be executed sequentially (separate messages).

For each independent task group:

1. **Prepare Task Brief**:
   - Clear scope and boundaries
   - Expected deliverables
   - Files to modify/create
   - Testing requirements

2. **Launch Subagents** (multiple in one message for parallel execution):
   - **ALWAYS use specialized subagents** when tasks match expert domains (TypeScript, React, testing, databases, etc.)
   - Run `claudekit list agents` if you need to see available specialized agents
   - Match task requirements to expert domains for optimal results  
   - Use `general-purpose` subagent only when no specialized expert fits
   - Ensure each agent has non-overlapping responsibilities
   
   Example task details for EACH agent (include multiple Task tool calls in ONE message):
   
   If using STM, include task details:
   ```
   Task: "Implement [component name]"
   Prompt: |
     Task ID: [STM task ID]
     Title: [Task title from STM]
     
     Technical Details:
     [Contents of task 'details' section from STM]
     
     Validation Criteria:
     [Contents of task 'validation' section from STM]
     
     Additional Instructions:
     - Follow project code style guidelines
     - Write comprehensive tests
     - Update STM status when complete: stm update [task-id] --status done
   ```
   
   If using TodoWrite:
   ```
   Task: "Implement [component name]"
   Prompt: Detailed implementation instructions including:
   - Specification reference
   - Technical requirements
   - Code style guidelines
   - Testing requirements
   ```
   
   **Remember**: Include Task tool invocations in a SINGLE message ONLY for truly parallel, independent tasks!

3. **Monitor Progress**:
   - If using STM: `stm list --status in-progress --pretty`
   - If using TodoWrite: Track task completion in session
   - Identify blocked tasks
   - Coordinate dependencies

### 4. Validation Points

After each major component:
- Run tests to verify functionality
- Check integration with other components
- Update documentation
- Mark tasks as complete in TodoWrite

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