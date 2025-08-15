# Feature Specification: Expose Commands and Subagent Prompts for Headless Mode

## Title
Expose Commands and Subagent Prompts from Claudekit Executable for Headless Mode

## Status
Draft

## Authors
Claude Assistant - August 15, 2025

## Overview
This feature will expose the internal commands and subagent prompts from the claudekit executable as a programmatic API, enabling their reuse in headless (non-interactive) mode. This allows external tools, scripts, and even subagents themselves to retrieve command/agent prompts and execute them with additional context outside of the Claude Code interactive environment.

## Background/Problem Statement
Currently, claudekit's commands and subagent prompts are tightly coupled to the Claude Code interactive environment. The system loads and executes these components internally, but there's no programmatic way to:
- Access the raw prompts of commands and agents
- Execute commands/agents in a headless manner
- Integrate claudekit functionality into automated workflows
- Allow subagents to leverage other subagents' expertise programmatically
- Build tooling that extends or composes claudekit capabilities

This limitation prevents users from:
- Creating automated CI/CD pipelines that leverage claudekit expertise
- Building composite workflows that chain multiple agents
- Developing external tools that integrate with claudekit's knowledge base
- Running batch operations across multiple projects

## Goals
- Expose a programmatic API to load and retrieve command/agent definitions
- Enable headless execution of commands and agents with custom input
- Provide CLI commands for non-interactive access to prompts
- Support multiple output formats (JSON, YAML, plain text)
- Maintain backward compatibility with existing Claude Code integration
- Enable agent-to-agent communication in non-interactive contexts
- Support batch operations and workflow automation

## Non-Goals
- Replacing the Claude Code interactive experience
- Modifying the existing command/agent file formats
- Creating a REST API or web service
- Implementing a full workflow orchestration system
- Building a visual interface for command/agent management
- Authentication/authorization (relies on file system permissions)

## Technical Dependencies
- **Commander.js** (^12.0.0): CLI framework already in use
- **Node.js** (>=18.0.0): Runtime environment
- **js-yaml** (^4.1.0): YAML parsing for frontmatter
- **gray-matter** (^4.0.3): Frontmatter extraction
- **TypeScript** (^5.0.0): Type definitions and compilation
- **minimatch** (^9.0.0): Pattern matching for component filtering

## Detailed Design

### Architecture Changes

#### 1. New Module Structure
```
cli/
├── lib/
│   ├── loaders/
│   │   ├── agent-loader.ts      # Agent definition loading
│   │   ├── command-loader.ts    # Command definition loading
│   │   └── index.ts            # Unified loader interface
│   ├── executors/
│   │   ├── headless-executor.ts # Headless execution engine
│   │   ├── context-builder.ts   # Context preparation
│   │   └── result-formatter.ts  # Output formatting
│   └── api/
│       ├── public-api.ts        # Public API surface
│       └── types.ts             # TypeScript definitions
```

#### 2. Public API Interface

```typescript
// cli/lib/api/types.ts
export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  bundle?: string;
  tools: string[];
  content: string;
  metadata: {
    displayName?: string;
    color?: string;
    [key: string]: any;
  };
}

export interface CommandDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  allowedTools: string[];
  content: string;
  parameters?: string[];
  examples?: string[];
}

export interface ExecutionOptions {
  input?: string;
  arguments?: string[];
  context?: Record<string, any>;
  format?: 'json' | 'yaml' | 'text' | 'markdown';
  quiet?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  timeout?: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string | object;
  metadata: {
    executionTime: number;
    componentId: string;
    componentType: 'agent' | 'command';
  };
  errors?: string[];
  warnings?: string[];
}
```

#### 3. Loader Implementation

```typescript
// cli/lib/loaders/agent-loader.ts
export class AgentLoader {
  private cache: Map<string, AgentDefinition> = new Map();
  
  async loadAgent(agentId: string): Promise<AgentDefinition> {
    if (this.cache.has(agentId)) {
      return this.cache.get(agentId)!;
    }
    
    const agentPath = await this.resolveAgentPath(agentId);
    const content = await fs.readFile(agentPath, 'utf-8');
    const { data, content: body } = matter(content);
    
    const definition: AgentDefinition = {
      id: agentId,
      name: data.name,
      description: data.description,
      category: data.category,
      bundle: data.bundle,
      tools: data.tools || [],
      content: body,
      metadata: {
        displayName: data.displayName,
        color: data.color,
        ...data
      }
    };
    
    this.cache.set(agentId, definition);
    return definition;
  }
  
  async loadAllAgents(): Promise<Map<string, AgentDefinition>> {
    const agents = await this.discoverAgents();
    const definitions = new Map<string, AgentDefinition>();
    
    for (const agentId of agents) {
      definitions.set(agentId, await this.loadAgent(agentId));
    }
    
    return definitions;
  }
}
```

#### 4. Headless Executor

```typescript
// cli/lib/executors/headless-executor.ts
export class HeadlessExecutor {
  async executeAgent(
    agentId: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Load agent definition
      const agent = await this.agentLoader.loadAgent(agentId);
      
      // Build execution context
      const context = await this.contextBuilder.buildContext({
        type: 'agent',
        definition: agent,
        input: options.input,
        additionalContext: options.context
      });
      
      // Prepare prompt with context
      const prompt = this.preparePrompt(agent.content, context);
      
      // Execute (in dry-run mode, just return the prompt)
      if (options.dryRun) {
        return this.formatResult({
          success: true,
          output: prompt,
          metadata: {
            executionTime: Date.now() - startTime,
            componentId: agentId,
            componentType: 'agent'
          }
        }, options.format);
      }
      
      // For actual execution, would integrate with Claude API
      // This is placeholder for the integration point
      const result = await this.callClaudeAPI(prompt, agent.tools);
      
      return this.formatResult({
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          componentId: agentId,
          componentType: 'agent'
        }
      }, options.format);
      
    } catch (error) {
      return {
        success: false,
        output: '',
        metadata: {
          executionTime: Date.now() - startTime,
          componentId: agentId,
          componentType: 'agent'
        },
        errors: [error.message]
      };
    }
  }
}
```

#### 5. CLI Command Extensions

```typescript
// cli/commands/export.ts
export function registerExportCommands(program: Command) {
  const exportCmd = program
    .command('export')
    .description('Export component definitions');
  
  exportCmd
    .command('agent <id>')
    .description('Export a single agent definition')
    .option('-f, --format <format>', 'Output format', 'json')
    .action(async (id, options) => {
      const loader = new AgentLoader();
      const agent = await loader.loadAgent(id);
      console.log(formatOutput(agent, options.format));
    });
  
  exportCmd
    .command('agents')
    .description('Export all agent definitions')
    .option('-f, --format <format>', 'Output format', 'json')
    .option('--category <category>', 'Filter by category')
    .option('--bundle <bundle>', 'Filter by bundle')
    .action(async (options) => {
      const loader = new AgentLoader();
      const agents = await loader.loadAllAgents();
      const filtered = applyFilters(agents, options);
      console.log(formatOutput(filtered, options.format));
    });
  
  exportCmd
    .command('command <id>')
    .description('Export a single command definition')
    .option('-f, --format <format>', 'Output format', 'json')
    .action(async (id, options) => {
      const loader = new CommandLoader();
      const command = await loader.loadCommand(id);
      console.log(formatOutput(command, options.format));
    });
}

// cli/commands/run.ts
export function registerRunCommands(program: Command) {
  const runCmd = program
    .command('run')
    .description('Run components in headless mode');
  
  runCmd
    .command('agent <id>')
    .description('Run an agent in headless mode')
    .option('-i, --input <input>', 'Input text for the agent')
    .option('-c, --context <json>', 'Additional context as JSON')
    .option('-f, --format <format>', 'Output format', 'text')
    .option('--dry-run', 'Show prompt without execution')
    .action(async (id, options) => {
      const executor = new HeadlessExecutor();
      const result = await executor.executeAgent(id, {
        input: options.input,
        context: options.context ? JSON.parse(options.context) : {},
        format: options.format,
        dryRun: options.dryRun
      });
      
      if (!result.success) {
        console.error('Execution failed:', result.errors);
        process.exit(1);
      }
      
      console.log(result.output);
    });
}
```

#### 6. Library Exports Enhancement

```typescript
// cli/index.ts (additions)
// Loaders
export { AgentLoader } from './lib/loaders/agent-loader.js';
export { CommandLoader } from './lib/loaders/command-loader.js';

// Executors
export { HeadlessExecutor } from './lib/executors/headless-executor.js';
export { ContextBuilder } from './lib/executors/context-builder.js';

// Types
export type {
  AgentDefinition,
  CommandDefinition,
  ExecutionOptions,
  ExecutionResult
} from './lib/api/types.js';

// High-level API
export {
  loadAgent,
  loadCommand,
  loadAllAgents,
  loadAllCommands,
  executeAgentHeadless,
  executeCommandHeadless
} from './lib/api/public-api.js';
```

### Integration with External Libraries

#### Context7 Integration (Optional)
When executing agents that require library documentation:

```typescript
interface Context7Integration {
  async enhanceContext(
    agentId: string,
    libraries: string[]
  ): Promise<DocumentationContext> {
    const docs = await Promise.all(
      libraries.map(lib => this.fetchLibraryDocs(lib))
    );
    
    return {
      libraries: docs,
      timestamp: new Date().toISOString()
    };
  }
}
```

## User Experience

### CLI Usage Examples

```bash
# Export agent definition
claudekit export agent typescript-expert --format json > typescript-expert.json

# Export all agents in a category
claudekit export agents --category typescript --format yaml

# Run agent in headless mode
claudekit run agent react-expert \
  --input "How do I optimize React performance?" \
  --format markdown

# Dry run to see the prompt
claudekit run agent webpack-expert \
  --input "Configure code splitting" \
  --dry-run

# Run command with arguments
claudekit run command spec:create \
  --args "New feature for authentication" \
  --format json

# Batch processing
for project in */; do
  claudekit run agent testing-expert \
    --input "Analyze test coverage in $project" \
    --context "{\"projectPath\": \"$project\"}"
done
```

### Programmatic Usage Examples

```typescript
import { 
  loadAgent, 
  executeAgentHeadless,
  AgentDefinition 
} from 'claudekit';

// Load agent definition
const agent: AgentDefinition = await loadAgent('typescript-expert');
console.log(agent.description);
console.log(agent.tools);

// Execute agent programmatically
const result = await executeAgentHeadless('react-performance-expert', {
  input: 'Profile this React component for performance issues',
  context: {
    componentCode: await fs.readFile('./Component.tsx', 'utf-8')
  },
  format: 'json'
});

if (result.success) {
  console.log('Analysis:', result.output);
}

// Chain multiple agents
async function analyzeCodebase(path: string) {
  const structureAnalysis = await executeAgentHeadless('nodejs-expert', {
    input: `Analyze project structure at ${path}`
  });
  
  const securityAnalysis = await executeAgentHeadless('devops-expert', {
    input: 'Review security practices',
    context: { structure: structureAnalysis.output }
  });
  
  return { structure: structureAnalysis, security: securityAnalysis };
}
```

### Agent-to-Agent Communication

```typescript
// In a custom agent script
import { loadAgent, executeAgentHeadless } from 'claudekit';

export async function compositeAnalysis(code: string) {
  // First, get TypeScript analysis
  const typeAnalysis = await executeAgentHeadless('typescript-type-expert', {
    input: `Analyze type safety: ${code}`,
    format: 'json'
  });
  
  // Then get performance analysis
  const perfAnalysis = await executeAgentHeadless('react-performance-expert', {
    input: 'Identify performance bottlenecks',
    context: {
      code,
      typeIssues: typeAnalysis.output
    },
    format: 'json'
  });
  
  // Combine insights
  return {
    types: typeAnalysis.output,
    performance: perfAnalysis.output,
    recommendations: mergeRecommendations(typeAnalysis, perfAnalysis)
  };
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/loaders/agent-loader.test.ts
describe('AgentLoader', () => {
  // Purpose: Verify agent loading returns complete definition with all metadata
  test('loadAgent returns complete agent definition', async () => {
    const loader = new AgentLoader();
    const agent = await loader.loadAgent('typescript-expert');
    
    expect(agent).toHaveProperty('id', 'typescript-expert');
    expect(agent).toHaveProperty('name');
    expect(agent).toHaveProperty('description');
    expect(agent).toHaveProperty('content');
    expect(agent.tools).toBeInstanceOf(Array);
  });
  
  // Purpose: Ensure caching prevents redundant file reads for performance
  test('caches loaded agents to avoid duplicate reads', async () => {
    const loader = new AgentLoader();
    const spy = jest.spyOn(fs, 'readFile');
    
    await loader.loadAgent('react-expert');
    await loader.loadAgent('react-expert');
    
    expect(spy).toHaveBeenCalledTimes(1);
  });
  
  // Purpose: Verify graceful failure with clear error for missing agents
  test('throws meaningful error for non-existent agent', async () => {
    const loader = new AgentLoader();
    
    await expect(loader.loadAgent('non-existent'))
      .rejects.toThrow('Agent not found: non-existent');
  });
});

// tests/unit/executors/headless-executor.test.ts
describe('HeadlessExecutor', () => {
  // Purpose: Verify dry-run returns prompt without API calls for testing
  test('dry-run returns formatted prompt without execution', async () => {
    const executor = new HeadlessExecutor();
    const result = await executor.executeAgent('git-expert', {
      input: 'Resolve merge conflict',
      dryRun: true
    });
    
    expect(result.success).toBe(true);
    expect(result.output).toContain('Resolve merge conflict');
    expect(mockClaudeAPI).not.toHaveBeenCalled();
  });
  
  // Purpose: Ensure context injection works for agent chaining scenarios
  test('merges additional context into execution', async () => {
    const executor = new HeadlessExecutor();
    const result = await executor.executeAgent('testing-expert', {
      input: 'Write tests',
      context: { framework: 'jest', coverage: 80 }
    });
    
    expect(result.output).toContain('jest');
    expect(result.metadata.componentType).toBe('agent');
  });
});
```

### Integration Tests

```typescript
// tests/integration/headless-workflow.test.ts
describe('Headless Workflow Integration', () => {
  // Purpose: Verify end-to-end agent execution workflow with real files
  test('complete agent execution workflow', async () => {
    // Load agent
    const agent = await loadAgent('typescript-expert');
    expect(agent).toBeDefined();
    
    // Execute in dry-run
    const dryResult = await executeAgentHeadless('typescript-expert', {
      input: 'Analyze type safety',
      dryRun: true
    });
    expect(dryResult.success).toBe(true);
    
    // Execute with mock API
    mockClaudeAPI.mockResolvedValue('Analysis complete');
    const result = await executeAgentHeadless('typescript-expert', {
      input: 'Analyze type safety'
    });
    expect(result.output).toBe('Analysis complete');
  });
  
  // Purpose: Test agent chaining for complex multi-step workflows
  test('agent chaining with context passing', async () => {
    const first = await executeAgentHeadless('linting-expert', {
      input: 'Check code quality',
      dryRun: true
    });
    
    const second = await executeAgentHeadless('testing-expert', {
      input: 'Create tests for issues',
      context: { lintResults: first.output },
      dryRun: true
    });
    
    expect(second.output).toContain(first.output);
  });
});
```

### E2E Tests

```bash
#!/usr/bin/env bash
# tests/e2e/cli-headless.test.sh

# Purpose: Verify CLI export commands produce valid JSON/YAML output
test_export_commands() {
  # Test JSON export
  output=$(claudekit export agent typescript-expert --format json)
  echo "$output" | jq . > /dev/null || fail "Invalid JSON output"
  
  # Test YAML export
  output=$(claudekit export agents --format yaml)
  echo "$output" | yq . > /dev/null || fail "Invalid YAML output"
}

# Purpose: Test batch processing doesn't leak memory or leave processes
test_batch_processing() {
  for i in {1..10}; do
    claudekit run agent oracle --input "Test $i" --dry-run
  done
  
  # Check no orphaned processes
  pgrep -f "claudekit run" && fail "Orphaned processes found"
}
```

### Mocking Strategies

```typescript
// tests/mocks/claude-api.ts
export const mockClaudeAPI = {
  call: jest.fn().mockImplementation((prompt, tools) => {
    // Return predictable responses based on prompt patterns
    if (prompt.includes('typescript')) {
      return 'TypeScript analysis result';
    }
    if (prompt.includes('performance')) {
      return 'Performance analysis result';
    }
    return 'Generic response';
  })
};

// tests/mocks/filesystem.ts
export const mockFileSystem = {
  agents: new Map([
    ['typescript-expert', mockAgentContent],
    ['react-expert', mockReactAgentContent]
  ]),
  commands: new Map([
    ['spec:create', mockSpecCommandContent]
  ])
};
```

## Performance Considerations

### Caching Strategy
- **Agent/Command Definitions**: Cache in memory after first load
- **Parsed Frontmatter**: Cache parsed YAML to avoid re-parsing
- **File Watchers**: Optional file watching for cache invalidation in development
- **TTL**: Configurable cache TTL for long-running processes

### Optimization Techniques
```typescript
class PerformantLoader {
  private cache = new LRUCache<string, Definition>({
    max: 100, // Maximum cached items
    ttl: 1000 * 60 * 5 // 5 minute TTL
  });
  
  async loadWithCache(id: string): Promise<Definition> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    
    const definition = await this.load(id);
    this.cache.set(id, definition);
    return definition;
  }
}
```

### Batch Loading
```typescript
async function loadAgentsBatch(ids: string[]): Promise<Map<string, AgentDefinition>> {
  const results = await Promise.all(
    ids.map(id => loadAgent(id).catch(err => ({ id, error: err })))
  );
  
  return new Map(
    results
      .filter(r => !r.error)
      .map(r => [r.id, r as AgentDefinition])
  );
}
```

## Security Considerations

### File System Access
- **Path Validation**: Prevent directory traversal attacks
- **Sandboxing**: Limit file access to claudekit directories
- **Permission Checks**: Verify read permissions before loading

```typescript
function validatePath(path: string): void {
  const resolved = path.resolve(path);
  const allowed = [
    path.resolve('./src/agents'),
    path.resolve('./src/commands'),
    path.resolve('./.claude')
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
- **Inherit from Source**: Respect `allowed-tools` from agent/command definitions
- **Headless Restrictions**: Additional restrictions for headless mode
- **Audit Logging**: Log all headless executions for security auditing

## Documentation

### API Documentation
- **TypeScript Definitions**: Complete type definitions for all exports
- **JSDoc Comments**: Comprehensive inline documentation
- **API Reference**: Generated from TypeScript using TypeDoc
- **Examples**: Code examples for common use cases

### User Documentation
- **CLI Help**: Built-in help for all new commands
- **README Updates**: Add headless mode section
- **Guides**: 
  - "Using Claudekit in CI/CD Pipelines"
  - "Building Composite Agents"
  - "Automating with Claudekit"

### Developer Documentation
- **Architecture Guide**: Explain the headless execution model
- **Extension Guide**: How to build on top of the API
- **Integration Examples**: Sample integrations with popular tools

## Implementation Phases

### Phase 1: MVP/Core Functionality (Week 1-2)
1. **Loader Infrastructure**
   - Implement `AgentLoader` and `CommandLoader`
   - Add caching layer
   - Create unified loader interface

2. **Basic CLI Commands**
   - `export agent <id>` command
   - `export agents` command with filtering
   - JSON output format support

3. **Library Exports**
   - Export loader classes
   - Export type definitions
   - Create basic public API

4. **Testing Foundation**
   - Unit tests for loaders
   - Integration tests for CLI commands
   - Mock infrastructure

### Phase 2: Enhanced Features (Week 3-4)
1. **Headless Execution**
   - Implement `HeadlessExecutor`
   - Add context building
   - Create execution options

2. **Advanced CLI Commands**
   - `run agent <id>` command
   - `run command <id>` command
   - Multiple output formats (YAML, text, markdown)

3. **Batch Operations**
   - Batch loading optimizations
   - Parallel execution support
   - Progress reporting

4. **Documentation**
   - API documentation
   - User guides
   - Example scripts

### Phase 3: Polish and Optimization (Week 5-6)
1. **Performance Optimization**
   - Implement LRU cache
   - Add file watching for development
   - Optimize batch operations

2. **Security Hardening**
   - Path validation
   - Input sanitization
   - Audit logging

3. **Integration Features**
   - Context7 integration
   - GitHub Actions examples
   - Docker container support

4. **Advanced Features**
   - Template system for prompts
   - Agent composition helpers
   - Workflow definition format

## Open Questions

1. **Claude API Integration**: How should the actual Claude API integration work in headless mode? Options:
   - Require API key configuration
   - Proxy through Claude Code if available
   - Support multiple LLM backends

2. **Output Streaming**: Should headless execution support streaming responses?
   - Pros: Better for long-running operations
   - Cons: Complicates the API

3. **Versioning**: How to handle version compatibility?
   - Lock to specific agent/command versions?
   - Support version ranges?
   - Automatic updates?

4. **State Management**: Should headless execution maintain state between calls?
   - Stateless (current design)
   - Optional session management
   - Context persistence

5. **Error Recovery**: How to handle partial failures in batch operations?
   - Fail fast
   - Continue with errors
   - Retry logic

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
- [Strategy Pattern for Executors](https://refactoring.guru/design-patterns/strategy)
- [Factory Pattern for Loaders](https://refactoring.guru/design-patterns/factory-method)
- [LRU Cache Implementation](https://github.com/isaacs/node-lru-cache)