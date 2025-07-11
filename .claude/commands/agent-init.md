---
description: Initialize project with AGENT.md and create symlinks for all AI assistants
allowed-tools: Write, Bash(ln:*), Bash(mkdir:*), Bash(test:*), Read
---

# Initialize AGENT.md for Your Project

Create a comprehensive AGENT.md file following the universal standard, with symlinks for all AI assistants.

## Current Status
!`test -f AGENT.md && echo "⚠️  AGENT.md already exists" || echo "✅ Ready to create AGENT.md"`

## Task

Initialize this project with the AGENT.md standard:

### 1. Check for Existing Files
First, verify if AGENT.md or any AI config files already exist. If AGENT.md exists, ask if the user wants to:
- Keep existing and just create missing symlinks
- Backup existing and create new from template
- Cancel operation

### 2. Create AGENT.md
If proceeding, create AGENT.md with the following template (customize based on project):

```markdown
# Project Name

Brief description of what this project does and its main purpose.
The core functionality lives in the `src/` folder with [describe structure].

## Build & Commands

- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Fix linting: `npm run lint:fix`
- Run tests: `npm test`
- Run single test: `npm test path/to/file.test.ts`
- Start development: `npm run dev`
- Build for production: `npm run build`

### Development Environment

- Frontend dev server: http://localhost:3000
- Backend API: http://localhost:3001
- Database: PostgreSQL on port 5432

## Code Style

- Language: TypeScript with strict mode enabled
- Indentation: 2 spaces (tabs for specific files if needed)
- Quotes: Single quotes preferred
- Semicolons: [project preference]
- Line length: 100 characters
- Naming: camelCase for variables, PascalCase for components/classes
- Comments: Use JSDoc for documentation
- NEVER use \`any\` type - use \`unknown\` with type guards instead
- NEVER use \`@ts-ignore\` - fix the types properly

## Testing

- Framework: [Jest/Vitest/Mocha]
- Test files: \`*.test.ts\` or \`*.spec.ts\`
- Coverage goal: [percentage]
- Mock external dependencies
- Write descriptive test names without "should"

## Architecture

- Frontend: [React/Vue/Angular/etc]
- Backend: [Node.js/Python/Go/etc]
- Database: [PostgreSQL/MySQL/MongoDB]
- State Management: [Redux/Zustand/Pinia]
- Styling: [CSS/Tailwind/styled-components]
- Build Tool: [Webpack/Vite/Rollup]

## Security

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Validate all user inputs
- Follow OWASP guidelines
- Regular dependency updates
- Use HTTPS in production

## Git Workflow

- Branch naming: \`feature/\`, \`bugfix/\`, \`hotfix/\`
- Commit style: [conventional commits/descriptive messages]
- Always run tests before committing
- PR reviews required before merging
- No force push to main/master

## Project-Specific Guidelines

[Add any project-specific information, conventions, or gotchas here]
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
- Created AGENT.md
- List of symlinks created
- Suggest next steps (customize content, commit changes)

## Notes
- The template should be customized for each project
- This replaces the need for individual `/init` commands in each AI tool
- All AI assistants will now share the same configuration