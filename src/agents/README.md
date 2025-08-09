# Claudekit Subagents Library

This directory contains specialized subagents for Claude Code that provide deep expertise in specific technical domains.

## Structure

Subagents are organized by domain:
- `typescript/` - TypeScript and JavaScript experts
- `react/` - React and frontend framework experts (future)
- `testing/` - Testing framework experts (future)
- `database/` - Database and data layer experts (future)

## Format

Each subagent is a markdown file with YAML frontmatter following Claude Code's native format:

```yaml
---
name: agent-identifier
description: Brief description of expertise
tools: Comma-separated list of allowed tools
---
```

## Current Agents

### TypeScript Expert (`typescript/expert.md`)
- Comprehensive TypeScript and JavaScript expertise
- Type system mastery
- Build configuration optimization
- Module resolution debugging
- Migration guidance

## Usage

Agents are automatically copied to `.claude/agents/` during `claudekit setup`.

Claude Code will automatically delegate to these agents based on task context.

## Contributing

To add a new subagent:
1. Create a new `.md` file in the appropriate domain folder
2. Follow the format requirements above
3. Add the agent to `cli/commands/setup.ts` agents array
4. Test the agent with real scenarios
5. Submit a pull request

## Best Practices

1. **Focused Expertise**: Each agent should have a clear domain
2. **Comprehensive Prompts**: Include all relevant expertise areas
3. **Practical Examples**: Provide real commands and patterns
4. **Tool Restrictions**: Only request necessary tools
5. **Educational Approach**: Explain while solving

## Agent Authoring Guidelines

### System Prompt Structure
1. Opening statement defining the agent's role
2. Core Expertise sections with bullet points
3. Approach methodology (numbered list)
4. Key commands and tools section
5. Common patterns with code examples
6. Best practices relevant to the domain

### Naming Conventions
- Use lowercase with hyphens: `typescript-expert`, not `TypeScriptExpert`
- Be specific but not too narrow: `react-expert` not `react-hooks-expert`
- Include domain in name when helpful: `typescript-type-expert`

### Tool Selection
Only request tools the agent actually needs:
- Read, Grep, Glob - for code analysis
- Edit, MultiEdit, Write - for code modifications
- Bash - for running commands
- WebSearch - only if current information needed

### Testing Your Agent
1. Install the agent: `claudekit setup`
2. Open a project in Claude Code
3. Ask questions relevant to the agent's domain
4. Verify delegation occurs (Claude mentions using the agent)
5. Test edge cases and complex scenarios

## Future Agents Roadmap

### Phase 1: Core Domain Experts
- ✅ typescript-expert - TypeScript/JavaScript
- ⏳ react-expert - React patterns and hooks
- ⏳ nodejs-expert - Node.js server patterns
- ⏳ testing-expert - Testing strategies

### Phase 2: Specialized Experts
- typescript-type-expert - Advanced type system
- react-performance-expert - React optimization
- database-postgres-expert - PostgreSQL
- docker-expert - Containerization

See the main specification for the complete roadmap.