Create a git commit following the project's established style

## Efficiency Note:
This command intelligently reuses recent git:status results when available to avoid redundant operations. If you just ran /git:status, the commit process will be faster.

## Steps:
1. Check if the previous message contains git:status results:
   - Look for patterns like "Git Status Analysis", "Modified Files:", "Uncommitted Changes:"
   - If found and recent (within last 2-3 messages): Reuse those results
   - If not found or stale: Run `git status --porcelain=v1` for quick check
   - Note: Only skip git status if you're confident the working directory hasn't changed
2. Run git diff to review changes and verify:
   - No sensitive information (passwords, API keys, tokens) in the changes
   - No debugging code or console.log statements left in production code
   - No temporary debugging scripts (test-*.js, debug-*.py, etc.) created by Claude Code
   - No temporary files or outputs in inappropriate locations (move to project's temp directory or delete)
   - All TODO/FIXME comments are addressed or intentionally left
3. Check CLAUDE.md for documented git commit conventions; if not documented or unclear, analyze recent commit messages to understand the project's commit style and update CLAUDE.md accordingly (see "Commit Convention Documentation" section below)
4. If the project uses ticket/task codes, ask the user for the relevant code if not clear from context
5. Check if README.md or other documentation needs updating to reflect the changes (see "Documentation Updates" section below)
6. Run tests and lint commands to ensure code quality (unless just ran before this command)
7. Stage all relevant files (including any updated documentation)
8. Create commit with appropriate message matching the project's conventions
9. Verify commit succeeded
10. Check if any post-commit hooks need to be considered (e.g., pushing to remote, creating PR)

## Documentation Updates:
Consider updating relevant documentation when committing changes:
- README.md: New features, API changes, installation steps, usage examples
- CHANGELOG.md: Notable changes, bug fixes, new features
- API documentation: New endpoints, changed parameters, deprecated features
- User guides: New workflows, updated procedures
- Configuration docs: New settings, changed defaults

## Commit Convention Documentation:
After analyzing the commit history in a new project, document the observed commit conventions in CLAUDE.md under a "Git Commit Conventions" section. This allows future commits to follow the established style automatically without needing to analyze the history each time.

The documentation should capture whatever style the project uses, for example:
- Simple descriptive messages: "Fix navigation bug"
- Conventional commits: "feat(auth): add OAuth support"
- Prefixed style: "[BUGFIX] Resolve memory leak in parser"
- Task/ticket codes: "PROJ-123: Add user authentication"
- JIRA integration: "ABC-456 Fix memory leak in parser"
- GitHub issues: "#42 Update documentation"
- Imperative mood: "Add user authentication"
- Past tense: "Added user authentication"
- Or any other project-specific convention

Example CLAUDE.md section:
```markdown
## Git Commit Conventions
Based on analysis of this project's git history:
- Format: [observed format pattern]
- Tense: [imperative/past/present]
- Length: [typical subject line length]
- Ticket codes: [if used, note the pattern like "PROJ-123:" or "ABC-456 "]
- Other patterns: [any other observed conventions]

Note: If ticket/task codes are used, always ask the user for the specific code rather than inventing one.
```