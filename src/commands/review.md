---
description: Multi-aspect code review using parallel code-reviewer agents
allowed-tools: Task, Bash(git status:*), Bash(git diff:*), Bash(git log:*)
argument-hint: [what to review] - e.g., "recent changes", "src/components", "*.ts files", "PR #123"
---

# Code Review

## Current Repository State
!`git status --short && echo "---" && git diff --stat && echo "---" && git log --oneline -5`

## Review Strategy

Based on **$ARGUMENTS**, determine which review agents are needed:

If reviewing "changes" or recent modifications:
1. Analyze the file types that have been modified
2. Launch only relevant review agents:
   - **Documentation files only** (*.md, *.txt, README): Launch only Documentation & API Review agent
   - **Test files only** (*test.*, *.spec.*, tests/): Launch Testing Quality Review and Code Quality Review agents
   - **Config files only** (*.json, *.yaml, *.toml, .*rc): Launch Security & Dependencies Review and Architecture Review agents
   - **Source code files** (*.ts, *.js, *.py, etc.): Launch all 6 review agents
   - **Mixed changes**: Launch agents relevant to each file type present

If reviewing a specific directory or broad scope:
- Launch all 6 review agents for comprehensive coverage

Use the Task tool to invoke the appropriate code-reviewer agents concurrently:

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

Documentation Review Guidelines:
- Consider purpose and audience: Who needs this information and why?
- Evaluate effectiveness: Does the documentation achieve its goals?
- Focus on clarity: Can users understand and apply the information?
- Identify real issues: Missing information, errors, contradictions, outdated content
- Respect intentional variation: Multiple examples may show different valid approaches
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
Include only aspects that were actually reviewed based on the file types and agents launched:
┌─────────────────┬───────┬────────────────────────────────────┐
│ Aspect          │ Score │ Notes                              │
├─────────────────┼───────┼────────────────────────────────────┤
│ [Only include relevant aspects based on what was reviewed]      │
│ Architecture    │ X/10  │ [Clean separation, coupling issues]│
│ Code Quality    │ X/10  │ [Readability, consistency, patterns]│
│ Security        │ X/10  │ [Critical vulnerabilities, if any] │
│ Performance     │ X/10  │ [Bottlenecks, scalability concerns]│
│ Testing         │ X/10  │ [Coverage percentage, test quality]│
│ Documentation   │ X/10  │ [API docs, comments, examples]     │
└─────────────────┴───────┴────────────────────────────────────┘

For example:
- Documentation-only review: Show only Documentation row
- Test file review: Show Testing and Code Quality rows
- Config file review: Show Security and Architecture rows
- Full code review: Show all relevant aspects

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
Repeated problems that need addressing:
- [Problem pattern] (X occurrences)
  → [Actionable fix/next step]
- [Additional problems with solutions...]
```

After all agents complete, consolidate findings into this format. Focus on actionable feedback with specific file locations and code examples. Use type icons:
🔒 Security | 🏗️ Architecture | ⚡ Performance | 🧪 Testing | 📝 Documentation | 💥 Breaking Change