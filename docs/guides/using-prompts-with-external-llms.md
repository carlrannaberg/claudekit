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
          # Get TypeScript expert prompt
          EXPERT=$(claudekit show agent typescript-expert)
          
          # Review changed files
          for file in $(git diff --name-only origin/main...HEAD | grep '\.ts$'); do
            echo "Reviewing $file..."
            cat "$file" | claude -p \
              --append-system-prompt "$EXPERT" \
              --output-format json \
              "Review this TypeScript file for issues" > "review-$file.json"
          done
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Integration with Other AI Coding CLI Tools

### Amp (Agentic Coding Tool)

[Amp](https://ampcode.com/) is an agentic coding tool with CLI support. While Amp primarily uses slash commands, you can provide initial context:

```bash
#!/bin/bash

# Export claudekit prompt to a file for Amp context
claudekit show agent typescript-expert > typescript-expert.md

# Start Amp with the prompt as initial context
amp
# Then in Amp: /editor to write a prompt with the expert knowledge

# Or provide as initial message
PROMPT=$(claudekit show agent react-performance-expert)
echo "$PROMPT" | amp

# Use for automated workflows
claudekit show agent database-expert > db-expert.md
amp < db-expert.md
```

### Gemini CLI (Google's AI Agent)

[Gemini CLI](https://github.com/google-gemini/gemini-cli) is Google's AI agent for terminal with free tier (60 req/min, 1000 req/day):

```bash
#!/bin/bash

# Gemini CLI uses interactive mode, so provide context via initial prompt
EXPERT=$(claudekit show agent typescript-type-expert)
echo "Use this expertise: $EXPERT" | gemini-cli

# Or save to file and reference
claudekit show agent nodejs-expert > nodejs-expert.md
gemini-cli
# Then reference the file in your prompts

# For automation, combine with expect or similar tools
claudekit show agent database-expert > db-expert.md
echo "Using expertise from db-expert.md, optimize this schema..." | gemini-cli
```

### OpenCode (Open-Source Terminal Agent)

[OpenCode](https://github.com/sst/opencode) is an open-source AI coding agent for terminal:

```bash
#!/bin/bash

# Use claudekit prompts with OpenCode
EXPERT=$(claudekit show agent typescript-expert)
opencode -p "$EXPERT. Review this TypeScript codebase for issues"

# Non-interactive mode with expert knowledge
claudekit show agent react-performance-expert | \
  opencode -p "$(cat -). Analyze React components for performance" -q

# Pipe content with expert context
cat app.tsx | opencode -p "$(claudekit show agent react-expert). Refactor this component"

# Use with specific providers
export OPENAI_API_KEY="your-key"
claudekit show agent postgres-expert | \
  opencode -p "$(cat -). Optimize database queries in this project"
```

### Cursor CLI (Terminal Coding Agent)

[Cursor CLI](https://cursor.com/cli) brings Cursor's AI capabilities to the terminal:

```bash
#!/bin/bash

# Use claudekit agents with Cursor CLI
export CURSOR_API_KEY="your-key"

# Start Cursor CLI with expert context
EXPERT=$(claudekit show agent typescript-expert)
echo "$EXPERT" | cursor-agent

# For non-interactive usage, provide full prompt
claudekit show agent testing-expert > testing-expert.md
cursor-agent "Using the expertise in testing-expert.md, write comprehensive tests"

# Status check
cursor-agent status
```

### Codex (OpenAI's Coding Agent)

[Codex](https://github.com/openai/codex) is OpenAI's lightweight terminal coding agent:

```bash
#!/bin/bash

# Use claudekit prompts with Codex
EXPERT=$(claudekit show agent typescript-expert)
codex "$EXPERT. Refactor the Dashboard component to use React Hooks"

# With specific model
claudekit show agent react-performance-expert | \
  codex --model gpt-4.1 "$(cat -). Optimize all React components"

# Auto-edit mode with expert knowledge
PROMPT=$(claudekit show agent nodejs-expert)
codex --auto-edit "$PROMPT. Fix all async/await issues in the codebase"

# Full-auto mode for automated workflows
claudekit show agent testing-expert | \
  codex --full-auto "$(cat -). Add missing unit tests"
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
          PROMPT=$(claudekit show agent typescript/expert)
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
    - EXPERT_PROMPT=$(claudekit show agent react/performance-expert)
    
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
claudekit show agent typescript/expert --format json | jq -r '.category'

# Get display name and color for UI
claudekit show agent react/expert --format json | jq -r '"\(.displayName) (\(.color))"'

# Extract all agents in a specific category  
claudekit list agents --format json | jq '.agents[] | select(.category == "typescript") | .name'
```

### Command Metadata Extraction

```bash
# Get allowed tools for security validation
claudekit show command git/commit --format json | jq -r '.allowedTools[]'

# Get argument hint for CLI help
claudekit show command checkpoint/create --format json | jq -r '.argumentHint // "No arguments"'

# Extract command category
claudekit show command spec/create --format json | jq -r '.category'
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
    claudekit list agents --format json | jq -r '.[] | "\(.id) - \(.description)"' | nl
    
    read -p "Select an expert (number): " selection
    AGENT_ID=$(claudekit list agents --format json | jq -r ".[$((selection-1))].id")
    
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
    claudekit list agents --format json | jq -r '.[].id' | while read agent_id; do
        echo "Exporting agent: $agent_id"
        claudekit show agent "$agent_id" > "$output_dir/agents/${agent_id}.md"
        claudekit show agent "$agent_id" --format json > "$output_dir/agents/${agent_id}.json"
    done
    
    # Export all commands
    claudekit list commands --format json | jq -r '.[].id' | while read command_id; do
        echo "Exporting command: $command_id"
        # Replace / with _ for filenames
        safe_name=$(echo "$command_id" | tr '/' '_')
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
    "database/postgres-expert" \
    "security/expert" \
    "performance/expert"
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
# Cache frequently used prompts
CACHE_DIR="$HOME/.cache/claudekit-prompts"
mkdir -p "$CACHE_DIR"

get_cached_prompt() {
    local agent_id="$1"
    local cache_file="$CACHE_DIR/${agent_id}.md"
    local cache_time=3600  # 1 hour
    
    if [[ -f "$cache_file" && $(($(date +%s) - $(stat -c %Y "$cache_file"))) -lt $cache_time ]]; then
        cat "$cache_file"
    else
        claudekit show agent "$agent_id" | tee "$cache_file"
    fi
}
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
PROMPT=$(get_prompt_with_fallback "typescript/type-expert" "typescript/expert")
```

### Integration Testing

```bash
# Test prompt extraction in CI
test_prompt_extraction() {
    local errors=0
    
    # Test that all listed agents can be shown
    claudekit list agents --format json | jq -r '.[].id' | while read agent_id; do
        if ! claudekit show agent "$agent_id" >/dev/null 2>&1; then
            echo "ERROR: Cannot show agent: $agent_id"
            ((errors++))
        fi
    done
    
    # Test that all listed commands can be shown
    claudekit list commands --format json | jq -r '.[].id' | while read command_id; do
        if ! claudekit show command "$command_id" >/dev/null 2>&1; then
            echo "ERROR: Cannot show command: $command_id"
            ((errors++))
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        echo "All prompts accessible ✓"
    else
        echo "Found $errors errors in prompt extraction"
        exit 1
    fi
}
```

## Advanced Use Cases

### Multi-Model Consensus

```bash
#!/bin/bash

# Get consensus from multiple models using the same expert prompt
get_multi_model_consensus() {
    local agent_id="$1"
    local query="$2"
    
    EXPERT_PROMPT=$(claudekit show agent "$agent_id")
    
    echo "# Multi-Model Analysis: $agent_id"
    echo "Query: $query"
    echo ""
    
    # GPT-4
    echo "## GPT-4 Response"
    echo "$query" | openai chat --system "$EXPERT_PROMPT" --model gpt-4
    echo ""
    
    # Claude
    echo "## Claude Response"
    echo "$query" | claude --system "$EXPERT_PROMPT"
    echo ""
    
    # Local model
    echo "## Local Model Response"
    ollama run llama3.1:70b <<EOF
System: $EXPERT_PROMPT

User: $query
EOF
}
```

### Prompt Version Management

```bash
#!/bin/bash

# Version prompts for reproducible results
version_prompts() {
    local version_tag="$1"
    local output_dir="prompt-versions/$version_tag"
    
    mkdir -p "$output_dir"
    
    # Export with version metadata
    {
        echo "# Prompt Version: $version_tag"
        echo "# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        echo "# claudekit version: $(claudekit --version)"
        echo ""
        
        # Export all prompts with checksums
        claudekit list agents --format json | jq -r '.[].id' | while read agent_id; do
            content=$(claudekit show agent "$agent_id")
            checksum=$(echo "$content" | sha256sum | cut -d' ' -f1)
            echo "Agent: $agent_id (SHA256: $checksum)"
        done
    } > "$output_dir/version-manifest.md"
    
    echo "Prompts versioned in $output_dir/"
}
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