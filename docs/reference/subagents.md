# Subagents List

Claudekit includes 31 specialized AI subagents that provide deep domain expertise. These agents work alongside Claude Code to handle complex, domain-specific tasks.

## Installation

```bash
# Install all agents
claudekit setup --all

# Install specific agents
claudekit setup --agents typescript-expert,react-expert

# Install by category (e.g., testing stack)
claudekit setup --agents testing-expert,jest-expert,vitest-expert,playwright-expert
```

## Usage

After installation, use agents in two ways:

1. **Explicit invocation**: "Use the oracle agent to debug this issue"
2. **Proactive usage**: Run `/agent-md:init` to configure automatic delegation

## Available Agents

### 🧠 Advanced Analysis

#### oracle
Deep debugging, audits, and architectural decisions using GPT-5.
- **Expertise**: Complex bug analysis, security audits, code reviews
- **Special**: Uses external CLI tools (cursor-agent, codex, opencode)
- **Setup**: [Oracle Setup Guide](oracle-setup.md)

### 🔧 Build Tools

#### webpack-expert
Webpack build optimization and configuration specialist.
- **Expertise**: Bundle analysis, code splitting, module federation
- **Tools**: Read, Edit, MultiEdit, Bash, Grep, Glob

#### vite-expert
Vite development and build optimization expert.
- **Expertise**: ESM-first development, HMR optimization, plugin ecosystem
- **Tools**: Read, Edit, MultiEdit, Bash, Grep, Glob

### 🎯 Code Quality

#### code-review-expert
Comprehensive 6-aspect parallel code review specialist.
- **Expertise**: Architecture, security, performance, testing, quality, documentation
- **Tools**: Read, Grep, Glob, Bash

#### triage-expert
Context gathering and initial problem diagnosis specialist.
- **Expertise**: Error analysis, performance issues, problem routing to specialized experts
- **Tools**: Read, Grep, Glob, Bash, Task

#### refactoring-expert
Code smell detection and comprehensive refactoring guidance.
- **Expertise**: 25+ code smell patterns, safe refactoring process, test-driven changes
- **Tools**: Read, Grep, Glob, Bash, Edit, MultiEdit, Write

#### linting-expert
Code linting, formatting, and static analysis across languages.
- **Expertise**: ESLint, Prettier, static analysis tools
- **Tools**: Full access (*)

### 🗄️ Database

#### database-expert
Cross-database optimization and schema design.
- **Expertise**: PostgreSQL, MySQL, MongoDB, SQLite, ORM integration
- **Tools**: Bash(psql:*), Bash(mysql:*), Bash(mongosh:*), Bash(sqlite3:*), Read, Grep, Edit

#### postgres-expert
PostgreSQL-specific optimization and administration.
- **Expertise**: Query optimization, JSONB, indexing, partitioning
- **Tools**: Bash(psql:*), Bash(pg_dump:*), Bash(pg_restore:*), Read, Grep, Edit

#### mongodb-expert
MongoDB document modeling and aggregation specialist.
- **Expertise**: Document modeling, aggregation pipelines, sharding
- **Tools**: Bash(mongosh:*), Bash(mongo:*), Read, Grep, Edit

### 🚀 DevOps & Infrastructure

#### devops-expert
CI/CD pipelines and infrastructure as code.
- **Expertise**: Containerization, orchestration, monitoring, security
- **Tools**: Full access (*)

#### docker-expert (infrastructure/docker-expert)
Docker containerization and orchestration expert.
- **Expertise**: Multi-stage builds, image optimization, Docker Compose
- **Tools**: Full access (*)

#### github-actions-expert (infrastructure/github-actions-expert)
GitHub Actions workflow automation specialist.
- **Expertise**: CI/CD pipelines, custom actions, security best practices
- **Tools**: Full access (*)

### 🎨 Frontend Development

#### css-styling-expert (frontend/css-styling-expert)
CSS architecture and responsive design expert.
- **Expertise**: Modern CSS, CSS-in-JS, design systems, accessibility
- **Tools**: Read, Edit, MultiEdit, Grep, Glob, Bash, LS

#### accessibility-expert (frontend/accessibility-expert)
WCAG compliance and accessibility optimization.
- **Expertise**: WCAG 2.1/2.2, WAI-ARIA, screen readers, keyboard navigation
- **Tools**: Read, Grep, Glob, Bash, Edit, MultiEdit, Write

### 📦 Frameworks

#### nextjs-expert (framework/nextjs-expert)
Next.js App Router and Server Components specialist.
- **Expertise**: App Router, Server Components, performance, deployment
- **Tools**: Read, Grep, Glob, Bash, Edit, MultiEdit, Write

### 🌿 Version Control

#### git-expert
Git workflow and repository management expert.
- **Expertise**: Merge conflicts, branching, recovery, performance
- **Tools**: Full access (*)

### ⚙️ Runtime

#### nodejs-expert
Node.js runtime and ecosystem expert.
- **Expertise**: Async patterns, module systems, streams, performance
- **Tools**: Read, Write, Edit, Bash, Grep, Glob

### ⚛️ React

#### react-expert
React patterns and best practices specialist.
- **Expertise**: Component patterns, hooks, state management
- **Tools**: Read, Grep, Glob, Bash, Edit, MultiEdit, Write

#### react-performance-expert
React performance optimization specialist.
- **Expertise**: DevTools Profiler, memoization, Core Web Vitals
- **Tools**: Read, Grep, Glob, Bash, Edit, MultiEdit, Write

### 🧪 Testing

#### testing-expert
Cross-framework testing architecture specialist.
- **Expertise**: Test structure, mocking, coverage, debugging
- **Tools**: Read, Edit, Bash, Grep, Glob

#### jest-expert (testing/jest-expert)
Jest testing framework specialist.
- **Expertise**: Advanced mocking, snapshots, async patterns
- **Tools**: Full access (*)

#### vitest-expert (testing/vitest-expert)
Vitest modern testing framework expert.
- **Expertise**: ESM patterns, Vite integration, performance
- **Tools**: Full access (*)

#### playwright-expert (e2e/playwright-expert)
End-to-end testing and browser automation.
- **Expertise**: Cross-browser testing, visual regression, CI/CD
- **Tools**: Bash, Read, Write, Edit, MultiEdit, Grep, Glob

### 📘 TypeScript

#### typescript-expert
General TypeScript and JavaScript expertise.
- **Expertise**: Best practices, patterns, ecosystem
- **Tools**: Full access (*)

#### typescript-build-expert
TypeScript compiler and build configuration.
- **Expertise**: tsconfig, module resolution, build optimization
- **Tools**: Read, Bash, Glob, Grep, Edit, MultiEdit, Write

#### typescript-type-expert
Advanced TypeScript type system specialist.
- **Expertise**: Complex generics, conditional types, type-level programming
- **Tools**: Full access (*)

## Creating Custom Agents

Use `/create-subagent` in Claude Code for guided agent creation, or manually create agents following the structure in `src/agents/`.

## Agent Frontmatter Fields

Each agent markdown file includes:
- `name`: Agent identifier
- `description`: When to use this agent
- `tools`: Available Claude Code tools
- `category`: Agent category for organization
- `displayName`: Human-friendly name
- `color`: UI theme color

## Contributing

See [Agent Authoring Guide](../src/agents/README.md) for contribution guidelines.