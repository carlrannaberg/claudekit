# Spec Command Documentation

The `/spec:create` and `/spec:check` commands help you create and validate comprehensive specification documents for new features or bugfixes.

## Overview

This command generates detailed technical specifications that serve as blueprints for implementation. It ensures thorough planning before coding begins and creates a reference document for the development process.

## Dependencies

### Optional: context7 MCP Server
For enhanced library documentation integration, install the context7 MCP server:
- Provides `mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs` tools
- Enables automatic retrieval of up-to-date library documentation
- Includes official code examples and best practices

Without context7, the command still works but won't automatically fetch external library documentation.

## Usage

```bash
# For a new feature
/spec:create add user authentication with OAuth2

# For a bugfix (include issue number)
/spec:create fix-123 memory leak in data processor

# Check specification completeness
/spec:check specs/feat-user-authentication.md
```

## The spec:check Command

The `/spec:check` command analyzes existing specifications to determine if they contain sufficient detail for autonomous implementation.

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

1. Create spec first: `/spec:create feature description`
2. Check completeness: `/spec:check specs/your-spec.md`
2. Review and refine the spec
3. Get approval from stakeholders
4. Implement based on the spec
5. Update spec status to "Implemented"

This ensures thoughtful development and maintains documentation throughout the project lifecycle.