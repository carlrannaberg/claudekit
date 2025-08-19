# Subagent Development Guide for Claudekit

This guide provides comprehensive instructions for creating research-driven, high-quality subagents that extend Claude's capabilities in specific domains.

## Related Documentation

- [Official Subagents Documentation](../official/subagents.md) - Claude Code's subagent system and configuration
- [Prompting Guide](prompting-guide.md) - Patterns and best practices for effective subagent prompts
- [Domain Expert Principles](../internals/principles.md) - Core principles for designing domain experts
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

Based on [Domain Expert Principles](../internals/principles.md) and proven patterns from 22 production agents:

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

**Important Naming Convention**: Agent filenames should be fully descriptive. When agents are nested in domain directories, include the domain prefix in the filename to ensure unique, clear IDs. For example:
- ✅ `src/agents/typescript/typescript-expert.md` (not just `expert.md`)
- ✅ `src/agents/database/database-postgres-expert.md` (not just `postgres-expert.md`)
- ✅ `src/agents/testing/jest-testing-expert.md` (not just `jest-expert.md`)

This ensures agent IDs are consistent and unambiguous across the system.

```bash
# Universal agents (all projects need them)
src/agents/oracle.md
src/agents/code-review-expert.md

# Domain-specific agents (organized by domain)
src/agents/typescript/typescript-expert.md
src/agents/react/react-expert.md
src/agents/database/database-postgres-expert.md
```

Create your file:
```bash
# Universal agent
touch src/agents/my-agent.md

# Domain-specific (use full descriptive names)
mkdir -p src/agents/mydomain
touch src/agents/mydomain/mydomain-expert.md
```

### Step 3: Write Frontmatter with Metadata

The frontmatter controls how your agent is discovered and grouped:

```yaml
---
# Required official Claude Code fields:
name: my-agent
description: Use this agent for analyzing TypeScript compilation issues and build errors

# Optional official field:
tools: Read, Grep, Bash

# Claudekit extensions (all optional):
category: build
color: indigo
displayName: TypeScript Build Expert
bundle: ["typescript-expert"]
---
```

#### Field Documentation: Official vs Claudekit

**Official Claude Code Fields (from Claude Code documentation):**
| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Unique identifier (lowercase, hyphens only) |
| `description` | Yes | string | Natural language description of when this agent should be invoked |
| `tools` | No | string | Comma-separated list of allowed tools (inherits ALL if omitted) |

**Claudekit Extension Fields (all optional):**
| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `category` | string | Grouping for setup UI | `general`, `framework`, `testing`, `database`, `frontend`, `devops`, `build`, `linting`, `tools`, `universal` |
| `color` | string | Visual color in Claude Code UI | Named colors (`indigo`, `red`) or hex codes (`#3b82f6`) |
| `displayName` | string | Human-readable name for UI | Any string |
| `bundle` | array | Related agents to install together | Array of agent names |

#### Important: Tools Field Behavior

⚠️ **Critical Security Consideration**: The `tools` field behaves differently from commands' `allowed-tools`:

- **Subagents `tools:`** - Comma-separated STRING for broad domain expertise
  ```yaml
  tools: Read, Grep, Bash  # String format
  ```
  - If omitted, inherits ALL available tools (including destructive ones)
  - Designed for specialized domain experts who need broad access

- **Commands `allowed-tools:`** - Granular restrictions for specific tasks  
  ```yaml
  allowed-tools: Bash(git commit:*), Read  # Specific security restrictions
  ```
  - Required field for security
  - Allows fine-grained tool restrictions

**Design Philosophy:**
- **Subagents** = Domain experts with broad tool access for comprehensive analysis
- **Commands** = Specific workflows with minimal necessary permissions

#### Schema Validation

Claudekit validates subagent frontmatter using the official Claude Code schema plus extensions:

**Common Validation Errors:**
- `tools` field as array instead of string: `tools: [Read, Grep]` ❌ → `tools: Read, Grep` ✅
- Missing required fields: `name` and `description` are mandatory
- Invalid agent names: Must be lowercase with hyphens only (`my-agent`, not `My_Agent`)
- Unknown categories: Must be one of the valid category values listed above

**Run Validation:**
```bash
# Lint all subagents in .claude/agents
claudekit lint-subagents

# Lint subagents in a specific directory
claudekit lint-subagents path/to/agents

# Check overall project setup (counts agents, not schemas)
claudekit validate
```

The linter checks for:
- Valid frontmatter YAML syntax
- Required fields (`name` and `description`)
- Correct field names and types  
- Valid category values from the enum
- Proper name format (lowercase with hyphens)
- Tool names are recognized

### Step 4: Structure Agent Content

Transform your research into the agent body using the structured template from the [Prompting Guide](prompting-guide.md):

```markdown
---
# Required official Claude Code fields:
name: typescript-build-expert
description: Use this agent for TypeScript compilation issues, build errors, and compiler configuration problems

# Optional official field:
tools: Read, Grep, Bash

# Claudekit extensions (all optional):
category: build
color: indigo
displayName: TypeScript Build Expert
bundle: ["typescript-expert"]
---

# TypeScript Build Expert

You are a TypeScript build expert for Claude Code with deep knowledge of compilation, configuration, and build system integration.

## Delegation First
0. **If ultra-specific expertise needed, delegate and stop**:
   - Advanced type system issues (generics, conditionals) → typescript-type-expert 
   - Framework-specific build integration → react-expert, nextjs-expert
   
   Output: "This requires [specialty]. Use the [expert-name] subagent. Stopping here."

## Core Process
1. **Environment Detection**:
   ```bash
   # Detect project setup
   test -f tsconfig.json && echo "TypeScript project detected"
   which tsc >/dev/null 2>&1 && echo "TypeScript compiler available"
   test -f package.json && echo "Node.js project"
   ```

2. **Problem Analysis** (based on research categories):
   - Compiler errors and diagnostics
   - Configuration issues (tsconfig.json)
   - Module resolution problems
   - Build performance optimization

3. **Solution Implementation**:
   - Apply TypeScript best practices
   - Use proven configuration patterns
   - Validate with tsc and build tools

## TypeScript Build Expertise

### [Category 1]: [Problem Area from research]
**Common Issues**:
- Error: "[Specific error message from research]"
- Symptom: [Observable behavior from research]

**Root Causes & Solutions**:
1. **Quick Fix**: [Minimal change with example from research]
2. **Proper Fix**: [Better solution with code from research]  
3. **Best Practice**: [Architectural improvement from research]

**Validation**:
```bash
[domain-specific validation command from research]
```

### [Category 2-6]: [Additional Problem Areas]
[Follow same pattern with research findings...]

## Code Review Checklist
When reviewing [domain] code:

### [Technical Area 1]
- [ ] [Specific check with example from research]
- [ ] [Another domain-specific check from research]

### [Technical Area 2] 
- [ ] [Performance considerations from research]
- [ ] [Security patterns from research]

### [Technical Area 3-6]
[Additional categories based on research...]

## Quick Reference
```
[Decision tree or common commands from research]
```

## Resources
- [Official Documentation](link from research)
- [Best Practices Guide](link from research)
- [Additional authoritative sources from research]
```

### Step 5: Setup Integration

Your agent is automatically discovered by claudekit based on metadata:

**Universal Agents** (`category: universal`):
- Appear in "Universal Helpers" section
- Recommended for all projects
- Examples: oracle, code-review-expert

**Technology Agents** (`category: framework`, `build`, `database`, etc.):
- Appear in "Technology Stack" section  
- Project-specific tools
- Examples: typescript-expert, react-expert

**General Purpose Agents** (`category: general`):
- Appear in main sections
- Cross-cutting concerns
- Examples: triage-expert, refactoring-expert

**Radio Groups** (mutually exclusive):
- Require manual update to `AGENT_RADIO_GROUPS` in `cli/lib/agents/registry-grouping.ts`
- For test frameworks, databases, build tools

### Step 6: Create Runtime Symlink

Enable runtime discovery:

```bash
# From project root
ln -sf ../../src/agents/my-agent.md .claude/agents/my-agent.md

# For domain-specific agents
ln -sf ../../../src/agents/mydomain/mydomain-expert.md .claude/agents/mydomain-expert.md
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
- Ensure `category` field matches expected usage patterns

### Tool Access Issues
- Explicitly list tools in frontmatter
- Check for typos in tool names
- Verify Claude Code permissions

### Delegation Not Working
- Place delegation logic in step 0
- Include "Stopping here." after delegation
- Make conditions specific and clear

## Visual Customization

The `color` field allows you to customize your agent's visual appearance in Claude Code:

```yaml
---
name: code-review-expert
description: Expert reviewer for code quality and best practices
tools: Read, Grep, Bash
color: indigo     # Named color or hex code
---
```

**Supported Color Formats:**
- **Named colors**: `indigo`, `red`, `blue`, `green`, `purple`, `amber`, etc.
- **Hex codes**: `#3b82f6`, `#ef4444`, `#10b981`
- **Case-insensitive**: `Red`, `RED`, `red` all work

**Common Usage Patterns:**
```yaml
# Build tools
color: amber

# Testing frameworks  
color: green

# Security/audit tools
color: red

# Database tools
color: blue
```

**Notes:**
- Part of claudekit's UI enhancement extensions
- Helps visually organize agents by role or domain
- All standard CSS named colors are supported

## Dynamic Domain Expertise Integration

### Best Practice: Leverage Available Experts

For general-purpose agents (like triage, code-review-expert, or orchestration agents), enhance capabilities by tapping into specialist domain knowledge. This pattern allows broad agents to benefit from deep specialist expertise.

#### Implementation Pattern

Add a "Dynamic Domain Expertise Integration" section to general-purpose agents:

```markdown
## Dynamic Domain Expertise Integration

### Leverage Available Experts

```bash
# Discover available domain experts
claudekit list agents

# Get specific expert knowledge as needed
claudekit show agent [expert-name]

# Apply expert patterns to enhance analysis
```
```

#### When to Use This Pattern

**✅ Good for General-Purpose Agents:**
- `code-review-expert` - Reviews code across domains, benefits from domain-specific patterns
- `triage-expert` - Diagnoses issues across technologies, needs domain context
- `refactoring-expert` - Refactors code in various languages/frameworks
- `performance-expert` - Optimizes across different technology stacks

**❌ Not for Specialist Agents:**
- `typescript-type-expert` - Already focused on specific domain
- `react-performance-expert` - Already has deep specialization
- `postgres-expert` - Domain-specific, doesn't need cross-domain knowledge

#### Implementation Benefits

1. **Enhanced Context**: General agents get domain-specific insights
2. **Informed Handoffs**: Better preparation when delegating to specialists  
3. **Cross-Domain Solutions**: Ability to solve problems spanning multiple domains
4. **Knowledge Synthesis**: Combining insights from multiple expert domains

#### Example: Triage Expert Integration

The `triage-expert` uses this pattern to:
- Query `typescript-expert` knowledge for type-related errors
- Access `react-expert` patterns for component debugging
- Leverage `database-expert` insights for query performance issues
- Apply `webpack-expert` knowledge for build system problems

This creates a smart triage system that provides domain-specific diagnostic approaches while maintaining clear boundaries for specialist delegation.

## Best Practices

1. **Research First**: Invest significant time understanding the domain before implementation
2. **Document Problems**: Base your agent on real issues with proven solutions
3. **Follow prompting patterns**: Use proven system prompt structures from the [Prompting Guide](prompting-guide.md)
4. **Test Incrementally**: Validate each section as you build
5. **Use Real Examples**: Include working code from your research
6. **Link Sources**: Always reference authoritative documentation
7. **Restrict Tools**: Grant minimum necessary permissions
8. **Plan Fallbacks**: Include error handling strategies
9. **Save Research**: Keep research artifacts in `reports/` for future reference
10. **Iterate Based on Usage**: Update agents as you discover new patterns
11. **Include Review Checklist**: Every domain expert should include a "Code Review Checklist" section with domain-specific checks to aid both direct review tasks and the code-review-expert agent
12. **Use Expert Integration**: For general-purpose agents, implement Dynamic Domain Expertise Integration to leverage specialist knowledge

## Conclusion

Creating effective subagents is a research-driven process. The time invested in understanding the domain, documenting problems, and organizing solutions directly translates to agent quality. 

Follow this guide to create subagents that:
- Solve real problems developers face
- Provide expert-level domain knowledge
- Integrate seamlessly with claudekit
- Extend Claude's capabilities meaningfully

Your research is the foundation—build on it to create agents that truly make a difference.