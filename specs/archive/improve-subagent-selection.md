# Improved Subagent Selection for Project Matching

## Current Problem
- 23 agents presented as a flat list is overwhelming
- Users don't know which agents are relevant to their project
- All agents selected by default may install unnecessary ones

## Proposed Solution: Smart Project-Based Selection

### 1. Auto-Detection Based Selection
Analyze the project and pre-select relevant agents:

```typescript
// Detect project characteristics
const projectProfile = {
  languages: detectLanguages(),        // .ts, .js, .py, etc.
  frameworks: detectFrameworks(),       // React, Vue, Next.js, etc.
  testing: detectTestingTools(),       // Jest, Vitest, Playwright
  database: detectDatabases(),         // PostgreSQL, MongoDB, etc.
  buildTools: detectBuildTools(),      // Webpack, Vite, etc.
  hasDocker: detectDocker(),          // Dockerfile, docker-compose.yml
  hasCI: detectCI(),                  // .github/workflows, etc.
};

// Auto-select relevant agents based on detection
```

### 2. Role-Based Agent Groups

Instead of domain grouping, offer role-based profiles:

```javascript
const AGENT_PROFILES = {
  'frontend-developer': {
    name: '🎨 Frontend Developer',
    description: 'React, CSS, accessibility, and build tools',
    agents: [
      'react-expert',
      'react-performance-expert',
      'css-styling-expert',
      'accessibility-expert',
      'typescript-expert',
      'webpack-expert',
      'vite-expert'
    ],
    detection: (project) => project.hasReact || project.hasVue
  },
  
  'backend-developer': {
    name: '🚀 Backend Developer',
    description: 'Node.js, databases, and API development',
    agents: [
      'nodejs-expert',
      'database-expert',
      'postgres-expert',
      'mongodb-expert',
      'typescript-expert',
      'docker-expert'
    ],
    detection: (project) => project.hasNodeBackend || project.hasExpress
  },
  
  'fullstack-developer': {
    name: '🔧 Full-Stack Developer',
    description: 'Complete web application development',
    agents: [
      'react-expert',
      'nodejs-expert',
      'database-expert',
      'typescript-expert',
      'nextjs-expert',
      'docker-expert',
      'git-expert'
    ],
    detection: (project) => project.hasNext || (project.hasReact && project.hasNodeBackend)
  },
  
  'devops-engineer': {
    name: '☁️ DevOps Engineer',
    description: 'Infrastructure, CI/CD, and deployment',
    agents: [
      'devops-expert',
      'docker-expert',
      'github-actions-expert',
      'git-expert',
      'nodejs-expert'
    ],
    detection: (project) => project.hasCI || project.hasDocker
  },
  
  'qa-engineer': {
    name: '🧪 QA Engineer',
    description: 'Testing, quality assurance, and automation',
    agents: [
      'testing-expert',
      'jest-expert',
      'vitest-expert',
      'playwright-expert',
      'code-quality-expert',
      'typescript-expert'
    ],
    detection: (project) => project.hasTests
  },
  
  'typescript-developer': {
    name: '📘 TypeScript Developer',
    description: 'Advanced TypeScript and build optimization',
    agents: [
      'typescript-expert',
      'typescript-type-expert',
      'typescript-build-expert',
      'code-quality-expert'
    ],
    detection: (project) => project.hasTypeScript
  }
};
```

### 3. Technology Stack Groups

Group agents by common tech stacks:

```javascript
const STACK_GROUPS = {
  'react-typescript': {
    name: '⚛️ React + TypeScript',
    description: 'Modern React development with TypeScript',
    agents: ['react-expert', 'react-performance-expert', 'typescript-expert', 'css-styling-expert'],
    autoDetect: true
  },
  
  'nextjs-fullstack': {
    name: '▲ Next.js Full-Stack',
    description: 'Next.js with API routes and database',
    agents: ['nextjs-expert', 'react-expert', 'nodejs-expert', 'database-expert'],
    autoDetect: true
  },
  
  'node-postgres': {
    name: '🐘 Node.js + PostgreSQL',
    description: 'Backend API with PostgreSQL',
    agents: ['nodejs-expert', 'postgres-expert', 'database-expert', 'typescript-expert'],
    autoDetect: true
  },
  
  'mern-stack': {
    name: '🍃 MERN Stack',
    description: 'MongoDB, Express, React, Node.js',
    agents: ['mongodb-expert', 'nodejs-expert', 'react-expert', 'database-expert'],
    autoDetect: true
  },
  
  'testing-suite': {
    name: '🧪 Testing Suite',
    description: 'Comprehensive testing setup',
    agents: ['testing-expert', 'jest-expert', 'playwright-expert', 'code-quality-expert'],
    autoDetect: true
  },
  
  'build-optimization': {
    name: '📦 Build & Bundle',
    description: 'Build tool and performance optimization',
    agents: ['webpack-expert', 'vite-expert', 'typescript-build-expert'],
    autoDetect: false
  }
};
```

### 4. Interactive Selection Experience

```
═══════════════════════════════════════════════════════════════
Step 3: Choose AI Assistant Subagents
═══════════════════════════════════════════════════════════════

🔍 Project Analysis Detected:
  • TypeScript project
  • React framework
  • Jest testing
  • PostgreSQL database
  • Webpack bundler

📊 Recommended Agent Profiles:
  [✓] Frontend Developer (7 agents)
      Perfect match - React and TypeScript detected
  [ ] Full-Stack Developer (7 agents)
      Good match - Add if working on backend too
  [✓] QA Engineer (6 agents)
      Recommended - Jest testing detected

🎯 Quick Presets:
  ( ) Minimal - Essential agents only (5)
  (•) Smart Match - Based on your project (12) ← RECOMMENDED
  ( ) Comprehensive - All related agents (18)
  ( ) Everything - All 23 agents
  ( ) Custom - Pick individual agents

Press Enter to continue with Smart Match, or select another option...
```

### 5. Custom Selection with Better Organization

If user chooses "Custom":

```
📦 Select Individual Agents:

Core Languages & Frameworks:
  [✓] typescript-expert ← Detected in project
  [ ] typescript-type-expert (advanced types)
  [ ] typescript-build-expert (compilation)
  [✓] react-expert ← Detected in project
  [ ] react-performance-expert
  [ ] nodejs-expert
  [ ] nextjs-expert

Testing & Quality (Detected: Jest):
  [✓] testing-expert ← Recommended
  [✓] jest-expert ← Detected in project
  [ ] vitest-expert
  [ ] playwright-expert
  [ ] code-quality-expert

Database (Detected: PostgreSQL):
  [ ] database-expert
  [✓] postgres-expert ← Detected in project
  [ ] mongodb-expert

Build & Infrastructure:
  [✓] webpack-expert ← Detected in project
  [ ] vite-expert
  [ ] docker-expert
  [ ] github-actions-expert
  [ ] devops-expert

Frontend Specialties:
  [ ] css-styling-expert
  [ ] accessibility-expert

Version Control:
  [ ] git-expert

[12 agents selected] Press Enter to confirm
```

### 6. Implementation Code Structure

```typescript
// cli/lib/agent-selection.ts
export interface AgentSelectionStrategy {
  analyze(projectPath: string): ProjectProfile;
  recommend(profile: ProjectProfile): string[];
  groupAgents(): AgentGroup[];
}

export class SmartAgentSelector implements AgentSelectionStrategy {
  async analyze(projectPath: string): Promise<ProjectProfile> {
    return {
      languages: await this.detectLanguages(projectPath),
      frameworks: await this.detectFrameworks(projectPath),
      testing: await this.detectTestingTools(projectPath),
      databases: await this.detectDatabases(projectPath),
      buildTools: await this.detectBuildTools(projectPath),
      cicd: await this.detectCICD(projectPath),
    };
  }

  recommend(profile: ProjectProfile): string[] {
    const recommended = new Set<string>();
    
    // Core language agents
    if (profile.languages.includes('typescript')) {
      recommended.add('typescript-expert');
    }
    
    // Framework agents
    if (profile.frameworks.includes('react')) {
      recommended.add('react-expert');
    }
    if (profile.frameworks.includes('next')) {
      recommended.add('nextjs-expert');
      recommended.add('react-expert'); // Next.js implies React
    }
    
    // Testing agents
    if (profile.testing.length > 0) {
      recommended.add('testing-expert');
      profile.testing.forEach(tool => {
        const agent = `${tool}-expert`;
        if (agentExists(agent)) {
          recommended.add(agent);
        }
      });
    }
    
    // Database agents
    profile.databases.forEach(db => {
      recommended.add('database-expert');
      const agent = `${db}-expert`;
      if (agentExists(agent)) {
        recommended.add(agent);
      }
    });
    
    return Array.from(recommended);
  }
}
```

### 7. Benefits of This Approach

1. **Reduces Overwhelm**: Users see relevant agents first
2. **Smart Defaults**: Project analysis provides intelligent recommendations
3. **Role-Based**: Users can think in terms of their role, not technologies
4. **Stack-Based**: Common combinations are pre-grouped
5. **Progressive Disclosure**: Start with presets, allow drilling down
6. **Educational**: Shows why agents are recommended
7. **Flexible**: Still allows full customization

### 8. Alternative: Question-Based Selection

Ask 3-4 quick questions to determine agents:

```
Quick Setup Questions:

1. What type of development do you primarily do?
   > Frontend
     Backend
     Full-Stack
     DevOps
     Mobile

2. What's your main framework? (detected: React)
   > React ← Detected
     Vue
     Angular
     Next.js
     None/Other

3. Do you need database expertise?
   > Yes, PostgreSQL ← Detected
     Yes, MongoDB
     Yes, both
     No

4. What's most important for this project?
   > Performance optimization
     Testing coverage
     Code quality
     Rapid development

Based on your answers, we recommend these 12 agents:
[List of recommended agents with reasons]

[Use these] [Customize] [Show all]
```

## Recommendation

Implement **Option 2 (Role-Based)** combined with **Project Auto-Detection** for the best user experience:

1. Analyze project automatically
2. Suggest role-based profiles that match
3. Show "Smart Match" as default
4. Allow preset selection (Minimal/Smart/Comprehensive/Everything)
5. Provide custom selection with detected agents pre-selected

This approach significantly improves the user experience by:
- Reducing cognitive load
- Providing intelligent defaults
- Educating users about available agents
- Matching agents to actual project needs
- Maintaining full flexibility for power users