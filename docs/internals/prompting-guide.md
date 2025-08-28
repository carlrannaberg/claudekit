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
9. [Schema and Template References](#schema-and-template-references)
10. [Best Practices Summary](#best-practices-summary)
11. [Practical Integration](#practical-integration)

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

## Schema and Template References

This guide focuses on prompt writing patterns. For complete schema specifications and templates, see the dedicated guides:

### Field Schemas and Validation
- **[Creating Commands Guide](creating-commands.md)** - Complete command frontmatter schema, field specifications, and validation rules
- **[Creating Subagents Guide](creating-subagents.md)** - Subagent frontmatter schema, naming conventions, and tool configurations

### Key Differences Summary
| Component | Tool Field | Security Model | Primary Use |
|-----------|------------|----------------|--------------|
| Commands | `allowed-tools` | Granular restrictions (`Bash(git:*)`) | User workflows |
| Subagents | `tools` | Flexible access or inherit all | Expert delegation |

### Quick Validation
```bash
# Validate schemas and configurations
claudekit lint-commands      # Command frontmatter validation
claudekit lint-subagents     # Subagent frontmatter validation
claudekit doctor             # Overall project setup
```

## Complete Templates and Examples

For complete, ready-to-use templates with all required fields and examples:

### Command Templates
- **[Creating Commands Guide](creating-commands.md)** - Complete slash command templates, schema examples, and frontmatter patterns
- Includes dynamic content (`!command`, `@file`, `$ARGUMENTS`)
- Tool restriction patterns and security configurations
- User workflow examples and validation steps

### Subagent Templates  
- **[Creating Subagents Guide](creating-subagents.md)** - Authoritative subagent template with research methodology
- Domain expertise structuring patterns
- Environment detection and delegation logic
- Code review checklists and quick reference formats

### Template Selection Guide
| Need | Use Template From |
|------|-------------------|
| User-initiated workflow | [Creating Commands Guide](creating-commands.md) |
| Domain expertise delegation | [Creating Subagents Guide](creating-subagents.md) |
| Prompt writing patterns | This guide (prompting-guide.md) |

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
claudekit doctor

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
