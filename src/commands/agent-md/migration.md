---
description: Migrate AI assistant configuration to AGENT.md standard with universal compatibility
category: ai-assistant
allowed-tools: Bash(mv:*), Bash(ln:*), Bash(ls:*), Bash(test:*), Bash(grep:*), Bash(echo:*), Read
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

### 2. Analyze Existing Files
Check all AI config files and their content to determine migration strategy:

**Priority order for analysis:**
1. CLAUDE.md (Claude Code)
2. .clinerules (Cline)
3. .cursorrules (Cursor)
4. .windsurfrules (Windsurf)
5. .github/copilot-instructions.md (GitHub Copilot)
6. .replit.md (Replit)
7. GEMINI.md (Gemini CLI)

**Content Analysis:**
- Compare file sizes and content
- Identify identical files (can be safely symlinked)
- Detect different content (needs merging or user decision)

### 3. Perform Smart Migration

**Scenario A: Single file found**
```bash
# Simple case - move to AGENT.md
mv CLAUDE.md AGENT.md  # or whichever file exists
```

**Scenario B: Multiple identical files**
```bash
# Keep the priority file, symlink others
mv CLAUDE.md AGENT.md
ln -sf AGENT.md .cursorrules  # if .cursorrules was identical
```

**Scenario C: Multiple files with different content**
1. **Automatic merging** (when possible):
   - Different sections can be combined
   - No conflicting information
   - Clear structure boundaries

2. **User guidance** (when conflicts exist):
   - Show content differences
   - Provide merge recommendations
   - Offer options:
     - Keep primary file, backup others
     - Manual merge with assistance
     - Selective migration

### 4. Handle Conflicts Intelligently

**When conflicts detected:**
1. **Display differences:**
   ```
   ⚠️  Multiple AI config files with different content found:
   
   📄 CLAUDE.md (1,234 bytes)
   - Build commands: npm run build
   - Testing: vitest
   
   📄 .cursorrules (856 bytes)  
   - Code style: Prettier + ESLint
   - TypeScript: strict mode
   
   📄 .github/copilot-instructions.md (567 bytes)
   - Security guidelines
   - No secrets in code
   ```

2. **Provide merge options:**
   ```
   Choose migration approach:
   1. 🔄 Auto-merge (recommended) - Combine all unique content
   2. 📋 Keep CLAUDE.md, backup others (.cursorrules.bak, copilot-instructions.md.bak)
   3. 🎯 Selective - Choose which sections to include
   4. 🛠️  Manual - Guide me through merging step-by-step
   ```

3. **Execute chosen strategy:**
   - **Auto-merge**: Combine sections intelligently
   - **Backup**: Keep primary, rename others with .bak extension
   - **Selective**: Interactive selection of content blocks
   - **Manual**: Step-by-step merge assistance

### 5. Create AGENT.md and Symlinks
After handling content merging, create the final structure:
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

### 6. Verify Results
- Use `ls -la` to show all created symlinks
- Display which AI assistants are now configured
- Show any backup files created (.bak extensions)
- Confirm that AGENT.md includes the symlink documentation note
- Verify content completeness (all important sections included)

### 7. Git Guidance
If in a git repository:
- Show git status (including new AGENT.md and any .bak files)
- Suggest adding AGENT.md and symlinks to git
- Recommend reviewing .bak files before deleting them
- Remind to update .gitignore if needed (some teams ignore certain config files)

### 8. Post-Migration Cleanup
After successful migration and git commit:
1. **Review backup files** (.bak extensions) to ensure nothing important was missed
2. **Delete backup files** once satisfied with AGENT.md content
3. **Test with different AI assistants** to ensure all symlinks work correctly
4. **Run `/agent-md:init`** if you want to add directory structure and latest best practices

## Why AGENT.md?

AGENT.md is becoming the standard for AI assistant configuration because:
- Single source of truth for all AI tools
- No more duplicating content across multiple files
- Consistent experience across Claude Code, Cursor, Windsurf, and other tools
- Future-proof as new AI tools emerge

Learn more at https://agent.md