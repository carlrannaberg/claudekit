---
description: Intelligently analyze git status and provide insights about current project state
allowed-tools: Bash(git:*), Task
---

Analyze the current git status and provide an intelligent summary of what's happening in the project.

## Instructions for Claude:

1. First, quickly check the basic status:
!git status --porcelain=v1

2. If there are changes, use the Task tool to gather details in parallel:
- Get change statistics: `git diff --stat` and `git diff --cached --stat` (if staged changes exist)
- Check branch tracking: `git branch -vv | grep "^\*"`
- Get last commit for context: `git log --oneline -1`

Note: Only run the parallel Task if there are actual changes to analyze. For a clean working directory, just report that status.

2. Analyze the combined results and provide:
   - **Summary**: Brief overview of the current state
   - **Modified Files**: Group by type (docs, code, tests, config)
   - **Uncommitted Changes**: What's been changed and why it might matter
   - **Branch Status**: Relationship to remote branch
   - **Suggestions**: What actions might be appropriate

Provide insights about:
- Whether changes appear related or should be separate commits
- If any critical files are modified (package.json, config files, etc.)
- Whether the working directory is clean for operations like rebasing
- Any patterns in the modifications (e.g., all test files, all docs, etc.)
- If there are stashed changes that might be forgotten

Make the output concise but informative, focusing on what matters most to the developer.