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

After all agents complete, consolidate their findings into this structured format:

```
🗂 Consolidated Code Review Report - [Target]

📋 Review Scope
Target: [directory/files reviewed] ([X files, Y lines])
Focus: Architecture, Security, Performance, Testing, Documentation

📊 Executive Summary
Brief overview of code quality, key strengths, and critical issues requiring attention.

🔴 CRITICAL Issues (Must Fix Immediately)
1. 🔒 [Security/🏗️ Architecture/⚡ Performance/🧪 Testing/📝 Documentation/💥 Breaking] [Issue Name]
   File: [path:line]
   Impact: [description]
   Solution:
   ```[code example]```

2. [Additional critical issues with type icons...]

🟠 HIGH Priority Issues
1. [Type icon] [Issue name]
   File: [path:line]
   Impact: [description]
   Solution: [recommendation]

2. [Additional high priority issues...]

🟡 MEDIUM Priority Issues
1. [Type icon] [Issue name] - [file:line]
   Extract into: [suggested refactoring]

2. [Additional medium priority issues...]

✅ Quality Metrics
┌─────────────────┬───────┬────────────────────────────────────┐
│ Aspect          │ Score │ Notes                              │
├─────────────────┼───────┼────────────────────────────────────┤
│ Architecture    │ X/10  │ [Clean separation, coupling issues]│
│ Code Quality    │ X/10  │ [Readability, consistency, patterns]│
│ Security        │ X/10  │ [Critical vulnerabilities, if any] │
│ Performance     │ X/10  │ [Bottlenecks, scalability concerns]│
│ Testing         │ X/10  │ [Coverage percentage, test quality]│
│ Documentation   │ X/10  │ [API docs, comments, examples]     │
└─────────────────┴───────┴────────────────────────────────────┘

✨ Strengths to Preserve
- [Key strength with evidence]
- [Additional strengths...]

🚀 Proactive Improvements
1. [Pattern/Practice Name]
   ```[code example]```

2. [Additional improvements...]

📊 Issue Distribution
- Architecture: [X critical, Y high, Z medium]
- Security: [X critical, Y high, Z medium]
- Performance: [X critical, Y high, Z medium]
- Testing: [X critical, Y high, Z medium]
- Documentation: [X critical, Y high, Z medium]

⚠️ Systemic Issues
Repeated Patterns Requiring Standards:
- [Pattern description] (X occurrences)
  → [Actionable solution/next step]
- [Additional patterns with solutions...]
```

After all agents complete, consolidate findings into this format. Focus on actionable feedback with specific file locations and code examples. Use type icons:
🔒 Security | 🏗️ Architecture | ⚡ Performance | 🧪 Testing | 📝 Documentation | 💥 Breaking Change