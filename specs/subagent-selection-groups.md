# Subagent Selection with Specialized Options

## The Problem
We have both broad experts and specialized sub-experts:
- `testing-expert` (broad) vs `jest-expert`, `vitest-expert`, `playwright-expert` (specialized)
- `database-expert` (broad) vs `postgres-expert`, `mongodb-expert` (specialized)
- `typescript-expert` (broad) vs `typescript-type-expert`, `typescript-build-expert` (specialized)

Users shouldn't need to install all specialized experts, just the ones they use.

## Proposed Solution: Two-Stage Selection

### Stage 1: Core Domains with Optional Specialization

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

Select domains and their specializations:

✅ TypeScript Development
   ├─ ✓ typescript-expert (general TypeScript support)
   └─ Choose specializations:
      [ ] typescript-type-expert (advanced type gymnastics)
      [ ] typescript-build-expert (compilation & bundling)

✅ React Development  
   ├─ ✓ react-expert (general React development)
   └─ Choose specialization:
      [ ] react-performance-expert (optimization & profiling)

✅ Testing
   ├─ ✓ testing-expert (general testing strategies)
   └─ Choose your test frameworks:
      ( ) Jest
      ( ) Vitest
      ( ) Both Jest and Vitest
      ( ) None (general testing only)
   └─ E2E Testing:
      [ ] playwright-expert

✅ Database
   ├─ ✓ database-expert (general database patterns)
   └─ Choose your databases:
      [ ] PostgreSQL
      [ ] MongoDB
      [ ] Both
      [ ] None (general database only)

✅ Build Tools
   └─ Choose your bundler:
      ( ) Webpack
      ( ) Vite
      ( ) Both
      ( ) None

✅ Infrastructure
   └─ Select what you use:
      [ ] Docker
      [ ] GitHub Actions

✅ Frontend Specialties
   └─ Select what you need:
      [ ] CSS & Styling
      [ ] Accessibility (WCAG)

✅ Other Experts
   ├─ [ ] nodejs-expert
   ├─ [ ] nextjs-expert
   ├─ [ ] git-expert
   ├─ [ ] code-quality-expert
   └─ [ ] devops-expert

[Continue] [Select All] [Clear All]
```

### Alternative: Preset + Customization Approach

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

QUICK START - Choose a preset:

📦 Standard Web Development (10 agents) ← RECOMMENDED
   ✓ Core: typescript, react, nodejs, testing, database
   ✓ Tools: git, code-quality
   + You'll customize: test framework, database, bundler

💼 Full-Stack Professional (15 agents)
   ✓ Everything in Standard
   ✓ Plus: All specializations for your choices
   
🎯 Minimal (5 agents)
   ✓ Just broad experts, no specializations

⚙️ Custom (start from scratch)

[Continue with Standard]

───────────────────────────────────────────────────────────────
CUSTOMIZE YOUR SELECTION:

Your preset includes broad experts. Now choose specializations:

🧪 Testing Framework (pick one or both):
   ( ) Jest - Most popular, great for React
   ( ) Vitest - Faster, Vite-native
   ( ) Both - Working with multiple projects
   ( ) Skip - Just use general testing expert

🗄️ Database System (pick one or both):
   ( ) PostgreSQL - Relational, production-ready
   ( ) MongoDB - Document store, flexible schema
   ( ) Both - Polyglot persistence
   ( ) Skip - Just use general database expert

📦 Build Tool (pick one or both):
   ( ) Webpack - Mature, highly configurable
   ( ) Vite - Fast, modern development
   ( ) Both - Migrating or multi-project
   ( ) Skip - No bundler-specific help needed

🎨 Frontend Specializations:
   [ ] React Performance - Optimization & profiling
   [ ] CSS & Styling - Modern CSS, Tailwind, CSS-in-JS
   [ ] Accessibility - WCAG compliance, ARIA

🔧 Advanced TypeScript:
   [ ] Type System Expert - Generics, conditional types
   [ ] Build Expert - Module systems, compilation

🚀 Infrastructure:
   [ ] Docker - Containerization
   [ ] GitHub Actions - CI/CD workflows
   [ ] Next.js - Full-stack React framework

[Install 12 agents] [Back]
```

## Smart Grouping Rules

### 1. Mutually Exclusive Choices (Radio Buttons)
When experts cover the same domain but different tools:
```
Choose your test runner:
( ) Jest
( ) Vitest  
( ) Both
( ) Neither
```

### 2. Independent Options (Checkboxes)
When experts cover different aspects:
```
Select additional capabilities:
[ ] React Performance
[ ] CSS & Styling
[ ] Accessibility
```

### 3. Hierarchical Dependencies
Broad expert always included when selecting specializations:
```
✅ Testing (included automatically)
   └─ ✓ jest-expert (your selection)
```

## Implementation Data Structure

```typescript
interface AgentDomain {
  id: string;
  name: string;
  broadExpert?: string;  // e.g., 'testing-expert'
  specializations: {
    category: string;
    type: 'radio' | 'checkbox';
    options: {
      id: string;
      name: string;
      description: string;
      agents: string[];
    }[];
  }[];
}

const AGENT_DOMAINS: AgentDomain[] = [
  {
    id: 'testing',
    name: 'Testing',
    broadExpert: 'testing-expert',
    specializations: [
      {
        category: 'Test Framework',
        type: 'radio',
        options: [
          { 
            id: 'jest', 
            name: 'Jest', 
            description: 'Popular, React-friendly',
            agents: ['jest-expert'] 
          },
          { 
            id: 'vitest', 
            name: 'Vitest', 
            description: 'Fast, Vite-native',
            agents: ['vitest-expert'] 
          },
          { 
            id: 'both-test', 
            name: 'Both', 
            description: 'Multiple projects',
            agents: ['jest-expert', 'vitest-expert'] 
          },
          { 
            id: 'none-test', 
            name: 'None', 
            description: 'General testing only',
            agents: [] 
          }
        ]
      },
      {
        category: 'E2E Testing',
        type: 'checkbox',
        options: [
          { 
            id: 'playwright', 
            name: 'Playwright', 
            description: 'Cross-browser E2E',
            agents: ['playwright-expert'] 
          }
        ]
      }
    ]
  },
  {
    id: 'database',
    name: 'Database',
    broadExpert: 'database-expert',
    specializations: [
      {
        category: 'Database System',
        type: 'radio',
        options: [
          { 
            id: 'postgres', 
            name: 'PostgreSQL', 
            description: 'Relational, ACID',
            agents: ['postgres-expert'] 
          },
          { 
            id: 'mongodb', 
            name: 'MongoDB', 
            description: 'Document store',
            agents: ['mongodb-expert'] 
          },
          { 
            id: 'both-db', 
            name: 'Both', 
            description: 'Polyglot persistence',
            agents: ['postgres-expert', 'mongodb-expert'] 
          },
          { 
            id: 'none-db', 
            name: 'None', 
            description: 'General patterns only',
            agents: [] 
          }
        ]
      }
    ]
  },
  {
    id: 'build-tools',
    name: 'Build Tools',
    broadExpert: null,  // No broad expert for build tools
    specializations: [
      {
        category: 'Bundler',
        type: 'radio',
        options: [
          { 
            id: 'webpack', 
            name: 'Webpack', 
            description: 'Mature, configurable',
            agents: ['webpack-expert'] 
          },
          { 
            id: 'vite', 
            name: 'Vite', 
            description: 'Fast, modern',
            agents: ['vite-expert'] 
          },
          { 
            id: 'both-build', 
            name: 'Both', 
            description: 'Multiple tools',
            agents: ['webpack-expert', 'vite-expert'] 
          },
          { 
            id: 'none-build', 
            name: 'None', 
            description: 'No bundler needed',
            agents: [] 
          }
        ]
      }
    ]
  }
];
```

## Preset Templates

### Standard Web Development (Customizable)
```typescript
{
  baseAgents: [
    'typescript-expert',
    'react-expert', 
    'nodejs-expert',
    'testing-expert',  // Broad expert included
    'database-expert', // Broad expert included
    'git-expert',
    'code-quality-expert'
  ],
  requiredChoices: [
    'testing.framework',  // Must choose Jest/Vitest/Both/None
    'database.system',    // Must choose Postgres/Mongo/Both/None
    'build-tools.bundler' // Must choose Webpack/Vite/Both/None
  ],
  optionalChoices: [
    'react.performance',
    'typescript.advanced',
    'frontend.specialties',
    'infrastructure'
  ]
}
```

## Benefits of This Approach

1. **No Redundancy** - Don't install both Jest and Vitest experts if you only use Jest
2. **Clear Choices** - Radio buttons for mutually exclusive options
3. **Flexibility** - Can select "Both" when needed
4. **Guided Selection** - Presets provide structure, customization adds specificity
5. **Hierarchical Logic** - Broad experts included automatically with specializations
6. **Quick Defaults** - Can skip customization and just get broad experts

## Example User Flow

1. User selects "Standard Web Development" preset
2. System shows customization screen:
   - Testing: User selects "Jest" 
   - Database: User selects "PostgreSQL"
   - Build: User selects "Vite"
   - Optional: User checks "React Performance"
3. Final installation:
   - 7 base agents from preset
   - jest-expert (not vitest-expert)
   - postgres-expert (not mongodb-expert)  
   - vite-expert (not webpack-expert)
   - react-performance-expert
   - **Total: 11 agents** (not 15+)

## Alternative: Compact Single-Screen Selection

```
═══════════════════════════════════════════════════════════════
AI Assistant Subagents - Choose What You Use
═══════════════════════════════════════════════════════════════

CORE AGENTS (recommended for all):
✅ typescript-expert     ✅ testing-expert
✅ react-expert         ✅ database-expert  
✅ nodejs-expert        ✅ git-expert
✅ code-quality-expert

CHOOSE YOUR TOOLS:

Test Framework:          Database:              Build Tool:
◉ Jest                  ◉ PostgreSQL           ◉ Webpack
○ Vitest                ○ MongoDB              ○ Vite
○ Both                  ○ Both                 ○ Both
○ Skip                  ○ Skip                 ○ Skip

ADD SPECIALIZATIONS:

React:                  TypeScript:            Frontend:
□ Performance           □ Type System          □ CSS & Styling
                       □ Build Config         □ Accessibility

Infrastructure:         Frameworks:
□ Docker               □ Next.js
□ GitHub Actions       □ DevOps

[Install 11 agents] [Select All 23] [Reset]
═══════════════════════════════════════════════════════════════
```

This gives users exactly what they need without overwhelming them with unnecessary specialized agents.