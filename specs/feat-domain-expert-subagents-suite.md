# Feature Specification: Domain Expert Subagents Suite

**Title**: Complete Domain Expert Subagents Implementation  
**Status**: Draft  
**Authors**: Claude Code Assistant  
**Date**: 2025-08-09  
**Related Specs**: feat-domain-expert-subagents.md

## Overview

This specification defines the implementation of a comprehensive suite of domain expert subagents for claudekit, following the hierarchical domain expert model. The suite will provide broad domain coverage with selective sub-domain specialization, enabling efficient problem-solving through task-specific AI assistants with concentrated knowledge and environmental adaptation capabilities.

## Background/Problem Statement

While the infrastructure for subagents is complete and a TypeScript expert exists as MVP, users need a broader range of domain experts to handle common development tasks effectively. The current single-agent approach limits the system's ability to provide specialized expertise across different domains while maintaining manageable context windows and focused problem-solving capabilities.

Key challenges:
- Developers work across multiple domains requiring different expertise
- General AI assistants lack concentrated domain knowledge
- Context pollution reduces effectiveness in long sessions
- No systematic approach to organizing specialized knowledge

## Goals

- Implement 8 core broad domain experts covering essential development areas
- Create 15 high-priority sub-domain experts for deep specialization
- Establish a repeatable playbook for creating consistent, high-quality agents
- Provide hierarchical organization for efficient agent selection
- Enable project-specific customization while maintaining shareable base agents
- Ensure all agents follow established patterns and pass quality checks

## Non-Goals

- Creating task-specific agents (e.g., "fix-circular-deps-agent")
- Implementing all 25+ extended coverage agents in initial release
- Building agent discovery or marketplace features
- Modifying Claude Code's core subagent mechanism
- Creating agents for non-development domains

## Technical Dependencies

### External Libraries/Frameworks
- Claude Code v0.7.1+ (native subagent support)
- Node.js 18+ (for setup tooling)
- Git (for version control integration)
- Language-specific tools per domain (detected at runtime)

### Internal Dependencies
- Existing claudekit infrastructure (setup command, component registry)
- Agent validation framework (tests/unit/test-subagents.sh)
- Create-subagent command for templating

### Documentation Sources
Each agent will reference official documentation:
- React: React 18/19 docs, Next.js docs
- Node.js: Node.js API docs, diagnostics guides
- Testing: Jest/Vitest/Playwright documentation
- Database: PostgreSQL/MongoDB vendor docs
- DevOps: Docker/GitHub Actions documentation

## Detailed Design

### Architecture

```
src/agents/
├── README.md                    # Authoring guidelines
├── typescript/                  # TypeScript domain
│   ├── expert.md               # ✅ Broad expert (existing)
│   ├── type-expert.md          # Sub-domain: Type system
│   ├── build-expert.md         # Sub-domain: Build/compilation
│   └── module-expert.md        # Sub-domain: Modules/dependencies
├── react/                      # React domain
│   ├── expert.md               # Broad expert
│   ├── performance-expert.md   # Sub-domain: Optimization
│   └── hooks-expert.md         # Sub-domain: Hooks patterns
├── nodejs/                     # Node.js domain
│   ├── expert.md               # Broad expert
│   └── async-expert.md         # Sub-domain: Async patterns
├── testing/                    # Testing domain
│   ├── expert.md               # Broad expert
│   ├── jest-expert.md          # Sub-domain: Jest
│   ├── vitest-expert.md        # Sub-domain: Vitest
│   └── playwright-expert.md    # Sub-domain: E2E
├── database/                   # Database domain
│   ├── expert.md               # Broad expert
│   ├── postgres-expert.md      # Sub-domain: PostgreSQL
│   └── mongodb-expert.md       # Sub-domain: MongoDB
├── git/                        # Git domain
│   └── expert.md               # Broad expert
├── code-quality/               # Code quality domain
│   └── expert.md               # Broad expert
├── devops/                     # DevOps domain
│   ├── expert.md               # Broad expert
│   ├── docker-expert.md        # Sub-domain: Docker
│   └── github-actions-expert.md # Sub-domain: CI/CD
├── frontend/                   # Frontend specializations
│   ├── css-styling-expert.md   # CSS/Tailwind
│   └── accessibility-expert.md # WCAG/ARIA
└── build-tools/                # Build tool specializations
    ├── webpack-expert.md       # Webpack config
    ├── vite-expert.md          # Vite optimization
    └── nextjs-expert.md        # Next.js patterns
```

### Agent Template Structure

Each agent follows this canonical template:

```yaml
---
name: [domain]-expert
description: [Action-oriented description with "Use PROACTIVELY" trigger]
tools: Read, Grep, Glob, Bash, Edit, MultiEdit, Write
---

# [Domain] Expert

I am an expert in [domain] with deep knowledge of [specific areas].

## When Invoked

### Step 0: Recommend Specialist and Stop
[List of sub-domain conditions and recommendations]

### Environment Detection
[Project analysis commands and patterns]

### Apply Strategy
[Ordered approach to problem-solving]

## Problem Playbooks

### [Problem Category 1]
**Common Issues:**
- [Symptom/error message]
  
**Diagnosis:**
```bash
[diagnostic commands]
```

**Prioritized Fixes:**
1. [Minimal change solution]
2. [More comprehensive fix]
3. [Complete refactor if needed]

**Validation:**
```bash
[verification commands]
```

**Resources:**
- [Official documentation link]
- [Specific guide link]

### [Additional Problem Categories...]

## Runtime Considerations
[Environment-specific caveats and patterns]

## Safety Guidelines
- No watch/serve commands
- One-shot diagnostics only
- Prefer project scripts
- Guard optional tools
```

### Implementation Phases

#### Phase 1: Core Broad Domain Experts (Week 1-2)

**Sprint 1.1: Language & Framework Experts**
1. `react-expert` - React patterns, hooks, best practices
2. `nodejs-expert` - Node.js server patterns, async, streams
3. `testing-expert` - Testing strategies across frameworks

**Sprint 1.2: Infrastructure Experts**
4. `database-expert` - SQL/NoSQL patterns, schema design
5. `git-expert` - Version control workflows, collaboration
6. `code-quality-expert` - Linting, formatting, standards
7. `devops-expert` - CI/CD, containers, deployment

Each broad expert will:
- Cover 5-15 common problems in the domain
- Detect environment and adapt approach
- Recommend sub-domain experts when appropriate
- Include 3-6 problem playbooks with fixes

#### Phase 2: High-Priority Sub-Domain Experts (Week 3-4)

**Sprint 2.1: TypeScript Sub-domains**
1. `typescript-type-expert` - Type system mastery
2. `typescript-build-expert` - Bundling, compilation

**Sprint 2.2: React Sub-domains**
3. `react-performance-expert` - Optimization, memoization
4. `css-styling-expert` - CSS-in-JS, Tailwind
5. `accessibility-expert` - WCAG, ARIA, keyboard nav

**Sprint 2.3: Testing Sub-domains**
6. `test-jest-expert` - Jest mocking, configuration
7. `test-vitest-expert` - Vitest patterns
8. `test-playwright-expert` - E2E testing

**Sprint 2.4: Database Sub-domains**
9. `postgres-expert` - PostgreSQL optimization
10. `mongodb-expert` - NoSQL patterns

**Sprint 2.5: Infrastructure Sub-domains**
11. `docker-expert` - Containerization
12. `github-actions-expert` - CI/CD workflows

**Sprint 2.6: Build Tool Sub-domains**
13. `webpack-expert` - Webpack configuration
14. `vite-expert` - Vite optimization
15. `nextjs-expert` - Next.js patterns

#### Phase 3: Extended Coverage (Future)
- Framework specialists (Vue, Angular, Svelte)
- Additional database experts (Redis, Elasticsearch)
- Cloud platform experts (AWS, GCP, Azure)
- API development experts (GraphQL, REST, gRPC)

### Content Gathering Playbook ✅ VALIDATED

For each agent, follow this repeatable process (successfully used for 22 agents):

1. **Define Scope and Boundaries**
   - Write one-sentence scope statement
   - List 5-15 recurring problems (frequency × complexity)
   - Map sub-domain expert recommendations

2. **Build Topic Map**
   - Identify 3-6 problem categories
   - For each category, collect:
     - Top error messages and symptoms
     - Root causes
     - Prioritized fixes (1→2→3)
     - Diagnostic commands
     - Validation steps
     - 2-5 official documentation links

3. **Apply Canonical Template**
   - Use typescript-expert as reference
   - Include frontmatter with proactive trigger
   - Add Step 0 recommend-and-stop logic
   - Implement environment detection
   - Add problem playbooks
   - Include runtime caveats

4. **Source Official Documentation**
   - Prioritize official docs over third-party
   - Distill patterns, don't dump content
   - Focus on non-obvious knowledge
   - Include runnable diagnostics

5. **Validate Safety and Quality**
   - Ensure one-shot diagnostics only
   - Guard optional tools
   - Prefer project scripts
   - Test with validation framework

### Code Structure and File Organization

```typescript
// cli/lib/agents/registry.ts
export const AGENT_PHASES = {
  phase1: {
    core: [
      'react-expert',
      'nodejs-expert', 
      'testing-expert',
      'database-expert',
      'git-expert',
      'code-quality-expert',
      'devops-expert'
    ]
  },
  phase2: {
    typescript: ['type-expert', 'build-expert'],
    react: ['performance-expert'],
    frontend: ['css-styling-expert', 'accessibility-expert'],
    testing: ['jest-expert', 'vitest-expert', 'playwright-expert'],
    database: ['postgres-expert', 'mongodb-expert'],
    infrastructure: ['docker-expert', 'github-actions-expert'],
    buildTools: ['webpack-expert', 'vite-expert', 'nextjs-expert']
  }
};
```

### API Changes

No API changes required. Agents integrate with existing infrastructure:
- Setup command discovers agents automatically
- `/create-subagent` command for new agents
- Component registry handles installation

### Data Model Changes

No data model changes. Agents use established format:
- YAML frontmatter with name, description, tools
- Markdown body with system prompt
- Standard file locations (.claude/agents/)

### Integration with External Libraries

Each agent will integrate with domain-specific tools:

**React Expert:**
- React DevTools detection
- JSX runtime analysis
- Next.js/Gatsby/CRA detection

**Testing Experts:**
- Jest/Vitest config detection
- Coverage tool integration
- Test runner discovery

**Database Experts:**
- Connection string parsing
- Migration tool detection
- ORM/ODM identification

## User Experience

### Discovery and Selection
Users interact with agents through:

1. **Automatic Delegation**: Claude proactively selects based on task
2. **Explicit Invocation**: "Use the react-expert to review components"
3. **Setup Wizard**: Choose agents during `claudekit setup`
4. **Hierarchical Fallback**: Sub-domain → Broad → General Claude

### Installation Options

```bash
# Interactive setup (choose agents)
claudekit setup

# Install all agents
claudekit setup --all

# Install specific phase
claudekit setup --agents phase1

# Skip agents
claudekit setup --skip-agents
```

### Usage Examples

```
# Automatic selection
> Fix the TypeScript type errors in my component
[typescript-type-expert automatically invoked]

# Explicit invocation  
> Use the react-performance-expert to optimize rendering
[react-performance-expert invoked]

# Hierarchical fallback
> How should I structure my tests?
[testing-expert invoked - no specific framework mentioned]

> How do I mock ES6 modules in Jest?
[test-jest-expert invoked - framework-specific]
```

## Testing Strategy

### Unit Tests

Each agent must pass validation:

```bash
# tests/unit/test-subagents.sh
test_agent_structure() {
  - Valid YAML frontmatter
  - Required fields (name, description)
  - Comprehensive prompt (50+ lines)
  - Problem playbooks present
  - Documentation links included
}

test_agent_safety() {
  - No watch/serve commands
  - Diagnostic commands only
  - Optional tools guarded
  - Project scripts preferred
}
```

### Integration Tests

```bash
# tests/integration/test-agent-selection.sh
test_hierarchical_selection() {
  - Sub-domain expert selected for specific problems
  - Broad expert selected for general questions
  - Proper fallback chain
}

test_agent_installation() {
  - Agents copied correctly
  - Permissions preserved
  - Content integrity maintained
}
```

### E2E Tests

Manual testing with Claude Code:
1. Install agents via setup
2. Test automatic delegation
3. Verify explicit invocation
4. Check hierarchical fallback
5. Validate problem-solving effectiveness

### Test Documentation

Each test includes purpose comments:

```bash
# Purpose: Verify agents recommend sub-domain experts appropriately
# This ensures hierarchical organization works and prevents broad experts
# from attempting specialized tasks they're not equipped for
test_recommend_and_stop() {
  # Test implementation
}
```

## Performance Considerations

### Agent Selection Performance
- Hierarchical organization reduces selection complexity
- Clear description fields enable fast matching
- Limited to 20-25 total agents keeps selection manageable

### Context Efficiency
- Each agent uses separate context window
- Concentrated knowledge reduces token usage
- Environmental adaptation minimizes exploration

### Startup Latency
- Agents start with clean slate (expected behavior)
- Environment detection adds 2-3 commands overhead
- Cached detection patterns for common setups

## Security Considerations

### Tool Restrictions
- Each agent specifies allowed tools explicitly
- No unrestricted bash access
- Read-only operations for analysis

### Code Safety
- No execution of untrusted code
- Validation before modifications
- Prefer non-destructive operations

### Information Disclosure
- No logging of sensitive data
- No exposure of API keys or secrets
- Project-specific knowledge stays local

## Documentation

### Updates Required

1. **README.md**
   - List all available agents
   - Installation instructions
   - Usage examples

2. **Agent Library Docs** (src/agents/README.md)
   - Updated roadmap
   - Contribution guidelines
   - Quality checklist

3. **AGENT.md**
   - Reference to available agents
   - Selection guidelines
   - Customization instructions

### New Documentation

1. **Agent Catalog** (docs/agent-catalog.md)
   - Complete list with descriptions
   - Problem coverage per agent
   - Selection decision tree

2. **Agent Authoring Guide** (docs/creating-agents.md)
   - Detailed playbook
   - Content gathering process
   - Quality standards

## Implementation Phases

### Phase 1: MVP/Core Functionality (Week 1-2) ✅ RESEARCH COMPLETE
- [x] Research 7 broad domain experts (Tasks 103-109 completed)
  - React Expert: 15 recurring problems, 6 categories, environment detection
  - Node.js Expert: Async patterns, module system, performance profiling
  - Testing Expert: Flaky test debugging, framework patterns, coverage analysis
  - Database Expert: Query optimization, connection management, schema design
  - Git Expert: Workflows, recovery procedures, collaboration patterns
  - Code Quality Expert: ESLint/Prettier, metrics, automation patterns
  - DevOps Expert: CI/CD, containerization, deployment strategies
- [ ] Implement agents from research
- [ ] Test with validation framework
- [ ] Update setup command if needed
- [ ] Document agent catalog

### Phase 2: Enhanced Features (Week 3-4) ✅ RESEARCH COMPLETE
- [x] Research 15 sub-domain experts (Tasks 110-124 completed)
  - TypeScript Type Expert: Advanced type gymnastics, performance optimization
  - TypeScript Build Expert: Compiler configuration, monorepo management
  - React Performance Expert: Profiling, memoization, Core Web Vitals
  - CSS Styling Expert: Architecture patterns, CSS-in-JS, performance
  - Accessibility Expert: WCAG 2.1/2.2, screen readers, testing automation
  - Jest Testing Expert: Jest-specific patterns, mocking, configuration
  - Vitest Testing Expert: Vite integration, migration from Jest
  - Playwright Testing Expert: E2E patterns, cross-browser testing
  - PostgreSQL Expert: Query optimization, JSONB, indexing strategies
  - MongoDB Expert: Aggregation pipelines, document modeling
  - Docker Expert: Container optimization, security, multi-stage builds
  - GitHub Actions Expert: Workflow optimization, caching, security
  - Webpack Expert: Bundle optimization, code splitting, loaders
  - Vite Expert: ESM-first development, HMR, build optimization
  - Next.js Expert: App Router, Server Components, deployment
- [ ] Implement agents from research
- [ ] Add hierarchical selection tests
- [ ] Create authoring guide
- [ ] Community contribution templates

### Phase 3: Polish and Optimization (Future)
- [ ] Extended coverage agents
- [ ] Performance optimizations
- [ ] Advanced selection algorithms
- [ ] Agent marketplace features

## Open Questions

1. **Agent Versioning**: Should agents include version compatibility info?
   - Current thinking: No, agents adapt at runtime

2. **Project-Specific Overrides**: How to handle project customization?
   - Current thinking: Project agents in `.claude/agents/` take precedence

3. **Agent Dependencies**: Can agents depend on other agents?
   - Current thinking: No direct dependencies, only recommendations

4. **Community Contributions**: Process for accepting community agents?
   - Current thinking: PR review with quality checklist

5. **Agent Updates**: How to handle updates to shipped agents?
   - Current thinking: Versioned releases, user chooses when to update

## References

### Related Issues and PRs
- Original MVP spec: specs/feat-domain-expert-subagents.md
- TypeScript expert implementation: src/agents/typescript/expert.md
- Setup command integration: cli/commands/setup.ts

### External Documentation
- [Claude Code Subagents Documentation](https://docs.anthropic.com/en/docs/claude-code/subagents)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/)

### Design Patterns
- Domain Expert Pattern (docs/subagents-principles.md)
- Hierarchical Agent Organization
- Environmental Adaptation Strategy
- Problem Playbook Structure

## Success Metrics

### Quantitative Metrics
- Agent selection accuracy: >90% correct expert chosen
- Problem resolution rate: >80% issues solved without escalation  
- Time to solution: <5 minutes for common problems
- Context efficiency: <50% token usage vs general assistant

### Qualitative Metrics
- Developer satisfaction with expertise quality
- Knowledge transfer effectiveness
- Reduced cognitive load on developers
- Improved code quality from expert guidance

## Risk Mitigation

### Technical Risks
- **Agent Quality Variance**: Mitigated by validation framework and template
- **Selection Conflicts**: Mitigated by hierarchical organization
- **Maintenance Burden**: Mitigated by repeatable playbook and testing

### Adoption Risks
- **Learning Curve**: Mitigated by clear documentation and examples
- **Agent Overload**: Mitigated by phased rollout and curation
- **Customization Complexity**: Mitigated by simple override mechanism

## Research Findings Summary

### Phase 1: Core Broad Domain Experts (Tasks 103-109)

**React Expert (Task 103)**
- 15 recurring problems identified: hook rules, re-renders, memory leaks, SSR issues
- 6 categories: Hooks Hygiene, Rendering Performance, Effects & Lifecycle, State Management, SSR/RSC, Component Patterns
- 21 specific error patterns documented with 3-tier solutions
- Key anti-patterns: Overusing memoization, creating objects in render, using Effects for data transformation

**Node.js Expert (Task 104)**
- 15 problems: Unhandled rejections, event loop blocking, ESM/CommonJS conflicts, memory leaks
- 6 categories: Async & Promises, Module System, Performance & Memory, Filesystem & Streams, Process & Environment, HTTP & Networking
- 24 diagnostic patterns for runtime debugging and performance profiling
- Focus on async patterns, stream processing, and module resolution

**Testing Expert (Task 105)**
- 15 problems: Flaky tests, mock confusion, async timing, coverage gaps
- 6 categories: Test Structure, Mocking, Async Issues, Coverage Metrics, Integration/E2E, CI/CD
- Framework coverage: Jest, Vitest, Playwright, Testing Library
- 24 testing scenarios with progressive fixes

**Database Expert (Task 106)**
- 15 problems: Query performance, connection pooling, schema design, transactions
- 6 categories: Query Performance, Schema Design, Connections & Transactions, Indexing, Security, Monitoring
- 25 database-specific issues across PostgreSQL, MySQL, MongoDB
- Connection overhead insights: PostgreSQL ~9MB vs MySQL ~256KB per connection

**Git Expert (Task 107)**
- 15 problems: Merge conflicts, branch management, remote issues, performance
- 6 categories: Merge Conflicts, Commit History, Remote Repos, Git Hooks, Performance, Security
- 25 Git workflow scenarios with recovery procedures
- Focus on practical conflict resolution and repository maintenance

**Code Quality Expert (Task 108)**
- 15 problems: ESLint conflicts, Prettier integration, metrics, security vulnerabilities
- 6 categories: Linting, Formatting, Metrics, Security, CI/CD, Team Standards
- 24 quality enforcement patterns
- Incremental adoption strategy: formatting → linting → metrics → security

**DevOps Expert (Task 109)**
- 15 problems: Pipeline failures, container issues, deployment problems, monitoring gaps
- 6 categories: CI/CD Pipelines, Containerization, Infrastructure, Monitoring, Security, Performance
- 24 DevOps scenarios covering Docker, Kubernetes, Terraform, GitHub Actions
- Focus on automation, reliability, and scalability patterns

### Phase 2: Sub-Domain Specialists (Tasks 110-124)

**TypeScript Specialists (Tasks 110-111)**
- Type Expert: 18 advanced type system issues, generics, utility types, performance
- Build Expert: 21 compilation issues, module resolution, monorepo patterns
- Combined coverage: Type-level programming, build optimization, migration strategies

**Frontend Specialists (Tasks 112-114)**
- React Performance: 25 optimization scenarios, Core Web Vitals, profiling techniques
- CSS Styling: 27 styling issues, architecture patterns, CSS-in-JS optimization
- Accessibility: 40+ WCAG compliance issues, screen reader optimization, testing automation

**Testing Framework Specialists (Tasks 115-117)**
- Jest: 50+ Jest-specific issues, mocking patterns, configuration
- Vitest: 21 Vite integration issues, migration from Jest, browser mode
- Playwright: 15 E2E scenarios, cross-browser testing, visual regression

**Database Specialists (Tasks 118-119)**
- PostgreSQL: 30 PostgreSQL-specific issues, JSONB optimization, index strategies
- MongoDB: 40+ document modeling patterns, aggregation pipeline optimization

**Infrastructure Specialists (Tasks 120-121)**
- Docker: 25 containerization issues, multi-stage builds, security hardening
- GitHub Actions: 30+ workflow scenarios, caching strategies, security patterns

**Build Tool Specialists (Tasks 122-124)**
- Webpack: 27 bundle optimization issues, code splitting, module federation
- Vite: 27 ESM-first development issues, HMR optimization
- Next.js: 40+ App Router patterns, Server Components, deployment strategies

### Research Deliverables

All 22 agents produced comprehensive research materials:

**Phase 1 Research Locations:**
- React Expert: `reports/agent-research/react/expert-research.md` + `expert-matrix.csv`
- Node.js Expert: `reports/agent-research/nodejs/expert-research.md` + `expert-matrix.csv`
- Testing Expert: `reports/agent-research/testing/expert-research.md` + `expert-matrix.csv`
- Database Expert: `reports/agent-research/database/expert-research.md` + `expert-matrix.csv`
- Git Expert: `reports/agent-research/git/expert-research.md` + `expert-matrix.csv`
- Code Quality Expert: `reports/agent-research/code-quality/expert-research.md` + `expert-matrix.csv`
- DevOps Expert: `reports/agent-research/devops/expert-research.md` + `expert-matrix.csv`

**Phase 2 Research Locations:**
- TypeScript Type Expert: `reports/agent-research/typescript/type-expert-research.md` + `type-expert-matrix.csv`
- TypeScript Build Expert: `reports/agent-research/typescript/build-expert-research.md` + `build-expert-matrix.csv`
- React Performance Expert: `reports/agent-research/react/performance-expert-research.md` + `performance-expert-matrix.csv`
- CSS Styling Expert: `reports/agent-research/frontend/css-expert-research.md` + `css-expert-matrix.csv`
- Accessibility Expert: `reports/agent-research/frontend/accessibility-expert-research.md` + `accessibility-expert-matrix.csv`
- Jest Testing Expert: `reports/agent-research/testing/jest-expert-research.md` + `jest-expert-matrix.csv`
- Vitest Testing Expert: `reports/agent-research/testing/vitest-expert-research.md` + `vitest-expert-matrix.csv`
- Playwright Testing Expert: `reports/agent-research/testing/playwright-expert-research.md` + `playwright-expert-matrix.csv`
- PostgreSQL Expert: `reports/agent-research/database/postgres-expert-research.md` + `postgres-expert-matrix.csv`
- MongoDB Expert: `reports/agent-research/database/mongodb-expert-research.md` + `mongodb-expert-matrix.csv`
- Docker Expert: `reports/agent-research/infrastructure/docker-expert-research.md` + `docker-expert-matrix.csv`
- GitHub Actions Expert: `reports/agent-research/infrastructure/github-actions-expert-research.md` + `github-actions-expert-matrix.csv`
- Webpack Expert: `reports/agent-research/build-tools/webpack-expert-research.md` + `webpack-expert-matrix.csv`
- Vite Expert: `reports/agent-research/build-tools/vite-expert-research.md` + `vite-expert-matrix.csv`
- Next.js Expert: `reports/agent-research/framework/nextjs-expert-research.md` + `nextjs-expert-matrix.csv`

**Combined Coverage**: 
- 500+ documented issues with progressive solutions
- 200+ links to official documentation sources

## Appendix: Agent Content Matrix Template

For rapid agent development, use this validated matrix:

| Category | Symptoms | Root Causes | Fix 1 (Minimal) | Fix 2 (Better) | Fix 3 (Complete) | Diagnostics | Validation | Links |
|----------|----------|-------------|-----------------|----------------|------------------|-------------|------------|-------|
| [Problem 1] | [Error messages] | [Why it happens] | [Quick fix] | [Proper fix] | [Refactor] | [Commands] | [Tests] | [Docs] |
| [Problem 2] | ... | ... | ... | ... | ... | ... | ... | ... |

Convert matrix to agent template for consistent, high-quality agents.