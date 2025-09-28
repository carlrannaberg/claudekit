# Writing Documentation Guides

## Required Reading

Before writing or updating feature guides, read the official Claude Code documentation:
- **[Commands Documentation](https://docs.claude.com/en/docs/claude-code/slash-commands)** - How slash commands work
- **[Subagents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents)** - Subagent configuration and behavior
- **[Hooks Reference](https://docs.claude.com/en/docs/claude-code/hooks)** - Complete hook system documentation

Understanding the official specs ensures accuracy and prevents documenting non-existent features or incorrect behavior.

## Core Principles

When creating guides for claudekit features, follow these principles learned from experience:

### 1. Be Honest About What Exists

**Don't:**
- Document features that aren't implemented yet
- Make up performance metrics (e.g., "90% faster", "6x improvement")
- Present experimental work as shipped features

**Do:**
- Clearly indicate if something is experimental or planned
- State benefits conceptually without fabricated numbers
- Verify installation instructions actually work

### 2. Keep It Focused

**Don't:**
- Generate words for the sake of creating content
- Include exhaustive feature lists
- Add marketing language or sales pitch

**Do:**
- Get straight to the point
- Focus on what users need to know
- Include only relevant, actionable information
- Make it as long as needed, but concise

### 3. Structure Consistently

Use this proven structure for feature guides:

```markdown
# Feature Name

## Overview
Brief description of what it does and why it matters.

## Installation
```bash
# One-liner when possible
claudekit setup --yes --force --commands feature
```

## Architecture
[Visual diagram if it helps understanding]

## How It Works
1. Clear step one
2. Clear step two
3. Clear step three

## Usage Examples
[Concrete, runnable examples]

## Key Design Decisions
[Why it works this way]

## Limitations
[Be honest about constraints]
```

### 4. Architecture Diagrams

Include diagrams when they clarify complex flows:

```
┌─────────────────────────────────────────────┐
│              User Input                      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│            Processing Step                   │
│  • Key action 1                             │
│  • Key action 2                             │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│              Output                          │
└─────────────────────────────────────────────┘
```

### 5. Language Guidelines

**For Commands and Subagents:**
- Use imperative mood (instructions TO Claude, not Claude speaking)
- Avoid first-person ("I will", "I'll analyze")
- Be direct: "Analyze the query" not "I'll analyze your query"

**For Documentation:**
- Active voice when possible
- Present tense for current behavior
- Future tense only for planned features (with clear indication)

### 6. Installation Instructions

**REQUIRED: Include both claudekit installation AND feature setup:**

All feature guides must include both commands because:
- New users need claudekit installed globally first
- Existing users need the specific feature/hook configured in their project
- One-liner format ensures proper execution order and prevents missed steps

**Good:**
```bash
# Single command that handles both requirements
npm install -g claudekit && claudekit setup --yes --force --hooks feature
```

**Bad:**
```bash
# Missing claudekit installation step
claudekit setup --yes --force --hooks feature

# Don't reference files that don't exist in npm package
cp $(npm root -g)/claudekit/src/new-feature.md .claude/

# Requires multiple copy-paste operations
npm install -g claudekit
claudekit setup --yes --force --hooks feature
```

#### Installation Command Consistency

**Always use `--yes --force` flags:**
- `--yes` skips interactive prompts (enables copy-paste)
- `--force` overwrites existing config without asking (prevents failures)

**Always include both steps in one command:**
```bash
# Template for all feature installation instructions
npm install -g claudekit && claudekit setup --yes --force --hooks FEATURE_NAME
```

**Troubleshooting commands should also be consistent:**
```bash
# Good - includes flags for reliability
claudekit setup --yes --force --hooks feature

# Bad - might prompt user unexpectedly  
claudekit setup --hooks feature
```

### 7. Distinguish Command Output from User Instructions

When documenting commands that provide guidance or perform actions, clearly distinguish:
- What the command does automatically
- What guidance the command provides
- What the user needs to do manually

**Bad (ambiguous):**
```markdown
## After Running the Command

```bash
git status
git add AGENTS.md 
git commit -m "feat: update configuration"
```
```

**Good (clear about command behavior):**
```markdown
## After Running the Command

The command automatically:
- Creates symlinks for all AI tools
- Backs up conflicting files as .bak

The command suggests these next steps:
```
✓ Complete! Next steps:
1. Review changes: git status
2. Stage files: git add AGENTS.md
3. Commit: git commit -m "feat: update"
```
```

This prevents users from thinking they need to manually run commands that the tool handles automatically.

### 8. Appropriate Length for Complexity

**Simple features** (e.g., single command):
- Target: 50-100 lines

**Standard features** (e.g., hooks, workflows):
- Target: 150-200 lines

**Complex systems** (e.g., multi-command workflows):
- Target: 200-400 lines if truly needed
- But first ask: Can this be simplified?

**What to keep (valuable content):**
- Links to source code for defaults/implementation
- "What Claude Sees" examples showing actual output
- Concrete troubleshooting steps that actually work
- One good configuration example

**What to remove (actual fluff):**
- Same example shown 5 different ways
- Multiple installation methods doing the same thing
- Marketing language ("revolutionizes", "intelligent")
- Exhaustive troubleshooting for non-problems
- Internal implementation details users don't need

### 9. Troubleshooting Must Be Accurate

**Bad troubleshooting:**
```markdown
- Test manually: `command-name`  # Doesn't work without proper input
- Check target patterns  # Vague, not actionable
- Ensure transcript path  # What does this mean?
```

**Good troubleshooting:**
```markdown
- Check if registered: `/hooks` command
- View execution: `claude --debug`
- Validate JSON: `jq . config.json`
```

Always verify troubleshooting steps actually work before including them.

### 10. Be Critical During Review

Before publishing, ask:
- Is everything in this guide actually true?
- Can users actually run these commands?
- Do the troubleshooting steps actually work?
- Are there any made-up metrics or claims?
- Is valuable content being cut just to reduce length?

## Guidelines from Experience

### What Makes Content Valuable

**Keep these elements:**
- **"What User/Claude Sees" examples** - Show actual output/prompts, not descriptions
- **Links to source code** - For defaults, full implementation details
- **One canonical installation method** - Multiple ways confuse users
- **Working troubleshooting steps** - Test every command before documenting
- **Common pitfalls** - Real issues users encounter

**Remove these patterns:**
- **Multiple ways to do the same thing** - Choose the best one
- **Marketing language** - "revolutionizes", "intelligent", "enterprise-grade"
- **Internal implementation details** - How it works internally vs how to use it
- **Verbose benefit lists** - Show benefits through clear examples instead
- **Repeated explanations** - Say it once, clearly

### Distinguishing Valuable Repetition from Redundancy

**Valuable "repetition":**
- Showing input → output examples
- Configuration example followed by explanation
- Different valid use cases

**Actual redundancy:**
- Three installation methods that do the same thing
- Explaining the same concept with slightly different words
- Listing features already shown in examples

## Quick Checklist

Before publishing any guide:

- [ ] All features described actually exist
- [ ] Installation commands work
- [ ] No fabricated performance metrics
- [ ] Architecture diagram if helpful
- [ ] Concrete usage examples
- [ ] Honest limitations section
- [ ] Clear distinction between command actions vs user instructions
- [ ] Consistent use of `--yes --force` flags in all claudekit setup commands
- [ ] One-liner installation commands when possible (using `&&`)
- [ ] Length matches complexity (concise but complete)
- [ ] No unnecessary repetition
- [ ] No first-person language in prompts
- [ ] Public-facing appropriateness verified

## Remember

> "No point in generating for the sake of creating words."

Every sentence should serve a purpose. If it doesn't help the user understand or use the feature, delete it.

**The goal**: Guides should be as long as needed, but as short as possible. Complex topics deserve thorough documentation. Simple features need concise guides. Most existing guides can be 50-80% shorter without losing any value.