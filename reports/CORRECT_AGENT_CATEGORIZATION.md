# Correct Agent Categorization

## Truly Universal Agents (Should Always Be Selected)

These agents help regardless of technology stack:
- **Git** - Version control is universal
- **Code Quality** - Best practices apply to any language
- **Oracle (GPT-5)** - Deep analysis for any problem
- **DevOps** - Deployment/CI/CD concepts are universal
- **Accessibility** - Web accessibility is a universal concern
- **CSS & Styling** - Any web UI needs styling guidance
- **Testing Expert** - Testing strategies apply universally

## Technology-Specific (User Should Choose)

These depend on your actual stack:
- **TypeScript** (3 agents) - Only if using TypeScript
- **React** (2 agents) - Only if using React
- **Node.js** - Only if using Node.js
- **Jest/Vitest** - Specific test runners
- **PostgreSQL/MongoDB** - Specific databases
- **Webpack/Vite** - Specific bundlers
- **Next.js** - Specific framework
- **Docker** - Specific tool
- **GitHub Actions** - Specific CI platform
- **Playwright** - Specific E2E tool
- **Database Expert** - Only if using databases

## Corrected Interface

```
═══════════════════════════════════════════════════════════════
Select Your Development Stack
═══════════════════════════════════════════════════════════════

Universal Helpers (recommended for all):
[✓] Git                      [✓] DevOps
[✓] Code Quality             [✓] CSS & Styling  
[✓] Oracle (GPT-5)           [✓] Accessibility
[✓] Testing Strategies

Your Technology Stack:
[ ] TypeScript (3 agents)    [ ] Next.js
[ ] React (2 agents)         [ ] Docker
[ ] Node.js                  [ ] GitHub Actions

Test Framework:              Database:
○ Jest                       ○ PostgreSQL + Database Expert
○ Vitest                     ○ MongoDB + Database Expert
○ Both                       ○ Both
○ None                       ○ None

Build Tool:                  E2E Testing:
○ Vite                       [ ] Playwright
○ Webpack
○ Both
○ None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7 agents selected (with no stack choices)

[Install] [Select All 24] [Skip Agents]
```

## Better Approach: Quick Presets + Customization

```
═══════════════════════════════════════════════════════════════
Select Your Development Stack
═══════════════════════════════════════════════════════════════

Quick Presets:
○ JavaScript/React Project (React, Node.js, Jest, Webpack)
○ TypeScript/React Project (TypeScript, React, Node.js, Jest, Vite)
○ Node.js Backend (Node.js, TypeScript, Database, PostgreSQL)
○ Python Project (Coming soon)
○ Custom Selection

[Continue with Custom Selection]

──────────────────────────────────────────────────────────────

Always Included (universal helpers):
✓ Git  ✓ Code Quality  ✓ Oracle  ✓ DevOps  
✓ Testing Strategies  ✓ CSS & Styling  ✓ Accessibility

Select Your Technologies:
[ ] TypeScript (3 agents)    [ ] React (2 agents)
[ ] Node.js                  [ ] Next.js
[ ] Docker                   [ ] GitHub Actions

Test Runner:                 Database:
○ Jest                       ○ PostgreSQL
○ Vitest                     ○ MongoDB
○ Both                       ○ Both
○ None                       ○ None

Build Tool:                  E2E Testing:
○ Vite                       [ ] Playwright
○ Webpack
○ Both
○ None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7 universal + 0 selected = 7 agents

[Install] [Select All 24] [Skip Agents]
```

## The Real Problem

We're trying to set defaults for technology-specific agents, but claudekit users could be using:
- Python instead of JavaScript
- Vue instead of React  
- Java instead of Node.js
- Ruby on Rails
- Go
- Rust

So the only TRUE defaults should be the universal agents. Everything else should be opt-in based on what they actually use.

## Final Recommendation

```
═══════════════════════════════════════════════════════════════
Select Your Development Stack
═══════════════════════════════════════════════════════════════

Universal Agents (always helpful):
[✓] Git                      [✓] DevOps
[✓] Code Quality             [✓] CSS & Styling
[✓] Oracle (GPT-5)           [✓] Accessibility  
[✓] Testing Strategies

Programming Languages:
[ ] TypeScript (includes type & build experts)
[ ] Node.js
[ ] Python (coming soon)

Frameworks:
[ ] React (includes performance expert)
[ ] Next.js
[ ] Vue (coming soon)

Test Runners:
○ Jest  ○ Vitest  ○ Both  ○ None

Databases:
○ PostgreSQL  ○ MongoDB  ○ Both  ○ None

Build & Deploy:
[ ] Webpack    [ ] Docker
[ ] Vite       [ ] GitHub Actions
[ ] Playwright

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7 agents selected

[Install] [Select All 24] [Skip Agents]
```

This properly separates:
- **Universal agents** (pre-selected) - Help regardless of stack
- **Technology choices** (user selects) - Based on actual project

Much more honest about what's truly "universal" vs technology-specific!