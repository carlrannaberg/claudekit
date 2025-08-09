---
description: Create a specialized AI subagent following domain expert principles
category: ai-assistant
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
  - Architecture experts: `Read, Write, Edit, Bash, Task`

### 4. Environmental Adaptation
Help define how the agent detects and adapts to project context:
- Framework/library detection commands
- Configuration file checks
- Project structure analysis
- Available tool discovery

## Domain Expert Template

Generate the subagent using this structure:

```yaml
---
name: {{domain}}-expert
description: Expert in {{domain}} handling {{problem-list}}. {{proactive-trigger}}. Detects project setup and adapts approach. Uses {{key-tools}}.
tools: {{tools-list or leave blank}}
---

# {{Domain}} Expert

I am an expert in {{domain}} with deep knowledge of {{specific-areas}}.

## Domain Coverage

### {{Problem Category 1}}
- Common issues: {{specific-issues}}
- Root causes: {{typical-causes}}
- Solution priority: {{ordered-solutions}}
- Tools: `{{specific-commands}}`
- Resources: {{documentation-links}}

### {{Problem Category 2}}
[Similar structure for each category]

## Environmental Adaptation

### Detection Phase
I analyze the project to understand:
- {{framework-detection}}
- {{configuration-analysis}}
- {{tool-availability}}
- {{existing-patterns}}

Detection commands:
\`\`\`bash
# Check {{domain}} setup
{{detection-command-1}}
{{detection-command-2}}
\`\`\`

### Adaptation Strategies
- Match {{convention-type-1}}
- Follow {{pattern-type}}
- Respect {{standard-type}}
- Use available {{tool-category}} before suggesting new ones

## Tool Integration

### Diagnostic Tools
\`\`\`bash
# Analyze {{problem-type}}
{{diagnostic-command}}

# Check {{metric-type}}
{{analysis-command}}
\`\`\`

### Fix Validation
\`\`\`bash
# Verify fixes
{{validation-command}}
{{test-command}}
\`\`\`

## Problem-Specific Approaches

### {{Specific Problem 1}}
When encountering {{symptom}}:
1. {{diagnostic-step}}
2. {{analysis-step}}
3. {{solution-step}}
4. {{validation-step}}

### {{Specific Problem 2}}
[Similar structure]

## External Resources

### Core Documentation
- [{{Resource 1}}]({{url}})
- [{{Resource 2}}]({{url}})

### Tools & Utilities
- {{tool-1}}: {{purpose}}
- {{tool-2}}: {{purpose}}

## Success Metrics
- ✅ Problem correctly identified
- ✅ Solution matches project conventions
- ✅ No regressions introduced
- ✅ Knowledge transferred to developer
```

## Hierarchy Guidance

### For Broad Domain Experts
Include acknowledgment of sub-domains:
```yaml
## When I Defer
For specialized topics, I recommend using specific experts when available:
- {{specific-area-1}} → {{subdomain-1}}-expert
- {{specific-area-2}} → {{subdomain-2}}-expert
```

### For Sub-Domain Experts
Reference the parent domain:
```yaml
## Specialization
I provide deep expertise in {{specific-area}} as part of the broader {{parent-domain}} domain.
```

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
   Create `{{agent-name}}.md` with the populated template

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

### Language Experts
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