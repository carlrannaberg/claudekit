---
description: Run quality checks and automatically fix issues using concurrent agents
allowed-tools: Bash, Task, TodoWrite, Read, Edit, MultiEdit
---

# Validate and Fix

Run quality checks and automatically fix discovered issues using parallel execution.

## Process

### 1. Discovery Phase
Run all available quality checks in parallel using Bash. Capture full output including file paths, line numbers, and error messages:
- Linting (ESLint, Prettier, Ruff, etc.)
- Type checking (TypeScript, mypy, etc.)
- Tests (Jest, pytest, go test, etc.)
- Build verification
- Custom project checks

### 2. Analysis Phase
Analyze the errors to identify:
- Error categories (syntax, type errors, lint violations, test failures)
- Affected files and their dependencies
- Which fixes can be done independently vs. those requiring coordination
- Patterns for bulk fixes

### 3. Task Distribution
Create detailed task plans where each agent gets:
- A specific, focused objective (e.g., "Fix all TypeScript errors in src/components/")
- Exact file paths and line numbers to modify
- Clear success criteria (e.g., "Ensure npm run typecheck passes for these files")
- Any relevant context about dependencies or patterns to follow

### 4. Parallel Execution
Launch multiple agents concurrently using Task tool, ensuring:
- Each agent has non-overlapping responsibilities to avoid conflicts
- Agents working on related files understand the shared interfaces
- Each agent verifies their fixes work before completing
- Track progress with TodoWrite

### 5. Verification
After all agents complete:
- Re-run all checks
- Confirm issues are resolved
- Report any remaining manual fixes needed

This approach maximizes efficiency through parallel discovery and fixing while ensuring coordinated, conflict-free changes.