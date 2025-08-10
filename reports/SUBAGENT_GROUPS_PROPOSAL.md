# Subagent Installation Groups - Implementation Proposal

## Executive Summary
Replace the current "all 23 agents selected by default" approach with intelligent, project-aware agent selection using role-based profiles and auto-detection.

## Proposed Agent Groups for Installation

### 1. Role-Based Profiles

#### 🎨 Frontend Developer Profile
**Agents**: 7 agents
- `react-expert` - React framework expertise
- `react-performance-expert` - Performance optimization
- `typescript-expert` - TypeScript support
- `css-styling-expert` - Styling and CSS-in-JS
- `accessibility-expert` - WCAG compliance
- `webpack-expert` OR `vite-expert` - Build tools (based on detection)
- `testing-expert` - Frontend testing

**Auto-select when**: React, Vue, or Angular detected

#### 🚀 Backend Developer Profile  
**Agents**: 6 agents
- `nodejs-expert` - Node.js runtime
- `database-expert` - General database patterns
- `postgres-expert` OR `mongodb-expert` - Specific DB (based on detection)
- `typescript-expert` - TypeScript support
- `docker-expert` - Containerization
- `testing-expert` - Backend testing

**Auto-select when**: Express, Fastify, or Node.js API detected

#### 🔧 Full-Stack Developer Profile
**Agents**: 9 agents
- `nextjs-expert` - Next.js framework
- `react-expert` - React components
- `nodejs-expert` - Backend/API routes
- `database-expert` - Data layer
- `typescript-expert` - Type safety
- `docker-expert` - Deployment
- `git-expert` - Version control
- `testing-expert` - Full-stack testing
- Build tool expert (detected)

**Auto-select when**: Next.js, Remix, or full-stack framework detected

#### 🧪 QA Engineer Profile
**Agents**: 6 agents
- `testing-expert` - Testing strategies
- `jest-expert` - Unit testing
- `playwright-expert` - E2E testing
- `code-quality-expert` - Best practices
- `typescript-expert` - Type checking
- Framework test expert (detected)

**Auto-select when**: Test files detected (*.test.*, *.spec.*)

#### ☁️ DevOps Engineer Profile
**Agents**: 5 agents
- `devops-expert` - CI/CD and deployment
- `docker-expert` - Containerization
- `github-actions-expert` - GitHub workflows
- `git-expert` - Advanced git operations
- `nodejs-expert` - Build scripts

**Auto-select when**: Dockerfile, CI/CD configs, or IaC files detected

### 2. Technology Stack Presets

#### ⚛️ React + TypeScript Stack
**Agents**: 5 agents
- `react-expert`
- `react-performance-expert`
- `typescript-expert`
- `jest-expert`
- `webpack-expert` OR `vite-expert`

#### ▲ Next.js Full-Stack
**Agents**: 6 agents
- `nextjs-expert`
- `react-expert`
- `nodejs-expert`
- `typescript-expert`
- `database-expert`
- `vercel-expert` (future)

#### 🍃 MERN Stack
**Agents**: 5 agents
- `mongodb-expert`
- `nodejs-expert`
- `react-expert`
- `database-expert`
- `jest-expert`

#### 🐘 Node.js + PostgreSQL
**Agents**: 5 agents
- `nodejs-expert`
- `postgres-expert`
- `database-expert`
- `typescript-expert`
- `docker-expert`

### 3. Complexity-Based Presets

#### 🎯 Essential (Minimal)
**Agents**: 5 agents
- Primary language expert (detected)
- Primary framework expert (detected)
- `testing-expert`
- `git-expert`
- `code-quality-expert`

#### 🚀 Recommended (Smart Match)
**Agents**: 8-12 agents
- All detected technology experts
- Related specialized experts
- Testing tools for detected frameworks
- Build tools in use

#### 💼 Professional (Comprehensive)
**Agents**: 15-18 agents
- All detected technology experts
- All related specialists
- All testing frameworks
- All build tools
- DevOps and deployment experts

#### 🌟 Everything
**Agents**: All 23 agents
- Complete suite for maximum coverage

## Interactive Selection Flow

### Step 1: Project Analysis
```
🔍 Analyzing your project...

Detected:
  ✓ TypeScript (tsconfig.json)
  ✓ React 18.2.0 (package.json)
  ✓ Jest 29.0.0 (jest.config.js)
  ✓ PostgreSQL (database config)
  ✓ Webpack 5 (webpack.config.js)
```

### Step 2: Smart Recommendations
```
Based on your project, we recommend:

🎯 Smart Match (12 agents) ← RECOMMENDED
   Perfectly tailored to your project

Choose a preset:
  ( ) Essential - Core agents only (5)
  (•) Smart Match - Project-specific (12)
  ( ) Professional - Comprehensive (18)
  ( ) Everything - All agents (23)
  ( ) Custom - Choose individually
  
Or select by role:
  [✓] Frontend Developer (7 agents)
  [ ] QA Engineer (6 agents)
  [ ] DevOps Engineer (5 agents)
```

### Step 3: Confirmation
```
Selected Agents (12):

Core:
  • typescript-expert (detected)
  • react-expert (detected)
  • nodejs-expert

Specialists:
  • react-performance-expert
  • postgres-expert (detected)
  • jest-expert (detected)
  • webpack-expert (detected)

Quality:
  • testing-expert
  • code-quality-expert
  • git-expert

Support:
  • database-expert
  • css-styling-expert

[Install] [Customize] [Back]
```

## Implementation Details

### Detection Logic
```typescript
interface ProjectDetection {
  // Language detection
  hasTypeScript: boolean;  // tsconfig.json
  hasJavaScript: boolean;  // .js files
  
  // Framework detection
  framework: 'react' | 'vue' | 'angular' | 'next' | 'svelte' | null;
  
  // Testing detection
  testRunners: ('jest' | 'vitest' | 'mocha' | 'playwright')[];
  
  // Database detection
  databases: ('postgres' | 'mongodb' | 'mysql' | 'redis')[];
  
  // Build tool detection
  buildTools: ('webpack' | 'vite' | 'rollup' | 'parcel')[];
  
  // Infrastructure detection
  hasDocker: boolean;      // Dockerfile
  hasKubernetes: boolean;  // k8s configs
  ciPlatform: 'github' | 'gitlab' | 'jenkins' | null;
}
```

### Scoring Algorithm
```typescript
function scoreAgentRelevance(agent: string, project: ProjectDetection): number {
  let score = 0;
  
  // Direct match: +10 points
  if (agentMatchesDetection(agent, project)) score += 10;
  
  // Related technology: +5 points
  if (agentRelatedToProject(agent, project)) score += 5;
  
  // Commonly used together: +3 points
  if (agentCommonlyUsedWith(agent, project)) score += 3;
  
  // General utility: +1 point
  if (isGeneralUtilityAgent(agent)) score += 1;
  
  return score;
}
```

## Benefits Over Current Approach

### Current Issues
- ❌ Overwhelming: 23 agents all selected
- ❌ No context: Users don't know what they need
- ❌ Wasteful: Installs irrelevant agents
- ❌ Confusing: No clear organization

### Improved Experience
- ✅ **Smart**: Detects and recommends relevant agents
- ✅ **Organized**: Clear role and stack-based groups
- ✅ **Educational**: Shows why agents are recommended
- ✅ **Flexible**: Multiple selection methods
- ✅ **Efficient**: Installs only what's needed

## Migration Path

1. **Phase 1**: Add detection logic and scoring
2. **Phase 2**: Implement role-based profiles
3. **Phase 3**: Add smart recommendations UI
4. **Phase 4**: Deprecate "all selected" default

## Metrics for Success

- **Selection time**: Reduced from 30s to 10s
- **Relevant agents**: 90%+ of installed agents used
- **User satisfaction**: Fewer "too many agents" complaints
- **Reinstalls**: Reduced need to add/remove agents later

## Conclusion

This proposal transforms agent selection from an overwhelming "select all" experience to an intelligent, project-aware system that installs exactly what developers need. The combination of auto-detection, role-based profiles, and smart presets ensures both beginners and experts can quickly configure their optimal agent setup.