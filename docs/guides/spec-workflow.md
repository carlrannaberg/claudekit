# Spec Command Documentation

The spec command suite (`/spec:create`, `/spec:validate`, `/spec:decompose`, `/spec:execute`) provides a complete specification-driven development workflow for features and bugfixes.

## Overview

This command generates detailed technical specifications that serve as blueprints for implementation. It ensures thorough planning before coding begins and creates a reference document for the development process.

## Dependencies

### Recommended: STM (Simple Task Master)
For enhanced task management, install STM:
```bash
# Install STM globally
npm install -g simple-task-master

# Initialize in your project (creates .simple-task-master directory)
stm init
```

**STM Benefits:**
- **Persistent tasks** across development sessions
- **Rich task data** with description, details, validation, and dependencies  
- **Status tracking** with `pending`, `in-progress`, `done` states
- **Dependency management** for coordinated parallel work
- **Query capabilities** for filtering and searching tasks

**Fallback:** Commands fall back to TodoWrite if STM is not available, but with reduced functionality.

### Optional: context7 MCP Server
For enhanced library documentation integration, install the context7 MCP server:
- Provides `mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs` tools
- Enables automatic retrieval of up-to-date library documentation
- Includes official code examples and best practices

Installation:
```bash
# Step 1: Install globally using your package manager
# npm:
npm install -g @upstash/context7-mcp

# yarn:
yarn global add @upstash/context7-mcp

# pnpm:
pnpm add -g @upstash/context7-mcp

# Step 2: Add to Claude Code
claude mcp add context7 context7-mcp
```

Without context7, the command still works but won't automatically fetch external library documentation.

## Usage

```bash
# For a new feature
/spec:create add user authentication with OAuth2

# For a bugfix (include issue number)
/spec:create fix-123 memory leak in data processor

# Validate specification completeness
/spec:validate specs/feat-user-authentication.md

# Decompose spec into actionable tasks
/spec:decompose specs/feat-user-authentication.md

# Execute specification with task management
/spec:execute specs/feat-user-authentication.md
```

## The spec:validate Command

The `/spec:validate` command analyzes existing specifications to determine if they contain sufficient detail for autonomous implementation, while also identifying overengineering and non-essential complexity that should be removed or deferred.

### Domain Expert Consultation

When analyzing specifications that involve specific technical domains, the command uses specialized subagents:
- Automatically matches specification domains to expert knowledge for thorough validation
- Runs `claudekit list agents` to see available specialized experts
- Uses general-purpose approach only when no specialized expert fits

### What It Checks

The analysis evaluates three fundamental aspects, each with specific criteria:

1. **WHY - Intent and Purpose**
   - Background/Problem Statement clarity
   - Goals and Non-Goals definition
   - User value/benefit explanation
   - Justification vs alternatives
   - Success criteria

2. **WHAT - Scope and Requirements**
   - Features and functionality definition
   - Expected deliverables
   - API contracts and interfaces
   - Data models and structures
   - Integration requirements (external systems, authentication, protocols)
   - Performance and security requirements

3. **HOW - Implementation Details**
   - Architecture and design patterns
   - Implementation phases/roadmap
   - Technical approach (core logic, algorithms, execution flow)
   - Error handling (failure modes, recovery behavior, edge cases)
   - Platform considerations (compatibility, dependencies)
   - Resource management (performance constraints, limits, cleanup)
   - Testing strategy (meaningful tests, edge coverage, project philosophy)
   - Deployment considerations

### Overengineering Detection

A key feature of the command is aggressive overengineering detection using:

**Core Value Alignment Analysis**
- Does this feature solve a real, immediate problem?
- Is it being used frequently enough to justify complexity?
- Would a simpler solution work for 80% of use cases?

**YAGNI Principle (You Aren't Gonna Need It)**
- If unsure whether it's needed → Cut it
- If it's for "future flexibility" → Cut it
- If only 20% of users need it → Cut it
- If it adds any complexity → Question it, probably cut it

**Common Overengineering Patterns Detected:**
1. **Premature Optimization** - Caching, performance optimizations without benchmarks
2. **Feature Creep** - "Nice to have" features, unlikely edge cases
3. **Over-abstraction** - Generic solutions for specific problems
4. **Infrastructure Overhead** - Complex builds for simple tools
5. **Testing Extremism** - 100% coverage requirements, mocking everything

### Output Format

The analysis provides:
- **Summary**: Overall readiness assessment (Ready/Not Ready)
- **Critical Gaps**: Must-fix issues blocking implementation
- **Missing Details**: Specific areas needing clarification
- **Risk Areas**: Potential implementation challenges
- **Overengineering Analysis**: 
  - Non-core features that should be removed entirely
  - Complexity that doesn't align with usage patterns
  - Suggested simplifications or complete removal
- **Features to Cut**: Specific items to remove from the spec
- **Essential Scope**: Absolute minimum needed to solve the core problem
- **Recommendations**: Next steps to improve the spec

### Example Analysis

When analyzing a specification, the validator might identify patterns like:
- **Unnecessary Caching**: "Cache user preferences with Redis" → Use localStorage for MVP
- **Premature Edge Cases**: "Handle 10,000+ concurrent connections" → Expected usage is <100 users
- **Over-abstracted Architecture**: "Plugin system for custom validators" → Only 3 validators needed, implement directly
- **Feature Creep**: "Support 5 export formats" → 95% of users only need JSON, cut the rest

## The spec:decompose Command

Transforms specifications into implementation-ready tasks:

### Self-Contained Tasks
- **No references**: Each task contains complete implementation details, not summaries
- **Copy, don't link**: Full code examples and requirements included directly
- **Ready to implement**: Developers can work from tasks without consulting the original spec

### Smart Task Management
- **STM Integration**: Uses Simple Task Master for persistent, rich task tracking
- **Dependency tracking**: Identifies which tasks can run in parallel
- **Quality validation**: Ensures tasks are complete and actionable

### Organized Implementation
- **Foundation first**: Core infrastructure tasks identified and prioritized
- **Vertical slices**: Complete features with all layers (database + API + frontend + tests)
- **Clear phases**: Logical grouping for coordinated development

## The spec:execute Command

Orchestrates complete implementation with built-in quality assurance:

### Quality-First Implementation
- **Mandatory reviews**: Every component gets reviewed for both completeness and quality
- **No shortcuts**: Tasks aren't marked complete until all requirements are fully implemented
- **Built-in testing**: Comprehensive test coverage is part of every task
- **Atomic commits**: Each feature is committed as a complete, working unit

### Intelligent Orchestration
- **Specialist matching**: Automatically launches the right expert agents for each task
- **Parallel execution**: Coordinates multiple agents working on non-conflicting components
- **Progress tracking**: Real-time visibility into implementation progress
- **Error recovery**: Handles issues and blocks gracefully with appropriate specialists

### Complete Implementation Assurance
- **Nothing forgotten**: Systematic approach ensures no requirements are missed
- **Quality standards**: All code meets project standards before being marked complete
- **Test coverage**: >80% test coverage target with meaningful, failure-capable tests
- **Documentation sync**: Keeps documentation updated as components are completed

## The spec:create Command

Creates comprehensive specifications that are immediately implementable:

### Smart Problem Validation
- **Prevents wrong solutions**: Validates the core problem before suggesting solutions
- **Avoids assumptions**: Questions user needs and technical constraints upfront
- **Finds simpler alternatives**: Explores if the problem can be solved without building anything

### Intelligent Research
- **Automatic codebase analysis**: Finds existing similar features and potential conflicts
- **Domain expertise**: Uses specialized subagents for technical research
- **Library integration**: Fetches up-to-date documentation when using external libraries

### Quality Assurance
- **Built-in validation**: Only creates specs that are actually implementable
- **Comprehensive coverage**: Ensures all critical sections are meaningfully filled
- **End-to-end thinking**: Maps complete system impact and user journeys

## What spec:create Creates

The command creates a comprehensive markdown file in the `specs/` folder with:

### File Naming Convention
- Features: `feat-{kebab-case-name}.md`
- Bugfixes: `fix-{issue-number}-{brief-description}.md`

### Document Structure

1. **Title** - Clear, descriptive title
2. **Status** - Draft/Under Review/Approved/Implemented
3. **Authors** - Author name and date
4. **Overview** - Brief description and purpose
5. **Background/Problem Statement** - Why this is needed
6. **Goals** - What to achieve
7. **Non-Goals** - What's out of scope
8. **Technical Dependencies** - Libraries, frameworks, versions
9. **Detailed Design** - Architecture, implementation approach
10. **User Experience** - How users interact with the feature
11. **Testing Strategy** - Unit, integration, E2E tests
12. **Performance Considerations** - Impact and mitigation
13. **Security Considerations** - Security implications
14. **Documentation** - What docs need updating
15. **Implementation Phases** - MVP, enhanced features, polish
16. **Open Questions** - Unresolved decisions
17. **References** - Related issues, PRs, docs

## Features

### External Library Integration

When your feature uses external libraries, the command:
- Searches for the library using context7 MCP server tools
- Retrieves up-to-date documentation
- Includes accurate code examples
- References best practices

**Note**: This feature requires the context7 MCP server to be configured in your Claude Code settings. If not available, the command will still generate specs but without automatic library documentation retrieval.

### Codebase Analysis

Before writing the spec, it:
- Searches for related existing features
- Identifies similar patterns
- Checks for potential conflicts
- Verifies current library versions

### Comprehensive Coverage

The spec addresses:
- Edge cases and error scenarios
- Performance implications
- Security considerations
- Testing strategies
- Documentation needs

## Best Practices

1. **Be Specific** - Include concrete details about implementation
2. **Consider Edge Cases** - Think about error scenarios
3. **Reference Patterns** - Use existing project conventions
4. **Include Examples** - Add code snippets where helpful
5. **Plan Phases** - Break complex features into phases

## Example Spec

```markdown
# Add User Authentication with OAuth2

**Status**: Draft
**Authors**: Claude, 2024-01-15

## Overview
Implement OAuth2-based authentication to allow users to sign in with Google and GitHub...

## Goals
- Enable OAuth2 authentication
- Support Google and GitHub providers
- Secure session management
...
```

## When to Use

Use `/spec:create` when:
- Starting a new feature
- Planning a complex bugfix
- Need stakeholder review before implementation
- Want to document architectural decisions
- Working with external libraries/APIs

## Complete Development Workflow

### Smart Planning
```bash
# Plan with problem validation and overengineering detection
/spec:create "your feature description"
/spec:validate specs/your-spec.md
```

**What you get:**
- **Right problems solved**: First principles analysis prevents building the wrong thing
- **Lean specifications**: Aggressive overengineering detection cuts unnecessary complexity
- **Implementable specs**: Quality gates ensure specs are actually buildable

### Quality Implementation  
```bash
# Transform into self-contained tasks and execute with quality assurance
/spec:decompose specs/your-spec.md
/spec:execute specs/your-spec.md
```

**What you get:**
- **Nothing forgotten**: Every requirement gets implemented and reviewed
- **Parallel development**: Clear task dependencies enable concurrent work
- **Quality assured**: Built-in reviews and testing for every component
- **Persistent progress**: Work continues across development sessions

### Key Benefits

- **Prevents overengineering**: YAGNI principles built into the validation process
- **Ensures completeness**: Mandatory reviews catch incomplete implementations  
- **Enables parallelization**: Smart task breakdown allows concurrent development
- **Maintains quality**: Every component is tested and reviewed before completion
- **Provides visibility**: Clear progress tracking and audit trail throughout development