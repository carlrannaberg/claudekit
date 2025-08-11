# Subagent Development Guide for Claudekit

This guide provides comprehensive instructions for creating research-driven, high-quality subagents that extend Claude's capabilities in specific domains.

## Related Documentation

- [Domain Expert Principles](./subagents-principles.md) - Core principles for designing domain experts
- [Official Subagents Documentation](./official-subagents-documentation.md) - Claude's official subagent capabilities
- [Feature Specification](../specs/feat-domain-expert-subagents-suite.md) - Complete subagent suite specification
- [Agent Research Reports](../reports/agent-research/) - Examples of comprehensive domain research

## Table of Contents
- [Overview](#overview)
- [Core Principles](#core-principles)
- [The Research Phase](#the-research-phase)
- [Implementation Guide](#implementation-guide)
- [Testing and Validation](#testing-and-validation)
- [Patterns and Examples](#patterns-and-examples)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

Subagents are specialized AI assistants that provide concentrated expertise in specific domains. They operate with their own context windows, tool permissions, and knowledge bases, allowing Claude to delegate complex tasks to domain experts.

### What Makes a Great Subagent?

A successful subagent combines:
- **Deep domain research** - Understanding of 15+ common problems and their solutions
- **Clear boundaries** - Well-defined scope and delegation rules
- **Practical knowledge** - Working examples from real-world usage
- **Smart tool usage** - Only the permissions necessary for the task

### How Subagents Work

1. **Claude recognizes** a task matching the agent's description
2. **Delegates** the task to the specialized subagent
3. **Subagent analyzes** using its concentrated domain knowledge
4. **Returns results** to continue the conversation

## Core Principles

Based on [Domain Expert Principles](./subagents-principles.md) and proven patterns from 22 production agents:

### 1. Complete Domain Coverage
Cover an entire problem domain comprehensively. Avoid overly narrow agents (❌ "React useState expert") in favor of coherent domains (✅ "React expert", "TypeScript expert").

### 2. Research-Driven Development
Every subagent must be built on thorough research documenting common problems, solutions, and patterns. This research forms the foundation of effective agents.

### 3. Clear Invocation Triggers
Write descriptions that Claude can pattern-match: "Use this agent for [specific scenarios]. Use PROACTIVELY when [conditions]."

### 4. Self-Contained Knowledge
Include all necessary information within the agent. Don't rely on external files or assume prior context.

### 5. Minimal Tool Permissions
Grant only essential tools. For analysis agents: `Read, Grep, Glob`. For implementation agents: add `Edit, Write`. For system agents: add `Bash`.

## The Research Phase

**Research is the foundation of every great subagent.** Before writing any code, invest time understanding the domain thoroughly. The research phase typically produces:
- 15+ documented problems with solutions
- 6 problem categories for organization
- 20-50 issue patterns in a CSV matrix
- Links to authoritative documentation

### Research Methodology

#### 1. Domain Analysis

Start with fundamental questions:
- What are the core concepts and terminology?
- What problems do developers face daily?
- What tools and technologies are standard?
- What are recognized best practices?
- What anti-patterns should be avoided?

**Problem Prioritization Matrix:**
```
Problem: "Too many re-renders"
Frequency: HIGH (happens often)
Complexity: MEDIUM (moderate difficulty)
Priority: HIGH × MEDIUM = High Priority
```

Target 15+ problems, rating each by frequency × complexity.

#### 2. Tool and Technology Survey

Map the ecosystem:
```bash
# Example: TypeScript tooling research
- tsc: Compiler capabilities, flags, performance
- tsx/ts-node: Runtime execution options
- Biome/ESLint: Linting and formatting tools
- Vite/Webpack: Build tool integration
- vitest/tsd: Type testing approaches
```

#### 3. Documentation Mining

Gather authoritative sources:
- **Official docs** - Primary reference (react.dev, nodejs.org)
- **GitHub issues** - Common problems and solutions
- **Stack Overflow** - Recurring patterns
- **Expert blogs** - Advanced techniques
- **Conference talks** - Best practices

#### 4. Pattern Recognition

Identify recurring themes:
- Common error messages → Root causes → Solutions
- Typical workflow sequences
- Decision trees experts use
- Performance optimization patterns
- Migration and upgrade strategies

### Research Outputs

Your research should produce two key deliverables:

#### 1. Research Report (Markdown)

Save as `reports/agent-research/[domain]/expert-research.md`:

```markdown
# [Domain] Expert Research Report

## 1. Scope and Boundaries
- One-sentence scope: "React patterns, hooks, performance, SSR/hydration"
- 15 Recurring Problems (with frequency × complexity ratings)
- Sub-domain mapping (when to delegate to specialists)

## 2. Topic Map (6 Categories)

### Category 1: Hooks Hygiene
**Common Errors:**
- "Invalid hook call. Hooks can only be called inside function components"
- "React Hook useEffect has missing dependencies"

**Root Causes:**
- Calling hooks conditionally or in loops
- Missing dependency array values

**Fix Strategies:**
1. Minimal: Add missing dependencies
2. Better: Extract custom hooks
3. Complete: Refactor component architecture

**Diagnostics:**
```bash
npx eslint src/ --rule react-hooks/exhaustive-deps
```

**Validation:**
- No ESLint warnings
- Components render without errors

**Resources:**
- [Rules of Hooks](https://react.dev/reference/rules-of-hooks)
- [useEffect Guide](https://react.dev/reference/react/useEffect)

### Categories 2-6: [Continue pattern...]
```

#### 2. Problem Matrix (CSV)

Save as `reports/agent-research/[domain]/expert-matrix.csv`:

```csv
Category,Symptom/Error,Root Cause,Fix 1,Fix 2,Fix 3,Diagnostic,Validation,Link
Hooks,"Invalid hook call",Conditional call,Move to top,Restructure,Custom hook,Check code,No errors,react.dev
Performance,"Too many renders",State in render,Event handler,Dependencies,Refactor,DevTools,Stable,react.dev
[20-50 rows covering all identified problems]
```

### Research Examples

The research phase for claudekit's 22 agents produced:
- **500+ documented issues** with progressive solutions
- **200+ official documentation links**
- **Comprehensive problem matrices** for rapid development

Browse examples:
- [React Expert Research](../reports/agent-research/react/expert-research.md) + [Matrix](../reports/agent-research/react/expert-matrix.csv)
- [Full Suite Specification](../specs/feat-domain-expert-subagents-suite.md)
- [All Research Reports](../reports/agent-research/)

## Implementation Guide

With research complete, follow these steps to implement your subagent:

### Step 1: Define Purpose and Boundaries

Based on your research, clearly establish:
- **Domain**: Specific expertise area (e.g., "React development")
- **Tasks**: Concrete problems it solves (from research)
- **Triggers**: Patterns that invoke this agent
- **Delegation**: When to recommend specialists

### Step 2: Choose File Location

```bash
# Universal agents (all projects need them)
src/agents/oracle.md
src/agents/code-reviewer.md

# Domain-specific agents (organized by domain)
src/agents/typescript/expert.md
src/agents/react/expert.md
src/agents/database/postgres-expert.md
```

Create your file:
```bash
# Universal agent
touch src/agents/my-agent.md

# Domain-specific
mkdir -p src/agents/mydomain
touch src/agents/mydomain/expert.md
```

### Step 3: Write Frontmatter with Metadata

The frontmatter controls how your agent is discovered and grouped:

```yaml
---
# Required Claude Code fields
name: my-agent                    # Unique identifier
description: Use this agent for... # When Claude should invoke
tools: Bash, Read, Grep           # Allowed tools (omit for all)

# Claudekit grouping fields (automatic discovery)
category: technology              # 'technology' or 'optional'
universal: false                  # true for universal helpers
defaultSelected: false            # Pre-selected in setup
displayName: My Agent             # UI display name
bundle: [related-agent]           # Install together
---
```

#### Metadata Field Reference

**Standard Claude Code Fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | Natural language trigger for Claude |
| `tools` | No | Comma-separated tools (inherits all if omitted) |

**Claudekit Extension Fields:**
| Field | Description | Values |
|-------|-------------|---------|
| `category` | Grouping for setup UI | `technology`, `optional` |
| `universal` | Shows in "Universal Helpers" | `true`/`false` |
| `defaultSelected` | Pre-selected in setup | `true`/`false` |
| `displayName` | Human-readable name | Any string |
| `bundle` | Related agents | Array of agent names |
| `color` | Visual color in Claude Code UI | `indigo`, `#3b82f6` |

### Step 4: Structure Agent Content

Transform your research into the agent body:

```markdown
# [Domain] Expert

You are [role with specific expertise from research].

## When invoked:

0. If ultra-specific expertise needed, recommend specialist:
   - Deep webpack issues → webpack-expert
   - Complex SQL → database-expert
   Output: "This requires [specialty]. Use the [expert] subagent. Stopping here."

1. Detect environment and adapt:
   ```bash
   # Check project setup
   test -f package.json && echo "Node.js project"
   test -f tsconfig.json && echo "TypeScript enabled"
   ```

2. Apply domain expertise to solve the problem

3. Validate solution works as expected

## [Domain] Expertise

[Transform your research categories into sections]

### Hooks Hygiene
[From research: problems, solutions, patterns]

### Performance Optimization
[From research: diagnostics, fixes, validation]

## Quick Decision Trees

[From research: decision frameworks]
```
< 10 packages → Turborepo
> 50 packages → Nx
Complex deps → Nx with visualization
```

## Resources

[From research: authoritative links]
- [Official Docs](url)
- [Best Practices](url)
```

### Step 5: Setup Integration

Your agent is automatically discovered by claudekit based on metadata:

**Universal Agents** (`universal: true`):
- Appear in "Universal Helpers" section
- Recommended for all projects
- Examples: oracle, code-reviewer

**Technology Agents** (`category: technology`):
- Appear in "Technology Stack" section  
- Project-specific tools
- Examples: typescript-expert, react-expert

**Optional Agents** (`category: optional`):
- Appear in "Optional" section
- Specialized tools
- Examples: accessibility-expert, css-expert

**Radio Groups** (mutually exclusive):
- Require manual update to `AGENT_RADIO_GROUPS` in `cli/lib/agents/registry-grouping.ts`
- For test frameworks, databases, build tools

### Step 6: Create Runtime Symlink

Enable runtime discovery:

```bash
# From project root
ln -sf ../../src/agents/my-agent.md .claude/agents/my-agent.md

# For domain-specific agents
ln -sf ../../../src/agents/mydomain/expert.md .claude/agents/mydomain-expert.md
```

## Testing and Validation

### 1. Verify Structure

```bash
# Check required frontmatter
grep -E "^name:|^description:" src/agents/my-agent.md

# Verify symlink
ls -la .claude/agents/ | grep my-agent
```

### 2. Test in Setup

```bash
claudekit setup
# Verify agent appears in correct section
```

### 3. Test Invocation

```
# Explicit invocation
Use the my-agent subagent to analyze this code

# Automatic invocation
[Problem that matches agent description]
```

### 4. Validate Tool Restrictions

- Agent with `tools: Bash` → Cannot read files
- Agent with no `tools` field → Full access
- Test actual tool usage matches permissions

## Patterns and Examples

### Successful Agent Patterns

#### Oracle Agent Pattern
**Purpose**: External tool integration for enhanced analysis
```markdown
1. Check if cursor-agent is available
   If yes: cursor-agent -p "[request]" --model gpt-5
2. Check if codex is available  
   If yes: codex exec "[request]" --model gpt-5
3. Fallback to Claude's analysis
```

#### TypeScript Expert Pattern
**Purpose**: Comprehensive domain coverage with delegation
```markdown
0. If ultra-specific expertise needed, delegate and stop
1. Analyze project setup comprehensively
2. Identify problem category from research
3. Apply appropriate solution
4. Validate thoroughly
```

### Common Implementation Patterns

#### Environment Detection
```bash
# Detect project type and tools
test -f package.json && echo "Node.js"
test -f tsconfig.json && echo "TypeScript"
which docker >/dev/null 2>&1 && echo "Docker available"
```

#### Delegation Logic
```markdown
0. If the issue requires ultra-specific expertise:
   - Deep webpack internals → webpack-expert
   - Complex SQL optimization → database-expert
   
   Output: "This requires [specialty]. Use the [expert] subagent. Stopping here."
```

#### Structured Problem Resolution
```markdown
## Problem: [From research]
**Severity**: High
**Root Cause**: [From research findings]
**Fix 1 (Quick)**: [Minimal change]
**Fix 2 (Better)**: [Proper solution]
**Fix 3 (Best)**: [Complete refactor]
```

## Troubleshooting

### Agent Not Found
- Verify symlink exists: `ls -la .claude/agents/`
- Check `name` field in frontmatter
- Ensure valid YAML syntax

### Not Invoked Automatically
- Make description more specific
- Add "Use PROACTIVELY" to description
- Set `defaultSelected: true`

### Tool Access Issues
- Explicitly list tools in frontmatter
- Check for typos in tool names
- Verify Claude Code permissions

### Delegation Not Working
- Place delegation logic in step 0
- Include "Stopping here." after delegation
- Make conditions specific and clear

## Color Feature

The `color` field in the YAML frontmatter allows you to customize the visual appearance of your agent in Claude Code:

```yaml
---
name: code-reviewer
description: Expert reviewer for code quality and best practices
tools: Read, Grep, Bash
color: indigo     # or "#3b82f6"
---
```

**Color Options:**
- Common color names: `red`, `blue`, `green`, `yellow`, `purple`, `indigo`, `cyan`, etc.
- Hex color codes: `#3b82f6`, `#ef4444`, `#10b981`
- Case-insensitive: `Red`, `RED`, `red` all work

**Notes:**
- This `color:` key is currently used by Claude Code and commonly seen in community agent templates
- While not yet documented in the official Claude Code documentation, it works in practice
- Examples from public repositories show usage like `color: red`, `color: Cyan`
- The feature is established and widely used in the Claude Code ecosystem

**Example Usage in the Wild:**
```yaml
# Testing framework agents
color: green    # For test-related agents

# Security/audit agents  
color: red      # For critical review agents

# Documentation agents
color: blue     # For documentation generators
```

This feature is particularly useful for visually distinguishing agents by their role or importance in the Claude Code interface.

## Best Practices

1. **Research First**: Invest significant time understanding the domain before implementation
2. **Document Problems**: Base your agent on real issues with proven solutions
3. **Test Incrementally**: Validate each section as you build
4. **Use Real Examples**: Include working code from your research
5. **Link Sources**: Always reference authoritative documentation
6. **Restrict Tools**: Grant minimum necessary permissions
7. **Plan Fallbacks**: Include error handling strategies
8. **Save Research**: Keep research artifacts in `reports/` for future reference
9. **Iterate Based on Usage**: Update agents as you discover new patterns

## Conclusion

Creating effective subagents is a research-driven process. The time invested in understanding the domain, documenting problems, and organizing solutions directly translates to agent quality. 

Follow this guide to create subagents that:
- Solve real problems developers face
- Provide expert-level domain knowledge
- Integrate seamlessly with claudekit
- Extend Claude's capabilities meaningfully

Your research is the foundation—build on it to create agents that truly make a difference.