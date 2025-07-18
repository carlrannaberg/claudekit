---
description: Clean up debug files, test artifacts, and status reports created during development
allowed-tools: Task, Bash(git:*)
---

## Purpose

Clean up temporary files and debug artifacts that Claude Code commonly creates during development sessions. These files clutter the workspace and should not be committed to version control.

## Context

- Git status and directory: !`git status --porcelain && git status --ignored --porcelain | grep "^!!" && echo "--- PWD: $(pwd) ---" && ls -la`
- Check if working directory is clean: !`if [ -z "$(git status --porcelain)" ]; then echo "WORKING_DIR_CLEAN=true"; git ls-files | grep -E "(analyze-.*\.js|debug-.*\.js|test-.*\.js|.*-test\.js|temp-.*|SUMMARY.*\.md)$" | head -20 && echo "--- Found $(git ls-files | grep -E "(analyze-.*\.js|debug-.*\.js|test-.*\.js|.*-test\.js|temp-.*|SUMMARY.*\.md)$" | wc -l) committed cleanup candidates ---"; else echo "WORKING_DIR_CLEAN=false"; fi`

Launch ONE subagent to analyze the git status (including ignored files) and propose files for deletion. If the working directory is clean, also check for committed files that match cleanup patterns.

## Target Files for Cleanup

**Debug Files:**
- `analyze-*.js` - Analysis scripts
- `debug-*.js` - Debug scripts
- `test-*.js` - Test scripts
- `*-test.js` - Test scripts

**Temporary Directories:**
- `temp-*` - Temporary debugging directories
- `test-*` - Test artifact directories (but NOT legitimate `test/` or `test-integration/`)

**Status Reports:**
- `*SUMMARY*.md` files in root directory (but NOT `CHANGELOG.md`, `README.md`, `AGENT.md`)
- Examples: `ESLINT_FIXES_SUMMARY.md`, `TEST_SUMMARY.md`, `SHOW_COMMAND_TEST_FIX_SUMMARY.md`

## Safety Rules

**Files safe to propose for deletion:**
- Must be untracked (`??` in git status) OR ignored (`!!` in git status)
- Should match or be similar to cleanup patterns above
- Must be clearly temporary/debug files

**Never propose these files:**
- Any committed files (not marked `??` or `!!`)
- `CHANGELOG.md`, `README.md`, `AGENT.md` (even if untracked)
- Core project directories: `src/`, `test/`, `dist/`, `scripts/`, `node_modules/`, etc.
- Any files you're uncertain about

## Instructions

Launch ONE subagent to:

1. **Analyze the git status output** provided in the context above
2. **Check if WORKING_DIR_CLEAN=true**: If so, also analyze committed files that match cleanup patterns
3. **Identify cleanup candidates**:
   - For dirty working directory: Focus on untracked (`??`) and ignored (`!!`) files
   - For clean working directory: Also include committed files matching cleanup patterns
4. **Create a proposal list** of files and directories to delete
5. **Present the list to the user** for approval before any deletion
6. **Do NOT delete anything** - only propose what should be deleted

The agent should provide:
- Clear list of proposed deletions with reasons
- For untracked files: Confirmation they are marked (`??`) or (`!!`)
- For committed files: Clear indication they are committed and match debug/temp patterns
- Ask user for explicit approval before proceeding

**IMPORTANT**: The agent cannot delete files directly. It must present a proposal and wait for user confirmation.

## After User Approval

Once the user approves the proposed deletions:

1. **Delete the approved files** using appropriate commands:
   - For untracked/ignored files: `rm -f` or `rm -rf` for directories
   - For committed files: `git rm` to properly remove from git tracking
2. **Analyze the target cleanup patterns** and approved files to identify common types
3. **Propose .gitignore patterns** based on the cleanup patterns to prevent future accumulation
4. **Add suggested patterns to .gitignore** if user agrees

This prevents the same types of files from cluttering the workspace in future development sessions.

**Note**: When removing committed files, the agent should use `git rm` to ensure proper removal from git tracking, and remind the user to commit these removals.