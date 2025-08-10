# Subagent Development Guide for Claudekit

This guide provides comprehensive instructions for creating new subagents in claudekit, based on established patterns and best practices.

## Related Documentation

- [Domain Expert Principles](./subagents-principles.md) - Core principles for designing domain experts
- [Official Subagents Documentation](./official-subagents-documentation.md) - Claude's official subagent capabilities
- [Feature Specification](../specs/feat-domain-expert-subagents-suite.md) - Complete subagent suite specification
- [Agent Research Report](../reports/agent-research/AGENT_RESEARCH_REPORT.md) - Research findings on agent patterns

## Table of Contents
- [Overview](#overview)
- [Core Principles](#core-principles)
- [Directory Structure](#directory-structure)
- [Creating a Subagent](#creating-a-subagent)
- [Metadata Fields](#metadata-fields)
- [Writing Effective Subagents](#writing-effective-subagents)
- [Testing and Validation](#testing-and-validation)
- [Examples](#examples)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

Subagents in claudekit are specialized AI agents that extend Claude's capabilities in specific domains. They follow a consistent structure and can be invoked automatically by Claude when it recognizes tasks matching their expertise.

### What is a Subagent?

A subagent is:
- A markdown file with YAML frontmatter defining metadata
- A specialized expert in a particular domain or task type
- Automatically discoverable and invocable by Claude
- Self-contained with all necessary instructions and context

## Core Principles

Based on the [Domain Expert Principles](./subagents-principles.md) and [Official Documentation](./official-subagents-documentation.md):

### 1. **Complete Domain Coverage**
- Cover an entire problem domain comprehensively
- Don't create overly narrow agents (e.g., "React useState expert")
- Aim for coherent domains like "TypeScript expert" or "Database expert"

### 2. **Clear Invocation Triggers**
- The `description` field tells Claude WHEN to use the agent
- Write descriptions that Claude can pattern-match against user requests
- Include "Use PROACTIVELY" for agents that should be used automatically

### 3. **Self-Contained Instructions**
- Each subagent should contain all necessary knowledge
- Don't rely on external files or dependencies
- Include examples, patterns, and reference materials

### 4. **Tool Restrictions**
- Explicitly define allowed tools in the `tools` field
- Restrict tools to only what's necessary for the task
- Consider security implications of tool access

## Directory Structure

```
claudekit/
├── src/
│   └── agents/                 # Source subagent files
│       ├── oracle.md           # Universal agents at root
│       ├── typescript/         # Domain-specific directories
│       │   └── expert.md
│       ├── react/
│       ├── database/
│       └── testing/
└── .claude/
    └── agents/                 # Symlinked for runtime use
        └── oracle.md -> ../../src/agents/oracle.md
```

### Naming Conventions

- **Universal agents**: Place at `src/agents/[name].md`
- **Domain-specific agents**: Place at `src/agents/[domain]/[name].md`
- Use descriptive names: `expert.md`, `analyzer.md`, `optimizer.md`
- Avoid redundant prefixes (not `typescript-typescript-expert.md`)

## Creating a Subagent

### Step 1: Research and Discovery

Before writing any code, thorough research is essential for creating an effective subagent. This phase often determines the success of your subagent.

#### Research Methodology

**1. Domain Analysis**
Start by understanding the complete landscape of your domain:

```markdown
## Research Questions to Answer:
- What are the core concepts and terminology?
- What are the common problems developers face?
- What tools and technologies are standard?
- What are the best practices and anti-patterns?
- What resources do experts rely on?

## Problem Prioritization (Frequency × Complexity):
Identify 15+ recurring problems and rate each:
- Frequency: HIGH/MEDIUM/LOW (how often it occurs)
- Complexity: HIGH/MEDIUM/LOW (how hard to solve)
- Priority = Frequency × Complexity score
Example: "Too many re-renders" (HIGH freq, MEDIUM complexity)
```

**2. Tool and Technology Survey**

Research existing tools that experts use:
```bash
# Example: Researching TypeScript tooling
- tsc (TypeScript compiler) - capabilities, flags, performance options
- tsx, ts-node - runtime execution tools
- Biome, ESLint - linting and formatting
- Vite, Webpack, Rollup - build tools
- Type testing tools - vitest, tsd
```

**3. Documentation Mining**

Gather authoritative sources:
- Official documentation and guides
- GitHub issues and discussions for common problems
- Stack Overflow patterns and solutions
- Blog posts from recognized experts
- Conference talks and tutorials

**4. Pattern Recognition**

Identify recurring patterns in the domain:
- Common error messages and their solutions
- Typical workflow sequences
- Decision trees experts use
- Performance optimization strategies
- Migration and upgrade patterns

#### Research Output Template

Create both a research report AND a problem matrix before implementing your subagent:

**1. Research Report (markdown):**
```markdown
# [Domain] Expert Research Report

## 1. Scope and Boundaries
- One-sentence scope: "[Core expertise areas]"
- 15 Recurring Problems (with frequency × complexity ratings)
- Sub-domain mapping (when to delegate to specialists)

## 2. Topic Map (6 Categories)
### Category 1: [Name]
- Common Error Messages: [List actual errors]
- Root Causes: [Why these occur]
- Fix Strategies:
  1. Minimal: [Quick fix]
  2. Better: [Proper solution]
  3. Complete: [Refactor approach]
- Diagnostics: [Commands to identify]
- Validation: [How to verify fix]
- Links: [Official documentation]

### Category 2-6: [Continue pattern...]

## Expert Knowledge Base
### Critical Commands
```bash
# Command with explanation
command --flag # What this does and when to use it
```

### Decision Frameworks
| Scenario | Recommended Approach | Reasoning |
|----------|---------------------|-----------|
| [Case 1] | [Solution] | [Why] |
| [Case 2] | [Solution] | [Why] |

### Code Patterns
```language
// Pattern name and purpose
// Working example with explanation
```

## Tools & Resources
### Essential Tools
- Tool name: Purpose and key features
- Installation: How to set up
- Key commands: Most important operations

### Authoritative Resources
- [Official Docs](URL): What to find there
- [Expert Blog](URL): Specialized knowledge
- [Tool Repo](URL): Issues and examples

## Research Gaps
- What couldn't be determined
- Areas needing more investigation
- Questions for domain experts
```

**2. Problem Matrix (CSV):**
Save as `reports/agent-research/[domain]/expert-matrix.csv`:
```csv
Category,Symptom/Error,Root Cause,Fix 1,Fix 2,Fix 3,Diagnostic Command,Validation Step,Official Link
Hooks Hygiene,"Invalid hook call",Hook called conditionally,Move to top level,Restructure logic,Create custom hook,Check structure,No errors,react.dev/rules
Performance,"Too many re-renders",State in render,Use event handler,Add dependencies,Refactor state,DevTools check,Stable renders,react.dev/memo
[Continue with 20-50 rows covering all problems]
```

#### Research Examples

**Oracle Agent Research:**
For the oracle agent, the research revealed:
1. **Multiple CLI tools** exist for GPT-5 access (cursor-agent, codex, opencode)
2. **Common patterns**: All tools use similar prompt/model/force flags
3. **Key insight**: Fallback strategy needed as tool availability varies
4. **Decision**: Check tools sequentially, stop at first available

**Comprehensive Research Examples:**
- Full suite specification: [Domain Expert Subagents Suite](../specs/feat-domain-expert-subagents-suite.md)
- Research reports: Browse [Agent Research Reports](../reports/agent-research/) directory
- Example: [React Expert Research](../reports/agent-research/react/expert-research.md) + [Matrix](../reports/agent-research/react/expert-matrix.csv)

The research phase produced 22 agents with:
- 500+ documented issues with progressive solutions
- 200+ links to official documentation
- CSV matrices for rapid agent development

#### Research Tools and Techniques

**1. GitHub Code Search**
```bash
# Find how experts use specific tools
# Search: "filename:*.md oracle GPT-5"
# Search: "language:typescript tsc --extendedDiagnostics"
```

**2. Package Analysis**
```bash
# Analyze popular packages in the ecosystem
npm info [package] # Check package details
npm ls [package] # See dependency tree
npx npmgraph [package] # Visualize dependencies
```

**3. Documentation Aggregation**
- Use `/agent:oracle` to analyze multiple docs
- Create comparison matrices for similar tools
- Extract command patterns from CLI help texts

**4. Community Research**
- Discord/Slack communities for real-world problems
- GitHub Discussions for design decisions
- Twitter/X for latest developments and tips

### Step 2: Define the Agent's Purpose

Based on your research, clearly define:
1. **Domain**: Specific area of expertise identified through research
2. **Tasks**: Concrete tasks discovered in research
3. **Triggers**: Problem patterns that should invoke this agent
4. **Tools**: Minimum tools needed based on research findings

### Step 3: Create the Agent File

Create the markdown file in the appropriate location:

```bash
# For universal agents
touch src/agents/my-agent.md

# For domain-specific agents
mkdir -p src/agents/mydomain
touch src/agents/mydomain/expert.md
```

### Step 4: Write the Frontmatter

Add YAML frontmatter with required and optional fields:

```yaml
---
name: my-agent
description: Use this agent for [specific tasks]. Use PROACTIVELY when [conditions].
tools: Bash, Read, Grep  # Optional - inherits all tools if omitted
category: technology     # 'universal', 'technology', or 'optional'
universal: false         # true for universal helpers (overrides category)
defaultSelected: false   # true to pre-select in setup
displayName: My Agent    # Human-readable name for UI
bundle: [related-agent]  # Optional: agents to install together
---
```

### Step 5: Write the Agent Instructions

Structure your agent following this template:

```markdown
# Agent Name

You are [role description with specific expertise].

## When invoked:

1. [First step - usually detection or analysis]
   ```bash
   # Example commands if applicable
   ```

2. [Second step - main task execution]

3. [Third step - validation or reporting]

## [Domain] Expertise

### [Specific Area 1]

**[Pattern or Technique Name]**
```language
// Code example
```
- Use for: [When to use this]
- Avoid: [When not to use this]
- Resource: [Link to documentation]

### [Specific Area 2]
[Continue pattern...]

## [Problem Resolution Patterns]

### [Common Problem Type]
[Solution approach with examples]

## Quick Decision Trees

```
Situation? → Decision
├─ Condition A → Action 1
├─ Condition B → Action 2
└─ Condition C → Action 3
```

## Resources

- [Authoritative documentation links]
- [Tool references]
- [Best practices guides]
```

### Step 6: Making Your Agent Appear in Setup

The claudekit system **automatically discovers** your agent and groups it based on metadata:

#### For Universal Agents
Agents available for all projects (like oracle, code-reviewer):
```yaml
---
name: oracle
description: Advanced analysis expert...
universal: true
defaultSelected: true  # Optional: pre-selected by default
---
```
✅ **No code changes needed** - Just set `universal: true`

#### For Technology-Specific Agents
Agents for specific technology stacks:
```yaml
---
name: python-expert
description: Python development expert
category: technology
universal: false
bundle: [python-linter, python-formatter]  # Optional: related agents
---
```
✅ **No code changes needed** - Just set `category: technology`

#### For Optional/Specialized Agents
Agents that are optional extras:
```yaml
---
name: accessibility-expert
description: Accessibility testing expert
category: optional
universal: false
---
```
✅ **No code changes needed** - Just set `category: optional`

#### For Mutually Exclusive Agents (Radio Groups)
For test frameworks, databases, etc. that are mutually exclusive:
1. Add appropriate metadata to the agent
2. Update `AGENT_RADIO_GROUPS` in `cli/lib/agents/registry-grouping.ts`:
```typescript
{
  id: 'test-framework',
  title: 'Test Framework',
  type: 'radio',
  options: [
    { id: 'jest', label: 'Jest', agents: ['jest-expert'] },
    { id: 'vitest', label: 'Vitest', agents: ['vitest-expert'] },
    { id: 'both', label: 'Both', agents: ['jest-expert', 'vitest-expert'] },
    { id: 'none', label: 'None', agents: [] },
  ],
}
```
⚠️ **Requires code changes** - Radio groups define mutual exclusivity relationships

### Step 7: Create the Symlink

Create a symlink in `.claude/agents/` for runtime discovery:

```bash
# From project root
ln -sf ../../src/agents/my-agent.md .claude/agents/my-agent.md

# Or for domain-specific
ln -sf ../../../src/agents/mydomain/expert.md .claude/agents/mydomain-expert.md
```

### Step 8: Test the Agent

#### Test in Setup
Run `claudekit setup` and verify your agent appears in the correct section.

#### Test Invocation
Test your agent by invoking it explicitly:

```
Use the my-agent subagent to [test task]
```

Or let Claude invoke it automatically when the task matches the description field.


## Metadata Fields

### Standard Claude Code Fields

Per the [official documentation](./official-subagents-documentation.md#configuration-fields):

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `name` | Yes | string | Unique identifier using lowercase letters and hyphens | `code-reviewer` |
| `description` | Yes | string | Natural language description of when to invoke | `Use this agent for audits...` |
| `tools` | No | string | Comma-separated list of tools. If omitted, inherits all | `Bash, Read, Grep` |

### Claudekit Extension Fields

For integration with `claudekit setup`, these additional metadata fields can be included:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `category` | string | Agent grouping: `technology`, `optional` | `technology` |
| `universal` | boolean | If true, appears in "Universal Helpers" section (overrides category) | `true` |
| `defaultSelected` | boolean | Pre-selected in setup | `true` |
| `displayName` | string | Human-readable name for setup UI | `Oracle (GPT-5)` |
| `bundle` | string[] | Related agents to install together | `[python-linter, python-formatter]` |

**Note**: These extension fields are parsed from the frontmatter by claudekit's registry system but are not part of the official Claude Code spec. Both `universal` and `category` fields work automatically to control agent grouping in the setup UI.

## Writing Effective Subagents

### 1. Clear Role Definition

Start with a concise role statement:
```markdown
You are an advanced TypeScript expert with deep knowledge of type-level programming, performance optimization, and modern tooling.
```

### 2. Structured Methodology

Use numbered steps for systematic approaches:
```markdown
## When invoked:

1. Analyze the current environment
2. Identify the specific problem
3. Apply appropriate solution
4. Validate the results
```

### 3. Practical Examples

Include real, working code examples:
```typescript
// Good: Specific, practical example
type Brand<K, T> = K & { __brand: T };
type UserId = Brand<string, 'UserId'>;

// Bad: Vague or theoretical
// "Use branded types for better type safety"
```

### 4. Decision Frameworks

Provide clear decision criteria:
```markdown
| Situation | Solution | Reason |
|-----------|----------|--------|
| < 10 packages | Turborepo | Simplicity |
| > 50 packages | Nx | Performance |
| Complex deps | Nx | Visualization |
```

### 5. Resource Links

Include authoritative references:
```markdown
## Resources
- [Official TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Performance Guide](https://github.com/microsoft/TypeScript/wiki/Performance)
```

## Examples

### Example 1: Oracle Agent (Analysis-Focused)

The oracle agent demonstrates:
- External tool integration (GPT-5 CLI tools)
- Fallback strategies
- Read-only analysis pattern
- Tool restriction (Bash only)

Key pattern:
```markdown
1. Check if cursor-agent is available
   If available, run: `cursor-agent -p "[request]" --model gpt-5` and stop
2. Check if codex is available
   If available, run: `codex exec "[request]" --model gpt-5` and stop
3. Fallback to Claude's analysis
```

### Example 2: TypeScript Expert (Implementation-Focused)

The TypeScript expert demonstrates:
- Comprehensive domain coverage
- Delegation to specialized sub-experts
- Practical code examples
- Performance considerations
- Migration strategies

Key pattern:
```markdown
0. If ultra-specific expertise needed, delegate and stop
1. Analyze project setup comprehensively
2. Identify problem category
3. Apply appropriate solution
4. Validate thoroughly
```

## Common Patterns

### Pattern 1: Tool Detection and Fallback

```markdown
```bash
if which tool1 >/dev/null 2>&1; then
    tool1 command
elif which tool2 >/dev/null 2>&1; then
    tool2 command
else
    # Fallback approach
fi
```
```

### Pattern 2: Delegation to Specialists

```markdown
0. If the issue requires ultra-specific expertise:
   - Deep webpack internals → webpack-expert
   - Complex SQL optimization → database-expert
   
   Output: "This requires [specialty]. Please invoke: 'Use the [expert] subagent.' Stopping here."
```

### Pattern 3: Structured Analysis

```markdown
## Analysis Summary
**Problem**: [Concise statement]
**Severity**: Critical/High/Medium/Low
**Root Cause**: [Primary cause]
**Recommendation**: [Primary action]
```

### Pattern 4: Environment Detection

```markdown
# Detect project type
if [ -f "package.json" ]; then
    # Node.js project
elif [ -f "Cargo.toml" ]; then
    # Rust project
elif [ -f "go.mod" ]; then
    # Go project
fi
```

## Testing and Validation

### 1. Frontmatter Validation

Ensure all required fields are present:
```bash
# Check for required fields
grep -E "^name:|^description:" src/agents/my-agent.md
```

### 2. Symlink Verification

Verify symlinks are correctly created:
```bash
ls -la .claude/agents/ | grep my-agent
```

### 3. Invocation Testing

Test different invocation patterns:
```
# Explicit invocation
Use the my-agent subagent to perform a simple task

# Complex task
Use the my-agent subagent to analyze this complex problem with context

# Automatic invocation
[Task that matches the agent's description field]
```

### 4. Tool Access Testing

Verify tool restrictions work:
- Agent with `tools: Bash` should not be able to Read files
- Agent with no tools field should have full access

## Troubleshooting

### Agent Not Found

**Problem**: "Use the my-agent subagent" doesn't work

**Solutions**:
1. Check symlink exists: `ls -la .claude/agents/`
2. Verify frontmatter has `name` field
3. Ensure no syntax errors in YAML

### Agent Not Invoked Automatically

**Problem**: Claude doesn't invoke agent for matching tasks

**Solutions**:
1. Make description more specific and pattern-matchable
2. Add "Use PROACTIVELY" to description
3. Ensure `defaultSelected: true` for auto-enablement

### Tool Access Errors

**Problem**: Agent can't use expected tools

**Solutions**:
1. Explicitly list tools in `tools` field
2. Check for typos in tool names
3. Verify tool permissions in Claude Code

### Delegation Not Working

**Problem**: Agent doesn't delegate to specialists

**Solutions**:
1. Ensure delegation logic is in step 0
2. Include "Stopping here." after delegation
3. Make delegation conditions clear and specific

## Best Practices

1. **Research First**: Spend significant time researching before writing any code
2. **Start Simple**: Begin with basic functionality, then add complexity
3. **Test Incrementally**: Test each section as you write it
4. **Document Assumptions**: Clearly state what environment or tools you expect
5. **Provide Examples**: Include working code examples from your research
6. **Link Resources**: Always provide authoritative documentation links
7. **Consider Security**: Restrict tools to minimum necessary
8. **Plan for Failure**: Include fallback strategies and error handling
9. **Keep Updated**: Review and update agents as tools and practices evolve
10. **Save Research**: Keep research reports in `reports/` for future reference

## Conclusion

Creating effective subagents requires:
- **Thorough research** of the domain and its tools
- Clear understanding of common problems and solutions
- Structured, systematic approach to implementation
- Practical, working examples from real-world usage
- Proper metadata configuration for claudekit integration
- Comprehensive testing of all scenarios

The research phase is the foundation of a great subagent. Time invested in understanding the domain, tools, and expert patterns will result in a subagent that truly extends Claude's capabilities effectively.

Follow this guide and the established patterns to create subagents that seamlessly extend Claude's capabilities in your specific domains.