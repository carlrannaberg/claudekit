---
description: Create a specialized AI subagent following domain expert principles
category: claude-setup
allowed-tools: Write, Bash(mkdir:*), Read
---

# Create Domain Expert Subagent

Create a specialized AI subagent following the domain expert principles. This command helps you build concentrated domain expertise rather than single-task agents.

## Setup

First, specify the subagent location:
- **project** - Add to `.claude/agents/` (shared with team, higher priority)
- **user** - Add to `~/.claude/agents/` (personal use across projects)

If not specified, ask which type to create.

## Required Information

Gather the following from the user:

### 1. Domain Identification
- **Domain name**: The expertise area (e.g., typescript, testing, database)
- **Sub-domain (optional)**: Specific area within domain (e.g., typescript-type, test-jest)
- **Hierarchical placement**: Is this a broad expert or sub-domain specialist?

### 2. Domain Coverage Assessment
Ask the user to identify 5-15 related problems this expert will handle. Examples:
- TypeScript type expert: generics, conditionals, mapped types, declarations, performance
- Database performance expert: query optimization, indexing, execution plans, partitioning
- Testing expert: structure, patterns, fixtures, debugging, coverage

If they list fewer than 5 problems, suggest expanding scope or reconsidering as a slash command instead.

### 3. Tool Requirements
- Leave blank to inherit all tools (recommended for broad experts)
- Specify specific tools for focused permissions (e.g., Read, Grep, Glob for analysis-only)
- Common patterns:
  - Analysis experts: `Read, Grep, Glob, Bash`
  - Fix experts: `Read, Edit, MultiEdit, Bash, Grep`
  - Architecture experts: `Read, Write, Edit, Bash, Grep`

**Tip**: Use `/agents` to adjust tool permissions interactively later.

### 4. Environmental Adaptation
Help define how the agent detects and adapts to project context:
- Framework/library detection (prefer config reads over heavy commands)
- Configuration file checks using internal tools first
- Project structure analysis
- Available tool discovery

**Note**: Prefer internal tools (Read, Grep, Glob) over shell commands for better performance.

## Subagent Template Structure

### YAML Frontmatter
```yaml
---
# REQUIRED FIELDS
name: domain-expert  # Unique identifier (lowercase, hyphens only)
description: Expert in {domain} handling {problem-list}. Use PROACTIVELY for {trigger-conditions}.

# OPTIONAL FIELDS
tools: Read, Grep, Bash  # If omitted, inherits ALL tools
model: opus  # opus, sonnet, or haiku
category: general  # For UI grouping
color: indigo  # Visual color in UI
displayName: Domain Expert  # Human-readable name
bundle: ["related-expert"]  # Related agents to install together
---
```

**Important**: Omitting the `tools` field grants ALL tools. An empty `tools:` field grants NO tools.

### Content Template
```markdown
# {Domain} Expert

You are a {domain} expert with deep knowledge of {specific-areas}.

## Delegation First
0. **If ultra-specific expertise needed, delegate immediately**:
   - {Area 1} → {specialist-1}
   - {Area 2} → {specialist-2}
   Output: "This requires {specialty}. Use {expert-name}. Stopping here."

## Core Process
1. **Environment Detection** (Use Read/Grep before shell):
   - Check configuration files
   - Detect framework/tools
   - Analyze project structure

2. **Problem Analysis** (4-6 categories):
   - {Category 1}: {Description}
   - {Category 2}: {Description}
   - {Category 3-6}: {Description}

3. **Solution Implementation**:
   - Apply domain best practices
   - Use progressive solutions (quick/proper/best)
   - Validate with established workflows
```

## Delegation Patterns

### Broad Domain Experts
- Include step 0 delegation to specialists
- Reference related domain experts
- Clear "stopping here" language
- Example: `typescript-expert` delegates to `typescript-type-expert`

### Sub-Domain Experts  
- Reference parent domain expert
- Define specialization boundaries
- Provide escalation paths
- Example: `typescript-type-expert` references `typescript-expert`

## Quality Checks

Before creating, verify:

### Domain Expert Criteria
- [ ] Covers 5-15 related problems (not just 1-2)
- [ ] Has concentrated, non-obvious knowledge
- [ ] Detects and adapts to environment
- [ ] Integrates with specific tools
- [ ] Would pass the "Would I pay $5/month for this?" test

### Boundary Check
Ask: "Would someone put '{{Domain}} Expert' on their resume?"
- Yes → Good domain boundary
- No → Too narrow, consider broader scope

### Naming Check
- ✅ Good: `typescript-expert`, `database-performance-expert`
- ❌ Avoid: `fix-circular-deps`, `enhanced-typescript-helper`

## Proactive Triggers

For agents that should be used automatically, include trigger phrases:
- "Use PROACTIVELY when {{condition}}"
- "MUST BE USED for {{scenario}}"
- "Automatically handles {{problem-type}}"

## Implementation Steps

1. **Create Directory Structure**
   ```bash
   # For project subagent
   mkdir -p .claude/agents
   
   # For user subagent
   mkdir -p ~/.claude/agents
   ```

2. **Generate Agent File**
   First, convert agent name to kebab-case filename:
   - "TypeScript Expert" → `typescript-expert.md`
   - "Database Performance" → `database-performance.md`
   
   Check if file exists before writing:
   ```bash
   # Check for existing file
   if [[ -f "{{path}}/{{kebab-name}}.md" ]]; then
     # Ask user: overwrite or create {{kebab-name}}-new.md?
   fi
   ```
   
   Create `{{kebab-name}}.md` with the populated template

3. **Validate Structure**
   - Ensure YAML frontmatter is valid
   - Check name follows kebab-case convention
   - Verify description is clear and actionable

4. **Show Usage Examples**
   ```
   # Automatic invocation based on description
   > Fix the TypeScript type errors in my code
   
   # Explicit invocation
   > Use the {{agent-name}} to analyze this issue
   ```

## Common Domain Expert Examples

### Complete Example: TypeScript Type Expert
```markdown
---
name: typescript-type-expert
description: Advanced TypeScript type system specialist for complex generics, conditional types, and type-level programming. Use PROACTIVELY for type errors, generics issues, or declaration problems.
tools: Read, Edit, MultiEdit, Grep, Glob
category: general
---

# TypeScript Type System Expert

You are a TypeScript type system specialist with deep knowledge of advanced type features.

## Delegation First
0. **If different expertise needed, delegate immediately**:
   - General TypeScript issues → typescript-expert
   - Build/compilation → typescript-build-expert
   - Testing → testing-expert
   Output: "This requires {specialty}. Use {expert-name}. Stopping here."

## Core Process
1. **Environment Detection**:
   - Check tsconfig.json for strict mode settings
   - Detect TypeScript version
   - Analyze type complexity in codebase

2. **Problem Analysis**:
   - Generic constraints and inference
   - Conditional types and mapped types
   - Template literal types
   - Type-level programming

3. **Solution Implementation**:
   - Apply progressive fixes (quick/proper/best)
   - Ensure type safety without runtime overhead
   - Validate with tsc --noEmit
```

### Other Language Experts
- `typescript-type-expert`: Type system, generics, conditionals, declarations
- `python-async-expert`: asyncio, concurrency, event loops
- `rust-ownership-expert`: Lifetimes, borrowing, memory safety

### Infrastructure Experts
- `database-performance-expert`: Query optimization, indexing, execution plans
- `container-optimization-expert`: Docker, image size, security
- `kubernetes-expert`: Deployments, networking, scaling

### Quality Experts
- `test-architecture-expert`: Test structure, fixtures, patterns
- `webapp-security-expert`: XSS, CSRF, authentication
- `frontend-performance-expert`: Bundle size, lazy loading, caching

## Notes

- Start with Claude-generated agents, then customize to your needs
- Design focused agents with single, clear responsibilities
- Check project agents into version control for team sharing
- Limit tool access to what's necessary for the agent's purpose

Remember: The goal is concentrated domain expertise that handles multiple related problems, not single-task agents. When in doubt, expand the scope to cover more related problems within the domain.