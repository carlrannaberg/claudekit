---
description: Implement a validated specification by orchestrating concurrent agents
allowed-tools: Task, Read, TodoWrite, Grep, Glob
argument-hint: "<path-to-spec-file>"
---

# Implement Specification

Implement the specification at: $ARGUMENTS

## MANDATORY PRE-EXECUTION VALIDATION

Before launching ANY subagents:

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

### 2. Create Task List

Using TodoWrite, create a comprehensive task list that includes:
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

For each independent task group:

1. **Prepare Task Brief**:
   - Clear scope and boundaries
   - Expected deliverables
   - Files to modify/create
   - Testing requirements

2. **Launch Subagent**:
   ```
   Task: "Implement [component name]"
   Prompt: Detailed implementation instructions including:
   - Specification reference
   - Technical requirements
   - Code style guidelines
   - Testing requirements
   ```

3. **Monitor Progress**:
   - Track task completion via TodoWrite
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

Use TodoWrite to maintain real-time progress:
- ✅ Completed tasks
- 🔄 In-progress tasks
- ⏸️ Blocked tasks
- 📋 Pending tasks

## Success Criteria

Implementation is complete when:
1. All tasks in TodoWrite are marked complete
2. Tests pass for all components
3. Integration tests verify system works as specified
4. Documentation is updated
5. Code follows project conventions

## Example Usage

```
/spec:execute specs/feat-user-authentication.md
```

This will:
1. Read the user authentication specification
2. Break it into implementable tasks
3. Launch concurrent agents to build components
4. Track progress in TodoWrite
5. Validate the complete implementation