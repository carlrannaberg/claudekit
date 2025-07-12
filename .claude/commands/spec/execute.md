---
description: Implement a validated specification by orchestrating concurrent agents
allowed-tools: Task, Read, TodoWrite, Grep, Glob
---

# Implement Specification

Implement the specification at: $ARGUMENTS

## Prerequisites

First, verify the specification is implementation-ready:
- Check if the spec exists and is readable
- Ensure it has been validated (run /spec:validate if needed)
- Confirm it contains implementation phases or can be broken down

## Implementation Process

### 1. Analyze Specification

Read the specification to extract:
- Implementation phases/sections
- Technical components to build
- Dependencies between components
- Testing requirements
- Success criteria

### 2. Create Implementation Plan

Use TodoWrite to create a comprehensive task list based on the specification:
- Break down each phase into concrete, actionable tasks
- Identify which tasks can run in parallel
- Mark dependencies and prerequisites
- Set appropriate priorities (high for core functionality, medium for enhancements, low for nice-to-haves)

### 3. Orchestrate Implementation

Launch concurrent Task agents for parallel work:

**Agent Distribution Strategy:**
- Group related tasks that can be done simultaneously
- Assign each agent specific files/components to work on
- Ensure agents work on non-conflicting areas
- Include clear success criteria and context for each agent

**Example Agent Assignments:**

```
Agent 1: Database/Model Layer
- "Create database models for [feature]"
- "Add migrations for new tables"
- "Implement data access methods"
- "Add model validation"

Agent 2: API/Backend Logic
- "Create API endpoints for [feature]"
- "Implement business logic"
- "Add request validation"
- "Handle error cases"

Agent 3: Frontend/UI Components
- "Create UI components for [feature]"
- "Implement forms and user interactions"
- "Add client-side validation"
- "Connect to API endpoints"

Agent 4: Testing Suite
- "Write unit tests for models"
- "Create API endpoint tests"
- "Add integration tests"
- "Implement E2E test scenarios"

Agent 5: Documentation & Polish
- "Update API documentation"
- "Add inline code documentation"
- "Update user guides"
- "Add examples and tutorials"
```

### 4. Coordinate Progress

Monitor and coordinate the implementation:
- Track task completion via todo list
- Launch follow-up agents as dependencies are met
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

## Usage Examples

```bash
# Implement a feature specification
/spec:execute specs/feat-user-authentication.md

# Implement a bugfix specification
/spec:execute specs/fix-123-memory-leak.md
```

## Implementation Guidelines

### For Each Agent:
1. Provide the relevant section of the specification
2. List specific files to create/modify
3. Include coding standards and patterns to follow
4. Define clear success criteria
5. Specify what tests to write

### Handling Complex Features:
- Break into multiple rounds of agents if needed
- Use the todo list to track multi-phase implementations
- Ensure earlier phases are complete before starting dependent phases

### Conflict Avoidance:
- Assign agents to different directories/layers
- Have agents work on separate feature branches if needed
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