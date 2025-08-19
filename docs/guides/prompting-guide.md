# Prompting Guide for Claude Code

This guide provides practical patterns and best practices for writing effective prompts for Claude Code commands and subagents, based on analysis of proven system prompt patterns.

## Command vs Subagent Prompting

### Commands (Slash Commands)
**Format**: Markdown files with YAML frontmatter that serve as reusable prompts
**Purpose**: User-initiated workflows and tasks  
**Execution**: Claude reads the markdown as instructions and executes using available tools
**Tool Control**: Uses `allowed-tools` for granular security restrictions (e.g., allow `git commit` but not `git push`)

### Subagents (Specialized Agents)
**Format**: Agent definitions with system prompts for delegation
**Purpose**: Domain-specific expertise that Claude can delegate to
**Execution**: Separate context window with specialized knowledge and tools
**Tool Control**: Uses `tools` field for broader tool access (inherits all tools if omitted)

## Related Documentation

- [Official Commands Documentation](../official/commands.md) - Claude Code's built-in slash command features and syntax
- [Official Subagents Documentation](../official/subagents.md) - Claude Code's subagent system and configuration
- [Creating Commands Guide](creating-commands.md) - Step-by-step command creation process  
- [Creating Subagents Guide](creating-subagents.md) - Research-driven subagent development

## Table of Contents

1. [Core Prompt Structure](#core-prompt-structure)
2. [Identity Establishment](#identity-establishment)
3. [Instruction Patterns](#instruction-patterns)
4. [Behavioral Constraints](#behavioral-constraints)
5. [Tool Usage Guidelines](#tool-usage-guidelines)
6. [Error Handling](#error-handling)
7. [Communication Standards](#communication-standards)
8. [Security Integration](#security-integration)
9. [Template Examples](#template-examples)

## Core Prompt Structure

### The Proven Formula

```
You are [ROLE] for [SYSTEM]. Your job is to [PRIMARY_FUNCTION].

[PRIMARY_DIRECTIVE]

# Process:
1. [STEP_ONE with specifics]
2. [STEP_TWO with technical details]
3. [VALIDATION_STEP]

## Constraints:
- `ABSOLUTE constraint with details`
- `Another MUST/NEVER rule`

## Guidelines:
- Specific operational guidance
- Tool preferences and alternatives
- Output format requirements
```

### Why This Works

- **Immediate Authority**: Clear role establishment prevents confusion
- **Hierarchical Organization**: Numbered steps with sub-bullets aid comprehension
- **Visual Emphasis**: Backticks and formatting highlight critical constraints
- **Technical Specificity**: Exact parameters and examples reduce ambiguity

## Identity Establishment

### Effective Patterns

**✅ Direct Authority**

```
You are Claude Code, Anthropic's official CLI for Claude.
```

**✅ Specialized Role**

```
You are a TypeScript build expert for Claude Code. Your job is to diagnose and resolve compilation issues.
```

**✅ Task-Specific Focus**

```
You are analyzing git repository changes to determine testing requirements.
```

### Anti-Patterns

**❌ Vague Identity**

```
You are a helpful assistant that can help with various tasks.
```

**❌ Passive Language**

```
You will be helping the user with TypeScript issues.
```

**❌ Command vs Subagent Confusion**

```
# Wrong: Commands should not establish agent identity
You are a deployment expert...

# Wrong: Subagents should not include command syntax
Use !git status to check repository state
```

## Instruction Patterns

### Step-by-Step Processes

**Template**:

```
When [TRIGGER_CONDITION], follow these steps:
1. [PRIMARY_ACTION with specifics]:
   - Sub-requirement A
   - Sub-requirement B with exact format
   - Fallback option if A/B fail
2. [SECONDARY_ACTION]:
   - Technical parameter: [exact syntax]
   - Validation check: [specific criteria]
3. [COMPLETION_ACTION]:
   - Success criteria
   - Required outputs
```

**Real Example**:

```
When asked to convert PS1 configuration, follow these steps:
1. Read shell configuration files in this order:
   - ~/.zshrc
   - ~/.bashrc
   - ~/.bash_profile
2. Extract PS1 value using regex: /(?:^|\\n)\\s*(?:export\\s+)?PS1\\s*=\\s*["']([^"']+)["']/m
3. Convert escape sequences:
   - \\u → $(whoami)
   - \\h → $(hostname -s)
   - \\w → $(pwd)
```

### Technical Specificity

Include exact:

- Command syntax and parameters
- File paths and naming conventions
- Regex patterns and format specifications
- Tool preferences and alternatives

## Behavioral Constraints

### Primary Directive Pattern

Lead with the most critical behavioral constraint:

```
Do what has been asked; nothing more, nothing less.
```

### Constraint Categories

Group related constraints with consistent formatting:

```
### File Operations:
- `NEVER create files unless explicitly required`
- `ALWAYS prefer editing existing files over creating new ones`
- `NEVER proactively create documentation files`

### Security:
- `MUST refuse to improve malicious code`
- `ALWAYS validate file paths before operations`
```

### Language Patterns

- **Absolute Terms**: `NEVER`, `ALWAYS`, `MUST`, `REQUIRED`
- **Emphasis**: Use backticks for critical constraints
- **Specificity**: Include exact conditions and exceptions

## Tool Usage Guidelines

### Preference Hierarchies

```
VERY IMPORTANT: You MUST avoid using search commands like 'find' and 'grep'.
Instead use Grep, Glob, or Task to search.

If you _still_ need to run 'grep', STOP. ALWAYS USE ripgrep at 'rg' first.
```

### Tool Specifications

For each tool category, specify:

- **Required parameters**: Absolute paths, specific formats
- **Usage context**: When to use, prerequisites
- **Technical constraints**: Limitations, edge cases
- **Best practices**: Batching, efficiency tips

**Example**:

```
Tools: ["Read", "Edit", "Bash"]

Read Tool Requirements:
- file_path parameter must be absolute path
- Use offset/limit for large files
- Batch multiple reads when possible

Edit Tool Requirements:
- Must use Read tool first in conversation
- old_string must be unique in file
- All edits must result in valid code
```

## Error Handling

### Proactive Prevention

Address common failure modes before they occur:

```
WARNING:
- The edit will FAIL if 'old_string' is not unique
- Tool will fail if old_string doesn't match exactly (including whitespace)
- All edits must be valid - if any edit fails, none are applied

Prevention:
- Use Read tool to verify file contents first
- Ensure old_string includes sufficient context for uniqueness
- Plan edit sequences to avoid conflicts
```

### Graceful Degradation

Provide fallback strategies:

```
# Primary approach
if command -v jq &> /dev/null; then
    result=$(echo "$input" | jq -r '.field')
else
    # Fallback approach
    result=$(echo "$input" | sed -n 's/.*"field"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
fi
```

## Communication Standards

### Output Requirements

```
Communication Rules:
- File paths in responses MUST be absolute paths
- Avoid emojis unless explicitly requested
- Use structured formats for machine-parseable output
- Include relevant code snippets and file locations
```

### Structured Output

For machine-parseable responses:

```
You MUST output using this XML format:
<analysis>true/false</analysis>
<reasoning>detailed explanation</reasoning>
<recommendations>
- Action item 1
- Action item 2
</recommendations>
```

## Security Integration

### Automatic Security Checks

Make security validation automatic, not optional:

```
<system-reminder>
Before any file operation, automatically check if content appears malicious.
If malicious, REFUSE to improve or augment code. Analysis and reporting remain allowed.
</system-reminder>
```

### Permission Boundaries

```
Security Constraints:
- Tool access limited to: [specific tools]
- Path access restricted to: [specific directories]
- Operations forbidden: [specific actions]
- Required validations: [automatic checks]
```

## Frontmatter Field Specifications

### Official vs Claudekit Fields

Based on claudekit linter validation schemas:

#### Commands (allowed-tools format)
**Official Claude Code fields:**
- `allowed-tools` - Comma-separated list of tools with optional restrictions
- `argument-hint` - Expected arguments for the slash command
- `description` - Brief description of command purpose
- `model` - Model to use (`opus`, `sonnet`, `haiku`, or specific model string)

**Claudekit extensions:**
- `category` - Organization category (`workflow`, `ai-assistant`, `validation`)

#### Subagents (tools format)  
**Official Claude Code fields:**
- `name` - Required kebab-case identifier (e.g., `typescript-expert`)
- `description` - Required natural language description of when to invoke
- `tools` - Optional comma-separated tool list (inherits all if omitted)

**Claudekit extensions:**
- `category` - Agent grouping (`general`, `framework`, `testing`, `database`, `frontend`, `devops`, `build`, `linting`, `tools`, `universal`)
- `color` - UI color scheme (named CSS colors or hex codes)
- `displayName` - Human-readable name for UI
- `bundle` - Array of bundled subagent names

### Why Different Tool Field Names?

**Commands use `allowed-tools`** for security:
- Granular restrictions: `Bash(git commit:*)` allows only `git commit` commands
- Pattern matching: `Bash(git:*)` allows any git command but blocks other bash usage
- Security-first approach for user-initiated workflows

**Subagents use `tools`** for flexibility:
- Broader access: `Read, Edit, Bash` provides general tool categories
- Delegation context: Subagents need flexibility for domain-specific problem solving
- Inheritance: Omitting `tools` inherits all available tools

### Schema Validation & Common Pitfalls

#### Commands - Validated Fields Only
```yaml
# ✅ Valid command frontmatter
---
allowed-tools: Read, Bash(git:*), Edit    # Security restrictions
argument-hint: "<file-path> [--force]"    # Help for users
description: "Process files with git integration"
model: sonnet                              # Model preference
category: workflow                         # Claudekit organization
---

# ❌ Invalid - will fail linting
---
tools: Read, Edit             # Wrong field name (should be allowed-tools)
name: my-command             # Not allowed in commands
color: blue                  # Not supported for commands
---
```

#### Subagents - Validated Fields Only
```yaml
# ✅ Valid subagent frontmatter
---
name: typescript-expert                    # Required kebab-case ID
description: "Expert in TypeScript type system..."  # Required delegation trigger
tools: Read, Grep, Bash                   # Optional tool list
category: framework                        # Claudekit grouping
color: indigo                             # UI color scheme
displayName: "TypeScript Expert"          # UI-friendly name
bundle: ["type-helper", "build-fixer"]    # Bundled agents
---

# ❌ Invalid - will fail linting  
---
allowed-tools: Read, Edit     # Wrong field name (should be tools)
argument-hint: "--fix"        # Not supported for subagents
model: opus                   # Not used by subagents
---
```

#### Field Format Requirements
**Tools field validation:**
- Commands: `"Read, Bash(git:*), Edit"` (comma-separated string with restrictions)
- Subagents: `"Read, Grep, Bash"` (comma-separated string, no restrictions)
- ❌ Arrays not allowed: `["Read", "Edit"]` will fail validation

**Name validation (subagents only):**
- ✅ `typescript-expert`, `database-perf-expert`
- ❌ `TypeScript Expert`, `typescript_expert`, `TYPESCRIPT-EXPERT`

**Category validation:**
- Commands: `workflow`, `ai-assistant`, `validation`
- Subagents: `general`, `framework`, `testing`, `database`, `frontend`, `devops`, `build`, `linting`, `tools`, `universal`

### Validation Benefits

**Claudekit linting catches:**
- Wrong field names (`tools` in commands, `allowed-tools` in subagents)
- Invalid formats (arrays instead of strings, wrong naming conventions)
- Unrecognized fields that may indicate typos or outdated configurations
- Missing required fields (`name` and `description` for subagents)

**To validate your files:**
```bash
# Lint command frontmatter schemas
claudekit lint-commands

# Lint subagent frontmatter schemas  
claudekit lint-subagents

# Check overall project setup (directories, configs)
claudekit validate
```

**Examples of common issues to fix manually:**
- Convert `tools: ["Read", "Edit"]` to `tools: "Read, Edit"`
- Suggest `displayName` when missing from subagents
- Recommend corrections for invalid field names

## Template Examples

### Command Template

**For Slash Commands** (`/my-command`):
```markdown
---
# === OFFICIAL CLAUDE CODE FIELDS ===
description: Brief description of command purpose
allowed-tools: Read, Bash(git:*), Edit
argument-hint: "[feature-name] [optional-flags]"
model: sonnet

# === CLAUDEKIT EXTENSIONS ===
category: workflow
---

# Instructions for Claude:

When the user runs this command with `$ARGUMENTS`, follow these steps:

1. **Analyze the current situation**:
   - Check file: `@package.json` 
   - Run: `!git status --short`
   - Validate [PREREQUISITE]

2. **Execute the main task**:
   - Use [SPECIFIC_TOOL] with exact parameters
   - Apply [PATTERN] following these rules:
     - Rule 1 with specific example
     - Rule 2 with validation criteria
   - For complex tasks, delegate to appropriate subagent:
     ```
     Use the [domain]-expert subagent for [specific type of work]
     ```

3. **Validate and report results**:
   - Confirm [SUCCESS_CRITERIA]
   - Output summary in this format: [SPECIFIC_FORMAT]

## Constraints:
- `NEVER [FORBIDDEN_ACTION]`
- `ALWAYS [REQUIRED_BEHAVIOR]` 
- `MUST delegate [DOMAIN_WORK] to [EXPERT_SUBAGENT]`

## Examples:
**Input**: `/my-command feature-name --debug`
**Expected Output**: [Specific format example]
```

### Subagent Template

**Agent Definition File** (`.claude/agents/domain-expert.md`):
```yaml
---
# === OFFICIAL CLAUDE CODE FIELDS ===
name: domain-expert
description: Use PROACTIVELY for [domain] issues including [specific triggers]. Expert in [technical areas].
tools: Read, Grep, Bash  # Optional - omit to inherit all tools

# === CLAUDEKIT EXTENSIONS ===
category: framework
color: indigo
displayName: Domain Expert
---
```

**Agent System Prompt** (same file, below frontmatter):
```markdown
You are a [DOMAIN] expert for Claude Code with deep knowledge of [SPECIFIC_AREAS].

## Delegation First
0. **If ultra-specific expertise needed, delegate and stop**:
   - [Ultra-specific case 1] → [specialist-expert] 
   - [Ultra-specific case 2] → [another-specialist]
   
   Output: "This requires [specialty]. Use the [expert-name] subagent. Stopping here."

## Core Process
1. **Environment Detection**:
   ```bash
   # Detect project setup
   test -f [config-file] && echo "[Framework] project detected"
   which [tool] >/dev/null 2>&1 && echo "[Tool] available"
   ```

2. **Problem Analysis** (based on research):
   - Category 1: [Common Problem Type]
   - Category 2: [Another Problem Type]
   - Apply appropriate solution from domain knowledge

3. **Solution Implementation**:
   - Use domain-specific best practices
   - Follow established patterns
   - Validate using domain tools

## [Domain] Expertise

### [Category 1]: [Problem Area]
**Common Issues**:
- Error: "[Specific error message]"
- Symptom: [Observable behavior]

**Root Causes & Solutions**:
1. **Quick Fix**: [Minimal change with example]
2. **Proper Fix**: [Better solution with code]
3. **Best Practice**: [Architectural improvement]

**Validation**:
```bash
[domain-specific validation command]
```

### [Category 2]: [Another Problem Area]
[Follow same pattern...]

## Code Review Checklist
When reviewing [domain] code:

### [Technical Area 1]
- [ ] [Specific check with example]
- [ ] [Another domain-specific check]

### [Technical Area 2] 
- [ ] [Performance considerations]
- [ ] [Security patterns]

## Quick Reference
```
[Decision tree or common commands]
```

## Resources
- [Official Documentation](link)
- [Best Practices Guide](link)
```

## Best Practices Summary

### For Commands (Slash Commands)
- **Frontmatter**: Use official fields (`allowed-tools`, `argument-hint`, `description`, `model`) plus optional claudekit `category`
- **Instructions format**: Write as instructions TO Claude, not AS Claude
- **Tool restrictions**: Use `allowed-tools` with granular patterns like `Bash(git commit:*)` for security
- **Dynamic content**: Use `!command` for bash, `@file` for includes, `$ARGUMENTS` for user input
- **Subagent delegation**: Include delegation instructions for domain-specific work
- **Examples**: Always provide input/output examples with `$ARGUMENTS` patterns

### For Subagents (Domain Experts) 
- **Frontmatter**: Use required `name`/`description`, optional `tools`, plus claudekit extensions for UI
- **Identity first**: Establish expertise and domain boundaries immediately
- **Tool flexibility**: Use `tools` field for broader access, or omit to inherit all tools
- **Delegation logic**: Include step 0 for ultra-specific handoffs
- **Environment detection**: Auto-detect project setup and available tools
- **Research-based**: Ground all knowledge in documented problems and solutions
- **Code review sections**: Include domain-specific review checklists

### Universal Language Patterns
- **Imperative mood** for actions: "Extract", "Convert", "Validate"
- **Absolute terms** for constraints: "MUST", "NEVER", "ALWAYS"
- **Present tense** for identity: "You are" not "You will be"
- **Specific examples** over abstract descriptions

### Structure Principles
- **Lead with purpose** and scope definition
- **Organize hierarchically** with numbered steps and sub-bullets
- **Group related constraints** under clear category headers
- **Include validation steps** after major operations
- **Provide fallback options** for error conditions

### Technical Requirements
- **Specify exact parameters**: file paths, command syntax, regex patterns
- **Define tool preferences**: preferred options and forbidden alternatives
- **Include format specifications**: input/output structures, validation criteria
- **Address edge cases**: common failure modes and error handling

### Security Integration
- **Embed automatic checks** as system behaviors
- **Define clear boundaries** for tools, paths, and operations
- **Use absolute language** for security constraints
- **Specify allowed exceptions** when relevant

## Practical Integration

### Command + Subagent Workflow

**Step 1: Command for User Interface**
```markdown
---
# User runs: /analyze-performance --component=UserList
description: Analyze React component performance issues
allowed-tools: Task, Read
argument-hint: "--component=<ComponentName> [--trace]"
category: workflow
---

## Instructions for Claude:

1. **Initial Analysis**:
   - Read component file: `@src/components/$ARGUMENTS`
   - Identify performance indicators

2. **Expert Delegation**:
   ```
   For complex performance analysis, use the react-performance-expert subagent
   with the gathered component context and user requirements.
   ```

3. **Report Results**:
   - Summary of findings
   - Implementation recommendations
   - Performance impact estimation
```

**Step 2: Subagent for Domain Expertise**
```yaml
---
name: react-performance-expert
description: Expert in React performance optimization, profiling, and memory management. Use for component analysis, re-render debugging, and bundle optimization.
tools: Read, Grep, Bash, Edit  # Flexible tool access for analysis and fixes
category: frontend
displayName: React Performance Expert
color: cyan
---
```

### Validation Workflow

**Before committing changes:**
```bash
# 1. Lint frontmatter schemas
claudekit lint-commands
claudekit lint-subagents

# 2. Check project setup
claudekit validate

# 3. Test in Claude Code
/your-new-command test-args
```

### Migration from Invalid Patterns

**Common migration needs:**

**❌ Old mixed pattern:**
```yaml
# Confused - mixing command and subagent fields
---
name: code-fixer              # Subagent field
allowed-tools: Read, Edit     # Command field
description: Fix code issues
---
```

**✅ Correct command pattern:**
```yaml
---
description: Fix code issues automatically
allowed-tools: Task, Read, Edit
category: workflow
---
```

**✅ Correct subagent pattern:**
```yaml
---
name: code-fixer
description: Expert in automated code fixes and refactoring
tools: Read, Edit, Bash
category: tools
displayName: Code Fixer
---
```

## Summary

This guide provides the foundation for creating effective prompts that produce reliable, secure, and user-focused Claude Code agents and commands using validated schemas and intentional design patterns.
