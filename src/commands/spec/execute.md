---
description: Implement a validated specification by orchestrating concurrent agents
allowed-tools: Task, Read, TodoWrite, Grep, Glob, Bash(task-master:*)
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

## Execution Mode Detection

Check if TaskMaster is available: !`command -v task-master && test -f .taskmaster/config.json && echo "TASKMASTER_MODE" || echo "SESSION_MODE"`

- **TaskMaster Mode**: Use existing decomposed tasks from `/spec:decompose`
- **Session Mode**: Create temporary TodoWrite tasks for this session

## Implementation Process

### 1. Check TaskMaster Availability

Based on the execution mode detected above:

If "TASKMASTER_MODE", proceed with **TaskMaster Mode**.

If TaskMaster is installed but not initialized:
- Offer to initialize TaskMaster with Claude Code provider configuration
- Use the same safe initialization as in `/spec:decompose` command

If "SESSION_MODE", use **Session Mode** with TodoWrite.

### 2A. TaskMaster Mode Implementation

When TaskMaster is available:

1. **List Available Tasks**:
   ```bash
   task-master list
   ```

2. **Filter Tasks Related to Specification**:
   - Look for tasks that reference the spec file in their details
   - Identify tasks that are ready to execute (dependencies met)
   - Show task dependency structure

3. **Execute Tasks in Dependency Order**:
   - Start with foundation tasks (no dependencies)
   - Launch agents for parallel tasks
   - Update task status in TaskMaster after completion
   - Respect task dependencies when launching follow-up work

### 2B. Session Mode Implementation (Fallback)

When TaskMaster is not available:

1. **Analyze Specification**:
   - Read the specification to extract implementation phases
   - Technical components to build
   - Dependencies between components
   - Testing requirements and success criteria

2. **Create TodoWrite Implementation Plan**:
   - Break down each phase into concrete, actionable tasks
   - Identify which tasks can run in parallel
   - Mark dependencies and prerequisites
   - Set appropriate priorities (high for core functionality, medium for enhancements, low for nice-to-haves)

### 3. RIGOROUS SUBAGENT ORCHESTRATION

**IMPORTANT: Act as an orchestrator to preserve main context window**
- The main agent should ONLY coordinate and monitor progress
- ALL implementation work must be done by subagents using the Task tool
- Launch multiple subagents concurrently for maximum efficiency
- Use a single subagent for final validation

**Orchestration Strategy:**

#### 3A. Launch with Explicit Boundaries
- Each subagent gets clear, non-overlapping responsibility
- Provide explicit success/failure criteria for each task
- Include rollback instructions for each subagent

#### 3B. Result Processing
- When subagents complete, immediately verify their work quality
- Check for integration issues between completed components
- If any subagent reports failure, analyze impact before proceeding
- Create recovery plan for failed components

**Implementation Guidelines:**
- Group related tasks that can be done simultaneously
- Launch subagents for each group of tasks
- Each subagent handles specific files/components
- Ensure subagents work on non-conflicting areas
- Monitor progress without implementing directly

**Example Subagent Launches:**

```
# Launch multiple subagents concurrently for parallel implementation
Task("Database Implementation", prompt="
  Implement the database layer for [feature]:
  - Create database models
  - Add migrations for new tables
  - Implement data access methods
  - Add model validation
  - Write unit tests for all models
  Context: [provide spec section]
")

Task("API Implementation", prompt="
  Implement the API layer for [feature]:
  - Create API endpoints
  - Implement business logic
  - Add request validation
  - Handle error cases
  - Write API tests
  Context: [provide spec section]
")

Task("Frontend Implementation", prompt="
  Implement the UI components for [feature]:
  - Create React/Vue/etc components
  - Implement forms and interactions
  - Add client-side validation
  - Connect to API endpoints
  - Write component tests
  Context: [provide spec section]
")

# Use separate subagents for searching and analysis
Task("Find existing patterns", prompt="
  Search the codebase for:
  - Similar features we can learn from
  - Existing utilities to reuse
  - Current coding patterns to follow
  Report findings for other agents to use
")

# Single subagent for final validation
Task("Validate implementation", prompt="
  Verify the complete implementation:
  - Run all tests
  - Check code quality (lint, typecheck)
  - Validate against specification
  - Ensure all requirements are met
  Report any issues found
")
```

### 4. Coordinate Progress

Monitor and coordinate the implementation:

**TaskMaster Mode**:
- Track task completion via `task-master list`
- Update task status with `task-master update-task`
- Launch follow-up agents as dependencies are met
- Mark tasks complete with `task-master complete --id=<task_id>`

**Session Mode**:
- Track task completion via TodoWrite list
- Launch follow-up agents as dependencies are met
- Update todo status as work progresses

**Both Modes**:
- Ensure all tests pass after each component
- Validate implementation against specification
- Handle any blockers or issues that arise

### 5. Final Validation

Once all tasks are complete:
- Run full test suite
- Verify all specification requirements are met
- Check code quality (lint, type checks)
- Ensure documentation is complete
- Confirm ready for review/merge

## Execution Mode Information

When this command runs, first inform the user which mode will be used:

**TaskMaster Mode Available:**
```
✅ TaskMaster detected - using persistent tasks
Found 8 tasks related to this specification
3 foundation tasks ready to execute
```

**Session Mode (Fallback):**
```
ℹ️  TaskMaster AI not found - using session-based TodoWrite for task management
To enable persistent tasks, install TaskMaster AI: npm install -g task-master-ai
```

## Usage Examples

```bash
# Implement a feature specification (TaskMaster mode if available)
/spec:execute specs/feat-user-authentication.md

# Implement a bugfix specification (Session mode fallback)
/spec:execute specs/fix-123-memory-leak.md
```

## Implementation Guidelines

### Orchestrator Role (Main Agent):
1. **DO NOT implement any code directly**
2. Launch subagents for ALL implementation work
3. Monitor progress and coordinate between subagents
4. Handle dependencies and sequencing
5. Report status updates to the user

### For Each Subagent:
1. Provide the relevant section of the specification
2. List specific files to create/modify
3. Include coding standards and patterns to follow
4. Define clear success criteria
5. Specify what tests to write

### Testing Guidelines for Subagents:
- **Document test purpose** - Each test should include a comment explaining why it exists
- **Write meaningful tests** - Avoid tests that always pass regardless of behavior
- **Test actual functionality** - Call the functions being tested, don't just check side effects
- **Include edge cases** - Write tests that can fail to reveal real issues
- **Follow project testing patterns** - Use existing test frameworks and conventions

### Subagent Usage Patterns:
- **Search Subagents**: Use freely for finding files, patterns, and existing code
- **Implementation Subagents**: Launch concurrently for non-conflicting work
- **Validation Subagent**: Use a single subagent at the end for final checks
- **Fix Subagents**: Launch as needed when validation finds issues

### Handling Complex Features:
- Break into multiple rounds of subagents if needed
- Use the todo list to track multi-phase implementations
- Ensure earlier phases are complete before starting dependent phases

### Conflict Avoidance:
- Assign subagents to different directories/layers
- Have subagents work on separate feature branches if needed
- Use clear file ownership to prevent conflicts
- Coordinate shared interfaces through the specification

## Success Criteria

The implementation is complete when:
- ✅ All todos are marked as completed
- ✅ All tests are passing
- ✅ Code follows project conventions
- ✅ Implementation matches specification
- ✅ No conflicts between agents' work
- ✅ Documentation is updated
- ✅ Code passes quality checks (lint, type check)

## Notes

- This command works best with well-structured specifications from /spec:create
- Always validate specs with /spec:validate before implementation
- The todo list provides real-time visibility into progress
- Agents should be given enough context to work autonomously
- Complex features may require multiple rounds of agent orchestration