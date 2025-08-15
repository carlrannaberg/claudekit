# Feature Specification: Show Commands and Subagent Prompts

## Title
Show Commands and Subagent Prompts from Claudekit

## Status
Draft

## Authors
Claude Assistant - August 15, 2025

## Overview
This feature adds `claudekit show` commands to display individual agent and command prompts, making them accessible for use with external LLMs and tools. Users can retrieve prompts in either plain text format (default, raw prompt only) or JSON format (with metadata).

## Background/Problem Statement
Currently, claudekit's commands and subagent prompts are tightly coupled to the Claude Code interactive environment. The system loads these components internally, but there's no way to:
- Access the raw prompts of commands and agents
- Use prompts with other LLMs or tools
- Integrate claudekit prompts into automated workflows

This limitation prevents users from:
- Using claudekit prompts with other AI systems (OpenAI, local LLMs, etc.)
- Creating automated pipelines that leverage specific claudekit expertise
- Sharing individual prompts with team members

## Goals
- Provide CLI command to show individual agent/command prompts
- Support two output formats: text (default, raw prompt only) and JSON (with metadata)
- Maintain backward compatibility with existing Claude Code integration
- Enable piping prompts to external tools and LLMs

## Non-Goals
- Batch operations or filtering (no --all, --category, etc.)
- Executing agents/commands within claudekit
- Modifying the existing command/agent file formats
- Creating a REST API or web service
- Building execution orchestration

## Technical Dependencies
- **Commander.js** (^12.0.0): CLI framework already in use
- **Node.js** (>=18.0.0): Runtime environment
- **gray-matter** (^4.0.3): Frontmatter extraction
- **glob** (^10.0.0): File pattern matching for recursive search
- **TypeScript** (^5.0.0): Type definitions and compilation

## Detailed Design

### Architecture Changes

#### 1. Data Structure Definitions

```typescript
// Complete interface definitions for agent and command data

export interface AgentDefinition {
  id: string;              // e.g., "typescript-expert"
  name: string;            // From frontmatter: name field
  description: string;     // From frontmatter: description field
  category: string;        // From frontmatter: category field (framework, testing, etc.)
  bundle?: string[];       // From frontmatter: related agents
  displayName?: string;    // From frontmatter: UI display name
  color?: string;          // From frontmatter: UI color hint
  content: string;         // Raw markdown content after frontmatter
  filePath: string;        // Full path to source file
  tools?: string[];        // From frontmatter: allowed tools (not in current agent format)
}

export interface CommandDefinition {
  id: string;              // e.g., "spec:create"
  name: string;            // Derived from filename
  description: string;     // From frontmatter: description field
  category?: string;       // From frontmatter: category field
  allowedTools: string[];  // From frontmatter: allowed-tools field
  argumentHint?: string;   // From frontmatter: argument-hint field
  content: string;         // Raw markdown content after frontmatter
  filePath: string;        // Full path to source file
}
```

#### 2. Loader Implementation Details

```typescript
// cli/lib/loaders/agent-loader.ts
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

export class AgentLoader {
  // Agents are embedded in the claudekit package
  private searchPaths = [
    path.join(__dirname, '../../src/agents')  // Agents bundled with claudekit
  ];

  /**
   * Load an agent by ID
   * @param agentId - Can be:
   *   - Simple name: "oracle" 
   *   - Category/name: "typescript/expert"
   *   - Full name: "typescript-expert"
   */
  async loadAgent(agentId: string): Promise<AgentDefinition> {
    const agentPath = await this.resolveAgentPath(agentId);
    if (!agentPath) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Read and parse file
    const fileContent = await fs.readFile(agentPath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Build definition
    const definition: AgentDefinition = {
      id: agentId,
      name: data.name || agentId,
      description: data.description || '',
      category: data.category || 'general',
      bundle: data.bundle,
      displayName: data.displayName,
      color: data.color,
      content: content.trim(),
      filePath: agentPath,
      tools: data.tools
    };

    return definition;
  }

  /**
   * Resolve agent ID to file path
   * Search strategy:
   * 1. Try exact match: {searchPath}/{agentId}.md
   * 2. Try with -expert suffix: {searchPath}/{agentId}-expert.md  
   * 3. Try category/name pattern: {searchPath}/{category}/{name}.md
   * 4. Try recursive search for matching name field in frontmatter
   */
  private async resolveAgentPath(agentId: string): Promise<string | null> {
    for (const searchPath of this.searchPaths) {
      // Check if search path exists
      try {
        await fs.access(searchPath);
      } catch {
        continue; // Skip non-existent paths
      }

      // Strategy 1: Direct file match
      let testPath = path.join(searchPath, `${agentId}.md`);
      if (await this.fileExists(testPath)) {
        return testPath;
      }

      // Strategy 2: Try with -expert suffix
      if (!agentId.endsWith('-expert')) {
        testPath = path.join(searchPath, `${agentId}-expert.md`);
        if (await this.fileExists(testPath)) {
          return testPath;
        }
      }

      // Strategy 3: Handle category/name pattern (e.g., "typescript/expert")
      if (agentId.includes('/')) {
        const [category, name] = agentId.split('/');
        testPath = path.join(searchPath, category, `${name}.md`);
        if (await this.fileExists(testPath)) {
          return testPath;
        }
        
        // Also try with -expert suffix
        if (!name.endsWith('-expert')) {
          testPath = path.join(searchPath, category, `${name}-expert.md`);
          if (await this.fileExists(testPath)) {
            return testPath;
          }
        }
      }

      // Strategy 4: Search recursively for name match in frontmatter
      const pattern = path.join(searchPath, '**/*.md');
      const files = await glob(pattern);
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const { data } = matter(content);
          
          // Check if name field matches
          if (data.name === agentId || 
              data.name === `${agentId}-expert` ||
              file.endsWith(`/${agentId}.md`)) {
            return file;
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

```typescript
// cli/lib/loaders/command-loader.ts
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

export class CommandLoader {
  // Commands are embedded in the claudekit package
  private searchPaths = [
    path.join(__dirname, '../../src/commands')  // Commands bundled with claudekit
  ];

  /**
   * Load a command by ID
   * @param commandId - Can be:
   *   - Simple name: "validate-and-fix"
   *   - Namespaced: "spec:create", "checkpoint:list"
   */
  async loadCommand(commandId: string): Promise<CommandDefinition> {
    const commandPath = await this.resolveCommandPath(commandId);
    if (!commandPath) {
      throw new Error(`Command not found: ${commandId}`);
    }

    // Read and parse file
    const fileContent = await fs.readFile(commandPath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Build definition
    const definition: CommandDefinition = {
      id: commandId,
      name: path.basename(commandPath, '.md'),
      description: data.description || '',
      category: data.category,
      allowedTools: this.parseAllowedTools(data['allowed-tools']),
      argumentHint: data['argument-hint'],
      content: content.trim(),
      filePath: commandPath
    };

    return definition;
  }

  /**
   * Parse allowed-tools field which can be string or array
   */
  private parseAllowedTools(tools: any): string[] {
    if (!tools) return [];
    if (typeof tools === 'string') {
      return tools.split(',').map(t => t.trim());
    }
    if (Array.isArray(tools)) {
      return tools;
    }
    return [];
  }

  /**
   * Resolve command ID to file path
   * Search strategy:
   * 1. Handle namespaced commands (spec:create -> spec/create.md)
   * 2. Try direct file match
   * 3. Search recursively
   */
  private async resolveCommandPath(commandId: string): Promise<string | null> {
    for (const searchPath of this.searchPaths) {
      // Check if search path exists
      try {
        await fs.access(searchPath);
      } catch {
        continue;
      }

      // Strategy 1: Handle namespaced commands (e.g., "spec:create")
      if (commandId.includes(':')) {
        const [namespace, name] = commandId.split(':');
        const testPath = path.join(searchPath, namespace, `${name}.md`);
        if (await this.fileExists(testPath)) {
          return testPath;
        }
      }

      // Strategy 2: Direct file match
      const testPath = path.join(searchPath, `${commandId}.md`);
      if (await this.fileExists(testPath)) {
        return testPath;
      }

      // Strategy 3: Search recursively
      const pattern = path.join(searchPath, '**/*.md');
      const files = await glob(pattern);
      
      for (const file of files) {
        const basename = path.basename(file, '.md');
        const dirname = path.basename(path.dirname(file));
        
        // Match various patterns
        if (basename === commandId ||
            `${dirname}:${basename}` === commandId) {
          return file;
        }
      }
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

#### 3. CLI Command Implementation

```typescript
// cli/commands/show.ts
export function registerShowCommands(program: Command) {
  const showCmd = program
    .command('show')
    .description('Show agent or command prompts');
  
  showCmd
    .command('agent <id>')
    .description('Show an agent prompt')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(async (id, options) => {
      const loader = new AgentLoader();
      const agent = await loader.loadAgent(id);
      
      if (options.format === 'json') {
        // Output full JSON with metadata
        console.log(JSON.stringify(agent, null, 2));
      } else {
        // Output raw prompt only (default)
        console.log(agent.content);
      }
    });
  
  showCmd
    .command('command <id>')
    .description('Show a command prompt')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(async (id, options) => {
      const loader = new CommandLoader();
      const command = await loader.loadCommand(id);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(command, null, 2));
      } else {
        // Output raw prompt only (default)
        console.log(command.content);
      }
    });
}
```

#### 4. Integration with Existing CLI

```typescript
// cli/cli.ts - Add this import and registration
import { registerShowCommands } from './commands/show.js';

// In the main program setup (around line 200-300):
registerShowCommands(program);
```

#### 5. Complete Output Examples

**Example Agent File** (`src/agents/typescript/expert.md`):
```markdown
---
name: typescript-expert
description: TypeScript and JavaScript expert with deep knowledge...
category: framework
bundle: [typescript-type-expert, typescript-build-expert]
displayName: TypeScript
color: blue
---

# TypeScript Expert

You are an advanced TypeScript expert...
```

**JSON Output** (`claudekit show agent typescript-expert --format json`):
```json
{
  "id": "typescript-expert",
  "name": "typescript-expert",
  "description": "TypeScript and JavaScript expert with deep knowledge...",
  "category": "framework",
  "bundle": ["typescript-type-expert", "typescript-build-expert"],
  "displayName": "TypeScript",
  "color": "blue",
  "content": "# TypeScript Expert\n\nYou are an advanced TypeScript expert...",
  "filePath": "/Users/user/project/src/agents/typescript/expert.md"
}
```

**Text Output** (`claudekit show agent typescript-expert`):
```
# TypeScript Expert

You are an advanced TypeScript expert...
```

## User Experience

### CLI Usage Examples

```bash
# Get raw agent prompt for piping to LLMs (default)
claudekit show agent typescript-expert

# Get agent with full metadata as JSON
claudekit show agent typescript-expert --format json > typescript-expert.json

# Get command prompt for external use (default text format)
claudekit show command spec:create | \
  claude --prompt-file - --input "New authentication feature"

# Pipe to other LLMs (default text format)
claudekit show agent react-expert | \
  openai-cli --system-prompt - --user "How do I optimize React performance?"

# Use with local LLMs
claudekit show agent webpack-expert | \
  ollama run llama2 --system

# Save JSON for programmatic use
claudekit show agent git-expert --format json > git-expert.json
jq '.content' git-expert.json  # Extract just the prompt
jq '.tools' git-expert.json     # See allowed tools
```

### Integration Examples

```bash
# GitHub Actions workflow
jobs:
  analyze:
    steps:
      - name: Get TypeScript Expert Prompt
        run: |
          PROMPT=$(claudekit show agent typescript-expert)
          echo "prompt<<EOF" >> $GITHUB_ENV
          echo "$PROMPT" >> $GITHUB_ENV
          echo "EOF" >> $GITHUB_ENV
      
      - name: Analyze with AI
        run: |
          # Use the prompt with any AI service
          curl -X POST https://api.example.com/analyze \
            -d "system_prompt=${{ env.prompt }}" \
            -d "code=$(cat src/**/*.ts)"

# Shell script using specific agent
#!/bin/bash
PROMPT=$(claudekit show agent testing-expert)
echo "$PROMPT" | your-ai-tool --input "Analyze tests in this project"
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/loaders/agent-loader.test.ts
describe('Show Command', () => {
  // Purpose: Verify CLI outputs text by default
  test('outputs text prompt by default', async () => {
    const output = await runCLI(['show', 'agent', 'typescript-expert']);
    
    expect(output).not.toContain('"id"');
    expect(output).not.toContain('{');
    expect(output).toContain('You are'); // Typical prompt start
  });
  
  // Purpose: Verify JSON format outputs full metadata
  test('JSON format outputs complete definition', async () => {
    const output = await runCLI(['show', 'agent', 'typescript-expert', '--format', 'json']);
    const parsed = JSON.parse(output);
    
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('content');
    expect(parsed).toHaveProperty('tools');
  });
  
  // Purpose: Verify error handling for missing agents
  test('shows error for non-existent agent', async () => {
    await expect(runCLI(['show', 'agent', 'non-existent']))
      .rejects.toThrow('Agent not found: non-existent');
  });
});
```

### E2E Tests

```bash
#!/usr/bin/env bash
# tests/e2e/cli-show.test.sh

# Purpose: Verify CLI show commands produce valid output
test_show_commands() {
  # Test text output (default)
  output=$(claudekit show agent typescript-expert)
  [[ "$output" == *"You are"* ]] || fail "Default should be raw prompt"
  [[ "$output" == *"\"id\""* ]] && fail "Default should not contain metadata"
  
  # Test JSON format
  output=$(claudekit show agent react-expert --format json)
  echo "$output" | jq . > /dev/null || fail "Invalid JSON output"
}

# Purpose: Test piping to external tools works
test_pipe_to_external() {
  # Test pipe to file (default text format)
  claudekit show agent git-expert > /tmp/git-expert.md
  [[ -s /tmp/git-expert.md ]] || fail "Show to file failed"
  
  # Test pipe to grep (default text format)
  output=$(claudekit show agent testing-expert | grep -c "test")
  [[ "$output" -gt 0 ]] || fail "Piping to grep failed"
}
```


## Performance Considerations

### Performance Considerations
- **No caching needed**: Each CLI invocation loads an agent/command at most once
- **File I/O**: Direct file reads are fast enough for single operations
- **Path resolution**: Search strategies ordered by likelihood for optimal performance

## Security Considerations

### File System Access
- **Path Validation**: Prevent directory traversal attacks
- **Sandboxing**: Limit file access to claudekit directories
- **Permission Checks**: Verify read permissions before loading

```typescript
import path from 'path';

function validatePath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const allowed = [
    path.join(__dirname, '../../src/agents'),
    path.join(__dirname, '../../src/commands')
  ];
  
  if (!allowed.some(dir => resolved.startsWith(dir))) {
    throw new Error('Access denied: Path outside allowed directories');
  }
}
```

### Input Sanitization
```typescript
function sanitizeInput(input: string): string {
  // Remove potential injection patterns
  return input
    .replace(/\$\{.*?\}/g, '') // Template literals
    .replace(/`.*?`/g, '')      // Backticks
    .replace(/\\/g, '\\\\');    // Escape sequences
}
```

### Tool Restrictions
- **Inherit from Source**: Respect `allowed-tools` from agent/command definitions when displaying
- **Read-only access**: Show commands only read, never modify

## Documentation

### User Documentation
- **CLI Help**: Built-in help for show commands
- **README Updates**: Add section on accessing prompts
- **Guides**: 
  - "Using Claudekit Prompts with External LLMs"
  - "Integrating Prompts in CI/CD"
  - "Piping to AI Tools"

### Developer Documentation
- **Integration Examples**: Sample scripts for using with popular LLM tools
- **Usage Patterns**: Common patterns for piping and processing prompts

## Implementation Phases

### Phase 1: Core Functionality (2-3 days)
1. **Loader Infrastructure**
   - Create `/cli/lib/loaders/agent-loader.ts`
   - Create `/cli/lib/loaders/command-loader.ts`
   - Implement path resolution logic

2. **CLI Integration**
   - Create `/cli/commands/show.ts`
   - Register command in `/cli/cli.ts`:
     ```typescript
     import { registerShowCommands } from './commands/show.js';
     // In main program setup:
     registerShowCommands(program);
     ```
   - Add `--format` option handling

3. **Output Formats**
   - Text format (default): Just `content` field
   - JSON format: Complete object with all fields, pretty-printed

4. **Error Handling**
   - Implement comprehensive error messages
   - Set appropriate exit codes
   - Handle edge cases (malformed frontmatter, etc.)

### Phase 2: Testing & Documentation (1-2 days)
1. **Testing**
   - Unit tests for loaders
   - Integration tests for CLI commands
   - E2E tests for piping

2. **Documentation**
   - Update README
   - Add usage examples
   - Document API

### Phase 3: Future Enhancements (if needed)
1. **Performance**
   - Improve caching if necessary
   - Add cache TTL configuration

2. **Extensions**
   - Resolve @file references (with --resolve flag)
   - Add version metadata to JSON output

## Resolved Design Decisions

1. **Variable Resolution**: **Not in v1**
   - Variables like `$ARGUMENTS`, `@file`, `!command` will NOT be resolved
   - Raw content is returned as-is from the markdown files
   - Future enhancement: Could add `--resolve` flag in v2

2. **Error Handling**: **Clear error messages with exit codes**
   ```typescript
   // Missing agent/command
   console.error(`Error: Agent not found: ${id}`);
   console.error(`Try 'claudekit list agents' to see available agents`);
   process.exit(1);
   
   // Invalid format parameter
   if (format !== 'text' && format !== 'json') {
     console.error(`Error: Invalid format '${format}'. Use 'text' or 'json'`);
     process.exit(1);
   }
   
   // File permission errors
   try {
     // ... file operations
   } catch (error) {
     if (error.code === 'EACCES') {
       console.error(`Error: Permission denied reading file`);
     } else if (error.code === 'ENOENT') {
       console.error(`Error: File not found`);
     } else {
       console.error(`Error: ${error.message}`);
     }
     process.exit(1);
   }
   ```

3. **Caching**: **Not needed**
   - Each CLI invocation loads an agent/command at most once
   - No benefit from caching in this simple use case
   - Direct file reads are sufficient

## References

### Internal Documentation
- [Component Discovery System](/cli/lib/components.ts)
- [Agent Registry](/cli/lib/agents/registry.ts)
- [CLI Architecture](/cli/cli.ts)
- [Existing Library Exports](/cli/index.ts)

### External Libraries
- [Commander.js Documentation](https://github.com/tj/commander.js#readme)
- [Gray Matter (Frontmatter Parser)](https://github.com/jonschlinkert/gray-matter)
- [js-yaml Documentation](https://github.com/nodeca/js-yaml)

### Related Specifications
- [Embedded Hooks System](/specs/feat-embedded-hooks-system.md)
- [Modernize Setup Installer](/specs/feat-modernize-setup-installer.md)
- [Domain Expert Subagents](/specs/feat-domain-expert-subagents.md)

### Design Patterns
- [Command Pattern](https://refactoring.guru/design-patterns/command)
- [Factory Pattern for Loaders](https://refactoring.guru/design-patterns/factory-method)
- [Simple Cache Pattern](https://github.com/isaacs/node-lru-cache)