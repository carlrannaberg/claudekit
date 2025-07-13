# Spec Command Documentation

The spec command suite (`/spec:create`, `/spec:validate`, `/spec:decompose`, `/spec:execute`) provides a complete specification-driven development workflow for features and bugfixes.

## Overview

This command generates detailed technical specifications that serve as blueprints for implementation. It ensures thorough planning before coding begins and creates a reference document for the development process.

## Dependencies

### Optional: context7 MCP Server
For enhanced library documentation integration, install the context7 MCP server:
- Provides `mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs` tools
- Enables automatic retrieval of up-to-date library documentation
- Includes official code examples and best practices

Installation:
```bash
# Step 1: Install globally
npm install -g @upstash/context7-mcp

# Step 2: Add to Claude Code
claude mcp add context7 context7-mcp
```

Without context7, the command still works but won't automatically fetch external library documentation.

### Optional: TaskMaster AI for Persistent Task Management
For enhanced task management with persistence across sessions, install TaskMaster AI:
- Provides persistent task storage and dependency management
- Enables the `/spec:decompose` command for breaking specs into tasks
- Enhances `/spec:execute` with organized task tracking
- Install with: `npm install -g task-master-ai`
- Safe initialization is handled automatically by `/spec:decompose`

Without TaskMaster AI, `/spec:execute` falls back to session-based TodoWrite tasks.

## Usage

```bash
# For a new feature
/spec:create add user authentication with OAuth2

# For a bugfix (include issue number)
/spec:create fix-123 memory leak in data processor

# Validate specification completeness
/spec:validate specs/feat-user-authentication.md

# Decompose spec into persistent tasks (requires TaskMaster AI)
/spec:decompose specs/feat-user-authentication.md

# Execute specification with task management
/spec:execute specs/feat-user-authentication.md
```

## The spec:validate Command

The `/spec:validate` command analyzes existing specifications to determine if they contain sufficient detail for autonomous implementation.

### What It Checks

1. **WHY - Intent and Purpose**
   - Background/Problem Statement clarity
   - Goals and Non-Goals definition
   - Success criteria

2. **WHAT - Scope and Requirements**
   - Features and functionality definition
   - API contracts and interfaces
   - Performance and security requirements

3. **HOW - Implementation Details**
   - Architecture and design patterns
   - Error handling and edge cases
   - Testing strategy

### Output
- Summary: Overall readiness assessment
- Critical Gaps: Must-fix issues
- Risk Areas: Potential challenges
- Recommendations: Next steps

## The spec:decompose Command

The `/spec:decompose` command breaks down validated specifications into persistent TaskMaster AI tasks with proper dependencies.

### Prerequisites
- TaskMaster AI installed globally: `npm install -g task-master-ai`
- The command will safely initialize TaskMaster if needed

### What It Does

1. **Analyzes the specification** to extract implementation phases
2. **Creates persistent tasks** in TaskMaster AI with proper dependencies
3. **Preserves all specification details** in task descriptions
4. **Establishes task dependencies** for logical implementation order
5. **Enables persistent tracking** across Claude Code sessions

### Task Structure

- **Foundation Tasks**: Database setup, backend framework, frontend setup, testing infrastructure
- **Feature Tasks**: Complete features with database + API + frontend + tests
- **Dependencies**: Vertical feature tasks depend on horizontal foundation tasks

### Benefits

- **Persistence**: Tasks survive Claude Code restarts
- **Dependencies**: Logical implementation order
- **Detail Preservation**: All spec details copied into tasks
- **Progress Tracking**: Visual progress with task status
- **Team Coordination**: Shared task visibility

## The spec:execute Command

The `/spec:execute` command takes a validated specification and orchestrates its implementation using concurrent AI agents.

### How It Works

**TaskMaster Mode** (when TaskMaster AI is available):
1. **Uses existing decomposed tasks** from `/spec:decompose`
2. **Executes tasks in dependency order**
3. **Updates TaskMaster task status** as work progresses
4. **Launches concurrent agents** for parallel tasks

**Session Mode** (fallback):
1. **Parses the specification** to extract implementation tasks
2. **Creates TodoWrite task list** for this session
3. **Launches concurrent agents** to work on non-conflicting components
4. **Tracks progress** through the todo system

### Agent Orchestration

The command typically launches agents for:
- **Database Layer** - Models, migrations, data access
- **API Layer** - Endpoints, validation, business logic  
- **Frontend** - UI components, forms, client logic
- **Testing** - Unit, integration, and E2E tests
- **Documentation** - API docs, guides, examples

### Success Criteria
- All todos completed
- All tests passing
- Code meets project standards
- Implementation matches specification

## What spec:create Creates

The command creates a markdown file in the `specs/` folder with:

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

## Integration with Workflow

### Standard Workflow
1. **Create spec**: `/spec:create feature description`
2. **Validate completeness**: `/spec:validate specs/your-spec.md`
3. **Review and refine** the spec
4. **Get approval** from stakeholders

### Enhanced Workflow (with TaskMaster AI)
1. **Create spec**: `/spec:create feature description`
2. **Validate completeness**: `/spec:validate specs/your-spec.md`
3. **Decompose into tasks**: `/spec:decompose specs/your-spec.md`
4. **Execute with persistent tracking**: `/spec:execute specs/your-spec.md`
5. **Update spec status** to "Implemented"

### Session-Based Workflow (without TaskMaster AI)
1. **Create spec**: `/spec:create feature description`
2. **Validate completeness**: `/spec:validate specs/your-spec.md`
3. **Execute with session tasks**: `/spec:execute specs/your-spec.md`
4. **Update spec status** to "Implemented"

This ensures thoughtful development and maintains documentation throughout the project lifecycle.