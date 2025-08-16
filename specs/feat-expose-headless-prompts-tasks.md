# Task Breakdown: Show Commands and Subagent Prompts
Generated: August 15, 2025
Source: specs/feat-expose-headless-prompts.md

## Overview
Implementation of `claudekit show` commands to expose agent and command prompts for external use with LLMs and tools. The feature provides simple CLI access to embedded prompts with text (default) and JSON output formats.

## Phase 1: Foundation & Core Infrastructure

### Task 1.1: Create Loader Module Structure
**Description**: Set up the directory structure and TypeScript configuration for loader modules
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None

**Technical Requirements**:
- Create directory `/cli/lib/loaders/`
- Set up TypeScript imports and exports
- Configure module resolution for embedded agents/commands

**Implementation Steps**:
1. Create `/cli/lib/loaders/` directory
2. Create `/cli/lib/loaders/index.ts` for unified exports
3. Update tsconfig.json if needed for new paths

**Acceptance Criteria**:
- [ ] Directory structure created
- [ ] TypeScript compilation works with new structure
- [ ] Module imports resolve correctly

### Task 1.2: Implement AgentLoader Class
**Description**: Build the AgentLoader class with path resolution and file loading
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.3

**Technical Requirements**:
- Embedded agents path: `path.join(__dirname, '../../src/agents')`
- Support ID formats: "oracle", "typescript/expert", "typescript-expert"
- Four-strategy path resolution as specified
- gray-matter for frontmatter parsing
- glob for recursive search

**Implementation from spec**:
```typescript
export class AgentLoader {
  private searchPaths = [
    path.join(__dirname, '../../src/agents')
  ];
  
  async loadAgent(agentId: string): Promise<AgentDefinition> {
    const agentPath = await this.resolveAgentPath(agentId);
    if (!agentPath) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    // ... implementation as specified
  }
  
  private async resolveAgentPath(agentId: string): Promise<string | null> {
    // Strategy 1: Direct file match
    // Strategy 2: Try with -expert suffix
    // Strategy 3: Handle category/name pattern
    // Strategy 4: Recursive search with frontmatter
  }
}
```

**Acceptance Criteria**:
- [ ] All four path resolution strategies implemented
- [ ] Handles all ID formats correctly
- [ ] Returns complete AgentDefinition object
- [ ] Error handling for missing agents
- [ ] Unit tests for all strategies

### Task 1.3: Implement CommandLoader Class
**Description**: Build the CommandLoader class with namespace support
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Embedded commands path: `path.join(__dirname, '../../src/commands')`
- Support namespaced commands: "spec:create", "checkpoint:list"
- Parse allowed-tools from string or array format
- Three-strategy path resolution

**Implementation from spec**:
```typescript
export class CommandLoader {
  private searchPaths = [
    path.join(__dirname, '../../src/commands')
  ];
  
  async loadCommand(commandId: string): Promise<CommandDefinition> {
    // Implementation as specified
  }
  
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
}
```

**Acceptance Criteria**:
- [ ] Namespace resolution works (spec:create -> spec/create.md)
- [ ] Direct file matching works
- [ ] Recursive search works
- [ ] Handles both string and array allowed-tools
- [ ] Unit tests for all path patterns

### Task 1.4: Define TypeScript Interfaces
**Description**: Create type definitions for AgentDefinition and CommandDefinition
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.2, Task 1.3

**Technical Requirements**:
- Create `/cli/lib/loaders/types.ts`
- Export AgentDefinition and CommandDefinition interfaces
- Document all fields with comments

**Implementation from spec**:
```typescript
export interface AgentDefinition {
  id: string;              // e.g., "typescript-expert"
  name: string;            // From frontmatter: name field
  description: string;     // From frontmatter: description field
  category: string;        // From frontmatter: category field
  bundle?: string[];       // From frontmatter: related agents
  displayName?: string;    // From frontmatter: UI display name
  color?: string;          // From frontmatter: UI color hint
  content: string;         // Raw markdown content after frontmatter
  filePath: string;        // Full path to source file
  tools?: string[];        // From frontmatter: allowed tools
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

**Acceptance Criteria**:
- [ ] Interfaces match specification exactly
- [ ] All fields documented
- [ ] TypeScript compilation succeeds

## Phase 2: CLI Integration

### Task 2.1: Create Show Command Implementation
**Description**: Implement the show command with agent and command subcommands
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.2, Task 1.3, Task 1.4
**Can run parallel with**: None

**Technical Requirements**:
- Create `/cli/commands/show.ts`
- Use Commander.js for command structure
- Support --format option (text|json), default: text
- Text format: raw content only
- JSON format: full object, pretty-printed

**Implementation from spec**:
```typescript
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
        console.log(JSON.stringify(agent, null, 2));
      } else {
        console.log(agent.content);
      }
    });
  
  showCmd
    .command('command <id>')
    // ... similar implementation
}
```

**Acceptance Criteria**:
- [ ] `show agent <id>` works with text output (default)
- [ ] `show agent <id> --format json` works with JSON output
- [ ] `show command <id>` works with both formats
- [ ] Error messages are user-friendly
- [ ] Exit codes set correctly on errors

### Task 2.2: Register Show Command in CLI
**Description**: Integrate the show command into the main CLI program
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: None

**Technical Requirements**:
- Modify `/cli/cli.ts`
- Import registerShowCommands
- Call registration in appropriate location (around line 200-300)

**Implementation from spec**:
```typescript
import { registerShowCommands } from './commands/show.js';

// In main program setup:
registerShowCommands(program);
```

**Acceptance Criteria**:
- [ ] Show command appears in `claudekit --help`
- [ ] Show subcommands work from command line
- [ ] No conflicts with existing commands

### Task 2.3: Implement Error Handling
**Description**: Add comprehensive error handling with clear messages
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.4

**Technical Requirements**:
- Handle missing agents/commands
- Handle invalid format parameter
- Handle file permission errors
- Set appropriate exit codes

**Implementation from spec**:
```typescript
// Missing agent/command
console.error(`Error: Agent not found: ${id}`);
console.error(`Try 'claudekit list agents' to see available agents`);
process.exit(1);

// Invalid format
if (format !== 'text' && format !== 'json') {
  console.error(`Error: Invalid format '${format}'. Use 'text' or 'json'`);
  process.exit(1);
}

// File errors
catch (error) {
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

**Acceptance Criteria**:
- [ ] Clear error messages for all failure modes
- [ ] Exit code 1 for all errors
- [ ] Helpful suggestions in error messages
- [ ] No stack traces shown to users

### Task 2.4: Add Path Security Validation
**Description**: Implement path validation to prevent directory traversal
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.2, Task 1.3
**Can run parallel with**: Task 2.3

**Technical Requirements**:
- Validate all resolved paths
- Prevent access outside allowed directories
- Use path.resolve for normalization

**Implementation from spec**:
```typescript
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

**Acceptance Criteria**:
- [ ] Prevents directory traversal attacks
- [ ] Allows legitimate agent/command access
- [ ] Clear error message for security violations

## Phase 3: Testing

### Task 3.1: Write Unit Tests for Loaders
**Description**: Create comprehensive unit tests for AgentLoader and CommandLoader
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.2, Task 1.3
**Can run parallel with**: Task 3.2, Task 3.3

**Test Requirements**:
- Test all path resolution strategies
- Test error cases (missing files, bad IDs)
- Test frontmatter parsing
- Test different ID formats
- Mock file system for predictable tests

**Tests from spec**:
```typescript
describe('AgentLoader', () => {
  test('loads agent by simple name');
  test('loads agent by category/name');
  test('loads agent with -expert suffix');
  test('throws error for non-existent agent');
  test('parses frontmatter correctly');
});

describe('CommandLoader', () => {
  test('loads namespaced command');
  test('loads simple command');
  test('parses allowed-tools from string');
  test('parses allowed-tools from array');
});
```

**Acceptance Criteria**:
- [ ] All path strategies have tests
- [ ] Error conditions tested
- [ ] Tests are meaningful (can fail to reveal issues)
- [ ] No reliance on actual file system

### Task 3.2: Write Integration Tests for CLI
**Description**: Test the show command end-to-end through the CLI
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2
**Can run parallel with**: Task 3.1, Task 3.3

**Test Requirements**:
- Test default text output
- Test JSON format output
- Test error handling
- Test actual CLI invocation

**Tests from spec**:
```typescript
describe('Show Command', () => {
  test('outputs text prompt by default', async () => {
    const output = await runCLI(['show', 'agent', 'typescript-expert']);
    expect(output).not.toContain('"id"');
    expect(output).toContain('You are');
  });
  
  test('JSON format outputs complete definition', async () => {
    const output = await runCLI(['show', 'agent', 'typescript-expert', '--format', 'json']);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('id');
  });
  
  test('shows error for non-existent agent', async () => {
    await expect(runCLI(['show', 'agent', 'non-existent']))
      .rejects.toThrow('Agent not found: non-existent');
  });
});
```

**Acceptance Criteria**:
- [ ] CLI tests pass with real command execution
- [ ] Output formats verified
- [ ] Error messages verified
- [ ] Exit codes verified

### Task 3.3: Write E2E Tests for Piping
**Description**: Test that output can be piped to external tools
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 2.1
**Can run parallel with**: Task 3.1, Task 3.2

**Test Requirements**:
- Test piping to file
- Test piping to grep
- Test JSON parsing with jq
- Shell script tests

**Tests from spec**:
```bash
test_pipe_to_external() {
  # Test pipe to file
  claudekit show agent git-expert > /tmp/git-expert.md
  [[ -s /tmp/git-expert.md ]] || fail "Show to file failed"
  
  # Test pipe to grep
  output=$(claudekit show agent testing-expert | grep -c "test")
  [[ "$output" -gt 0 ]] || fail "Piping to grep failed"
}
```

**Acceptance Criteria**:
- [ ] Output can be piped to files
- [ ] Output can be piped to Unix tools
- [ ] JSON output is valid and parseable
- [ ] Text output is clean (no extra formatting)

## Phase 4: Documentation

### Task 4.1: Update README with Show Command
**Description**: Document the new show command in the main README
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 2.1
**Can run parallel with**: Task 4.2, Task 4.3

**Documentation Requirements**:
- Add to command list
- Provide usage examples
- Explain output formats
- Show piping examples

**Content to add**:
```markdown
### Show Commands

Display agent and command prompts for use with external tools:

```bash
# Get agent prompt (text by default)
claudekit show agent typescript-expert

# Get with metadata
claudekit show agent typescript-expert --format json

# Pipe to other LLMs
claudekit show agent react-expert | openai-cli --system-prompt -
```
```

**Acceptance Criteria**:
- [ ] Command documented in README
- [ ] Examples are clear and working
- [ ] Both formats explained

### Task 4.2: Create Usage Guide
**Description**: Write guide for using prompts with external LLMs
**Size**: Small
**Priority**: Low
**Dependencies**: Task 2.1
**Can run parallel with**: Task 4.1, Task 4.3

**Guide Contents**:
- How to pipe to OpenAI CLI
- How to use with local LLMs (Ollama)
- How to integrate in CI/CD
- How to extract specific fields with jq

**Acceptance Criteria**:
- [ ] Guide covers common use cases
- [ ] Examples are tested and working
- [ ] Saved to docs/ directory

### Task 4.3: Add CLI Help Text
**Description**: Ensure comprehensive help text for show commands
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 2.1
**Can run parallel with**: Task 4.1, Task 4.2

**Requirements**:
- Help for `claudekit show`
- Help for `claudekit show agent`
- Help for `claudekit show command`
- Document format options

**Acceptance Criteria**:
- [ ] `--help` works for all commands
- [ ] Options are documented
- [ ] Examples in help text

## Execution Strategy

### Parallel Execution Opportunities
- **Phase 1**: Tasks 1.2, 1.3, and 1.4 can run in parallel after 1.1
- **Phase 3**: All testing tasks (3.1, 3.2, 3.3) can run in parallel
- **Phase 4**: All documentation tasks can run in parallel

### Critical Path
1. Task 1.1 (Module Structure)
2. Tasks 1.2/1.3 (Loaders) - parallel
3. Task 2.1 (Show Command)
4. Task 2.2 (CLI Registration)
5. Testing & Documentation - parallel

### Risk Mitigation
- **Path Resolution Complexity**: Start with simple cases, add strategies incrementally
- **TypeScript Integration**: Test compilation early and often
- **File System Access**: Use mocks in tests to avoid file system dependencies

## Summary
- **Total Tasks**: 14
- **Phase 1 (Foundation)**: 4 tasks
- **Phase 2 (CLI Integration)**: 4 tasks
- **Phase 3 (Testing)**: 3 tasks
- **Phase 4 (Documentation)**: 3 tasks
- **Estimated Timeline**: 3-4 days total
- **Parallel Opportunities**: High in testing and documentation phases