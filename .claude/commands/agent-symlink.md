---
description: Convert CLAUDE.md to AGENT.md and create symlinks for AI assistant compatibility
allowed-tools: Bash(mv:*), Bash(ln:*), Bash(ls:*), Bash(test:*), Read
---

# Convert to Universal AGENT.md Format

This command helps you adopt the AGENT.md standard by converting your existing CLAUDE.md file and creating symlinks for compatibility with various AI assistants.

## Current Project State
!`ls -la CLAUDE.md AGENT.md GEMINI.md .cursorrules 2>/dev/null || echo "Checking for AI configuration files..."`

## Task

Convert this project to use the AGENT.md standard following these steps:

### 1. Pre-flight Checks
- Check if CLAUDE.md exists (if not, check for AGENT.md)
- Verify no critical files will be overwritten
- Backup any existing GEMINI.md or .cursorrules files

### 2. Perform Migration
If CLAUDE.md exists and AGENT.md doesn't:
1. Move CLAUDE.md to AGENT.md: `mv CLAUDE.md AGENT.md`
2. Create symlink: `ln -s AGENT.md CLAUDE.md`
3. Create symlink: `ln -s AGENT.md GEMINI.md`
4. Create symlink: `ln -s AGENT.md .cursorrules`

If AGENT.md already exists:
- Verify existing symlinks are correct
- Create any missing symlinks

### 3. Verify Results
- Use `ls -la` to show the symlinks
- Confirm all AI assistants will now use the same configuration

### 4. Git Guidance
If in a git repository:
- Show git status
- Suggest adding changes: `git add AGENT.md CLAUDE.md GEMINI.md .cursorrules`
- Remind to update .gitignore if needed (some teams ignore .cursorrules)

## Why AGENT.md?

AGENT.md is becoming the standard for AI assistant configuration because:
- Single source of truth for all AI tools
- No more duplicating content across multiple files
- Consistent experience across Claude Code, Cursor, Windsurf, and other tools
- Future-proof as new AI tools emerge

Learn more at https://ampcode.com/AGENT.md