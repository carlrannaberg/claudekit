---
description: Initialize project with AGENTS.md and create symlinks for all AI assistants
category: claude-setup
allowed-tools: Write, Bash(ln:*), Bash(mkdir:*), Bash(test:*), Bash(echo:*), Read, Glob, Task
---

# Initialize AGENTS.md for Your Project

Create a comprehensive AGENTS.md file following the universal standard, with symlinks for all AI assistants.

## Current Status
!`test -f AGENTS.md && echo "⚠️  AGENTS.md already exists" || echo "✅ Ready to create AGENTS.md"`

## Task

Please analyze this codebase and create an AGENTS.md file containing:
1. Build/lint/test commands - especially for running a single test
2. Code style guidelines including imports, formatting, types, naming conventions, error handling, etc.

Usage notes:
- The file you create will be given to agentic coding agents (such as yourself) that operate in this repository
- If there's already an AGENTS.md, improve it
- If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include them
- Start the file with: "# AGENTS.md\nThis file provides guidance to AI coding assistants working in this repository."

### 1. Gather Repository Information
Use Task tool with description "Gather repository information" to run these Glob patterns in parallel:
- `package*.json` - Node.js project files
- `*.md` - Documentation files
- `.github/workflows/*.yml` - GitHub Actions workflows
- `.github/workflows/*.yaml` - GitHub Actions workflows (alternate extension)
- `.cursor/rules/**` - Cursor rules
- `.cursorrules` - Cursor rules (alternate location)
- `.github/copilot-instructions.md` - GitHub Copilot rules
- `.claude/agents/**/*.md` - Specialized AI subagents
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
- `Dockerfile`, `docker-compose*.yml` - Docker configuration

Also examine:
- README.md for project overview and command documentation
- package.json scripts to document all available commands
- GitHub workflows to identify CI/CD commands
- A few source files to infer coding conventions
- Test files to understand testing patterns
- `.claude/agents/` directory to discover available subagents

**Script Consistency Check**: When documenting npm scripts from package.json, verify they match references in:
- GitHub Actions workflows (npm run, npm test, etc.)
- README.md installation and usage sections
- Docker configuration files
- Any setup or deployment scripts

### 2. Check for Existing Configs
- If AGENTS.md exists, improve it based on analysis
- If .cursorrules or .cursor/rules/* exist, incorporate them
- If .github/copilot-instructions.md exists, include its content
- If other AI configs exist (.clinerules, .windsurfrules), merge them
- If `.claude/agents/` directory exists, document available subagents with their descriptions and usage examples

### 3. Create AGENTS.md
Based on your analysis, create AGENTS.md with this structure:

```markdown
# AGENTS.md
This file provides guidance to AI coding assistants working in this repository.

**Note:** [Document if CLAUDE.md or other AI config files are symlinks to AGENTS.md]

# [Project Name]

[Project Overview: Brief description of the project's purpose and architecture]

## Build & Commands

[Development, testing, and deployment commands with EXACT script names:]

**CRITICAL**: Document the EXACT script names from package.json, not generic placeholders.
For example:
- Build: `npm run build` (if package.json has "build": "webpack")
- Test: `npm test` (if package.json has "test": "jest")
- Type check: `npm run typecheck` (if package.json has "typecheck": "tsc --noEmit")
- Lint: `npm run lint` (if package.json has "lint": "eslint .")

If the project uses different names, document those:
- Type check: `npm run tsc` (if that's what's in package.json)
- Lint: `npm run eslint` (if that's what's in package.json)
- Format: `npm run prettier` (if that's what's in package.json)

[Include ALL commands from package.json scripts, even if they have non-standard names]

### Script Command Consistency
**Important**: When modifying npm scripts in package.json, ensure all references are updated:
- GitHub Actions workflows (.github/workflows/*.yml)
- README.md documentation
- Contributing guides
- Dockerfile/docker-compose.yml
- CI/CD configuration files
- Setup/installation scripts

Common places that reference npm scripts:
- Build commands → Check: workflows, README, Dockerfile
- Test commands → Check: workflows, contributing docs
- Lint commands → Check: pre-commit hooks, workflows
- Start commands → Check: README, deployment docs

**Note**: Always use the EXACT script names from package.json, not assumed names

## Code Style

[Formatting rules, naming conventions, and best practices:]
- Language/framework specifics
- Import conventions
- Formatting rules
- Naming conventions
- Type usage patterns
- Error handling patterns
[Be specific based on actual code analysis]

## Testing

[Testing frameworks, conventions, and execution guidelines:]
- Framework: [Jest/Vitest/Pytest/etc]
- Test file patterns: [*.test.ts, *.spec.js, etc]
- Testing conventions
- Coverage requirements
- How to run specific test suites

### Testing Philosophy
**When tests fail, fix the code, not the test.**

Key principles:
- **Tests should be meaningful** - Avoid tests that always pass regardless of behavior
- **Test actual functionality** - Call the functions being tested, don't just check side effects
- **Failing tests are valuable** - They reveal bugs or missing features
- **Fix the root cause** - When a test fails, fix the underlying issue, don't hide the test
- **Test edge cases** - Tests that reveal limitations help improve the code
- **Document test purpose** - Each test should include a comment explaining why it exists and what it validates

## Security

[Security considerations and data protection guidelines:]
- Authentication/authorization patterns
- Data validation requirements
- Secret management
- Security best practices specific to this project

## Directory Structure & File Organization

### Reports Directory
ALL project reports and documentation should be saved to the `reports/` directory:

```
your-project/
├── reports/              # All project reports and documentation
│   └── *.md             # Various report types
├── temp/                # Temporary files and debugging
└── [other directories]
```

### Report Generation Guidelines
**Important**: ALL reports should be saved to the `reports/` directory with descriptive names:

**Implementation Reports:**
- Phase validation: `PHASE_X_VALIDATION_REPORT.md`
- Implementation summaries: `IMPLEMENTATION_SUMMARY_[FEATURE].md`
- Feature completion: `FEATURE_[NAME]_REPORT.md`

**Testing & Analysis Reports:**
- Test results: `TEST_RESULTS_[DATE].md`
- Coverage reports: `COVERAGE_REPORT_[DATE].md`
- Performance analysis: `PERFORMANCE_ANALYSIS_[SCENARIO].md`
- Security scans: `SECURITY_SCAN_[DATE].md`

**Quality & Validation:**
- Code quality: `CODE_QUALITY_REPORT.md`
- Dependency analysis: `DEPENDENCY_REPORT.md`
- API compatibility: `API_COMPATIBILITY_REPORT.md`

**Report Naming Conventions:**
- Use descriptive names: `[TYPE]_[SCOPE]_[DATE].md`
- Include dates: `YYYY-MM-DD` format
- Group with prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Markdown format: All reports end in `.md`

### Temporary Files & Debugging
All temporary files, debugging scripts, and test artifacts should be organized in a `/temp` folder:

**Temporary File Organization:**
- **Debug scripts**: `temp/debug-*.js`, `temp/analyze-*.py`
- **Test artifacts**: `temp/test-results/`, `temp/coverage/`
- **Generated files**: `temp/generated/`, `temp/build-artifacts/`
- **Logs**: `temp/logs/debug.log`, `temp/logs/error.log`

**Guidelines:**
- Never commit files from `/temp` directory
- Use `/temp` for all debugging and analysis scripts created during development
- Clean up `/temp` directory regularly or use automated cleanup
- Include `/temp/` in `.gitignore` to prevent accidental commits

### Example `.gitignore` patterns
```
# Temporary files and debugging
/temp/
temp/
**/temp/
debug-*.js
test-*.py
analyze-*.sh
*-debug.*
*.debug

# Claude settings
.claude/settings.local.json

# Don't ignore reports directory
!reports/
!reports/**
```

### Claude Code Settings (.claude Directory)

The `.claude` directory contains Claude Code configuration files with specific version control rules:

#### Version Controlled Files (commit these):
- `.claude/settings.json` - Shared team settings for hooks, tools, and environment
- `.claude/commands/*.md` - Custom slash commands available to all team members
- `.claude/hooks/*.sh` - Hook scripts for automated validations and actions

#### Ignored Files (do NOT commit):
- `.claude/settings.local.json` - Personal preferences and local overrides
- Any `*.local.json` files - Personal configuration not meant for sharing

**Important Notes:**
- Claude Code automatically adds `.claude/settings.local.json` to `.gitignore`
- The shared `settings.json` should contain team-wide standards (linting, type checking, etc.)
- Personal preferences or experimental settings belong in `settings.local.json`
- Hook scripts in `.claude/hooks/` should be executable (`chmod +x`)

## Configuration

[Environment setup and configuration management:]
- Required environment variables
- Configuration files and their purposes
- Development environment setup
- Dependencies and version requirements

## Agent Delegation & Tool Execution

### ⚠️ MANDATORY: Always Delegate to Specialists & Execute in Parallel

**When specialized agents are available, you MUST use them instead of attempting tasks yourself.**

**When performing multiple operations, send all tool calls (including Task calls for agent delegation) in a single message to execute them concurrently for optimal performance.**

#### Why Agent Delegation Matters:
- Specialists have deeper, more focused knowledge
- They're aware of edge cases and subtle bugs  
- They follow established patterns and best practices
- They can provide more comprehensive solutions

#### Key Principles:
- **Agent Delegation**: Always check if a specialized agent exists for your task domain
- **Complex Problems**: Delegate to domain experts, use diagnostic agents when scope is unclear
- **Multiple Agents**: Send multiple Task tool calls in a single message to delegate to specialists in parallel
- **DEFAULT TO PARALLEL**: Unless you have a specific reason why operations MUST be sequential (output of A required for input of B), always execute multiple tools simultaneously
- **Plan Upfront**: Think "What information do I need to fully answer this question?" Then execute all searches together

#### Discovering Available Agents:
```bash
# Quick check: List agents if claudekit is installed
command -v claudekit >/dev/null 2>&1 && claudekit list agents || echo "claudekit not installed"

# If claudekit is installed, you can explore available agents:
claudekit list agents
```

#### Critical: Always Use Parallel Tool Calls

**Err on the side of maximizing parallel tool calls rather than running sequentially.**

**IMPORTANT: Send all tool calls in a single message to execute them in parallel.**

**These cases MUST use parallel tool calls:**
- Searching for different patterns (imports, usage, definitions)
- Multiple grep searches with different regex patterns
- Reading multiple files or searching different directories
- Combining Glob with Grep for comprehensive results
- Searching for multiple independent concepts with codebase_search_agent
- Any information gathering where you know upfront what you're looking for
- Agent delegations with multiple Task calls to different specialists

**Sequential calls ONLY when:**
You genuinely REQUIRE the output of one tool to determine the usage of the next tool.

**Planning Approach:**
1. Before making tool calls, think: "What information do I need to fully answer this question?"
2. Send all tool calls in a single message to execute them in parallel
3. Execute all those searches together rather than waiting for each result
4. Most of the time, parallel tool calls can be used rather than sequential

**Performance Impact:** Parallel tool execution is 3-5x faster than sequential calls, significantly improving user experience.

**Remember:** This is not just an optimization—it's the expected behavior. Both delegation and parallel execution are requirements, not suggestions.
```

Think about what you'd tell a new team member on their first day. Include these key sections:

1. **Project Overview** - Brief description of purpose and architecture
2. **Build & Commands** - All development, testing, and deployment commands
3. **Code Style** - Formatting rules, naming conventions, best practices
4. **Testing** - Testing frameworks, conventions, execution guidelines
5. **Security** - Security considerations and data protection
6. **Configuration** - Environment setup and configuration management
7. **Available AI Subagents** - Document relevant specialized agents for the project

Additional sections based on project needs:
- Architecture details for complex projects
- API documentation
- Database schemas
- Deployment procedures
- Contributing guidelines

**Important:** 
- Include content from any existing .cursorrules or copilot-instructions.md files
- Focus on practical information that helps AI assistants write better code
- Be specific and concrete based on actual code analysis

### 4. Create Directory Structure
Create the reports directory and documentation structure:

```bash
# Create reports directory
mkdir -p reports

# Create reports README template
cat > reports/README.md << 'EOF'
# Reports Directory

This directory contains ALL project reports including validation, testing, analysis, performance benchmarks, and any other documentation generated during development.

## Report Categories

### Implementation Reports
- Phase/milestone completion reports
- Feature implementation summaries
- Technical implementation details

### Testing & Analysis Reports
- Test execution results
- Code coverage analysis
- Performance test results
- Security analysis reports

### Quality & Validation
- Code quality metrics
- Dependency analysis
- API compatibility reports
- Build and deployment validation

## Purpose

These reports serve as:
1. **Progress tracking** - Document completion of development phases
2. **Quality assurance** - Validate implementations meet requirements
3. **Knowledge preservation** - Capture decisions and findings
4. **Audit trail** - Historical record of project evolution

## Naming Conventions

- Use descriptive names: `[TYPE]_[SCOPE]_[DATE].md`
- Include dates: `YYYY-MM-DD` format
- Group with prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Markdown format: All reports end in `.md`

## Version Control

All reports are tracked in git to maintain historical records.
EOF
```

### 5. Create Symlinks
After creating AGENTS.md and directory structure, create symlinks for all AI assistants and document this in AGENTS.md:

```bash
# Claude Code
ln -sf AGENTS.md CLAUDE.md

# Cline
ln -sf AGENTS.md .clinerules

# Cursor
ln -sf AGENTS.md .cursorrules

# Windsurf
ln -sf AGENTS.md .windsurfrules

# Replit
ln -sf AGENTS.md .replit.md

# Gemini CLI, OpenAI Codex, OpenCode
ln -sf AGENTS.md GEMINI.md

# GitHub Copilot (needs directory)
mkdir -p .github
ln -sf ../AGENTS.md .github/copilot-instructions.md

# Firebase Studio (needs directory)
mkdir -p .idx
ln -sf ../AGENTS.md .idx/airules.md
```

### 6. Show Results
Display:
- Created/updated AGENTS.md
- Created reports directory structure
- List of symlinks created
- Key information included in the file
- Suggest reviewing and customizing if needed

**Important:** Make sure to add a note at the top of AGENTS.md documenting which files are symlinks to AGENTS.md. For example:
```markdown
**Note:** CLAUDE.md, .clinerules, .cursorrules, and other AI config files are symlinks to AGENTS.md in this project.
```

