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
Focus on: readability, naming conventions, code complexity, DRY principles, code smells, refactoring opportunities, and consistent coding patterns. Pull domain-specific quality metrics from available experts.
```

## 3. Security & Dependencies Review
```
Subagent: code-reviewer
Description: Security and dependencies review
Prompt: Perform security and dependency analysis of: $ARGUMENTS
Focus on: input validation, injection vulnerabilities, authentication/authorization, secrets management, dependency vulnerabilities, license compliance, version pinning, and supply chain security. Use security insights from domain experts if available.
```

## 4. Performance & Scalability Review
```
Subagent: code-reviewer
Description: Performance and scalability review
Prompt: Analyze performance and scalability in: $ARGUMENTS
Focus on: algorithm complexity, memory usage, database queries, caching strategies, async patterns, resource management, load handling, and horizontal scaling considerations. Get performance patterns from relevant experts.
```

## 5. Testing Quality Review
```
Subagent: code-reviewer
Description: Testing quality review
Prompt: Review test quality and effectiveness for: $ARGUMENTS
Focus on: meaningful assertions, test isolation, edge case handling, failure scenario coverage, mock vs real dependencies balance, test maintainability, clear test names, and actual behavior verification (not just coverage metrics). Check for testing-expert insights if available.
```

## 6. Documentation & API Review
```
Subagent: code-reviewer
Description: Documentation and API review
Prompt: Review documentation and API design for: $ARGUMENTS
Focus on: README completeness, API documentation, breaking changes, code comments, JSDoc/TypeDoc coverage, usage examples, migration guides, and developer experience. Evaluate API consistency and contract clarity.
```

After all agents complete, consolidate their findings into a single comprehensive report organized by priority.