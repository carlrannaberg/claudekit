# Subagent Installation Presets

## Design Principles
- No auto-detection complexity
- Clear, descriptive preset names
- Logical groupings that match real-world use cases
- Progressive disclosure (start simple, allow expansion)

## Proposed Preset Structure

### Option 1: Size-Based Presets (Simple)

```
Choose your agent installation preset:

( ) 🎯 Minimal (5 agents)
    Essential agents for any project
    → typescript, testing, git, code-quality, nodejs

( ) 📦 Standard (10 agents)  ← DEFAULT
    Common development stack
    → Minimal + react, database, docker, jest, webpack

( ) 💼 Professional (15 agents)
    Comprehensive development toolkit
    → Standard + performance, accessibility, postgres, playwright, devops

( ) 🌟 Everything (23 agents)
    Complete suite with all specialists
    → All available agents

( ) ⚙️ Custom
    Choose individual agents
```

### Option 2: Role-Based Presets (Clear Intent)

```
Select preset based on your role:

( ) 🎨 Frontend Developer (8 agents)
    • react-expert
    • react-performance-expert
    • typescript-expert
    • css-styling-expert
    • accessibility-expert
    • webpack-expert
    • vite-expert
    • testing-expert

( ) 🚀 Backend Developer (7 agents)
    • nodejs-expert
    • database-expert
    • postgres-expert
    • mongodb-expert
    • typescript-expert
    • docker-expert
    • testing-expert

( ) 🔧 Full-Stack Developer (12 agents) ← DEFAULT
    • typescript-expert
    • react-expert
    • nodejs-expert
    • nextjs-expert
    • database-expert
    • testing-expert
    • git-expert
    • docker-expert
    • postgres-expert
    • webpack-expert
    • jest-expert
    • code-quality-expert

( ) 🧪 Testing Specialist (7 agents)
    • testing-expert
    • jest-expert
    • vitest-expert
    • playwright-expert
    • code-quality-expert
    • typescript-expert
    • react-expert (for component testing)

( ) ☁️ DevOps Engineer (6 agents)
    • devops-expert
    • docker-expert
    • github-actions-expert
    • nodejs-expert
    • git-expert
    • database-expert

( ) ⚙️ Custom Selection
    Choose individual agents
```

### Option 3: Stack-Based Presets (Technology Focused)

```
Select your technology stack:

( ) ⚛️ React Application (8 agents)
    Modern React development
    • react-expert
    • react-performance-expert
    • typescript-expert
    • css-styling-expert
    • jest-expert
    • webpack-expert
    • testing-expert
    • code-quality-expert

( ) ▲ Next.js Full-Stack (10 agents) ← DEFAULT
    Next.js with API and database
    • nextjs-expert
    • react-expert
    • nodejs-expert
    • typescript-expert
    • database-expert
    • postgres-expert
    • testing-expert
    • jest-expert
    • docker-expert
    • git-expert

( ) 🟢 Node.js Backend (8 agents)
    API and microservices
    • nodejs-expert
    • typescript-expert
    • database-expert
    • postgres-expert
    • mongodb-expert
    • docker-expert
    • testing-expert
    • jest-expert

( ) 📱 Modern Web App (11 agents)
    SPA with backend API
    • typescript-expert
    • react-expert
    • nodejs-expert
    • database-expert
    • webpack-expert
    • vite-expert
    • testing-expert
    • jest-expert
    • docker-expert
    • git-expert
    • code-quality-expert

( ) 🏢 Enterprise Stack (15 agents)
    Large-scale applications
    • All core experts (7)
    • All testing experts (4)
    • postgres-expert
    • docker-expert
    • github-actions-expert
    • accessibility-expert

( ) ⚙️ Custom Selection
    Choose individual agents
```

### Option 4: Hybrid Approach (RECOMMENDED)

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

Quick Presets - Select one:

🎯 Core Essentials (5 agents)
   Basic agents every project needs
   → typescript, testing, git, code-quality, nodejs

📦 Recommended Stack (10 agents) ← DEFAULT
   Well-rounded for most projects
   → Core + react, database, docker, jest, webpack

💼 Professional Suite (15 agents)
   Comprehensive toolkit
   → Recommended + specialists for performance, accessibility, CI/CD

🌟 Complete Collection (23 agents)
   Everything available
   → All domain experts and specialists

──────────────────────────────────────────────────────────────
Or choose by development focus:

[ ] Frontend Focus (+6 agents)
    react, react-performance, css-styling, accessibility, vite, webpack
    
[ ] Backend Focus (+5 agents)
    nodejs, database, postgres, mongodb, docker
    
[ ] Testing Focus (+4 agents)
    jest, vitest, playwright, code-quality
    
[ ] DevOps Focus (+3 agents)
    devops, github-actions, docker

[ ] Custom Selection
    Pick individual agents manually

[Continue with Recommended Stack]  [Change Selection]
```

## Detailed Preset Definitions

### 🎯 Core Essentials (5 agents)
**Purpose**: Minimum viable agent set for any project
**Agents**:
- `typescript-expert` - Most projects use TypeScript
- `testing-expert` - Universal testing guidance
- `git-expert` - Version control is universal
- `code-quality-expert` - Best practices for any language
- `nodejs-expert` - Common runtime even for frontend

### 📦 Recommended Stack (10 agents)
**Purpose**: Covers 80% of web development needs
**Agents**:
- All from Core Essentials (5)
- `react-expert` - Most popular framework
- `database-expert` - General database guidance
- `docker-expert` - Containerization is standard
- `jest-expert` - Most common test runner
- `webpack-expert` - Still widely used bundler

### 💼 Professional Suite (15 agents)
**Purpose**: For teams needing comprehensive coverage
**Agents**:
- All from Recommended Stack (10)
- `react-performance-expert` - Performance optimization
- `accessibility-expert` - WCAG compliance
- `postgres-expert` - Most common production DB
- `playwright-expert` - E2E testing
- `devops-expert` - CI/CD and deployment

### 🌟 Complete Collection (23 agents)
**Purpose**: Maximum coverage for consultants/agencies
**Agents**: All available agents

## Focus Area Add-ons

These can be added to any preset:

### Frontend Focus (+6)
- `react-expert` (if not included)
- `react-performance-expert`
- `css-styling-expert`
- `accessibility-expert`
- `vite-expert`
- `webpack-expert` (if not included)

### Backend Focus (+5)
- `nodejs-expert` (if not included)
- `database-expert` (if not included)
- `postgres-expert`
- `mongodb-expert`
- `docker-expert` (if not included)

### Testing Focus (+4)
- `jest-expert` (if not included)
- `vitest-expert`
- `playwright-expert`
- `code-quality-expert` (if not included)

### DevOps Focus (+3)
- `devops-expert`
- `github-actions-expert`
- `docker-expert` (if not included)

## Implementation Code

```typescript
interface AgentPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  agents: string[];
  isDefault?: boolean;
  category: 'size' | 'role' | 'stack' | 'addon';
}

const AGENT_PRESETS: AgentPreset[] = [
  {
    id: 'core',
    name: 'Core Essentials',
    emoji: '🎯',
    description: 'Basic agents every project needs',
    agents: ['typescript-expert', 'testing-expert', 'git-expert', 'code-quality-expert', 'nodejs-expert'],
    category: 'size'
  },
  {
    id: 'recommended',
    name: 'Recommended Stack',
    emoji: '📦',
    description: 'Well-rounded for most projects',
    agents: [
      'typescript-expert', 'testing-expert', 'git-expert', 'code-quality-expert', 'nodejs-expert',
      'react-expert', 'database-expert', 'docker-expert', 'jest-expert', 'webpack-expert'
    ],
    isDefault: true,
    category: 'size'
  },
  {
    id: 'professional',
    name: 'Professional Suite',
    emoji: '💼',
    description: 'Comprehensive toolkit',
    agents: [
      'typescript-expert', 'testing-expert', 'git-expert', 'code-quality-expert', 'nodejs-expert',
      'react-expert', 'database-expert', 'docker-expert', 'jest-expert', 'webpack-expert',
      'react-performance-expert', 'accessibility-expert', 'postgres-expert', 'playwright-expert', 'devops-expert'
    ],
    category: 'size'
  },
  {
    id: 'everything',
    name: 'Complete Collection',
    emoji: '🌟',
    description: 'All available agents',
    agents: getAllAgents(),
    category: 'size'
  }
];

const FOCUS_ADDONS: AgentPreset[] = [
  {
    id: 'frontend-focus',
    name: 'Frontend Focus',
    emoji: '🎨',
    description: 'React, CSS, accessibility, and build tools',
    agents: ['react-expert', 'react-performance-expert', 'css-styling-expert', 'accessibility-expert', 'vite-expert', 'webpack-expert'],
    category: 'addon'
  },
  {
    id: 'backend-focus',
    name: 'Backend Focus',
    emoji: '🚀',
    description: 'Node.js, databases, and containers',
    agents: ['nodejs-expert', 'database-expert', 'postgres-expert', 'mongodb-expert', 'docker-expert'],
    category: 'addon'
  },
  {
    id: 'testing-focus',
    name: 'Testing Focus',
    emoji: '🧪',
    description: 'All testing frameworks and tools',
    agents: ['jest-expert', 'vitest-expert', 'playwright-expert', 'code-quality-expert'],
    category: 'addon'
  },
  {
    id: 'devops-focus',
    name: 'DevOps Focus',
    emoji: '☁️',
    description: 'CI/CD and infrastructure',
    agents: ['devops-expert', 'github-actions-expert', 'docker-expert'],
    category: 'addon'
  }
];
```

## User Experience Flow

1. **Show presets with clear value proposition**
   ```
   🎯 Core (5) - Just the essentials
   📦 Recommended (10) - Good for most projects ← DEFAULT
   💼 Professional (15) - Comprehensive coverage
   🌟 Everything (23) - Complete suite
   ```

2. **Optional: Add focus areas**
   ```
   Add specialized expertise:
   [ ] +6 Frontend agents
   [ ] +5 Backend agents
   [ ] +4 Testing agents
   [ ] +3 DevOps agents
   ```

3. **Show final selection**
   ```
   Your selection: Recommended Stack + Frontend Focus
   Total agents: 14 (10 base + 4 additional)
   ```

## Benefits of This Approach

1. **Simple mental model** - Size-based presets are intuitive
2. **No detection needed** - Works immediately, no analysis required
3. **Clear value prop** - Each preset has obvious use case
4. **Flexible** - Add-on system allows customization
5. **Fast** - Most users pick "Recommended" and continue
6. **Educational** - Shows what agents are for each purpose

## Recommendation

Implement **Option 4 (Hybrid Approach)** because it:
- Provides simple size-based presets as primary choice
- Allows optional focus area additions
- Defaults to sensible "Recommended Stack"
- Requires no project analysis
- Takes < 10 seconds to complete