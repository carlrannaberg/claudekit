---
description: Capture CLI tool help documentation and add it to CLAUDE.md for AI assistant reference
category: claude-setup
allowed-tools: Bash(*:--help), Bash(*:-h), Bash(*:help), Bash(which:*), Bash(echo:*), Bash(sed:*), Edit, Read
argument-hint: "<cli-tool-name>"
---

# Add CLI Tool Documentation to CLAUDE.md

Capture help documentation from CLI tools and add it to CLAUDE.md for future reference.

## Usage
`/agents-md:cli <tool-name>`

Examples:
- `/agents-md:cli npm`
- `/agents-md:cli git`
- `/agents-md:cli cargo`

## Task

### 1. Check Tool Availability
First, verify the CLI tool exists:
!`which $ARGUMENTS 2>/dev/null && echo "✅ $ARGUMENTS is available" || echo "❌ $ARGUMENTS not found"`

### 2. Capture Help Documentation
If the tool exists, capture its help output. Try different help flags in order:

```bash
# Try common help flags
$ARGUMENTS --help 2>&1 || $ARGUMENTS -h 2>&1 || $ARGUMENTS help 2>&1
```

### 3. Update CLAUDE.md
Add or update the CLI tool documentation in CLAUDE.md following these steps:

1. **Check for existing CLI Tools Reference section**
   - If it doesn't exist, create it after the Configuration section
   - If it exists, add the new tool in alphabetical order

2. **Format the documentation** as a collapsible section:
   ```markdown
   ## CLI Tools Reference
   
   Documentation for CLI tools used in this project.
   
   <details>
   <summary><strong>$ARGUMENTS</strong> - [Brief description from help output]</summary>
   
   ```
   [Help output here, with ANSI codes stripped]
   ```
   
   </details>
   ```

3. **Clean the output**:
   - Remove ANSI escape codes (color codes, cursor movements)
   - Preserve the structure and formatting
   - Keep command examples and options intact

4. **Extract key information**:
   - Tool version if shown in help output
   - Primary purpose/description
   - Most commonly used commands or options

### 4. Provide Summary
After updating CLAUDE.md, show:
- ✅ Tool documentation added to CLAUDE.md
- Location in file where it was added
- Brief summary of what was captured
- Suggest reviewing CLAUDE.md to ensure formatting is correct

## Error Handling
- If tool not found: Suggest checking if it's installed and in PATH
- If no help output: Try running the tool without arguments
- If help output is extremely long (>500 lines): Capture key sections only
- If CLAUDE.md is a symlink: Update the target file (likely AGENTS.md)

## Implementation Notes
When processing help output:
1. Strip ANSI codes: `sed 's/\x1b\[[0-9;]*m//g'`
2. Handle tools that output to stderr by using `2>&1`
3. Preserve important formatting like tables and lists
4. Keep code examples and command syntax intact