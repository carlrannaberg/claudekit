# Domain Expert Subagents Research Tasks Summary

## Overview
This document tracks all 22 research tasks created for developing the domain expert subagents suite. Each task follows the comprehensive research playbook structure.

## Research Playbook Structure
Each task includes:
1. **Define Scope and Boundaries** - One-sentence scope, 5-15 recurring problems, sub-domain mapping
2. **Build Topic Map** - 3-6 problem categories with errors, fixes (1-2-3), diagnostics, validation
3. **Environment Detection** - Version, framework, and configuration detection methods
4. **Source Material** - Prioritized official documentation
5. **Content Matrix Structure** - CSV/JSON format for data collection
6. **Canonical Template Requirements** - Frontmatter, Step 0, validation, safety rules
7. **Distillation Guidelines** - Focus on non-obvious patterns
8. **Deliverables** - Research doc, content matrix, final agent file

## Phase 1: Core Broad Domain Experts (7 tasks)

| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 103 | react-expert | pending | `reports/agent-research/react/expert-research.md` |
| 104 | nodejs-expert | pending | `reports/agent-research/nodejs/expert-research.md` |
| 105 | testing-expert | pending | `reports/agent-research/testing/expert-research.md` |
| 106 | database-expert | pending | `reports/agent-research/database/expert-research.md` |
| 107 | git-expert | pending | `reports/agent-research/git/expert-research.md` |
| 108 | code-quality-expert | pending | `reports/agent-research/code-quality/expert-research.md` |
| 109 | devops-expert | pending | `reports/agent-research/devops/expert-research.md` |

## Phase 2: High-Priority Sub-Domain Experts (15 tasks)

### TypeScript Sub-Domain (2 tasks)
| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 110 | typescript-type-expert | pending | `reports/agent-research/typescript/type-expert-research.md` |
| 111 | typescript-build-expert | pending | `reports/agent-research/typescript/build-expert-research.md` |

### React Sub-Domain (1 task)
| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 112 | react-performance-expert | pending | `reports/agent-research/react/performance-expert-research.md` |

### Frontend Sub-Domain (2 tasks)
| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 113 | css-styling-expert | pending | `reports/agent-research/frontend/css-styling-expert-research.md` |
| 114 | accessibility-expert | pending | `reports/agent-research/frontend/accessibility-expert-research.md` |

### Testing Sub-Domain (3 tasks)
| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 115 | test-jest-expert | pending | `reports/agent-research/testing/jest-expert-research.md` |
| 116 | test-vitest-expert | pending | `reports/agent-research/testing/vitest-expert-research.md` |
| 117 | test-playwright-expert | pending | `reports/agent-research/testing/playwright-expert-research.md` |

### Database Sub-Domain (2 tasks)
| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 118 | postgres-expert | pending | `reports/agent-research/database/postgres-expert-research.md` |
| 119 | mongodb-expert | pending | `reports/agent-research/database/mongodb-expert-research.md` |

### Infrastructure Sub-Domain (2 tasks)
| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 120 | docker-expert | pending | `reports/agent-research/infrastructure/docker-expert-research.md` |
| 121 | github-actions-expert | pending | `reports/agent-research/infrastructure/github-actions-expert-research.md` |

### Build Tools Sub-Domain (3 tasks)
| Task ID | Agent Name | Status | Output Location |
|---------|------------|--------|-----------------|
| 122 | webpack-expert | pending | `reports/agent-research/build-tools/webpack-expert-research.md` |
| 123 | vite-expert | pending | `reports/agent-research/build-tools/vite-expert-research.md` |
| 124 | nextjs-expert | pending | `reports/agent-research/framework/nextjs-expert-research.md` |

## Research Task Commands

### View a specific task:
```bash
stm show [task-id]
```

### Update task status:
```bash
stm update [task-id] -s in-progress  # Start working on task
stm update [task-id] -s done         # Mark task as complete
```

### List all research tasks:
```bash
stm list -t research
```

### Filter by phase:
```bash
stm list -t phase1
stm list -t phase2
```

### Filter by domain:
```bash
stm list -t react
stm list -t testing
stm list -t database
```

## Research Execution Process

For each task:

1. **Start Research**
   ```bash
   stm update [task-id] -s in-progress
   ```

2. **Gather Content**
   - Review official documentation
   - Identify common problems and solutions
   - Collect diagnostic commands
   - Find best practices and patterns

3. **Create Deliverables**
   - Research document: `reports/agent-research/[domain]/[name]-research.md`
   - Content matrix: `reports/agent-research/[domain]/[name]-matrix.csv`
   - Final agent: `src/agents/[domain]/[name].md`

4. **Complete Task**
   ```bash
   stm update [task-id] -s done
   ```

## Quality Checklist

Before marking a research task as complete, ensure:

- [ ] Scope clearly defined (1 sentence)
- [ ] 5-15 recurring problems identified with frequency × complexity ratings
- [ ] 3-6 problem categories mapped with complete playbooks
- [ ] Environment detection methods documented
- [ ] Official sources prioritized and linked
- [ ] Content matrix created with all required columns
- [ ] Canonical template requirements addressed
- [ ] Non-obvious patterns and pitfalls captured
- [ ] Safe, one-shot diagnostic commands only
- [ ] Final agent file follows typescript-expert template

## Progress Tracking

### Phase 1 Progress: 0/7 (0%)
- [ ] react-expert
- [ ] nodejs-expert
- [ ] testing-expert
- [ ] database-expert
- [ ] git-expert
- [ ] code-quality-expert
- [ ] devops-expert

### Phase 2 Progress: 0/15 (0%)
- [ ] typescript-type-expert
- [ ] typescript-build-expert
- [ ] react-performance-expert
- [ ] css-styling-expert
- [ ] accessibility-expert
- [ ] test-jest-expert
- [ ] test-vitest-expert
- [ ] test-playwright-expert
- [ ] postgres-expert
- [ ] mongodb-expert
- [ ] docker-expert
- [ ] github-actions-expert
- [ ] webpack-expert
- [ ] vite-expert
- [ ] nextjs-expert

### Overall Progress: 0/22 (0%)

## Notes

- TypeScript expert already exists as MVP (src/agents/typescript/expert.md)
- Research tasks follow the comprehensive playbook from docs/subagents-principles.md
- All agents should use the canonical template structure from typescript-expert
- Focus on distilling non-obvious knowledge and practical playbooks
- Ensure all diagnostic commands are safe and one-shot only

---
*Last Updated: 2025-08-09*