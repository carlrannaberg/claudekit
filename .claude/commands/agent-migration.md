---
description: Migrate AI assistant configuration to AGENT.md standard with universal compatibility
allowed-tools: Bash(mv:*), Bash(ln:*), Bash(ls:*), Bash(test:*), Read
---

# Convert to Universal AGENT.md Format

This command helps you adopt the AGENT.md standard by converting your existing CLAUDE.md file and creating symlinks for compatibility with various AI assistants.

## Current Project State
!`ls -la CLAUDE.md AGENT.md GEMINI.md .cursorrules .clinerules .windsurfrules .replit.md .github/copilot-instructions.md 2>/dev/null | grep -E "(CLAUDE|AGENT|GEMINI|cursor|cline|windsurf|replit|copilot)" || echo "Checking for AI configuration files..."`

## Task

Convert this project to use the AGENT.md standard following these steps:

### 1. Pre-flight Checks
Check for existing AI configuration files:
- CLAUDE.md (Claude Code)
- .clinerules (Cline)
- .cursorrules (Cursor)
- .windsurfrules (Windsurf)
- .replit.md (Replit)
- .github/copilot-instructions.md (GitHub Copilot)
- GEMINI.md (Gemini CLI)
- AGENT.md (if already exists)

### 2. Perform Migration
Find the first existing config file and move it to AGENT.md. After moving, add a note at the top of AGENT.md documenting the symlink structure:
```bash
# Priority order for migration
if [ -f "CLAUDE.md" ] && [ ! -f "AGENT.md" ]; then
    mv CLAUDE.md AGENT.md
elif [ -f ".clinerules" ] && [ ! -f "AGENT.md" ]; then
    mv .clinerules AGENT.md
elif [ -f ".cursorrules" ] && [ ! -f "AGENT.md" ]; then
    mv .cursorrules AGENT.md
# ... and so on for other files
```

### 3. Update AGENT.md and Create Symlinks
First, add a note at the top of AGENT.md documenting which files will be symlinks:
```markdown
**Note:** CLAUDE.md, .clinerules, .cursorrules, and other AI config files are symlinks to AGENT.md in this project.
```

Then create symlinks for all supported AI assistants:
```bash
# Claude Code
ln -s AGENT.md CLAUDE.md

# Cline
ln -s AGENT.md .clinerules

# Cursor
ln -s AGENT.md .cursorrules

# Windsurf
ln -s AGENT.md .windsurfrules

# Replit
ln -s AGENT.md .replit.md

# Gemini CLI, OpenAI Codex, OpenCode
ln -s AGENT.md GEMINI.md

# GitHub Copilot (special case - needs directory)
mkdir -p .github
ln -s ../AGENT.md .github/copilot-instructions.md

# Firebase Studio (special case - needs .idx directory)
mkdir -p .idx
ln -s ../AGENT.md .idx/airules.md
```

### 4. Verify Results
- Use `ls -la` to show all created symlinks
- Display which AI assistants are now configured
- Confirm that AGENT.md includes the symlink documentation note

### 5. Git Guidance
If in a git repository:
- Show git status
- Suggest adding all changes
- Remind to update .gitignore if needed (some teams ignore certain config files)

## Why AGENT.md?

AGENT.md is becoming the standard for AI assistant configuration because:
- Single source of truth for all AI tools
- No more duplicating content across multiple files
- Consistent experience across Claude Code, Cursor, Windsurf, and other tools
- Future-proof as new AI tools emerge

Learn more at https://agent.md