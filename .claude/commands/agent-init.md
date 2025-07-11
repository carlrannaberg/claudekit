---
description: Initialize project with AGENT.md and create symlinks for all AI assistants
allowed-tools: Write, Bash(ln:*), Bash(mkdir:*), Bash(test:*), Read, Glob, Task
---

# Initialize AGENT.md for Your Project

Create a comprehensive AGENT.md file following the universal standard, with symlinks for all AI assistants.

## Current Status
!`test -f AGENT.md && echo "⚠️  AGENT.md already exists" || echo "✅ Ready to create AGENT.md"`

## Task

Please analyze this codebase and create an AGENT.md file containing:
1. Build/lint/test commands - especially for running a single test
2. Code style guidelines including imports, formatting, types, naming conventions, error handling, etc.

Usage notes:
- The file you create will be given to agentic coding agents (such as yourself) that operate in this repository
- If there's already an AGENT.md, improve it
- If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include them
- Start the file with: "# AGENT.md\nThis file provides guidance to AI coding assistants working in this repository."

### 1. Gather Repository Information
Use Task tool with description "Gather repository information" to run these Glob patterns in parallel:
- `package*.json` - Node.js project files
- `*.md` - Documentation files
- `.cursor/rules/**` - Cursor rules
- `.cursorrules` - Cursor rules (alternate location)
- `.github/copilot-instructions.md` - GitHub Copilot rules
- `requirements.txt`, `setup.py`, `pyproject.toml` - Python projects
- `go.mod` - Go projects
- `Cargo.toml` - Rust projects
- `Gemfile` - Ruby projects
- `pom.xml`, `build.gradle` - Java projects
- `*.csproj` - .NET projects
- `Makefile` - Build automation
- `.eslintrc*`, `.prettierrc*` - Code style configs
- `tsconfig.json` - TypeScript config
- `.env.example` - Environment configuration
- `**/*.test.*`, `**/*.spec.*` - Test files (limit to a few)

Also examine:
- README.md for project overview
- A few source files to infer coding conventions
- Test files to understand testing patterns

### 2. Check for Existing Configs
- If AGENT.md exists, improve it based on analysis
- If .cursorrules or .cursor/rules/* exist, incorporate them
- If .github/copilot-instructions.md exists, include its content
- If other AI configs exist (.clinerules, .windsurfrules), merge them

### 3. Create AGENT.md
Based on your analysis, create AGENT.md with this exact format:

```markdown
# AGENT.md
This file provides guidance to AI coding assistants working in this repository.

# [Project Name]

[Brief description of the project]

## Build & Commands

[List all important commands, especially:]
- Build: `command`
- Test: `command`
- Test single file: `command path/to/test.ext`
- Lint: `command`
- Dev server: `command`
[Include any other important commands found]

## Code Style

[Infer from actual code and config files:]
- Language/framework specifics
- Import conventions
- Formatting rules
- Naming conventions
- Type usage patterns
- Error handling patterns
[Be specific based on what you observe]

[Include other relevant sections as needed]
```

**Key sections to include based on your findings:**

1. **Build & Commands** (required)
   - Extract from package.json, Makefile, or other build files
   - Must include how to run a single test file

2. **Code Style** (required)
   - Infer from actual code samples
   - Look at config files (.eslintrc, .prettierrc, tsconfig.json)
   - Notice patterns in imports, naming, error handling

3. **Testing** (if test files exist)
   - Testing framework and conventions
   - How tests are organized

4. **Architecture** (for larger projects)
   - Key technologies and patterns
   - Project structure

5. **Additional sections** as appropriate:
   - Security considerations
   - Deployment process
   - Environment setup
   - Contributing guidelines

**Important:** 
- Include content from any existing .cursorrules or copilot-instructions.md files
- Focus on practical information that helps AI assistants write better code
- Be specific rather than generic (e.g., "Use 2 spaces" not "follow indentation rules")

### 4. Create Symlinks
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

### 5. Show Results
Display:
- Created/updated AGENT.md
- List of symlinks created
- Key information included in the file
- Suggest reviewing and customizing if needed

