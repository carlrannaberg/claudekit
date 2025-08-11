# Hierarchical Agent Selection with Auto-Inclusion

## The Problem
When a user selects a broad expert like `react-expert`, they should automatically get the specialized sub-experts like `react-performance-expert`. Same for TypeScript, Testing, Database, etc.

## Revised Selection Logic

### Hierarchical Dependencies

```javascript
const AGENT_HIERARCHY = {
  'react-expert': {
    includes: ['react-performance-expert'],
    description: 'React + Performance optimization'
  },
  'typescript-expert': {
    includes: ['typescript-type-expert', 'typescript-build-expert'],
    description: 'TypeScript + Type system + Build configuration'
  },
  'testing-expert': {
    includesChoice: {
      type: 'radio',
      question: 'Which test framework?',
      options: [
        { id: 'jest', includes: ['jest-expert'] },
        { id: 'vitest', includes: ['vitest-expert'] },
        { id: 'both', includes: ['jest-expert', 'vitest-expert'] }
      ]
    },
    optionalIncludes: ['playwright-expert'],
    description: 'Testing strategies + Your test framework'
  },
  'database-expert': {
    includesChoice: {
      type: 'radio',
      question: 'Which database?',
      options: [
        { id: 'postgres', includes: ['postgres-expert'] },
        { id: 'mongodb', includes: ['mongodb-expert'] },
        { id: 'both', includes: ['postgres-expert', 'mongodb-expert'] }
      ]
    },
    description: 'Database patterns + Your database system'
  }
};
```

## Simplified Selection Experience

### Option 1: Domain-Based Selection

```
═══════════════════════════════════════════════════════════════
Select Your Development Domains
═══════════════════════════════════════════════════════════════

Choose what you work with (includes all related experts):

Core Domains:
[✓] TypeScript (includes type & build experts)
[✓] React (includes performance expert)
[✓] Node.js
[✓] Git
[✓] Code Quality

Domains with Options:
[✓] Testing → Which framework? ◉ Jest ○ Vitest ○ Both
[✓] Database → Which system? ◉ PostgreSQL ○ MongoDB ○ Both
[ ] Build Tools → Which bundler? ○ Webpack ○ Vite ○ Both
[ ] Infrastructure → Includes Docker & GitHub Actions
[ ] Frontend Extras → Includes CSS & Accessibility
[ ] Frameworks → Includes Next.js

Additional Specialists:
[ ] DevOps Expert
[ ] E2E Testing (Playwright)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14 agents selected (7 domains + 7 specialists)

[Install] [Select All 23] [Skip Agents]
```

### Option 2: Smart Bundling

```
═══════════════════════════════════════════════════════════════
Choose AI Assistant Packages
═══════════════════════════════════════════════════════════════

Core packages (recommended):
[✓] TypeScript Package (3 agents)
    • typescript-expert
    • typescript-type-expert
    • typescript-build-expert

[✓] React Package (2 agents)
    • react-expert
    • react-performance-expert

[✓] Testing Package
    Choose framework: ◉ Jest ○ Vitest ○ Both
    • testing-expert
    • [your framework]-expert
    [ ] Add E2E (Playwright)

[✓] Database Package
    Choose system: ◉ PostgreSQL ○ MongoDB ○ Both
    • database-expert
    • [your database]-expert

[ ] Build Tools Package
    Choose bundler: ○ Webpack ○ Vite ○ Both

[ ] Infrastructure Package (3 agents)
    • docker-expert
    • github-actions-expert
    • devops-expert

[ ] Frontend Package (2 agents)
    • css-styling-expert
    • accessibility-expert

Individual agents:
[✓] nodejs-expert
[✓] git-expert
[✓] code-quality-expert
[ ] nextjs-expert

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15 agents selected

[Install] [Select All 23] [Skip Agents]
```

### Option 3: Simplified Auto-Complete (RECOMMENDED)

```
═══════════════════════════════════════════════════════════════
Select Your Stack
═══════════════════════════════════════════════════════════════

Main technologies (includes all related experts):
[✓] TypeScript → Includes type & build experts (3 total)
[✓] React → Includes performance expert (2 total)
[✓] Node.js (1)
[✓] Git (1)
[✓] Code Quality (1)

Your specific tools:
Test Framework: ◉ Jest ○ Vitest ○ Both → Includes testing expert
Database: ◉ PostgreSQL ○ MongoDB ○ Both → Includes database expert
Build Tool: ◉ Vite ○ Webpack ○ Both ○ None

Optional additions:
[ ] Next.js
[ ] Docker
[ ] GitHub Actions
[ ] Playwright (E2E)
[ ] CSS & Styling
[ ] Accessibility
[ ] DevOps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15 agents will be installed:
• 3 TypeScript agents (expert, types, build)
• 2 React agents (expert, performance)
• 2 Testing agents (expert, jest)
• 2 Database agents (expert, postgres)
• 1 Build agent (vite)
• 5 Core agents (nodejs, git, quality, etc.)

[Install] [Change Selection] [Skip Agents]
```

## Implementation Rules

### Auto-Inclusion Rules

1. **Broad expert selected → All sub-experts included**
   - `react-expert` → automatically includes `react-performance-expert`
   - `typescript-expert` → automatically includes `typescript-type-expert` and `typescript-build-expert`

2. **Framework choice → Broad expert included**
   - Selecting "Jest" → automatically includes `testing-expert` + `jest-expert`
   - Selecting "PostgreSQL" → automatically includes `database-expert` + `postgres-expert`

3. **No redundant selection**
   - If TypeScript is checked, don't show type/build experts separately
   - If React is checked, don't show performance expert separately

4. **Clear communication**
   - Show "(includes X experts)" next to each domain
   - Show total count updating in real-time

## Benefits of This Approach

1. **Logical bundling** - Related experts always together
2. **Fewer decisions** - ~8 choices instead of 23
3. **No missing dependencies** - Can't get `react-performance-expert` without `react-expert`
4. **Clear value** - "TypeScript (3 agents)" shows what you're getting
5. **Simpler mental model** - Think in domains, not individual agents

## Example Selection Flows

### Typical React Developer
1. Keeps TypeScript ✓ → Gets 3 agents
2. Keeps React ✓ → Gets 2 agents
3. Selects Jest → Gets 2 agents (testing + jest)
4. Selects PostgreSQL → Gets 2 agents (database + postgres)
5. Selects Vite → Gets 1 agent
6. Keeps Node.js, Git, Code Quality → Gets 3 agents
**Total: 13 agents automatically bundled correctly**

### Backend Developer
1. Keeps TypeScript ✓ → Gets 3 agents
2. Unchecks React → Removes 2 agents
3. Selects Vitest → Gets 2 agents
4. Selects MongoDB → Gets 2 agents
5. Selects None for build → Gets 0 agents
6. Checks Docker → Gets 1 agent
**Total: 10 agents, no React cruft**

## Final Recommendation

Use **Option 3: Simplified Auto-Complete** because:
- Shows clear parent-child relationships
- Automatically includes related experts
- Reduces decision points from 23 to ~10
- Makes it impossible to miss important sub-experts
- Clear agent count shows exactly what you're getting

The key insight: **Domains should be the unit of selection, not individual agents**. When someone uses React, they need both the broad expert and the performance expert. This approach ensures they get both automatically.