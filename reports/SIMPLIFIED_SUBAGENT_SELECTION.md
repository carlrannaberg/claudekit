# Simplified Subagent Selection Experience

## The Problem with Current Proposal
- Too many initial choices (Essential/Tailored/Comprehensive/Everything)
- Unclear what "Essential" vs "Tailored" means
- "Comprehensive" vs "Everything" is confusing

## Simplified Proposal: Just Two Choices

### Option 1: Binary Choice

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

How would you like to select agents?

  📦 Smart Selection ← RECOMMENDED
     Install core agents + choose your specific tools
     (~10-12 agents based on your choices)
     
  🌟 Install All
     Get all 23 available agents
     (Includes all specializations)

> Smart Selection (press Enter to continue)
```

Then if Smart Selection:

```
Select your development tools:

Test Framework:        Database:            Build Tool:
◉ Jest                ◉ PostgreSQL         ◉ Vite
○ Vitest              ○ MongoDB            ○ Webpack
○ Both                ○ Both               ○ Both

Additional agents:
[ ] React Performance  [ ] Docker           [ ] Next.js
[ ] TypeScript Types   [ ] GitHub Actions   [ ] Playwright E2E
[ ] CSS & Styling     [ ] Accessibility    [ ] DevOps

[Install 10 agents] [Select All]
```

### Option 2: Single Screen - Direct Tool Selection

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

Core agents (always installed):
✓ TypeScript  ✓ React  ✓ Testing  ✓ Database  
✓ Node.js    ✓ Git    ✓ Code Quality

Choose your specific tools:

Test Framework:        Database:            Build Tool:
◉ Jest                ◉ PostgreSQL         ◉ Vite
○ Vitest              ○ MongoDB            ○ Webpack
○ Both                ○ Both               ○ Both

Want additional expertise? (optional):
[ ] React Performance  [ ] Docker           [ ] Next.js
[ ] TypeScript Types   [ ] GitHub Actions   [ ] Playwright E2E
[ ] CSS & Styling     [ ] Accessibility    [ ] DevOps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10 agents selected   [Install] [Select All 23] [Skip All]
```

### Option 3: Progressive Disclosure

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

We'll install core agents plus your specific tools.

Which test framework do you use?
  ◉ Jest
  ○ Vitest
  ○ Both
  
Which database do you use?
  ◉ PostgreSQL
  ○ MongoDB
  ○ Both
  
Which build tool do you use?
  ◉ Vite
  ○ Webpack
  ○ Both

[Continue] [Install All 23 Instead]
```

Then:

```
Would you like any additional agents? (optional)

[ ] React Performance - Optimization and profiling
[ ] Docker - Containerization
[ ] Next.js - Full-stack React framework
[ ] TypeScript Advanced - Type system & build experts
[ ] Frontend - CSS & Accessibility experts
[ ] Infrastructure - GitHub Actions & DevOps

[Install 10 agents] [Add More] [Skip]
```

## Why These Are Better

### Option 1: Binary Choice
- **Pros**: Dead simple - smart or everything
- **Cons**: Still two screens

### Option 2: Single Screen (RECOMMENDED)
- **Pros**: Everything visible at once, no confusion
- **Cons**: Slightly more to look at initially

### Option 3: Progressive
- **Pros**: Guides user through choices
- **Cons**: Multiple screens

## The Real Problem: We're Overthinking It

Maybe we just need:

```
═══════════════════════════════════════════════════════════════
Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

Select what you use:

Testing:               Database:            Build Tool:
◉ Jest                ◉ PostgreSQL         ◉ Vite
○ Vitest              ○ MongoDB            ○ Webpack
○ Both                ○ Both               ○ Both
○ None                ○ None               ○ None

Additional:
[ ] React Performance  [ ] Docker           [ ] Next.js
[ ] TypeScript Types   [ ] GitHub Actions   [ ] Playwright
[ ] CSS & Styling     [ ] Accessibility    [ ] DevOps

[Install] [Select All] [Skip Agents]
```

That's it. No presets. No confusion. Just pick what you use.

## Actual User Needs

Looking at real usage patterns:

1. **Most users** want agents for their specific stack (Jest not Vitest, Postgres not MongoDB)
2. **Some users** want everything for learning/exploration
3. **Few users** want minimal installations

So we really only need:
- **Default path**: Pick your tools (covers 80% of users)
- **Escape hatch**: "Select All" button (covers 20% who want everything)

## Final Recommendation

**Go with Option 2: Single Screen - Direct Tool Selection**

Why?
- No confusing preset names
- One screen, no navigation
- Clear what you're getting
- Fast (3 clicks for most users)
- "Select All" escape hatch for those who want everything

The core insight: **Users know what tools they use**. We don't need to create abstract groupings like "Essential" or "Comprehensive". Just ask them what they use and give them the matching experts.