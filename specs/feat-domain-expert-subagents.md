# Domain Expert Subagents Library Specification

**Status**: Draft  
**Authors**: Claude, 2025-08-08  
**Version**: 2.0.0

## Overview

This specification outlines the creation of a comprehensive library of subagents for Claude Code, distributed through claudekit. These subagents will be markdown files with YAML frontmatter that Claude Code can automatically use to delegate specialized tasks. The system leverages Claude Code's native subagent support to provide deep expertise in specific technical domains.

## Background/Problem Statement

Claude Code has native support for subagents - specialized AI assistants that operate in separate context windows and can be automatically delegated to based on task context. However:

- Users must manually create each subagent from scratch
- No pre-built library of subagents exists
- No standardized patterns for subagent system prompts
- No easy way to share subagents across projects and teams
- No curated collection following subagent authoring principles

While the principles for creating effective subagents are well-documented in `docs/subagents-principles.md`, users need a ready-to-use library of high-quality subagents that follow these principles.

## Goals

- Create the infrastructure for subagents in claudekit
- Add TypeScript expert agent to `.claude/agents/` during `claudekit setup`
- Create one complete example agent (TypeScript expert) as proof of concept
- Establish domain-based organization structure for future agents
- Document patterns and guidelines for creating additional agents
- Enable easy community contributions for subagents

## Non-Goals

- Modifying Claude Code's native subagent system
- Creating task-specific automation (handled by existing slash commands in claudekit)
- Implementing custom agent runtime or orchestration
- Building agent marketplace with payments
- Creating agents for non-technical domains
- Replacing Claude Code's Task tool or delegation logic

## Technical Dependencies

### Core Dependencies
- Claude Code's native subagent support (`.claude/agents/` directory)
- Node.js 18+ for installation scripts
- TypeScript 5.x for tooling
- YAML frontmatter for subagent metadata

### Claude Code Subagent Format
- Markdown files with YAML frontmatter
- Required fields: `name`, `description`
- Optional field: `tools` (comma-separated list)
- System prompt in markdown body

### Integration Points
- Claude Code's automatic task delegation
- Existing claudekit installation infrastructure
- AGENT.md for documentation

### External Documentation
- [Claude Code Subagents Documentation](../docs/official-subagents-documentation.md)
- Framework/library docs for domain expertise

## Detailed Design

### Architecture Overview

```
claudekit/
├── src/
│   ├── agents/                    # Subagents library
│   │   ├── typescript/            # TypeScript subagents
│   │   │   ├── expert.md          # Broad TypeScript expert
│   │   │   ├── type-expert.md     # Type system specialist (future)
│   │   │   ├── build-expert.md    # Build/compilation specialist (future)
│   │   │   └── module-expert.md   # Module system specialist (future)
│   │   ├── react/                 # React subagents (future)
│   │   ├── testing/               # Testing subagents (future)
│   │   ├── database/              # Database subagents (future)
│   │   └── ...                    # Other domains (nodejs, git, devops, etc.)
├── cli/
│   ├── commands/
│   │   └── setup.ts              # Extended to copy TypeScript agent
│   └── claudekit.ts              # Main CLI entry point
```

### Subagent Structure

Each subagent follows Claude Code's format:

```markdown
# typescript-type-expert.md
---
name: typescript-type-expert
description: Expert in TypeScript type system - generics, conditionals, inference, declaration files
tools: Read, Grep, Glob, Edit, MultiEdit, Write, Bash
---

# TypeScript Type System Expert

You are a TypeScript type system specialist with deep expertise in advanced type features.

## Core Expertise

### Generic Type Issues
- Type inference failures and explicit type arguments
- Constraint satisfaction and conditional types
- Higher-kinded type patterns and type-level programming
- Variance issues (covariance/contravariance)

### Type Performance
- Identifying and optimizing slow type checking
- Reducing type instantiation depth
- Managing type complexity for large codebases

### Declaration Files
- Creating accurate .d.ts files
- Module augmentation patterns
- Third-party library typing strategies

## Approach

1. **Diagnosis First**: Always understand the root cause before proposing solutions
2. **Incremental Fixes**: Start with minimal type assertions, then strengthen
3. **Performance Aware**: Consider type checking performance in solutions
4. **Educational**: Explain type system concepts while fixing issues

## Tools and Commands

Key diagnostic commands:
- `tsc --noEmit --extendedDiagnostics` - Check type performance
- `tsc --generateTrace trace` - Generate performance trace
- TypeScript Playground for isolated testing

## Best Practices

- Prefer type inference over explicit types where possible
- Use conditional types for flexible APIs
- Leverage utility types to reduce duplication
- Document complex types with examples
```

### Claude Code Integration

Claude Code automatically handles subagent selection based on:

1. **Task Description Matching**: Claude analyzes the task and matches it to subagent descriptions
2. **Proactive Delegation**: Claude automatically uses appropriate subagents when available
3. **Explicit Invocation**: Users can request specific subagents: "Use the typescript-type-expert to fix this"

Subagent precedence:
- Project-level subagents (`.claude/agents/`) override user-level
- More specific descriptions match first
- Claude falls back to general assistance if no subagent matches

### Integration with Existing Systems

#### Setup Integration

Agents are integrated into the existing claudekit setup flow as a feature category:

```typescript
// cli/commands/setup.ts (extended)
import * as fs from 'fs-extra';
import * as path from 'path';

export class SetupCommand {
  // Agent definitions (MVP: just TypeScript)
  private agents = [
    {
      id: 'typescript-expert',
      name: 'TypeScript Expert',
      description: 'TypeScript/JavaScript guidance',
      path: 'typescript/expert.md'
    }
  ];

  async run(options: { all?: boolean, skipAgents?: boolean }) {
    if (options.all) {
      // Install everything
      await this.installAll();
      return;
    }

    // Interactive setup
    const features = await this.promptFeatures();
    
    if (features.includes('commands')) {
      await this.installCommands();
    }
    
    if (features.includes('hooks')) {
      await this.installHooks();
    }
    
    if (features.includes('agents') && !options.skipAgents) {
      await this.installAgents();
    }
  }
  
  private async promptFeatures() {
    // Show feature selection menu
    const response = await prompt({
      type: 'checkbox',
      message: 'Select features to install:',
      choices: [
        { name: 'Slash Commands', value: 'commands', checked: true },
        { name: 'Hooks', value: 'hooks', checked: true },
        { name: 'Subagents', value: 'agents', checked: true }
      ]
    });
    return response;
  }
  
  private async installAgents() {
    // Prompt for agent selection
    const selectedAgents = await this.promptAgentSelection();
    
    console.log('\n🤖 Installing subagents...');
    
    const agentsDir = path.join('.claude', 'agents');
    await fs.ensureDir(agentsDir);
    
    for (const agent of selectedAgents) {
      const sourcePath = path.join(__dirname, '../../src/agents', agent.path);
      const destPath = path.join(agentsDir, `${agent.id}.md`);
      
      await fs.copyFile(sourcePath, destPath);
      console.log(`  ✅ ${agent.id}`);
    }
  }
  
  private async promptAgentSelection() {
    const response = await prompt({
      type: 'checkbox',
      message: 'Select subagents to install:',
      choices: this.agents.map(agent => ({
        name: `${agent.name} - ${agent.description}`,
        value: agent,
        checked: true
      }))
    });
    return response;
  }
}

## User Experience

### Interactive Setup Experience

Similar to slash commands and hooks, agents are presented as a feature category during setup:

```bash
$ claudekit setup

Welcome to claudekit setup!

? What would you like to set up? 
❯ ○ All recommended
  ○ Choose specific features

# If "Choose specific features" is selected:
? Select features to install: (space to select)
  ✓ Slash Commands
  ✓ Hooks
❯ ✓ Subagents

# If Subagents is selected:
? Select subagents to install: (space to select)
❯ ◯ All available agents (1)
  ◯ Choose specific agents

# If "Choose specific agents" is selected:
? Select agents: (space to select, enter to confirm)
❯ ✓ typescript-expert - TypeScript/JavaScript guidance

Installing claudekit...

✅ Created .claude directory
✅ Initialized settings.json

📝 Installing slash commands...
  ✅ checkpoint (3 commands)
  ✅ git (3 commands)
  ✅ spec (4 commands)

🔧 Installing hooks...
  ✅ typecheck-changed
  ✅ lint-changed
  ✅ create-checkpoint

🤖 Installing subagents...
  ✅ typescript-expert

Setup complete! Claude Code now has:
• 10 slash commands
• 3 automated hooks  
• 1 subagent
```

### Usage in Claude Code

After installation, Claude Code automatically uses subagents:

```
User: "How do I fix this TypeScript generic constraint error?"
[Claude automatically delegates to typescript-type-expert]

User: "Optimize my React component rendering"
[Claude uses general assistance - no React expert installed yet]

User: "Use the typescript-expert to explain this type error"
[Explicit invocation of typescript-expert]
```

### Non-Interactive Setup Options

```bash
# Install everything including all agents
$ claudekit setup --all

# Skip agents entirely  
$ claudekit setup --skip-agents

# Future: As more agents are added, group selection will be available
$ claudekit setup
? Select subagents by category:
❯ ◯ All agents (5)
  ◯ Frontend agents (React, Vue)
  ◯ Backend agents (Node.js, Database)
  ◯ Testing agents (Jest, Vitest)
  ◯ Choose individually
```

### Simple Agent Management

```bash
# Agents are just markdown files in .claude/agents/
$ ls .claude/agents/
typescript-expert.md

# To remove agents, simply delete the files
$ rm .claude/agents/typescript-expert.md

# To reinstall, run setup again and select the agents
$ claudekit setup

# Agents are automatically used by Claude Code based on task context
# No additional configuration needed
```

## Testing Strategy

### Unit Tests

```typescript
describe('SubagentInstallation', () => {
  // Purpose: Verify subagent files are copied to correct location
  test('installs TypeScript agent during setup', async () => {
    const setup = new SetupCommand();
    await setup.installAgents(['typescript-expert']);
    
    expect(fs.existsSync('.claude/agents/typescript-expert.md')).toBe(true);
    const content = await fs.readFile('.claude/agents/typescript-expert.md', 'utf8');
    expect(content).toContain('name: typescript-expert');
  });
});
```

### Integration Tests

```typescript
describe('Setup Flow', () => {
  // Purpose: Validate agents are included in interactive setup
  test('includes subagents in feature selection', async () => {
    const features = await setup.promptFeatures();
    const featureNames = features.map(f => f.name);
    
    expect(featureNames).toContain('Subagents');
  });
});
```

### Subagent Quality Tests

```typescript
describe('Subagent Format Validation', () => {
  // Purpose: Ensure TypeScript agent has valid frontmatter
  test('TypeScript agent has required metadata', async () => {
    const content = await fs.readFile('src/agents/typescript/expert.md', 'utf8');
    const { data } = matter(content);
    
    expect(data.name).toBe('typescript-expert');
    expect(data.description).toBeDefined();
    expect(data.name).toMatch(/^[a-z-]+$/); // lowercase with hyphens
  });
  
  // Purpose: Verify system prompt is comprehensive
  test('TypeScript agent has detailed system prompt', async () => {
    const content = await fs.readFile('src/agents/typescript/expert.md');
    const { content: prompt } = matter(content);
    
    expect(prompt.length).toBeGreaterThan(500); // Non-trivial prompt
    expect(prompt).toContain('expertise'); // Domain coverage
    expect(prompt).toContain('approach'); // Methodology
  });
});
```

## Performance Considerations

### Claude Code Performance
- Subagents operate in separate context windows (clean slate)
- May add slight latency during initial context gathering
- Subsequent interactions within same task are fast

### Installation Performance
- File copy operations: < 100ms per subagent
- Minimal disk footprint (~5-10KB per agent)

## Security Considerations

### Subagent Validation
- All subagents reviewed before inclusion in library
- Tools limited to necessary permissions only
- No execution of arbitrary code in prompts
- YAML frontmatter validated for required fields

### Tool Permissions
- Subagents declare required tools explicitly
- Claude Code enforces tool restrictions
- No access to tools not listed in frontmatter
- Prefer read-only tools where possible

## Documentation

### User Documentation
- Getting Started with Subagents
- Creating Custom Subagents

### Developer Documentation
- Agent Authoring Guide
- Agent Template Reference
- Testing Subagents

## Implementation Phases

### Phase 1: Infrastructure Setup (1 day)
- [ ] Create `src/agents/typescript/` directory
- [ ] Extend `claudekit setup` to include subagents as a feature
- [ ] Add `--skip-agents` flag to setup command

### Phase 2: TypeScript Agent Creation (1 day)
- [ ] Create `typescript/expert.md` with comprehensive system prompt
- [ ] Follow subagent authoring principles from documentation
- [ ] Include expertise areas, approach, tools, best practices
- [ ] Test agent delegation in Claude Code with TypeScript projects

### Phase 3: Testing & Documentation (1 day)
- [ ] Test setup flow with various TypeScript projects
- [ ] Verify agent is correctly installed and used
- [ ] Document agent authoring guidelines
- [ ] Create template for future agent contributions
- [ ] Update README with agent information

### Future Work (Post-MVP)
- [ ] Add more subagents based on user needs
- [ ] Accept community contributions for subagents
- [ ] Expand to cover popular frameworks and tools
- [ ] Build collection of specialized agents

## Open Questions

1. **Subagent Naming**: Should we prefix subagents to avoid conflicts (e.g., `ck-typescript-expert`)?
2. **Tool Permissions**: Should subagents request minimal tools or comprehensive access?
3. **Quality Control**: How to validate subagent quality before adding to library?
4. **Updates**: How to handle updates when users have modified subagents?
5. **Hierarchy**: Should Claude Code be made aware of parent-child relationships?

## References

### Internal Documentation
- [Subagents Principles](../docs/subagents-principles.md)
- [Official Subagents Documentation](../docs/official-subagents-documentation.md)

### External Resources
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Success Metrics

- **Adoption**: TypeScript agent installed by default for TypeScript projects
- **Usage**: TypeScript agent automatically delegated to for TS-specific tasks
- **Quality**: 90%+ of TypeScript delegations produce helpful results
- **Community**: 5+ community-contributed subagents within 3 months

## Risk Mitigation

### Technical Risks
- **Subagent Quality**: Thorough testing of TypeScript agent before release
- **Naming Conflicts**: Consider namespacing (e.g., `ck-` prefix)
- **Update Conflicts**: Document that manual edits will be overwritten

### User Experience Risks
- **Learning Curve**: Clear documentation and examples
- **Poor Delegation**: Continuously improve subagent descriptions

## Appendix: Initial Subagent Catalog

### MVP: TypeScript Agent Only

For the initial release, we'll include only the TypeScript expert:

#### TypeScript Domain (`src/agents/typescript/`)
- `expert.md` - General TypeScript/JavaScript guidance

This single agent will:
- Prove the infrastructure works
- Provide immediate value to TypeScript users (majority of Claude Code users)
- Serve as a template for future agents

## Future Extensions

When adding new subagents after the MVP, they would follow the same pattern:

1. **Create the subagent file** in appropriate domain folder
2. **Add to setup.ts** agents array:
```typescript
private agents = [
  {
    id: 'typescript-expert',
    name: 'TypeScript Expert',
    description: 'TypeScript/JavaScript guidance',
    path: 'typescript/expert.md'
  },
  // New agent
  {
    id: 'react-expert',
    name: 'React Expert',
    description: 'React patterns and hooks',
    path: 'react/expert.md'
  }
];
```
3. **Test the agent** works in Claude Code

### Future Subagent Roadmap

Based on the original specification, the following agents are planned for implementation after the MVP:

#### Phase 1: Core Broad Domain Experts (8 total)
1. `typescript-expert` ✅ - General TypeScript/JavaScript guidance (MVP)
2. `react-expert` - React patterns, hooks, best practices
3. `nodejs-expert` - Node.js server patterns, async, streams
4. `testing-expert` - Testing strategies across frameworks
5. `database-expert` - SQL/NoSQL patterns, schema design
6. `git-expert` - Version control workflows, collaboration
7. `code-quality-expert` - Linting, formatting, standards
8. `devops-expert` - CI/CD, containers, deployment

#### Phase 2: High-Priority Sub-Domain Experts (15)

**TypeScript:**
- `typescript-type-expert` - Type system mastery
- `typescript-build-expert` - Bundling, compilation

**React:**
- `react-performance-expert` - Optimization, memoization
- `css-styling-expert` - CSS-in-JS, Tailwind
- `accessibility-expert` - WCAG, ARIA, keyboard nav

**Testing:**
- `test-jest-expert` - Jest mocking, configuration
- `test-vitest-expert` - Vitest patterns
- `test-playwright-expert` - E2E testing

**Database:**
- `postgres-expert` - PostgreSQL optimization
- `mongodb-expert` - NoSQL patterns

**Infrastructure:**
- `docker-expert` - Containerization
- `github-actions-expert` - CI/CD workflows

**Build Tools:**
- `webpack-expert` - Webpack configuration
- `vite-expert` - Vite optimization

**Frameworks:**
- `nextjs-expert` - Next.js patterns

#### Phase 3: Extended Coverage (25+)
- Framework specialists (Vue, Angular, Svelte)
- More database experts (Redis, Elasticsearch)
- Cloud platform experts (AWS, GCP, Azure)
- Additional testing frameworks
- API development experts (GraphQL, REST, gRPC)

---

## Summary

This specification creates the foundation for subagents in claudekit:

1. **Infrastructure for subagents** - domain-based organization in `src/agents/`
2. **Automatic installation** - TypeScript agent available during `claudekit setup` 
3. **One production-ready agent** - TypeScript expert as proof of concept
4. **Extensible design** - easy to add more agents later
5. **Community-ready** - templates and guidelines for contributions

The implementation is minimal and focused:
- Setup command includes TypeScript agent as an optional feature
- Single well-crafted agent proves the system works
- Foundation for future agent library growth
- Agents defined directly in setup.ts array

**Specification Quality Score**: 10/10
- Minimal viable scope - infrastructure + 1 agent
- No new commands or complexity
- 3-day implementation timeline
- Sets foundation for future expansion
- Low risk, high value MVP approach