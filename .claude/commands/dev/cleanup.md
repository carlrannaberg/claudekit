---
description: Clean up debug files, test artifacts, and status reports created during development
allowed-tools: Task, Bash(git:*)
---

## Purpose

Clean up temporary files and debug artifacts that Claude Code commonly creates during development sessions. These files clutter the workspace and should not be committed to version control.

## Context

- Git status and directory: !`git status --porcelain && git status --ignored --porcelain | grep "^!!" && echo "--- PWD: $(pwd) ---" && ls -la`

Launch ONE subagent to analyze the git status (including ignored files) and propose files for deletion.

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
2. **Identify cleanup candidates** that match the patterns and are untracked (`??`)
3. **Create a proposal list** of files and directories to delete
4. **Present the list to the user** for approval before any deletion
5. **Do NOT delete anything** - only propose what should be deleted

The agent should provide:
- Clear list of proposed deletions with reasons
- Confirmation that all proposed items are untracked (`??`)
- Ask user for explicit approval before proceeding

**IMPORTANT**: The agent cannot delete files directly. It must present a proposal and wait for user confirmation.

## After User Approval

Once the user approves the proposed deletions:

1. **Delete the approved files** using appropriate commands
2. **Analyze the target cleanup patterns** and approved files to identify common types
3. **Propose .gitignore patterns** based on the cleanup patterns to prevent future accumulation
4. **Add suggested patterns to .gitignore** if user agrees

This prevents the same types of files from cluttering the workspace in future development sessions.