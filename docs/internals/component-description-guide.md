# Component Description Guide

Guide for writing technical command descriptions in the claudekit technical overview.

## Purpose

Command descriptions in the technical overview should reveal the engineering sophistication and internal architecture of claudekit commands. These are not user-facing documentation but technical insights for developers understanding how claudekit is built.

## Template Format

```markdown
## [Command Name](link-to-source.md)

Brief description of what the command does and its technical approach.

**Tools**: `allowed-tools` from frontmatter

**Context collection**: What information is gathered

**Processing flow**:
1. Third-person verb describing what it does
2. Third-person verb describing next action
3. Third-person verb describing following step

**Output**: What the user receives
```

## Section Guidelines

### Header and Link
- Use exact command name with link to source markdown file
- Link format: `[/command:name](../src/commands/path/to/file.md)`

### Brief Description
- 1-2 sentences maximum
- Focus on technical approach, not basic functionality
- Highlight what makes it sophisticated (parallel execution, intelligent analysis, etc.)
- Avoid marketing language

### Tools Section
- Copy exact `allowed-tools` list from command frontmatter
- Use backticks for formatting: `Tool1, Tool2, Tool3`
- Shows technical capabilities available to the command

### Context Collection
- Describe what information the command gathers before processing
- Focus on data sources, not how it's gathered
- Examples: "Git status, file changes, branch info" not "runs git status --porcelain"
- Include specific patterns or file types when relevant

### Processing Flow
- Use numbered list with third-person verbs
- Start each item with action verbs: "Discovers", "Executes", "Analyzes", "Routes", etc.
- Focus on internal logic and decision points
- Show systematic approach and intelligence
- Include subagent routing, safety mechanisms, validation steps

### Output Section
- Describe what the user actually receives
- Focus on deliverables, reports, confirmations
- Do NOT describe internal mechanisms (TodoWrite, Task routing, etc.)
- Do NOT repeat processing steps

## Writing Guidelines

### Do Include
- ✅ Technical sophistication (parallel processing, intelligent routing)
- ✅ Safety mechanisms (checkpoints, validation, confirmations)
- ✅ Decision logic (risk assessment, categorization, prioritization)
- ✅ Integration points (subagent routing, external tools)
- ✅ Systematic approaches (phases, verification steps)

### Do NOT Include
- ❌ Marketing adjectives ("comprehensive", "intelligent", "optimal")
- ❌ Basic functionality descriptions
- ❌ Implementation details in output section
- ❌ Numbered lists as prose
- ❌ User instructions or tutorials

### Verb Forms
- **Processing flow**: Third-person present tense ("Discovers", "Executes", "Analyzes")
- **Context collection**: Simple present ("Git status and file changes")
- **Output**: Noun phrases ("Progress updates", "Summary report")

## Examples

### Simple Command
```markdown
#### [/checkpoint:create](../src/commands/checkpoint/create.md)

Uses git stash create/store pattern to preserve working directory state without disrupting current files.

**Tools**: `Bash(git stash:*), Bash(git add:*), Bash(git status:*)`

**Context collection**: Current working directory status and file changes

**Processing flow**:
1. Temporarily stages all files
2. Creates stash object without affecting working directory
3. Stores stash with descriptive message
4. Resets index to restore original state
5. Verifies checkpoint creation

**Output**: Confirmation message with checkpoint details and preserved state summary
```

### Complex Command
```markdown
#### [/validate-and-fix](../src/commands/validate-and-fix.md)

Runs quality checks and automatically fixes discovered issues using parallel execution with specialized subagents, organized into risk-based phases.

**Tools**: `Bash, Task, TodoWrite, Read, Edit, MultiEdit`

**Context collection**: Available validation commands from AGENTS.md, package.json scripts, README.md, and common project patterns (lint, typecheck, test, build commands)

**Processing flow**:
1. Discovers and categorizes available quality checks by priority (Critical → High → Medium → Low)
2. Executes parallel validation using Bash to capture full output with file paths and error details
3. Assesses risks and maps issue dependencies before fixing
4. Applies fixes in phases: safe quick wins → functionality fixes → critical issues with confirmation
5. Creates git stash checkpoints between phases and verifies each fix immediately
6. Routes specialized tasks to domain expert subagents
7. Re-runs all checks for final verification and provides fix/remaining issue summary

**Output**: Real-time progress updates, confirmation of each successful fix, summary report of resolved issues vs. remaining manual tasks, and rollback instructions if fixes cause problems
```

## Common Mistakes

### Wrong: Marketing Language
```markdown
Intelligently analyzes your project with comprehensive validation using optimal subagent routing.
```

### Right: Technical Focus
```markdown
Analyzes project validation commands and routes tasks to specialized subagents based on domain expertise.
```

### Wrong: Implementation in Output
```markdown
**Output**: Uses TodoWrite to track progress and Task tool to generate reports
```

### Right: User Deliverables
```markdown
**Output**: Progress tracking, validation reports, and fix confirmations
```

### Wrong: Prose Processing Flow
```markdown
**Processing flow**: Discovers commands, then executes validation, and finally routes to subagents.
```

### Right: Numbered List
```markdown
**Processing flow**:
1. Discovers available validation commands
2. Executes parallel validation
3. Routes tasks to specialized subagents
```

## Quality Checklist

Before adding a command description:

- [ ] Brief description highlights technical sophistication
- [ ] Tools section copied exactly from frontmatter
- [ ] Context collection describes data sources, not commands
- [ ] Processing flow uses numbered list with third-person verbs
- [ ] Output describes user deliverables, not internal mechanisms
- [ ] No marketing adjectives or promotional language
- [ ] Links to correct source file
- [ ] Reveals engineering complexity appropriately

## Integration

Add command descriptions to the technical overview under appropriate sections. Use the `####` heading level for individual commands within command sections.