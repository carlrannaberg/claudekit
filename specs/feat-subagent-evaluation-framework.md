# Subagent Evaluation Framework

**Status**: Draft  
**Authors**: Claude Code Assistant, 2025-08-26  
**Version**: 4.0.0 (Evalite with Vitest format)

## Overview

A lightweight evaluation framework that tests claudekit's slash commands and subagents by retrieving their actual prompts via `claudekit show` and testing them with Evalite using Vitest-style test definitions.

## Background/Problem Statement

Claudekit includes 30+ specialized subagents and numerous slash commands that need automated testing to ensure:
1. Correct tool usage (Task, Bash, Write, etc.)
2. Expected output patterns
3. Regression detection when prompts change

## Goals

- **Test Real Prompts**: Use `claudekit show` to get actual definitions
- **Vitest Format**: Write tests in familiar test syntax
- **Evalite Integration**: Leverage Evalite for LLM testing
- **Parallel Execution**: Run tests efficiently

## Non-Goals

- **YAML Configuration**: Use code-based tests instead
- **Complex Setup**: Keep testing simple
- **Part of Claudekit**: Separate evaluation package

## Technical Dependencies

- **Claudekit CLI**: `claudekit show` to retrieve prompts
- **Claude Code CLI**: `claude -p` to execute prompts
- **Evalite**: LLM testing framework with Vitest API
- **Node.js**: Runtime environment

## Detailed Design

### Test Structure with Evalite

```javascript
// eval/commands.eval.js
import { describe, it, expect } from 'evalite';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function testCommand(name, testInput, expectations) {
  // Get actual command prompt from claudekit
  const { stdout: prompt } = await execAsync(`claudekit show command ${name}`);
  
  // Replace $ARGUMENTS with test input
  const fullPrompt = prompt.replace('$ARGUMENTS', testInput);
  
  // Execute with Claude CLI
  const { stdout } = await execAsync(
    `claude -p "${fullPrompt}" --output-format json`
  );
  
  const result = JSON.parse(stdout);
  return result.result;
}

async function testAgent(name, testInput, expectations) {
  // Get actual agent prompt from claudekit
  const { stdout: prompt } = await execAsync(`claudekit show agent ${name}`);
  
  // Append test request
  const fullPrompt = `${prompt}\n\nUser request: ${testInput}`;
  
  // Execute with Claude CLI
  const { stdout } = await execAsync(
    `claude -p "${fullPrompt}" --output-format json`
  );
  
  const result = JSON.parse(stdout);
  return result.result;
}

describe('Claudekit Commands', () => {
  it('checkpoint:create should use git stash', async () => {
    const output = await testCommand(
      'checkpoint:create', 
      'before major refactoring'
    );
    
    expect(output).toContain('<invoke name="Bash">');
    expect(output).toContain('git stash');
  });
  
  it('spec:create should write specification', async () => {
    const output = await testCommand(
      'spec:create',
      'user authentication feature'
    );
    
    expect(output).toContain('<invoke name="Write">');
    expect(output).toContain('specs/feat-');
  }, { timeout: 45000 });
  
  it('git:commit should create smart commit', async () => {
    const output = await testCommand('git:commit', '');
    
    expect(output).toContain('<invoke name="Bash">');
    expect(output).toContain('git commit');
  });
  
  it('spec:validate should analyze completeness', async () => {
    const output = await testCommand(
      'spec:validate',
      'specs/feat-example.md'
    );
    
    expect(output).toContain('<invoke name="Read">');
    expect(output).toContain('completeness');
  });
});
```

```javascript
// eval/agents.eval.js
import { describe, it, expect } from 'evalite';

describe('Claudekit Agents', () => {
  describe('TypeScript Agents', () => {
    it('typescript-expert handles type errors', async () => {
      const output = await testAgent(
        'typescript-expert',
        'I have type errors with any types in my code'
      );
      
      expect(output).toContain('<invoke name="Task">');
      expect(output).toMatch(/typescript|type/i);
    });
    
    it('typescript-build-expert handles build config', async () => {
      const output = await testAgent(
        'typescript-build-expert',
        'TypeScript module resolution errors'
      );
      
      expect(output).toContain('<invoke name="Read">');
      expect(output).toContain('tsconfig');
    });
  });
  
  describe('React Agents', () => {
    it('react-expert helps with hooks', async () => {
      const output = await testAgent(
        'react-expert',
        'Create custom React hook for data fetching'
      );
      
      expect(output).toContain('<invoke name="Write">');
      expect(output).toMatch(/use[A-Z]/); // Custom hook pattern
    });
    
    it('react-performance-expert optimizes rendering', async () => {
      const output = await testAgent(
        'react-performance-expert',
        'My React app re-renders too frequently'
      );
      
      expect(output).toContain('<invoke name="Task">');
      expect(output).toMatch(/memo|useMemo|useCallback/);
    });
  });
  
  describe('Testing Agents', () => {
    it('jest-testing-expert configures Jest', async () => {
      const output = await testAgent(
        'jest-testing-expert',
        'Configure Jest for TypeScript with coverage'
      );
      
      expect(output).toContain('<invoke name="Write">');
      expect(output).toContain('jest.config');
    });
    
    it('vitest-testing-expert handles Vitest setup', async () => {
      const output = await testAgent(
        'vitest-testing-expert',
        'Set up Vitest for React components'
      );
      
      expect(output).toContain('<invoke name="Write">');
      expect(output).toContain('vitest.config');
    });
  });
  
  describe('Routing', () => {
    it('triage-expert routes to correct specialist', async () => {
      const output = await testAgent(
        'triage-expert',
        'I have webpack bundle size warnings'
      );
      
      expect(output).toContain('<invoke name="Task">');
      expect(output).toContain('webpack-expert');
    });
  });
});
```

### LLM Rubric Evaluation

```javascript
// eval/rubric.eval.js
import { describe, it } from 'evalite';

describe('Code Quality Agents with Rubric', () => {
  it('code-review-expert provides thorough analysis', async () => {
    const output = await testAgent(
      'code-review-expert',
      'Review this function for improvements'
    );
    
    // Use LLM rubric for qualitative assessment
    await expect(output).toMatchRubric({
      model: 'haiku',
      criteria: [
        {
          name: 'Identifies Issues',
          prompt: 'Does the response identify specific code issues?',
          weight: 0.5
        },
        {
          name: 'Provides Solutions',
          prompt: 'Does the response suggest concrete improvements?',
          weight: 0.5
        }
      ],
      threshold: 7
    });
  });
});
```

### Helper Utilities

```javascript
// eval/helpers.js
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function getClaudekitPrompt(type, name) {
  const cmd = type === 'command' 
    ? `claudekit show command ${name}`
    : `claudekit show agent ${name}`;
    
  const { stdout } = await execAsync(cmd);
  return stdout;
}

export async function executeWithClaude(prompt, options = {}) {
  const timeout = options.timeout || 30000;
  const model = options.model || 'default';
  
  const { stdout } = await execAsync(
    `claude -p "${prompt}" --output-format json`,
    { timeout }
  );
  
  return JSON.parse(stdout);
}

// Batch testing helper
export async function testBatch(tests) {
  const results = await Promise.all(
    tests.map(async test => {
      try {
        const output = await test.fn();
        return { 
          name: test.name, 
          passed: test.validate(output) 
        };
      } catch (error) {
        return { 
          name: test.name, 
          passed: false, 
          error: error.message 
        };
      }
    })
  );
  
  return results;
}
```

### Package Configuration

```json
{
  "name": "claudekit-eval",
  "version": "4.0.0",
  "type": "module",
  "scripts": {
    "eval": "evalite",
    "eval:commands": "evalite commands.eval.js",
    "eval:agents": "evalite agents.eval.js",
    "eval:watch": "evalite --watch",
    "eval:ui": "evalite --ui"
  },
  "devDependencies": {
    "evalite": "^1.0.0"
  }
}
```

### Evalite Configuration

```javascript
// evalite.config.js
export default {
  // Test files pattern
  testMatch: ['**/*.eval.js'],
  
  // Parallel execution
  parallel: 4,
  
  // Global timeout
  timeout: 30000,
  
  // Reporters
  reporters: ['default', 'json'],
  
  // Output file for JSON reporter
  outputFile: './eval-results.json',
  
  // Environment setup
  setup: './eval/setup.js'
};
```

## User Experience

### Running Tests

```bash
# Run all evaluation tests
npm run eval

# Run specific test file
npm run eval:commands

# Watch mode for development
npm run eval:watch

# Interactive UI
npm run eval:ui
```

### Expected Output

```
 ✓ commands.eval.js (4 tests) 12.4s
   ✓ Claudekit Commands
     ✓ checkpoint:create should use git stash (2.1s)
     ✓ spec:create should write specification (4.2s)
     ✓ git:commit should create smart commit (1.8s)
     ✓ spec:validate should analyze completeness (2.5s)
     
 ✓ agents.eval.js (7 tests) 18.2s
   ✓ TypeScript Agents
     ✓ typescript-expert handles type errors (2.3s)
     ✓ typescript-build-expert handles build config (2.1s)
   ✓ React Agents
     ✓ react-expert helps with hooks (3.1s)
     ✗ react-performance-expert optimizes rendering (2.8s)
       Expected output to contain "memo"
   ✓ Testing Agents
     ✓ jest-testing-expert configures Jest (2.5s)
     ✓ vitest-testing-expert handles Vitest setup (2.4s)
   ✓ Routing
     ✓ triage-expert routes to correct specialist (3.0s)

Test Files  2 passed (2)
     Tests  10 passed | 1 failed (11)
      Time  30.6s
```

## Testing Strategy

### Test Organization

```
eval/
├── commands.eval.js      # All command tests
├── agents.eval.js        # All agent tests
├── rubric.eval.js        # Tests with LLM rubrics
├── helpers.js            # Shared utilities
├── setup.js              # Global test setup
└── evalite.config.js     # Evalite configuration
```

### Coverage Goals

1. **Commands**: Test each slash command with typical usage
2. **Agents**: Test each agent's primary capability
3. **Routing**: Verify triage routes correctly
4. **Quality**: Use rubrics for subjective evaluation

## Implementation Phases

### Phase 1: Core Setup (1-2 days)
- Set up Evalite with basic configuration
- Create helper functions for claudekit integration
- Write tests for 5-10 key components

### Phase 2: Full Coverage (2-3 days)
- Write tests for all commands
- Write tests for all agents
- Add rubric evaluations where appropriate

### Phase 3: Optimization (1-2 days)
- Tune parallel execution
- Optimize test performance
- Add CI integration

## Benefits

- **Native Test Syntax**: Familiar Vitest API
- **No YAML Management**: All tests in code
- **Better IDE Support**: Full TypeScript/JavaScript tooling
- **Flexible Testing**: Easy to add custom logic
- **Real Prompts**: Tests actual claudekit components

## Open Questions

1. **Rate Limiting**: How many parallel Claude CLI calls allowed?
2. **Test Data**: How to handle tests that need specific file context?
3. **Flakiness**: How to handle non-deterministic outputs?

## References

- [Evalite Documentation](https://evalite.dev)
- [Vitest API](https://vitest.dev/api/)
- Claudekit show: `cli/commands/show.ts`
- Command definitions: `src/commands/`
- Agent definitions: `src/agents/`