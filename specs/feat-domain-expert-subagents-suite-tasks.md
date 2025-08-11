# Task Breakdown: Domain Expert Subagents Suite
Generated: 2025-08-09
Source: specs/feat-domain-expert-subagents-suite.md

## Overview
Implementation of 22 domain expert subagents for claudekit, following the hierarchical domain expert model. All research is complete with comprehensive documentation and content matrices available for each agent.

## Phase 0: Foundation & Infrastructure

### Task 0.1: Create Agent Directory Structure
**Description**: Set up the complete directory structure for all domain expert agents
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 0.2

**Technical Requirements**:
- Create directories for all agent domains
- Set up proper folder hierarchy following the spec
- Ensure consistent naming conventions

**Implementation Steps**:
```bash
# Create the main agent directories
mkdir -p src/agents/{react,nodejs,testing,database,git,code-quality,devops}
mkdir -p src/agents/{typescript,frontend,build-tools,infrastructure,framework}

# Create subdirectories for specific domains
mkdir -p src/agents/testing
mkdir -p src/agents/database
mkdir -p src/agents/infrastructure
```

**Acceptance Criteria**:
- [ ] All directories created as per specification architecture
- [ ] Directory structure matches spec exactly
- [ ] README.md exists in src/agents/ with authoring guidelines

### Task 0.2: Update Agent Registry Configuration
**Description**: Configure the agent registry to support new agents
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 0.1

**Technical Requirements**:
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

**Acceptance Criteria**:
- [ ] Registry includes all 22 agents
- [ ] Agents properly categorized by phase
- [ ] Registry integrates with setup command

### Task 0.3: Create Agent Validation Test Suite
**Description**: Implement comprehensive validation tests for all agents
**Size**: Medium
**Priority**: High
**Dependencies**: Task 0.1
**Can run parallel with**: None

**Technical Requirements**:
```bash
# tests/unit/test-subagents.sh updates
test_agent_structure() {
  # Valid YAML frontmatter
  # Required fields (name, description)
  # Comprehensive prompt (50+ lines)
  # Problem playbooks present
  # Documentation links included
}

test_agent_safety() {
  # No watch/serve commands
  # Diagnostic commands only
  # Optional tools guarded
  # Project scripts preferred
}
```

**Implementation Details**:
- Extend existing test-subagents.sh
- Add specific checks for new agent patterns
- Validate hierarchical recommendations
- Check for proactive triggers

**Acceptance Criteria**:
- [ ] All agents pass structural validation
- [ ] Safety checks implemented
- [ ] Hierarchical selection tests added
- [ ] Test documentation updated

## Phase 1: Core Broad Domain Experts

### Task 1.1: Implement React Expert
**Description**: Create React expert agent from research findings
**Size**: Large
**Priority**: High
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 1.2-1.7

**Research Location**: `reports/agent-research/react/expert-research.md` + `expert-matrix.csv`

**Technical Requirements**:
```yaml
---
name: react-expert
description: React component patterns, hooks, and performance expert. Use PROACTIVELY for React component issues, hook errors, re-rendering problems, or state management challenges.
tools: Read, Grep, Glob, Bash, Edit, MultiEdit, Write
---

# React Expert

I am an expert in React 18/19 with deep knowledge of hooks, component patterns, performance optimization, state management, and Server Components.

## When Invoked

### Step 0: Recommend Specialist and Stop
If the issue is specifically about:
- **Performance profiling and optimization**: Stop and recommend react-performance-expert
- **CSS-in-JS or styling**: Stop and recommend css-styling-expert  
- **Accessibility concerns**: Stop and recommend accessibility-expert
- **Testing React components**: Stop and recommend the appropriate testing expert

### Environment Detection
```bash
# Detect React version
npm list react 2>/dev/null | grep react@ || cat package.json | grep '"react"'

# Check for React DevTools
ls -la node_modules/react-devtools* 2>/dev/null

# Detect framework
test -f next.config.js && echo "Next.js detected"
test -f gatsby-config.js && echo "Gatsby detected"
test -f vite.config.js && echo "Vite detected"
```

### Apply Strategy
1. Identify the React-specific issue
2. Check for common anti-patterns
3. Apply progressive fixes
4. Validate with React DevTools

## Problem Playbooks

### Hooks Hygiene
**Common Issues:**
- "Invalid hook call" - Hooks called conditionally or outside components
- "Missing dependency" warnings - useEffect/useCallback missing deps
- Stale closure bugs - Values not updating in callbacks

**Diagnosis:**
```bash
# Check for hook violations
npx eslint . --ext .jsx,.tsx --rule 'react-hooks/rules-of-hooks: error'

# Find useEffect issues
grep -r "useEffect" --include="*.jsx" --include="*.tsx" | head -20
```

**Prioritized Fixes:**
1. Add missing dependencies to dependency array
2. Use useCallback/useMemo to stabilize references
3. Extract custom hooks for complex logic

**Validation:**
```bash
npm run lint
npm test
```

**Resources:**
- https://react.dev/reference/react/hooks
- https://react.dev/learn/removing-effect-dependencies

### Rendering Performance
**Common Issues:**
- "Too many re-renders" - State updates in render
- Component re-rendering unnecessarily
- Large lists causing slowdowns

**Diagnosis:**
```bash
# Check for React.memo usage
grep -r "React.memo\|memo(" --include="*.jsx" --include="*.tsx"

# Find potential performance issues
grep -r "map\|filter\|reduce" --include="*.jsx" --include="*.tsx" | grep -v "useMemo"
```

**Prioritized Fixes:**
1. Wrap components in React.memo
2. Use useMemo for expensive computations
3. Implement virtualization for large lists

**Validation:**
- Use React DevTools Profiler
- Check render count reduction
- Measure with Performance API

**Resources:**
- https://react.dev/reference/react/memo
- https://react.dev/reference/react/useMemo

### Effects & Lifecycle
**Common Issues:**
- Memory leaks from missing cleanup
- Race conditions in async effects
- Effects running too often

**Diagnosis:**
```bash
# Find effects without cleanup
grep -A 5 "useEffect" --include="*.jsx" --include="*.tsx" | grep -v "return"

# Check for async effects
grep "async.*useEffect\|useEffect.*async" --include="*.jsx" --include="*.tsx"
```

**Prioritized Fixes:**
1. Add cleanup functions to effects
2. Use AbortController for fetch cancellation
3. Consider useEffectEvent for event handlers

**Validation:**
```bash
# Check for memory leaks
npm test -- --detectLeaks
```

**Resources:**
- https://react.dev/reference/react/useEffect
- https://react.dev/learn/synchronizing-with-effects

### State Management
**Common Issues:**
- Props drilling through many levels
- State updates not batching
- Context causing unnecessary re-renders

**Diagnosis:**
```bash
# Find prop drilling patterns
grep -r "props\." --include="*.jsx" --include="*.tsx" | wc -l

# Check Context usage
grep -r "useContext\|createContext" --include="*.jsx" --include="*.tsx"
```

**Prioritized Fixes:**
1. Lift state up to common ancestor
2. Use Context for cross-cutting concerns
3. Consider state management library (Redux, Zustand)

**Resources:**
- https://react.dev/learn/managing-state
- https://react.dev/learn/passing-data-deeply-with-context

### SSR/RSC Issues
**Common Issues:**
- Hydration mismatches
- Server vs client code confusion
- Data fetching patterns

**Diagnosis:**
```bash
# Check for client-only code
grep -r "window\.\|document\.\|localStorage" --include="*.jsx" --include="*.tsx"

# Find server components
grep -r "use server\|async function.*await" --include="*.jsx" --include="*.tsx"
```

**Prioritized Fixes:**
1. Wrap client code in useEffect
2. Use dynamic imports with ssr: false
3. Implement proper data fetching patterns

**Resources:**
- https://react.dev/reference/react/use-server
- https://nextjs.org/docs/app/building-your-application/rendering

### Component Patterns
**Common Issues:**
- Tight coupling between components
- Poor component composition
- Reusability challenges

**Diagnosis:**
```bash
# Check component size
find . -name "*.jsx" -o -name "*.tsx" | xargs wc -l | sort -rn | head -10

# Find repeated patterns
grep -r "interface.*Props" --include="*.tsx" | wc -l
```

**Prioritized Fixes:**
1. Extract shared logic to hooks
2. Use component composition
3. Implement compound components pattern

**Resources:**
- https://react.dev/learn/thinking-in-react
- https://react.dev/learn/reusing-logic-with-custom-hooks

## Runtime Considerations
- React 18 automatic batching changes behavior
- Strict Mode runs effects twice in development
- Fast Refresh limitations with certain patterns
- Server Components can't use hooks or browser APIs

## Safety Guidelines
- Never modify state directly
- Always handle loading and error states
- Validate props in development
- Use error boundaries for graceful failures
```

**Implementation from Research**:
- 15 recurring problems from research
- 6 problem categories with specific solutions
- 21 error patterns from content matrix
- Environment detection patterns
- Progressive fix strategies (1→2→3)

**Acceptance Criteria**:
- [ ] Agent file created at src/agents/react/expert.md
- [ ] All 6 problem playbooks implemented
- [ ] Includes Step 0 specialist recommendations
- [ ] Environment detection works
- [ ] Passes validation tests
- [ ] Follows canonical template

### Task 1.2: Implement Node.js Expert
**Description**: Create Node.js expert agent from research findings
**Size**: Large
**Priority**: High
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 1.1, 1.3-1.7

**Research Location**: `reports/agent-research/nodejs/expert-research.md` + `expert-matrix.csv`

**Technical Requirements**:
```yaml
---
name: nodejs-expert
description: Node.js runtime, async patterns, and performance expert. Use PROACTIVELY for Node.js runtime errors, async/await issues, module problems, or performance concerns.
tools: Read, Grep, Glob, Bash, Edit, MultiEdit, Write
---

# Node.js Expert

I am an expert in Node.js with deep knowledge of the event loop, async patterns, module system, streams, and performance optimization.

## When Invoked

### Step 0: Recommend Specialist and Stop
If the issue is specifically about:
- **Database operations**: Stop and recommend database-expert
- **Testing Node.js code**: Stop and recommend testing-expert
- **Docker containerization**: Stop and recommend docker-expert
- **TypeScript in Node.js**: Stop and recommend typescript-expert

### Environment Detection
```bash
# Node.js version
node --version

# Package manager
test -f package-lock.json && echo "npm detected"
test -f yarn.lock && echo "yarn detected"
test -f pnpm-lock.yaml && echo "pnpm detected"

# Module type
grep '"type"' package.json

# Framework detection
npm list express fastify koa 2>/dev/null | grep -E "express|fastify|koa"
```

### Apply Strategy
1. Identify async/runtime issue
2. Check event loop and memory
3. Apply progressive fixes
4. Validate with profiling tools

## Problem Playbooks
[Continue with all 6 categories from research...]
```

**Acceptance Criteria**:
- [ ] Agent file created at src/agents/nodejs/expert.md
- [ ] All problem playbooks from research implemented
- [ ] Environment detection complete
- [ ] Passes validation tests

### Task 1.3: Implement Testing Expert
**Description**: Create Testing expert agent from research findings
**Size**: Large
**Priority**: High  
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 1.1-1.2, 1.4-1.7

**Research Location**: `reports/agent-research/testing/expert-research.md` + `expert-matrix.csv`

**Implementation**: Similar structure to above, using research content

### Task 1.4: Implement Database Expert
**Description**: Create Database expert agent from research findings
**Size**: Large
**Priority**: High
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 1.1-1.3, 1.5-1.7

**Research Location**: `reports/agent-research/database/expert-research.md` + `expert-matrix.csv`

### Task 1.5: Implement Git Expert
**Description**: Create Git expert agent from research findings
**Size**: Large
**Priority**: High
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 1.1-1.4, 1.6-1.7

**Research Location**: `reports/agent-research/git/expert-research.md` + `expert-matrix.csv`

### Task 1.6: Implement Code Quality Expert
**Description**: Create Code Quality expert agent from research findings
**Size**: Large
**Priority**: High
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 1.1-1.5, 1.7

**Research Location**: `reports/agent-research/code-quality/expert-research.md` + `expert-matrix.csv`

### Task 1.7: Implement DevOps Expert
**Description**: Create DevOps expert agent from research findings
**Size**: Large
**Priority**: High
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 1.1-1.6

**Research Location**: `reports/agent-research/devops/expert-research.md` + `expert-matrix.csv`

## Phase 2: Sub-Domain Specialists

### Task 2.1: Implement TypeScript Type Expert
**Description**: Create TypeScript Type expert for advanced type system issues
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 2.2-2.15

**Research Location**: `reports/agent-research/typescript/type-expert-research.md` + `type-expert-matrix.csv`

### Task 2.2: Implement TypeScript Build Expert
**Description**: Create TypeScript Build expert for compilation and configuration
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 2.1, 2.3-2.15

**Research Location**: `reports/agent-research/typescript/build-expert-research.md` + `build-expert-matrix.csv`

### Task 2.3: Implement React Performance Expert
**Description**: Create React Performance expert for optimization
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.1
**Can run parallel with**: Tasks 2.1-2.2, 2.4-2.15

**Research Location**: `reports/agent-research/react/performance-expert-research.md` + `performance-expert-matrix.csv`

### Task 2.4: Implement CSS Styling Expert
**Description**: Create CSS Styling expert for architecture and performance
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 2.1-2.3, 2.5-2.15

**Research Location**: `reports/agent-research/frontend/css-expert-research.md` + `css-expert-matrix.csv`

### Task 2.5: Implement Accessibility Expert
**Description**: Create Accessibility expert for WCAG compliance
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 2.1-2.4, 2.6-2.15

**Research Location**: `reports/agent-research/frontend/accessibility-expert-research.md` + `accessibility-expert-matrix.csv`

### Task 2.6: Implement Jest Testing Expert
**Description**: Create Jest-specific testing expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.3
**Can run parallel with**: Tasks 2.1-2.5, 2.7-2.15

**Research Location**: `reports/agent-research/testing/jest-expert-research.md` + `jest-expert-matrix.csv`

### Task 2.7: Implement Vitest Testing Expert
**Description**: Create Vitest-specific testing expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.3
**Can run parallel with**: Tasks 2.1-2.6, 2.8-2.15

**Research Location**: `reports/agent-research/testing/vitest-expert-research.md` + `vitest-expert-matrix.csv`

### Task 2.8: Implement Playwright Testing Expert
**Description**: Create Playwright E2E testing expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.3
**Can run parallel with**: Tasks 2.1-2.7, 2.9-2.15

**Research Location**: `reports/agent-research/testing/playwright-expert-research.md` + `playwright-expert-matrix.csv`

### Task 2.9: Implement PostgreSQL Expert
**Description**: Create PostgreSQL-specific database expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.4
**Can run parallel with**: Tasks 2.1-2.8, 2.10-2.15

**Research Location**: `reports/agent-research/database/postgres-expert-research.md` + `postgres-expert-matrix.csv`

### Task 2.10: Implement MongoDB Expert
**Description**: Create MongoDB-specific database expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.4
**Can run parallel with**: Tasks 2.1-2.9, 2.11-2.15

**Research Location**: `reports/agent-research/database/mongodb-expert-research.md` + `mongodb-expert-matrix.csv`

### Task 2.11: Implement Docker Expert
**Description**: Create Docker containerization expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.7
**Can run parallel with**: Tasks 2.1-2.10, 2.12-2.15

**Research Location**: `reports/agent-research/infrastructure/docker-expert-research.md` + `docker-expert-matrix.csv`

### Task 2.12: Implement GitHub Actions Expert
**Description**: Create GitHub Actions CI/CD expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.7
**Can run parallel with**: Tasks 2.1-2.11, 2.13-2.15

**Research Location**: `reports/agent-research/infrastructure/github-actions-expert-research.md` + `github-actions-expert-matrix.csv`

### Task 2.13: Implement Webpack Expert
**Description**: Create Webpack build optimization expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 2.1-2.12, 2.14-2.15

**Research Location**: `reports/agent-research/build-tools/webpack-expert-research.md` + `webpack-expert-matrix.csv`

### Task 2.14: Implement Vite Expert
**Description**: Create Vite build tool expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2
**Can run parallel with**: Tasks 2.1-2.13, 2.15

**Research Location**: `reports/agent-research/build-tools/vite-expert-research.md` + `vite-expert-matrix.csv`

### Task 2.15: Implement Next.js Expert
**Description**: Create Next.js framework expert
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 0.1, 0.2, 1.1
**Can run parallel with**: Tasks 2.1-2.14

**Research Location**: `reports/agent-research/framework/nextjs-expert-research.md` + `nextjs-expert-matrix.csv`

## Phase 3: Integration & Testing

### Task 3.1: Integration Testing Suite
**Description**: Create comprehensive integration tests for agent selection
**Size**: Medium
**Priority**: High
**Dependencies**: All Phase 1 and 2 tasks

**Technical Requirements**:
```bash
# tests/integration/test-agent-selection.sh
test_hierarchical_selection() {
  # Sub-domain expert selected for specific problems
  # Broad expert selected for general questions
  # Proper fallback chain
}

test_agent_installation() {
  # Agents copied correctly
  # Permissions preserved
  # Content integrity maintained
}
```

**Acceptance Criteria**:
- [ ] Hierarchical selection works correctly
- [ ] Installation process validated
- [ ] All agents pass integration tests

### Task 3.2: Setup Command Integration
**Description**: Update setup command to support new agents
**Size**: Medium
**Priority**: High
**Dependencies**: Task 0.2, All Phase 1 and 2 tasks

**Technical Requirements**:
- Interactive agent selection
- Phase-based installation options
- Proper copying and permissions

**Acceptance Criteria**:
- [ ] Setup command recognizes all agents
- [ ] Interactive selection works
- [ ] Batch installation options available

### Task 3.3: Documentation Updates
**Description**: Update all documentation for new agents
**Size**: Medium
**Priority**: High
**Dependencies**: All Phase 1 and 2 tasks

**Documentation to Update**:
- README.md - List all available agents
- src/agents/README.md - Updated roadmap
- docs/agent-catalog.md - Complete catalog
- docs/creating-agents.md - Authoring guide

**Acceptance Criteria**:
- [ ] All documentation updated
- [ ] Agent catalog complete
- [ ] Usage examples provided

### Task 3.4: E2E Testing with Claude Code
**Description**: Manual testing of all agents with Claude Code
**Size**: Large
**Priority**: High
**Dependencies**: All previous tasks

**Test Scenarios**:
1. Install agents via setup
2. Test automatic delegation
3. Verify explicit invocation
4. Check hierarchical fallback
5. Validate problem-solving effectiveness

**Acceptance Criteria**:
- [ ] All agents work in Claude Code
- [ ] Automatic selection functions correctly
- [ ] Hierarchical fallback works
- [ ] Problems are solved effectively

## Execution Strategy

### Parallel Execution Opportunities
- Phase 0 tasks can run in parallel
- All Phase 1 experts can be implemented in parallel
- All Phase 2 specialists can be implemented in parallel
- Integration testing must wait for implementation

### Critical Path
1. Foundation (Tasks 0.1-0.3)
2. Phase 1 Experts (Tasks 1.1-1.7) - Parallel
3. Phase 2 Specialists (Tasks 2.1-2.15) - Parallel
4. Integration & Testing (Tasks 3.1-3.4) - Sequential

### Risk Mitigation
- All research is complete, reducing implementation risk
- Validation framework ensures quality
- Parallel implementation speeds delivery
- Hierarchical organization prevents conflicts

## Summary
- **Total Tasks**: 26
- **Phase 0 (Foundation)**: 3 tasks
- **Phase 1 (Core Experts)**: 7 tasks
- **Phase 2 (Sub-domain Specialists)**: 15 tasks
- **Phase 3 (Integration)**: 4 tasks
- **Estimated Complexity**: High (22 large agent implementations)
- **Parallel Opportunities**: High (most implementation can be parallel)