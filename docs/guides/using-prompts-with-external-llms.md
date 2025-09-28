# Using Claudekit Prompts with External LLMs

## Overview

Claudekit's `show` command extracts specialized AI assistant prompts for use with Claude Code's non-interactive mode and other LLM CLI tools. This enables automated code review, CI/CD integration, and specialized expertise in scripts.

**Key Benefits:**
- **Specialized expertise** - Access domain-specific agents (TypeScript, React, PostgreSQL, etc.)
- **Automation-ready** - Perfect for CI/CD pipelines and scripts
- **Tool compatibility** - Works with multiple LLM CLI tools
- **Consistent quality** - Standardized prompts across your team

## Installation

```bash
# Install claudekit (if not already installed)
npm install -g claudekit && claudekit setup --yes --force --agents typescript-expert,react-expert,postgres-expert
```

## Key Use Case: Claude Code Non-Interactive Mode

Transform Claude Code's non-interactive mode with specialized expertise:

```bash
# Generic approach
cat complex_code.ts | claude -p "Review this code"

# With specialized expertise
EXPERT=$(claudekit show agent typescript-expert)
cat complex_code.ts | claude -p --append-system-prompt "$EXPERT" "Review this code"
```

## Basic Usage

### Extract Agent Prompts

```bash
# Show available agents
claudekit list agents

# Extract specific agent prompt
claudekit show agent typescript-expert

# Use in Claude Code non-interactive mode
EXPERT=$(claudekit show agent typescript-expert)
echo "const x: any = 123" | claude -p --append-system-prompt "$EXPERT" "Review this TypeScript"
```

### Extract Command Prompts

```bash
# Show available commands
claudekit list commands

# Extract command prompt
claudekit show command git:commit

# Use the extracted template
PROMPT=$(claudekit show command git:commit)
git diff --staged | claude -p "$PROMPT"
```

## Compatible CLI Tools

Claudekit prompts work with these AI coding tools:

**Primary Integration:**
- **Claude Code** - `claude -p --append-system-prompt "$PROMPT"`

**Other Compatible Tools:**
- **Gemini CLI** - `gemini -c "$PROMPT"`
- **Cursor CLI** - `cursor --system "$PROMPT"`
- **OpenCode** - `opencode --prompt "$PROMPT"`

## CI/CD Pipeline Integration

### GitHub Actions Example

```yaml
name: AI Code Review
on: [pull_request]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Install tools
      run: |
        npm install -g claudekit
        # Install Claude Code CLI per official docs
    
    - name: AI Code Review
      run: |
        EXPERT=$(claudekit show agent typescript-expert)
        
        # Review changed TypeScript files
        git diff --name-only origin/main...HEAD | grep '\.tsx\?$' | while read file; do
          echo "## AI Review: $file" >> review.md
          cat "$file" | claude -p --append-system-prompt "$EXPERT" \
            "Review for type safety and best practices" >> review.md
          echo "" >> review.md
        done
        
        # Post as PR comment (with appropriate GitHub Action)
```

### Shell Script Example

```bash
#!/bin/bash
# Automated TypeScript review script

review_typescript() {
  local file="$1"
  local expert=$(claudekit show agent typescript-expert)
  
  cat "$file" | claude -p \
    --append-system-prompt "$expert" \
    --output-format json \
    "Review this TypeScript file for type safety, performance, and best practices"
}

# Review all TypeScript files
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  echo "Reviewing: $file"
  review_typescript "$file" > "reviews/$(basename $file).json"
done
```

## Integration Patterns

### Structured Output with jq

```bash
# Get JSON-formatted review
EXPERT=$(claudekit show agent typescript-expert)
REVIEW=$(cat app.ts | claude -p --append-system-prompt "$EXPERT" --output-format json \
  "Review this code and return JSON with fields: issues, suggestions, score")

# Extract specific fields
echo "$REVIEW" | jq -r '.issues[]'
echo "$REVIEW" | jq -r '.score'
```

### Multi-Agent Pipeline

```bash
# Sequential reviews with different experts
TS_EXPERT=$(claudekit show agent typescript-expert)
PERF_EXPERT=$(claudekit show agent react-performance-expert)

# TypeScript review
cat component.tsx | claude -p --append-system-prompt "$TS_EXPERT" \
  "Review TypeScript code quality" > typescript-review.txt

# Performance review  
cat component.tsx | claude -p --append-system-prompt "$PERF_EXPERT" \
  "Review React performance" > performance-review.txt

# Combine results
echo "## Combined Review" > final-review.md
cat typescript-review.txt performance-review.txt >> final-review.md
```

## Best Practices

### Performance Optimization
- **Cache agent prompts** in variables to avoid repeated `claudekit show` calls
- **Use structured output** (JSON) for programmatic processing  
- **Batch similar files** together for efficiency

### Error Handling
```bash
# Check if claudekit is available
if ! command -v claudekit &> /dev/null; then
  echo "Error: claudekit not installed"
  exit 1
fi

# Verify agent exists
if ! claudekit show agent typescript-expert &> /dev/null; then
  echo "Error: typescript-expert agent not found"
  exit 1
fi
```

### Security Considerations
- **Never log full agent prompts** in CI/CD - they may contain sensitive instructions
- **Validate file inputs** before passing to LLM APIs
- **Use appropriate rate limiting** for batch operations

## Troubleshooting

### Agent Not Found
```bash
# List available agents
claudekit list agents

# Check if specific agent exists
claudekit show agent typescript-expert || echo "Agent not found"
```

### Claude Code Integration Issues
```bash
# Verify Claude Code CLI is installed and accessible
claude --version

# Test basic non-interactive mode
echo "test" | claude -p "Echo this back"

# Test with system prompt
echo "test" | claude -p --append-system-prompt "You are a helpful assistant" "Echo this back"
```

### Empty or Invalid Output
- **Check agent exists**: `claudekit list agents | grep your-agent`
- **Verify file permissions**: Ensure readable files and writable output directories
- **Test with simple input**: Use basic examples before complex pipelines

## Limitations

- **Claude Code dependency** - Primary integration requires Claude Code CLI
- **Token usage** - Specialized prompts use more tokens than basic queries
- **Rate limits** - External LLM APIs have rate limiting for batch operations
- **Agent availability** - Requires claudekit agents to be installed locally
- **No real-time updates** - Extracted prompts are static snapshots

## Learn More

- [Claude Code CLI Documentation](https://docs.claude.com/en/docs/claude-code/cli) - Official non-interactive mode reference
- [Agent Configurations](../reference/subagents.md) - Available specialized agents
- [Command Reference](../reference/commands.md) - Extractable command prompts