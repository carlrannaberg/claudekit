---
description: Multi-aspect code review using parallel code-reviewer agents
allowed-tools: Task
argument-hint: [what to review] - e.g., "recent changes", "src/components", "*.ts files", "PR #123"
---

# Code Review

Launch multiple code-reviewer agents in parallel to review different aspects of: **$ARGUMENTS**

Use the Task tool to invoke multiple code-reviewer agents concurrently:

## 1. Architecture & Design Review
```
Subagent: code-reviewer
Description: Architecture review
Prompt: Review the architecture and design patterns in: $ARGUMENTS
Focus on: module organization, separation of concerns, dependency management, abstraction levels, design pattern usage, and architectural consistency. Check available experts with claudekit for domain-specific patterns.
```

## 2. Code Quality Review
```
Subagent: code-reviewer
Description: Code quality review  
Prompt: Review code quality and maintainability in: $ARGUMENTS
Focus on: readability, DRY violations, complexity metrics, naming conventions, code smells, and refactoring opportunities. Pull domain-specific quality metrics from available experts.
```

## 3. Security Review
```
Subagent: code-reviewer
Description: Security review
Prompt: Perform security analysis of: $ARGUMENTS
Focus on: input validation, injection vulnerabilities, authentication/authorization, data exposure, dependency vulnerabilities, and security best practices. Use security insights from domain experts if available.
```

## 4. Performance Review
```
Subagent: code-reviewer
Description: Performance review
Prompt: Analyze performance implications in: $ARGUMENTS
Focus on: algorithm complexity, memory usage, potential bottlenecks, caching opportunities, async patterns, and resource management. Get performance patterns from relevant experts.
```

## 5. Error Handling & Testing Review
```
Subagent: code-reviewer
Description: Testing and error handling review
Prompt: Review error handling and test coverage for: $ARGUMENTS
Focus on: error boundaries, edge cases, test completeness, test quality, mock appropriateness, and testing patterns. Check for testing-expert insights if available.
```

After all agents complete, consolidate their findings into a single comprehensive report organized by priority.