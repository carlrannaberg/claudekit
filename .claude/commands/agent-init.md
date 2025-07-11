---
description: Initialize project with AGENT.md and create symlinks for all AI assistants
allowed-tools: Write, Bash(ln:*), Bash(mkdir:*), Bash(test:*), Read
---

# Initialize AGENT.md for Your Project

Create a comprehensive AGENT.md file following the universal standard, with symlinks for all AI assistants.

## Current Status
!`test -f AGENT.md && echo "⚠️  AGENT.md already exists" || echo "✅ Ready to create AGENT.md"`

## Task

Analyze this codebase and create an AGENT.md file that provides guidance to AI coding assistants.

### 1. Analyze the Codebase
First, examine the project to understand:
- Project type by checking for:
  - Node.js: package.json, package-lock.json, yarn.lock
  - Python: requirements.txt, setup.py, pyproject.toml, Pipfile
  - Go: go.mod, go.sum
  - Rust: Cargo.toml, Cargo.lock
  - Ruby: Gemfile, Gemfile.lock
  - Java: pom.xml, build.gradle
  - .NET: *.csproj, *.sln
- Build system and available scripts
- Test framework and patterns
- Code style and conventions
- Existing AI config files (.cursorrules, .github/copilot-instructions.md, etc.)

Look for:
- Configuration files (package.json, tsconfig.json, .eslintrc, etc.)
- Build scripts and commands
- Test files to understand testing patterns
- README.md for project overview
- Existing code to infer style conventions
- Scripts in package.json, Makefile, or other build files
- Environment files (.env.example) for configuration needs
- CI/CD files (.github/workflows, .gitlab-ci.yml) for quality checks

### 2. Check for Existing Configs
- If AGENT.md exists, improve it based on analysis
- If .cursorrules or .cursor/rules/* exist, incorporate them
- If .github/copilot-instructions.md exists, include its content
- If other AI configs exist (.clinerules, .windsurfrules), merge them

### 3. Create AGENT.md
Based on your analysis, create a comprehensive AGENT.md that starts with:

```markdown
# AGENT.md
This file provides guidance to AI coding assistants working in this repository.

# [Project Name from package.json/README/etc]

[Brief description based on README or package.json description]
```

Then include the most important sections based on what you find:

**Essential sections (always include):**
1. **Build & Commands** - Extract from package.json scripts, Makefile, etc.
   - Focus on: build, test, lint, typecheck, dev server
   - IMPORTANT: Include how to run a single test file

2. **Code Style** - Infer from existing code and config files
   - Language/TypeScript settings from tsconfig.json
   - Formatting from .prettierrc, .eslintrc
   - Import style from existing code
   - Naming conventions observed in codebase
   - Error handling patterns

**Include if relevant:**
3. **Testing** - If test files exist
   - Framework used (look for jest.config, vitest.config, etc.)
   - Test file patterns (*.test.ts, *.spec.js, etc.)
   - Testing conventions

4. **Architecture** - For complex projects
   - Main technologies (from package.json dependencies)
   - Project structure
   - Key patterns used

5. **Project-Specific Guidelines**
   - Any unique conventions
   - Important warnings or gotchas
   - Special setup requirements

**Be comprehensive**: Include all relevant information that would help an AI assistant work effectively in this codebase.

**Example structure based on analysis:**
```markdown
# AGENT.md
This file provides guidance to AI coding assistants working in this repository.

# NextJS E-commerce Platform

A modern e-commerce platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Build & Commands

- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Test: `npm test`
- Test single file: `npm test -- path/to/file.test.ts`
- Lint: `npm run lint`
- Type check: `npm run type-check`

## Code Style

- TypeScript strict mode enabled
- Prefer const, avoid let
- Use single quotes for strings
- 2 spaces indentation
- Imports: group by external/internal, sort alphabetically
- Components: PascalCase, utils: camelCase
- Always handle errors with try/catch or .catch()

## Testing

- Vitest for unit tests, Playwright for E2E
- Test files: `*.test.ts` alongside source
- Use describe/it blocks, avoid "should" in test names
```

### 3. Create Symlinks
After creating AGENT.md, create symlinks for all AI assistants:

```bash
# Claude Code
ln -sf AGENT.md CLAUDE.md

# Cline
ln -sf AGENT.md .clinerules

# Cursor
ln -sf AGENT.md .cursorrules

# Windsurf
ln -sf AGENT.md .windsurfrules

# Replit
ln -sf AGENT.md .replit.md

# Gemini CLI, OpenAI Codex, OpenCode
ln -sf AGENT.md GEMINI.md

# GitHub Copilot (needs directory)
mkdir -p .github
ln -sf ../AGENT.md .github/copilot-instructions.md

# Firebase Studio (needs directory)
mkdir -p .idx
ln -sf ../AGENT.md .idx/airules.md
```

### 4. Show Results
Display:
- Created/updated AGENT.md
- List of symlinks created
- Key information included in the file
- Suggest reviewing and customizing if needed

## Important Guidelines
- Be comprehensive - include all relevant project information
- Focus on practical information: commands, conventions, architecture
- Include specific commands for running single tests (critical for AI tools)
- Merge any existing AI config files to preserve their wisdom
- The analysis should be smart - infer conventions from actual code, not just config files