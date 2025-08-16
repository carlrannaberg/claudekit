# Using claudekit Prompts with Claude Code and External LLMs

This guide shows how to leverage claudekit's `show` command to extract specialized AI assistant prompts for use with Claude Code's non-interactive mode (`claude -p`) and other LLM systems.

## Key Use Case: Claude Code Non-Interactive Mode

The primary use case is enhancing Claude Code's non-interactive mode with specialized expertise:

```bash
# Instead of generic Claude Code:
cat complex_code.ts | claude -p "Review this code"

# Use specialized expertise from claudekit:
EXPERT=$(claudekit show agent typescript-expert)
cat complex_code.ts | claude -p --append-system-prompt "$EXPERT" "Review this code"
```

This approach gives you:
- **Specialized expertise** - Access to domain-specific agents (TypeScript, React, PostgreSQL, etc.)
- **Consistent quality** - Standardized prompts across your team
- **Automation-ready** - Perfect for CI/CD pipelines and scripts
- **Tool compatibility** - Works with multiple LLM CLI tools

## Overview

The `claudekit show` command provides access to:
- **Agent prompts** - Specialized AI assistant configurations for different domains (typescript-expert, react-performance-expert, etc.)
- **Command prompts** - Reusable task templates and workflows from Claude Code slash commands

These prompts can be:
- Used with Claude Code's non-interactive print mode (`claude -p`)
- Piped to Claude Code for streaming operations
- Integrated into CI/CD pipelines for automated code review
- Exported for use with various LLM CLI tools

### Compatible CLI Tools

claudekit prompts work with these AI coding CLI tools:

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code/cli)** - Primary integration via `claude -p --append-system-prompt`
- **[Amp](https://ampcode.com/)** - Agentic coding tool with CLI support
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** - Google's AI agent for terminal
- **[Cursor CLI](https://cursor.com/cli)** - Cursor's terminal coding agent
- **[Codex](https://github.com/openai/codex)** - OpenAI's lightweight coding agent
- **[OpenCode](https://github.com/sst/opencode)** - Open-source AI coding agent for terminal

## Basic Usage

### Show Agent Prompts

```bash
# Show agent prompt as plain text (default)
claudekit show agent typescript-expert

# Show agent metadata and content as JSON
claudekit show agent react-performance-expert --format json

# List all available agents with their actual names
claudekit list agents
# Output shows: typescript-expert, postgres-expert, docker-expert, etc.
```

### Show Command Prompts

```bash
# Show command prompt as plain text
claudekit show command spec:create

# Show command metadata and content as JSON  
claudekit show command checkpoint:restore --format json

# List all available commands
claudekit list commands
```

## Integration with Claude Code Non-Interactive Mode

Claude Code's print mode (`claude -p`) is perfect for using claudekit prompts in automated workflows:

### Using Agent Prompts with Claude Code

```bash
#!/bin/bash

# Use TypeScript expert for code review
PROMPT=$(claudekit show agent typescript-expert)
cat src/app.ts | claude -p --append-system-prompt "$PROMPT" "Review this TypeScript code for best practices"

# Stream JSON output for programmatic processing
claudekit show agent react-performance-expert | \
  claude -p --output-format json "Analyze the performance of ProductList.tsx"

# Use with verbose mode for debugging
claudekit show agent postgres-expert | \
  claude -p --verbose "Optimize this query: SELECT * FROM orders WHERE status='pending'"
```

### Piping Content Through Claude Code

```bash
# Process logs with specialized agent
cat error.log | claudekit show agent nodejs-expert | \
  claude -p "Analyze these Node.js errors and suggest fixes"

# Review git changes with expert prompt
git diff main..feature | claudekit show agent git-expert | \
  claude -p "Review these changes for potential issues"

# Analyze test failures
npm test 2>&1 | claudekit show agent jest-testing-expert | \
  claude -p "Explain why these tests are failing"
```

### Non-Interactive Workflows with Commands

```bash
# Execute a command workflow non-interactively
SPEC_WORKFLOW=$(claudekit show command spec:create)
echo "User authentication system with OAuth2" | \
  claude -p --append-system-prompt "$SPEC_WORKFLOW" --max-turns 5

# Use checkpoint commands in automation
CHECKPOINT_CMD=$(claudekit show command checkpoint:create)
claude -p --append-system-prompt "$CHECKPOINT_CMD" "Create a checkpoint before deployment"
```

### CI/CD Integration with Claude Code

```yaml
# GitHub Actions example using Claude Code non-interactive mode
name: AI Code Review with Claude Code

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: |
          npm install -g @anthropic/claude-code
          npm install -g claudekit
      
      - name: Review TypeScript changes
        run: |
          # Get TypeScript expert prompt inline
          for file in $(git diff --name-only origin/main...HEAD | grep '\.ts$'); do
            echo "Reviewing $file..."
            cat "$file" | claude -p \
              --append-system-prompt "$(claudekit show agent typescript-expert)" \
              --output-format json \
              "Review this TypeScript file for issues" > "review-$file.json"
          done
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Integration with Other AI Coding CLI Tools

### Gemini CLI (Google's AI Agent)

[Gemini CLI](https://github.com/google-gemini/gemini-cli) provides powerful AI capabilities with a free tier (60 req/min, 1000 req/day):

```bash
#!/bin/bash

# Use expert prompts with Gemini in non-interactive mode
echo "Find and fix the memory leak in app.ts" | \
  gemini -c "$(claudekit show agent nodejs-expert)" -m gemini-2.5-pro

# Process files with specialized expertise
cat ProductList.tsx | gemini -c "$(claudekit show agent react-performance-expert). Identify render performance issues and suggest memoization strategies"

# Use for database optimization
cat schema.sql | gemini -c "$(claudekit show agent postgres-expert). Analyze this schema and create optimal indexes for common queries"

# Code review with TypeScript expertise
cat new-feature.ts | gemini -c "$(claudekit show agent typescript-expert). Review for type safety and suggest improvements"
```

### Amp (Agentic Coding Tool)

[Amp](https://ampcode.com/) supports execute mode (`-x`) for non-interactive usage:

```bash
#!/bin/bash

# Use expert prompts with Amp in execute mode
amp -x "$(claudekit show agent typescript-expert)

Review the TypeScript codebase for type safety issues and fix any 'any' types"

# Pipe content with expert context
cat ProductList.tsx | amp -x "$(claudekit show agent react-performance-expert)

Analyze this React component for performance bottlenecks and suggest optimizations"

# For automated workflows with tool permissions
amp --dangerously-allow-all -x "$(claudekit show agent postgres-expert)

Analyze the database schema in schema.sql and create optimal indexes"

# Execute mode is automatic when redirecting stdout
echo "$(claudekit show agent testing-expert)

Write comprehensive unit tests for all functions in UserService.ts" | amp > tests.ts

# Combine expert knowledge with specific file processing
amp -x "$(claudekit show agent nodejs-expert)

Find and fix all unhandled promise rejections in the src/ directory"
```

### OpenCode (Open-Source Terminal Agent)

[OpenCode](https://github.com/sst/opencode) is an open-source AI coding agent for terminal:

```bash
#!/bin/bash

# Use claudekit prompts with OpenCode in non-interactive mode
EXPERT=$(claudekit show agent typescript-expert)
opencode -p "$EXPERT

Review this TypeScript codebase for issues" -q

# Pipe content with expert context
PROMPT=$(claudekit show agent react-performance-expert)
cat app.tsx | opencode -p "$PROMPT

Refactor this component for better performance"

# Use with specific providers
export OPENAI_API_KEY="your-key"
DB_EXPERT=$(claudekit show agent postgres-expert)
opencode -p "$DB_EXPERT

Optimize the database queries in this project"
```

### Cursor CLI (Terminal Coding Agent)

[Cursor CLI](https://cursor.com/cli) brings Cursor's AI capabilities to the terminal:

```bash
#!/bin/bash

# Use claudekit agents with Cursor CLI
export CURSOR_API_KEY="your-key"

# Provide expert context directly in the prompt
EXPERT=$(claudekit show agent typescript-expert)
cursor-agent "$EXPERT

Refactor this TypeScript module for better type safety"

# For specific tasks
TESTING_EXPERT=$(claudekit show agent testing-expert)
cursor-agent "$TESTING_EXPERT

Write comprehensive unit tests for the UserService class"
```

### Codex (OpenAI's Coding Agent)

[Codex](https://github.com/openai/codex) is OpenAI's terminal coding agent. While primarily interactive, it can accept initial prompts:

```bash
#!/bin/bash

# Use claudekit prompts with Codex
EXPERT=$(claudekit show agent typescript-expert)
codex "$EXPERT

Refactor the Dashboard component to use React Hooks"

# With specific model
REACT_EXPERT=$(claudekit show agent react-performance-expert)
codex --model gpt-4o "$REACT_EXPERT

Optimize all React components for performance"

# Auto-edit mode with expert knowledge
NODE_EXPERT=$(claudekit show agent nodejs-expert)
codex --auto-edit "$NODE_EXPERT

Fix all async/await issues in the codebase"
```


## CI/CD Pipeline Integration

### GitHub Actions

```yaml
# .github/workflows/ai-code-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install claudekit
        run: npm install -g claudekit
        
      - name: Setup claudekit
        run: claudekit setup --no-interactive
        
      - name: Get TypeScript expert prompt
        id: expert-prompt
        run: |
          PROMPT=$(claudekit show agent typescript-expert)
          echo "prompt<<EOF" >> $GITHUB_OUTPUT
          echo "$PROMPT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
          
      - name: Review changed TypeScript files
        run: |
          # Get changed .ts/.tsx files
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD | grep -E '\.(ts|tsx)$' | head -5)
          
          for file in $CHANGED_FILES; do
            echo "Reviewing $file..."
            CONTENT=$(cat "$file")
            
            # Send to OpenAI for review
            echo "Review this TypeScript code for best practices, performance, and potential issues:

          \`\`\`typescript
          $CONTENT
          \`\`\`" | openai chat \
              --system "${{ steps.expert-prompt.outputs.prompt }}" \
              --model gpt-4 > "review-$file.md"
          done
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Post review comments
        # Upload review files as artifacts or post as PR comments
        uses: actions/upload-artifact@v4
        with:
          name: ai-code-reviews
          path: review-*.md
```

### GitLab CI

```yaml
# .gitlab-ci.yml
ai-code-review:
  stage: test
  image: node:18
  script:
    - npm install -g claudekit
    - claudekit setup --no-interactive
    
    # Get React performance expert for component analysis
    - EXPERT_PROMPT=$(claudekit show agent react-performance-expert)
    
    # Review React components in merge request
    - |
      git diff --name-only origin/main...HEAD | grep -E '\.(jsx|tsx)$' | while read file; do
        echo "Analyzing $file for performance issues..."
        COMPONENT_CODE=$(cat "$file")
        echo "Analyze this React component: $COMPONENT_CODE" | \
          curl -X POST "https://api.openai.com/v1/chat/completions" \
            -H "Authorization: Bearer $OPENAI_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
              \"model\": \"gpt-4\",
              \"messages\": [
                {\"role\": \"system\", \"content\": \"$EXPERT_PROMPT\"},
                {\"role\": \"user\", \"content\": \"Analyze this React component: $COMPONENT_CODE\"}
              ]
            }" > "analysis-$file.json"
      done
  artifacts:
    paths:
      - analysis-*.json
```

## Extracting Specific Fields with jq

### Agent Metadata Extraction

```bash
# Get just the agent description
claudekit show agent oracle --format json | jq -r '.description'

# Get agent category for filtering
claudekit show agent typescript-expert --format json | jq -r '.category'

# Get display name and color for UI
claudekit show agent react-expert --format json | jq -r '"\(.displayName) (\(.color))"'

# Extract all agents in a specific category  
claudekit list agents --format json | jq '.agents[] | select(.category == "typescript") | .name'
```

### Command Metadata Extraction

```bash
# Get allowed tools for security validation
claudekit show command git:commit --format json | jq -r '.allowedTools[]'

# Get argument hint for CLI help
claudekit show command checkpoint:create --format json | jq -r '.argumentHint // "No arguments"'

# Extract command category
claudekit show command spec:create --format json | jq -r '.category'
```

### Advanced jq Processing

```bash
# Create a prompt library JSON file
cat > prompt-library.json << 'EOF'
{
  "agents": [],
  "commands": []
}
EOF

# Populate with all agents
claudekit list agents --format json | jq '.' > agents.json
claudekit list commands --format json | jq '.' > commands.json

# Combine into single library
jq -s '{agents: .[0], commands: .[1]}' agents.json commands.json > prompt-library.json

# Clean up
rm agents.json commands.json
```

## Shell Scripting Examples

### Prompt Selection Menu

```bash
#!/bin/bash

# Interactive prompt selection
select_agent() {
    echo "Available AI Experts:"
    claudekit list agents --format json | jq -r '.agents[] | "\(.name) - \(.description)"' | nl
    
    read -p "Select an expert (number): " selection
    AGENT_ID=$(claudekit list agents --format json | jq -r ".agents[$((selection-1))].name")
    
    if [ "$AGENT_ID" != "null" ]; then
        claudekit show agent "$AGENT_ID"
    else
        echo "Invalid selection"
        exit 1
    fi
}

# Usage
EXPERT_PROMPT=$(select_agent)
echo "Using expert prompt for your query..."
```

### Bulk Prompt Export

```bash
#!/bin/bash

# Export all prompts to a directory structure
export_all_prompts() {
    local output_dir="exported-prompts"
    mkdir -p "$output_dir/agents" "$output_dir/commands"
    
    # Export all agents
    claudekit list agents --format json | jq -r '.agents[].name' | while read agent_id; do
        echo "Exporting agent: $agent_id"
        claudekit show agent "$agent_id" > "$output_dir/agents/${agent_id}.md"
        claudekit show agent "$agent_id" --format json > "$output_dir/agents/${agent_id}.json"
    done
    
    # Export all commands
    claudekit list commands --format json | jq -r '.commands[].name' | while read command_id; do
        echo "Exporting command: $command_id"
        # Replace : with _ for filenames
        safe_name=$(echo "$command_id" | tr ':' '_')
        claudekit show command "$command_id" > "$output_dir/commands/${safe_name}.md"
        claudekit show command "$command_id" --format json > "$output_dir/commands/${safe_name}.json"
    done
    
    echo "All prompts exported to $output_dir/"
}

export_all_prompts
```

### Dynamic Prompt Composition

```bash
#!/bin/bash

# Combine multiple expert prompts
compose_multi_expert() {
    local query="$1"
    local experts=("$@")
    
    echo "# Multi-Expert Analysis"
    echo "Query: $query"
    echo ""
    
    for expert in "${experts[@]:1}"; do
        echo "## Expert: $expert"
        PROMPT=$(claudekit show agent "$expert")
        echo "Analyzing with $expert expertise..."
        echo "$query" | your-llm-cli --system "$PROMPT"
        echo ""
    done
}

# Usage
compose_multi_expert "Review this database schema" \
    "postgres-expert" \
    "database-expert" \
    "typescript-expert"
```

## Best Practices and Tips

### Security Considerations

```bash
# Validate agent exists before using
validate_agent() {
    local agent_id="$1"
    if ! claudekit show agent "$agent_id" >/dev/null 2>&1; then
        echo "Error: Agent '$agent_id' not found"
        echo "Available agents:"
        claudekit list agents | head -10
        exit 1
    fi
}

# Sanitize user input
sanitize_input() {
    local input="$1"
    # Remove potentially dangerous characters
    echo "$input" | sed 's/[`$]//g' | tr -d '\0'
}
```

### Performance Optimization

```bash
# Store prompts in variables when using multiple times
get_prompt_once() {
    local agent_id="$1"
    # Store in global variable to avoid repeated calls
    if [ -z "${CACHED_PROMPTS[$agent_id]}" ]; then
        CACHED_PROMPTS[$agent_id]=$(claudekit show agent "$agent_id")
    fi
    echo "${CACHED_PROMPTS[$agent_id]}"
}

# Usage with associative array for multiple prompts
declare -A CACHED_PROMPTS
TS_EXPERT=$(get_prompt_once "typescript-expert")
REACT_EXPERT=$(get_prompt_once "react-expert")
```

### Error Handling

```bash
# Robust prompt retrieval with fallbacks
get_prompt_with_fallback() {
    local primary_agent="$1"
    local fallback_agent="$2"
    
    if claudekit show agent "$primary_agent" 2>/dev/null; then
        return 0
    elif [[ -n "$fallback_agent" ]]; then
        echo "Warning: Using fallback agent '$fallback_agent'" >&2
        claudekit show agent "$fallback_agent"
    else
        echo "Error: No available agents" >&2
        return 1
    fi
}

# Usage
PROMPT=$(get_prompt_with_fallback "typescript-type-expert" "typescript-expert")
```

### Quick Agent Discovery

```bash
# Find agents by keyword
find_agent() {
    local keyword="$1"
    echo "Agents matching '$keyword':"
    claudekit list agents --format json | \
        jq -r --arg kw "$keyword" '.agents[] | 
        select(.description | ascii_downcase | contains($kw | ascii_downcase)) | 
        "\(.name): \(.description)"' | head -5
}

# Usage examples
find_agent "typescript"  # Find TypeScript-related agents
find_agent "database"    # Find database experts
find_agent "performance" # Find performance optimization experts
```



## Practical Examples

### Real-World Code Review Pipeline

```bash
#!/bin/bash
# Automated code review using claudekit agents with Claude Code

review_typescript_project() {
  echo "🔍 Starting TypeScript code review..."
  
  # Get the TypeScript expert prompt
  TS_EXPERT=$(claudekit show agent typescript-expert)
  
  # Review all TypeScript files
  find src -name "*.ts" -o -name "*.tsx" | while read file; do
    echo "Reviewing: $file"
    
    cat "$file" | claude -p \
      --append-system-prompt "$TS_EXPERT" \
      --output-format json \
      --max-turns 1 \
      "Review this TypeScript file for: type safety, best practices, performance, and potential bugs" \
      > "reviews/$(basename $file).review.json"
  done
  
  echo "✅ Reviews saved to reviews/ directory"
}

# Usage
review_typescript_project
```

### Database Query Optimization

```bash
#!/bin/bash
# Optimize slow queries using postgres-expert

SLOW_QUERIES=$(psql -c "SELECT query FROM pg_stat_statements WHERE mean_exec_time > 1000")
POSTGRES_EXPERT=$(claudekit show agent postgres-expert)

echo "$SLOW_QUERIES" | claude -p \
  --append-system-prompt "$POSTGRES_EXPERT" \
  "Analyze these slow queries and provide optimization strategies with index recommendations"
```

### React Component Performance Analysis

```bash
#!/bin/bash
# Analyze React components for performance issues

REACT_EXPERT=$(claudekit show agent react-performance-expert)

# Find large React components
find src/components -name "*.tsx" -size +100 | while read component; do
  echo "Analyzing: $component"
  
  cat "$component" | claude -p \
    --append-system-prompt "$REACT_EXPERT" \
    --verbose \
    "Identify performance bottlenecks and suggest optimizations including memoization opportunities"
done
```

## Troubleshooting

### Common Issues

**Agent/Command Not Found**
```bash
# Check if claudekit is properly setup
claudekit validate

# Re-initialize if needed
claudekit setup

# List available items
claudekit list agents
claudekit list commands
```

**JSON Parsing Errors**
```bash
# Validate JSON output
claudekit show agent oracle --format json | jq '.'

# Check for binary/non-text content
claudekit show agent oracle --format json | file -
```

**Permission Issues**
```bash
# Check claudekit installation
which claudekit
claudekit --version

# Verify file permissions
ls -la ~/.claude/
```

**Integration Failures**
```bash
# Test with simple prompt first
echo "Hello" | openai chat --system "You are a helpful assistant"

# Verify environment variables
echo $OPENAI_API_KEY | wc -c  # Should be > 1

# Test jq availability
echo '{"test": "value"}' | jq '.test'
```

This guide provides comprehensive examples for integrating claudekit's powerful prompt system with external LLMs and automation workflows. The prompts are designed to be portable and can enhance AI interactions across different platforms and use cases.