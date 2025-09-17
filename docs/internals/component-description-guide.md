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

Subagents are specialized AI assistants that handle specific technical domains or unique architectural approaches. Use a unified template that works for both domain experts and non-domain expert subagents.

### Subagent Template Format
```markdown
#### [subagent-name](../src/agents/path.md)

Brief technical description of specialized approach and domain focus (1-2 sentences max).

**Tools**: Available tools and capabilities
**Specialization**: Unique expertise and problem-solving methods
```

### Subagent Description Guidelines
- **Purpose and approach**: Clearly state what the subagent specializes in and its technical approach
- **Domain focus**: For domain experts, specify the technical area; for non-domain experts, highlight unique architecture
- **Tools**: Copy exact `allowed-tools` list from frontmatter with backticks
- **Specialization**: Focus on unique capabilities, methodologies, and problem-solving approaches
- **Follow Kevin's principle**: Minimal words for maximum technical information

### Example - Domain Expert Subagent
```markdown
#### [typescript-type-expert](../src/agents/typescript/typescript-type-expert.md)

Advanced TypeScript type system specialist for complex generics, conditional types, and type-level programming challenges.

**Tools**: `Read, Edit, MultiEdit, Bash, Grep, Glob`
**Specialization**: Recursive types, brand types, utility type authoring, template literal types, and type performance optimization with comprehensive coverage of 18 advanced type system error patterns
```

### Example - Non-Domain Expert Subagent
```markdown
#### [code-review-expert](../src/agents/code-review-expert.md)

Single-focus code review subagent that gets launched multiple times concurrently by `/code-review` command, with each instance specializing in one review aspect rather than handling all aspects simultaneously.

**Tools**: `Read, Grep, Glob, Bash`
**Specialization**: Cross-file intelligence analysis, evolutionary pattern tracking, solution-oriented feedback with working code examples, dynamic integration with domain experts, and context-aware pattern detection with impact-based prioritization within assigned focus area
```

### Subagent-Specific Guidelines
- **Unified approach**: Same template works for all subagent types - content naturally distinguishes domain vs non-domain experts
- **Technical sophistication**: Highlight engineering patterns, unique methodologies, and problem-solving approaches
- **Domain scope**: For domain experts, clearly define technical boundaries and expertise areas
- **Architectural uniqueness**: For non-domain experts, emphasize unique approaches that differ from standard domain patterns

## Hook Descriptions

Hooks are event-driven components that integrate with Claude Code's execution lifecycle. Unlike commands (user-invoked) and subagents (task-focused), hooks respond automatically to system events.

### Hook Template Format
```markdown
#### [hook-name](../cli/hooks/hook-file.ts)

Brief technical description including purpose and approach (1-2 sentences max).

**Triggers**: Event conditions and matcher patterns

**Implementation**: Key technical mechanisms

**Behavior**: System integration and output characteristics
```

### Hook Description Guidelines
- **Purpose**: Clearly state what the hook accomplishes and why it exists
- **Technical approach**: Mention key patterns or engineering solutions used
- **Triggers**: List specific events and matcher patterns with backticks for event names
- **Implementation**: Focus on core technical mechanisms and tool orchestration
- **Behavior**: Describe system integration patterns and output characteristics

### Example Hook Description
```markdown
#### [create-checkpoint](../cli/hooks/create-checkpoint.ts)

Automatic backup system for Claude Code sessions using git stash create/store pattern to preserve work without disrupting workflow.

**Triggers**: `Stop` and `SubagentStop` events with universal matcher

**Implementation**: Git status detection, temporary staging, stash object creation, index reset, and automatic cleanup of aged checkpoints

**Behavior**: Silent execution without workflow interruption, provides backup safety net without modifying working directory
```

### Hook-Specific Guidelines
- **Event names**: Use backticks for event names like `PostToolUse`, `Stop`, `SessionStart`
- **Matcher patterns**: Include matcher specifics like `Write|Edit|MultiEdit` or `universal matcher`
- **Integration focus**: Emphasize how the hook fits into Claude Code's event system
- **Output behavior**: Describe silent execution, context injection, blocking behavior, etc.
- **Technical sophistication**: Highlight engineering patterns like debouncing, session management, state preservation

## Integration

Add command descriptions to the technical overview under appropriate sections. Use the `####` heading level for individual commands within command sections. Use the same heading level for subagents within subagent sections and hooks within hook sections.