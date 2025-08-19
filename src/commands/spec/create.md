---
allowed-tools: Read, Write, Grep, Glob, TodoWrite, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, Bash(ls:*), Bash(echo:*), Bash(command:*), Bash(npm:*), Bash(claude:*)
description: Generate a spec file for a new feature or bugfix
category: validation
argument-hint: "<feature-or-bugfix-description>"
---

## Context
- Existing specs: !`ls -la specs/ 2>/dev/null || echo "No specs directory found"`

## Optional: Enhanced Library Documentation Support

Context7 MCP server provides up-to-date library documentation for better spec creation.

Check if Context7 is available: !`command -v context7-mcp || echo "NOT_INSTALLED"`

If NOT_INSTALLED and the feature involves external libraries, offer to enable Context7:
```
████ Optional: Enable Context7 for Enhanced Documentation ████

Context7 provides up-to-date library documentation to improve spec quality.
This is optional but recommended when working with external libraries.

Would you like me to install Context7 for you? I can:
  1. Install globally: npm install -g @upstash/context7-mcp
  2. Add to Claude Code: claude mcp add context7 context7-mcp

Or you can install it manually later if you prefer.
```

If user agrees to installation:
- Run: `npm install -g @upstash/context7-mcp`
- Then run: `claude mcp add context7 context7-mcp`
- Verify installation and proceed with enhanced documentation support

If user declines or wants to continue without it:
- Proceed with spec creation using existing knowledge

## FIRST PRINCIPLES PROBLEM ANALYSIS

Before defining any solution, validate the problem from first principles:

### Core Problem Investigation
- **Strip Away Solution Assumptions**: What is the core problem, completely separate from any proposed solution?
- **Root Cause Analysis**: Why does this problem exist? What created this need?
- **Goal Decomposition**: What are we fundamentally trying to achieve for users/business?
- **Success Definition**: What would success look like if we had unlimited resources and no constraints?
- **Alternative Approaches**: Could we achieve the underlying goal without building anything? Are there simpler approaches?

### Problem Validation Questions
- **Real vs. Perceived**: Is this solving a real problem that users actually have?
- **Assumption Audit**: What assumptions about user needs, technical constraints, or business requirements might be wrong?
- **Value Proposition**: What is the minimum viable solution that delivers core value?
- **Scope Validation**: Are we solving the right problem, or treating symptoms of a deeper issue?

**CRITICAL: Only proceed if the core problem is clearly defined and validated. If uncertain, request additional context.**

## MANDATORY PRE-CREATION VERIFICATION

After validating the problem from first principles, complete these technical checks:

### 1. Context Discovery Phase
- Search existing codebase for similar features/specs using AgentTool
- **Use specialized subagents** when research involves specific domains (TypeScript, React, testing, databases, etc.)
- Run `claudekit list agents` to see available specialized experts
- Match research requirements to expert domains for optimal analysis
- Use general-purpose approach only when no specialized expert fits
- Identify potential conflicts or duplicates
- Verify feature request is technically feasible
- Document any missing prerequisites

### 2. Request Validation
- Confirm request is well-defined and actionable
- If vague or incomplete, STOP and ask clarifying questions
- Validate scope is appropriate (not too broad/narrow)

### 3. Quality Gate
- Only proceed if you have 80%+ confidence in implementation approach
- If uncertain, request additional context before continuing
- Document any assumptions being made

**CRITICAL: If any validation fails, STOP immediately and request clarification.**

## Your task

Create a comprehensive specification document in the `specs/` folder for the following feature/bugfix: $ARGUMENTS

First, analyze the request to understand:
1. Whether this is a feature or bugfix
2. The scope and complexity
3. Related existing code/features
4. External libraries/frameworks involved

If the feature involves external libraries or frameworks AND Context7 is available:
- Use `mcp__context7__resolve-library-id` to find the library
- Use `mcp__context7__get-library-docs` to get up-to-date documentation
- Reference official patterns and best practices from the docs

## END-TO-END INTEGRATION ANALYSIS

Before writing the detailed specification, map the complete system impact:

### System Integration Mapping
- **Data Flow Tracing**: Trace data flow from user action → processing → storage → response
- **Service Dependencies**: Identify all affected services, APIs, databases, and external systems
- **Integration Points**: Map every place this feature touches existing functionality
- **Cross-System Impact**: How does this change affect other teams, services, or user workflows?

### Complete User Journey Analysis
- **Entry Points**: How do users discover and access this feature?
- **Step-by-Step Flow**: What is the complete sequence from start to finish?
- **Error Scenarios**: What happens when things go wrong at each step?
- **Exit Points**: How does this connect to what users do next?

### Deployment and Rollback Considerations
- **Migration Path**: How do we get from current state to new state?
- **Rollback Strategy**: What if we need to undo this feature?
- **Deployment Dependencies**: What must be deployed together vs. independently?
- **Data Migration**: How do we handle existing data during the transition?

**VERIFICATION: Ensure you can trace the complete end-to-end flow before proceeding to detailed specification.**

Then create a spec document that includes:

1. **Title**: Clear, descriptive title of the feature/bugfix
2. **Status**: Draft/Under Review/Approved/Implemented
3. **Authors**: Your name and date
4. **Overview**: Brief description and purpose
5. **Background/Problem Statement**: Why this feature is needed or what problem it solves
6. **Goals**: What we aim to achieve (bullet points)
7. **Non-Goals**: What is explicitly out of scope (bullet points)
8. **Technical Dependencies**:
    - External libraries/frameworks used
    - Version requirements
    - Links to relevant documentation
9. **Detailed Design**:
    - Architecture changes
    - Implementation approach
    - Code structure and file organization
    - API changes (if any)
    - Data model changes (if any)
    - Integration with external libraries (with examples from docs)
10. **User Experience**: How users will interact with this feature
11. **Testing Strategy**:
    - Unit tests
    - Integration tests
    - E2E tests (if needed)
    - Mocking strategies for external dependencies
    - **Test documentation**: Each test should include a purpose comment explaining why it exists and what it validates
    - **Meaningful tests**: Avoid tests that always pass regardless of behavior
    - **Edge case testing**: Include tests that can fail to reveal real issues
12. **Performance Considerations**: Impact on performance and mitigation strategies
13. **Security Considerations**: Security implications and safeguards
14. **Documentation**: What documentation needs to be created/updated
15. **Implementation Phases**:
    - Phase 1: MVP/Core functionality
    - Phase 2: Enhanced features (if applicable)
    - Phase 3: Polish and optimization (if applicable)
16. **Open Questions**: Any unresolved questions or decisions
17. **References**:
    - Links to related issues, PRs, or documentation
    - External library documentation links
    - Relevant design patterns or architectural decisions

Follow these guidelines:
- Use Markdown format similar to existing specs
- Be thorough and technical but also accessible
- Include code examples where helpful (especially from library docs)
- Consider edge cases and error scenarios
- Reference existing project patterns and conventions
- Use diagrams if they would clarify complex flows (using ASCII art or mermaid)
- When referencing external libraries, include version-specific information
- Do NOT include time or effort estimations (no "X days", "Y hours", or complexity estimates)

Name the spec file descriptively based on the feature:
- Features: `feat-{kebab-case-name}.md`
- Bugfixes: `fix-{issue-number}-{brief-description}.md`

## PROGRESSIVE VALIDATION CHECKPOINTS

After completing each major section:

- **Problem Statement**: Verify it's specific and measurable
- **Technical Requirements**: Confirm all dependencies are available
- **Implementation Plan**: Validate approach is technically sound
- **Testing Strategy**: Ensure testability of all requirements

At each checkpoint, if quality is insufficient, revise before proceeding.

## FINAL SPECIFICATION VALIDATION

Before marking complete:
1. **Completeness Check**: All 17 sections meaningfully filled
2. **Consistency Check**: No contradictions between sections  
3. **Implementability Check**: Someone could build this from the spec
4. **Quality Score**: Rate spec 1-10, only accept 8+

Before writing, use AgentTool to search for:
- Related existing features or code
- Similar patterns in the codebase
- Potential conflicts or dependencies
- Current library versions in package.json or equivalent