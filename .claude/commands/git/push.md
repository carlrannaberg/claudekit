---
description: Intelligently push commits to remote with safety checks and insights
allowed-tools: Bash(git:*)
---

Push commits to remote repository with appropriate safety checks and branch management.

## Efficiency Note:
Be concise. Use single bash calls where possible. Skip verbose explanations. Focus on results and safety.

## Instructions for Claude:

1. Run safety checks in a single bash call:
!git status --porcelain=v1 && echo "---" && git branch -vv | grep "^\*" && echo "---" && git remote -v | head -2 && echo "---" && git log --oneline @{u}..HEAD 2>/dev/null

Parse output to check:
- Any uncommitted changes (warn if present)
- Current branch and tracking info
- Remote repository URL
- Commits to be pushed

2. If safe to push (no uncommitted changes):
   - For simple push to tracked branch: Execute `git push`
   - For first push of new branch: Execute `git push -u origin [branch-name]`
   - If behind remote: Warn about potential conflicts, suggest `git pull --rebase` first
   - Actually run the appropriate push command!

3. Show results after push:
   - Success confirmation
   - Any errors or warnings
   - Updated branch status

4. Provide concise output format:
   - **Status**: Ready to push / Issues found / Push complete
   - **Commits**: Number and summary of commits
   - **Remote**: Target repository
   - **Result**: Success message or error details

4. Special cases to handle:
   - Diverged branches: Suggest rebase or merge strategy
   - No upstream branch: Use -u flag
   - Force push needed: Warn strongly, require confirmation
   - Protected branch: Remind about PR workflow

Example concise output:
- Skip: "Let me check if it's safe to push"
- Skip: "I'll analyze your branch status"
- Just show: "Ready to push 4 commits to origin/main"