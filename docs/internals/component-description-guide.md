# Component Description Guide

Guide for writing technical command descriptions in the claudekit technical overview.

## Kevin's Principle

> "Why waste time say lot word when few word do trick." - Kevin Malone

This is the core principle for all technical descriptions: say exactly what things do, nothing more.

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

## Command Group Descriptions

For command groups that contain multiple commands with detailed descriptions, add a brief group description before the `### Commands` heading:

### Guidelines
- **Purpose**: Describe what unites the commands in the group, not individual commands
- **Length**: One sentence, maximum two if needed for clarity
- **Focus**: Shared functionality, common approach, or unified purpose
- **Tone**: Technical and direct, avoid marketing language
- **Avoid**: Business buzzwords like "comprehensive", "seamless", "optimal", "universal"
- **Avoid**: Technical implementation details (parallel execution, risk assessment, safety mechanisms)
- **Focus on domain**: Describe the problem domain or purpose, not the solution method
- **Use concrete terms**: Simple nouns and verbs rather than abstract concepts or compound technical terms
- **Be precise**: Look at what the commands actually operate on and describe that directly (files, repositories, configurations) rather than abstract processes or methodologies

### Format
```markdown
## Command Group Name

Brief technical description of what unites these commands and their shared approach.

### Commands

#### [/command:name](../src/commands/...)
```

### Examples

**Good group descriptions:**
- "AGENTS.md management: creation, migration from existing configs, and enhancement with CLI tool documentation."
- "Project validation and automated issue resolution."
- "Repository cleanup of temporary files and debug artifacts."
- "Interactive tools for generating Claude Code slash commands and domain expert subagents with template construction and validation."

**Bad group descriptions:**
- "Universal AI assistant configuration management following the AGENTS.md standard for cross-platform compatibility." (business jargon)
- "Creates AGENTS.md files by analyzing codebases and consolidating existing AI assistant configurations." (describes single command, not group)
- "Comprehensive solution for optimizing workflow efficiency." (marketing language)
- "Automated quality assurance with parallel execution, risk assessment, and specialized subagent routing for comprehensive project validation." (too many technical implementation details)
- "Workspace organization through intelligent detection and removal of debug artifacts, test files, and development cruft with safety mechanisms." (overly verbose, implementation details)

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

## Subagent Descriptions

Subagents fall into two categories requiring different description approaches:

### Non-Domain Expert Subagents
For subagents with unique architectures (like code-review-expert, research-expert), use the full format:

```markdown
#### [subagent-name](../src/agents/path.md)

Brief description of the subagent's unique technical approach and architecture.

**Tools**: `allowed-tools` from frontmatter
**Architecture**: How this agent's approach differs from standard domain experts
**Specialization**: Specific capabilities and problem-solving methods
```

### Domain Expert Subagents
Since most subagents are domain experts with similar architectures, use a generic description for the group followed by brief individual descriptions.

### Group Description Format
```markdown
### Subagents

Domain expert subagents with concentrated expertise in specific technical areas. Each agent uses environmental detection, delegation patterns, and progressive solution approaches within their domain.

[individual-expert](../src/agents/path.md) - Brief domain description.
[another-expert](../src/agents/path.md) - Brief domain description.
```

### Individual Subagent Format
```markdown
[subagent-name](../src/agents/path.md) - One sentence describing specific domain expertise.
```

### Guidelines
- **Generic description**: Explains the common architecture once
- **Individual descriptions**: One sentence per subagent about their specific domain
- **Focus on domain scope**: What technical area they cover
- **Avoid repetition**: Don't repeat the same architectural patterns
- **Follow Kevin's principle**: Minimal words for maximum information

### Example
```markdown
### Subagents

Domain expert subagents with concentrated expertise in specific technical areas. Each agent uses environmental detection, delegation patterns, and progressive solution approaches within their domain.

[typescript-type-expert](../src/agents/typescript/typescript-type-expert.md) - Advanced type system, generics, and conditional types.
[react-performance-expert](../src/agents/react/react-performance-expert.md) - React optimization, profiling, and Core Web Vitals.
[database-expert](../src/agents/database/database-expert.md) - Query optimization, schema design, and performance tuning.
```

## Integration

Add command descriptions to the technical overview under appropriate sections. Use the `####` heading level for individual commands within command sections. Use the same heading level for subagents within subagent sections.