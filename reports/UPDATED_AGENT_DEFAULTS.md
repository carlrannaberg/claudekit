# Updated Agent Selection with Correct Defaults

## Revised Default Selection Logic

### Always Selected (Generic/Universal):
- TypeScript (3 agents) - Almost every modern project
- React (2 agents) - Most common framework
- Node.js - Universal runtime
- Git - Version control is universal
- Code Quality - Best practices for any project
- Oracle (GPT-5) - Deep analysis for any domain
- CSS & Styling - Every web project needs styling
- Accessibility - Should be default best practice
- DevOps - Deployment concerns are universal

### User Chooses (Project-Specific):
- Test Framework (Jest/Vitest)
- Database (PostgreSQL/MongoDB)
- Build Tool (Vite/Webpack)
- Next.js (specific framework)
- Docker (not everyone containers)
- GitHub Actions (not everyone uses GitHub)
- Playwright (E2E is optional)

## Updated Interface

```
═══════════════════════════════════════════════════════════════
Select Your Development Stack
═══════════════════════════════════════════════════════════════

Core Stack (recommended for all projects):
[✓] TypeScript (3 agents)    [✓] CSS & Styling
[✓] React (2 agents)         [✓] Accessibility  
[✓] Node.js                  [✓] DevOps
[✓] Git                      [✓] Oracle (GPT-5)
[✓] Code Quality             

Additional Tools:
[ ] Next.js
[ ] Docker
[ ] GitHub Actions

Test Framework:              Database:
◉ Jest                       ◉ PostgreSQL
○ Vitest                     ○ MongoDB
○ Both                       ○ Both
○ None                       ○ None

Build Tool:                  E2E Testing:
◉ Vite                       [ ] Playwright
○ Webpack
○ Both
○ None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19 agents selected

[Install] [Select All 24] [Skip Agents]
```

## Why These Defaults Make Sense

### Generic Agents (Should be Default):
- **Oracle** - Useful for any complex problem regardless of stack
- **CSS & Styling** - Every web app needs styling guidance
- **Accessibility** - Should be default best practice, not optional
- **DevOps** - Every project eventually needs deployment help
- **Code Quality** - Universal best practices
- **Git** - Version control is universal

### Specific Agents (User Choice):
- **Jest vs Vitest** - Project-specific test runner
- **PostgreSQL vs MongoDB** - Specific database choice
- **Webpack vs Vite** - Specific bundler choice
- **Docker** - Not everyone uses containers
- **GitHub Actions** - GitHub-specific
- **Next.js** - Framework-specific
- **Playwright** - E2E testing is often optional

## Result: Better Defaults

**Before**: 15 agents (missing important generic ones)
**After**: 19 agents (includes all generic helpers)

This gives users:
- All the generic agents that help regardless of stack
- Smart defaults for common choices (Jest, PostgreSQL, Vite)
- Ability to customize specific tool choices
- Option to add specialized tools (Docker, GitHub Actions, etc.)

## Alternative: Simpler Grouping

```
═══════════════════════════════════════════════════════════════
Select Your Development Stack
═══════════════════════════════════════════════════════════════

Universal Agents (recommended for all):
[✓] TypeScript (3)  [✓] Git           [✓] CSS & Styling
[✓] React (2)       [✓] Code Quality  [✓] Accessibility
[✓] Node.js         [✓] Oracle        [✓] DevOps

Your Specific Stack:
Test: ◉ Jest ○ Vitest ○ Both ○ None
Database: ◉ PostgreSQL ○ MongoDB ○ Both ○ None
Build: ◉ Vite ○ Webpack ○ Both ○ None

Optional Additions:
[ ] Next.js  [ ] Docker  [ ] GitHub Actions  [ ] Playwright

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19 agents selected

[Install] [Select All 24] [Skip Agents]
```

This makes it even clearer which agents are universal vs specific choices.