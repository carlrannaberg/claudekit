# Proposed Subagent Selection Experience

## Overview
A two-step process that starts with a simple preset choice, then allows customization of specific tools.

## The Complete Experience

### Step 3 of Setup: Choose AI Assistant Subagents

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

How many agents would you like to install?

  🎯 Essential (7 agents)
     Core experts only, no specializations
     
  📦 Tailored (10-12 agents) ← RECOMMENDED
     Core experts + your specific tools
     
  💼 Comprehensive (15-18 agents)
     Core experts + most specializations
     
  🌟 Everything (23 agents)
     All available agents

> Tailored (press Enter to continue, or arrow keys to change)
```

### If User Selects "Tailored" (Default):

```
═══════════════════════════════════════════════════════════════
Customize Your Agent Selection
═══════════════════════════════════════════════════════════════

These core agents will be installed:
✓ typescript-expert   ✓ testing-expert   ✓ database-expert
✓ react-expert       ✓ nodejs-expert    ✓ git-expert
✓ code-quality-expert

Now choose your specific tools:

Test Framework:           Database System:          Build Tool:
◉ Jest                   ◉ PostgreSQL              ◉ Webpack
○ Vitest                 ○ MongoDB                 ○ Vite
○ Both                   ○ Both                    ○ Both
○ Skip                   ○ Skip                    ○ Skip

Additional Specializations (optional):
[ ] React Performance Expert
[ ] TypeScript Type System Expert
[ ] TypeScript Build Expert
[ ] CSS & Styling Expert
[ ] Accessibility Expert
[ ] Docker Expert
[ ] GitHub Actions Expert
[ ] Next.js Expert
[ ] Playwright E2E Expert
[ ] DevOps Expert

[Enter to continue with 10 agents selected]
```

### Final Confirmation:

```
═══════════════════════════════════════════════════════════════
Installation Summary
═══════════════════════════════════════════════════════════════

Installing 10 AI Assistant Subagents:

Core Experts (7):
  • typescript-expert      • testing-expert
  • react-expert          • database-expert
  • nodejs-expert         • git-expert
  • code-quality-expert

Your Specific Tools (3):
  • jest-expert (test framework)
  • postgres-expert (database)
  • webpack-expert (build tool)

[Confirm Installation] [Back to Customize]
```

## Alternative Presets Breakdown

### 🎯 Essential (7 agents)
Just the broad experts, no specializations:
- typescript-expert
- react-expert  
- nodejs-expert
- testing-expert
- database-expert
- git-expert
- code-quality-expert

### 📦 Tailored (10-12 agents)
Core experts + user's specific tool choices:
- All 7 essential agents
- User picks: test framework (0-2 agents)
- User picks: database system (0-2 agents)
- User picks: build tool (0-2 agents)
- Optional: additional specializations

### 💼 Comprehensive (15-18 agents)
Most agents except competing tools:
- All 7 essential agents
- jest-expert AND vitest-expert
- postgres-expert AND mongodb-expert
- webpack-expert OR vite-expert (pick one)
- react-performance-expert
- docker-expert
- accessibility-expert
- Plus 2-3 more based on common patterns

### 🌟 Everything (23 agents)
All available agents, no customization needed

## User Flow Examples

### Example 1: Typical React Developer
1. Selects "📦 Tailored" (default)
2. Keeps Jest selected (default)
3. Keeps PostgreSQL selected (default)
4. Changes build tool to Vite
5. Checks "React Performance Expert"
6. **Result**: 11 agents installed

### Example 2: Minimalist User
1. Selects "🎯 Essential"
2. **Result**: 7 agents installed, done

### Example 3: Full-Stack Developer
1. Selects "📦 Tailored"
2. Selects "Both" for test framework
3. Selects "Both" for database
4. Keeps Webpack selected
5. Checks "Docker Expert" and "Next.js Expert"
6. **Result**: 14 agents installed

### Example 4: Power User
1. Selects "🌟 Everything"
2. **Result**: 23 agents installed, done

## Implementation Details

### Interactive Elements

**Radio Button Groups** (mutually exclusive):
```javascript
// Only one selection allowed
Test Framework:
( ) Jest
( ) Vitest
( ) Both
( ) Skip
```

**Checkboxes** (multiple selections):
```javascript
// Any combination allowed
Additional Specializations:
[ ] React Performance
[ ] Docker
[ ] Accessibility
```

### Smart Defaults

Based on common patterns:
- Jest is default for test framework (most popular)
- PostgreSQL is default for database (most common production DB)
- Webpack is default for build tool (most mature)
- All defaults can be changed

### Selection Rules

1. **Core experts always included** in Tailored/Comprehensive presets
2. **"Skip" option** available for users who don't need specializations
3. **"Both" option** for users with multiple projects or migration scenarios
4. **No redundancy** - selecting a specialization includes its broad expert automatically

## Benefits of This Experience

1. **Fast for most users** - One click on "Tailored" + Enter gives sensible defaults
2. **No overwhelm** - Max 3 radio choices + optional checkboxes
3. **Clear value** - Each preset has obvious use case
4. **Flexible** - Can customize without starting from scratch
5. **Smart grouping** - Competing tools are radio buttons, complementary tools are checkboxes
6. **Educational** - Shows what tools compete vs complement

## Visual Design Notes

- **Emojis** for visual scanning and friendliness
- **Radio buttons** (◉/○) for mutually exclusive choices
- **Checkboxes** ([✓]/[ ]) for independent choices
- **Highlighted defaults** with "← RECOMMENDED" or "(default)"
- **Agent count** always visible to set expectations
- **Indentation** to show hierarchy and grouping

## Keyboard Navigation

- **Arrow keys**: Navigate between options
- **Space**: Toggle selection
- **Tab**: Move between sections
- **Enter**: Confirm and continue
- **ESC**: Go back

## Time to Complete

- **Minimal path**: 2 seconds (Enter → Enter with defaults)
- **Typical path**: 10 seconds (select preset, adjust 1-2 options)
- **Power user**: 20 seconds (review all options)
- **Compare to current**: 30+ seconds reviewing 23 agents

## Summary

This experience provides a **fast, intuitive way** to install the right agents by:
1. Starting with a simple size-based choice
2. Customizing only the tool-specific choices that matter
3. Presenting competing tools as radio buttons
4. Making complementary tools optional checkboxes
5. Always showing clear defaults and recommendations

Most users will select "Tailored", make 0-2 adjustments, and be done in under 10 seconds with exactly the agents they need.