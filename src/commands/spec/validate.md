---
allowed-tools: Task, Read, Grep
description: Analyzes a specification document to determine if it has enough detail for autonomous implementation
category: validation
argument-hint: "<path-to-spec-file>"
---

# Specification Completeness Check

Analyze the specification at: $ARGUMENTS

## Analysis Framework

This command will analyze the provided specification document to determine if it contains sufficient detail for successful autonomous implementation.

### Domain Expert Consultation

When analyzing specifications that involve specific technical domains:
- **Use specialized subagents** when analysis involves specific domains (TypeScript, React, testing, databases, etc.)
- Run `claudekit list agents` to see available specialized experts
- Match specification domains to expert knowledge for thorough validation
- Use general-purpose approach only when no specialized expert fits

### What This Check Evaluates:

The analysis evaluates three fundamental aspects, each with specific criteria:

#### 1. **WHY - Intent and Purpose**
- Background/Problem Statement clarity
- Goals and Non-Goals definition
- User value/benefit explanation
- Justification vs alternatives
- Success criteria

#### 2. **WHAT - Scope and Requirements**
- Features and functionality definition
- Expected deliverables
- API contracts and interfaces
- Data models and structures
- Integration requirements:
  - External system interactions?
  - Authentication mechanisms?
  - Communication protocols?
- Performance requirements
- Security requirements

#### 3. **HOW - Implementation Details**
- Architecture and design patterns
- Implementation phases/roadmap
- Technical approach:
  - Core logic and algorithms
  - All functions and methods fully specified?
  - Execution flow clearly defined?
- Error handling:
  - All failure modes identified?
  - Recovery behavior specified?
  - Edge cases documented?
- Platform considerations:
  - Cross-platform compatibility?
  - Platform-specific implementations?
  - Required dependencies per platform?
- Resource management:
  - Performance constraints defined?
  - Resource limits specified?
  - Cleanup procedures documented?
- Testing strategy:
  - Test purpose documentation (each test explains why it exists)
  - Meaningful tests that can fail to reveal real issues
  - Edge case coverage and failure scenarios
  - Follows project testing philosophy: "When tests fail, fix the code, not the test"
- Deployment considerations

### Additional Quality Checks:

**Completeness Assessment**
- Missing critical sections
- Unresolved decisions
- Open questions

**Clarity Assessment**  
- Ambiguous statements
- Assumed knowledge
- Inconsistencies

### Output Format:

The analysis will provide:
- **Summary**: Overall readiness assessment (Ready/Not Ready)
- **Critical Gaps**: Must-fix issues blocking implementation
- **Missing Details**: Specific areas needing clarification
- **Risk Areas**: Potential implementation challenges
- **Recommendations**: Next steps to improve the spec

### Usage Examples:

```bash
# Validate a spec file
/spec:validate docs/feature-spec.md

# Validate a specific spec
/spec:validate specs/hooks-system-implementation.md
```

This comprehensive analysis helps ensure specifications are implementation-ready before starting development, reducing ambiguity and rework.