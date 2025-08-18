/**
 * Integration tests for claudekit show command CLI functionality
 * 
 * Tests the complete end-to-end flow through the CLI for show commands,
 * verifying output formats, error handling, and CLI behavior.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import path from 'path';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { TestFileSystem } from '../utils/test-helpers.js';
import type { AgentDefinition, CommandDefinition } from '../../cli/lib/loaders/types.js';

// Helper to run CLI commands and capture output
async function runCliCommand(
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    input?: string;
  } = {}
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    // Always use absolute path to CLI script from the test directory
    const cliPath = path.join(process.cwd(), 'cli/cli.ts');
    const child = spawn('npx', ['tsx', cliPath, ...args], {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Filter out npm notices from stderr (these are not actual errors)
      const stderrLines = stderr.trim().split('\n');
      const filteredStderr = stderrLines
        .filter(line => !line.includes('npm notice') && line.trim() !== '')
        .join('\n');
      
      resolve({
        exitCode: code ?? 0,
        stdout: stdout.trim(),
        stderr: filteredStderr,
      });
    });

    if (options.input !== undefined && options.input !== '') {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

describe('CLI show command integration', () => {
  let testFs: TestFileSystem;

  beforeEach(async () => {
    testFs = new TestFileSystem();

    // Create tmp directories for test files
    await fs.mkdir(path.join(process.cwd(), 'src/agents/tmp'), { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'src/commands/tmp'), { recursive: true });

    // Create temporary test agents in tmp directory
    await testFs.writeFile(
      path.join(process.cwd(), 'src/agents/tmp/test-integration-agent.md'),
      `---
name: test-integration-agent
description: A test agent for CLI integration testing
category: testing
displayName: Test Integration Agent
color: blue
tools: Read, Bash
---

# Test Integration Agent

This is a test agent used for CLI integration testing.

It demonstrates:
- Agent metadata parsing
- Content extraction
- CLI output formatting

## Instructions

When invoked, this agent should provide testing functionality.
`
    );

    await testFs.writeFile(
      path.join(process.cwd(), 'src/commands/tmp/test-integration-command.md'),
      `---
description: Test command for CLI integration testing
category: testing
allowed-tools: Read, Write
argument-hint: "[optional-arg]"
---

# Test Integration Command

This is a test command for CLI integration testing.

Execute with: \`/test-integration-command [optional-arg]\`

Steps:
1. Parse the arguments: $ARGUMENTS
2. Perform test operations
3. Report results
`
    );
  });

  afterEach(async () => {
    // Clean up test files
    await testFs.cleanup();
    
    // Clean up tmp directories with all test files
    try {
      await fs.rm(path.join(process.cwd(), 'src/agents/tmp'), { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
    
    try {
      await fs.rm(path.join(process.cwd(), 'src/commands/tmp'), { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  afterAll(async () => {
    // Final cleanup of any remaining test directories
    const testDirs = [
      'src/agents/tmp',
      'src/agents/tmp-special-chars',
      'src/agents/tmp-corrupted',
      'src/commands/tmp'
    ];
    
    for (const dir of testDirs) {
      try {
        await fs.rm(path.join(process.cwd(), dir), { recursive: true, force: true });
      } catch {
        // Ignore if directory doesn't exist
      }
    }
  });

  describe('show agent command', () => {
    it('should display agent content in text format by default', async () => {
      // Purpose: Verify that the default text output shows only the agent content
      // without JSON metadata, making it suitable for human reading and piping.
      const result = await runCliCommand(['show', 'agent', 'test-integration-agent']);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Should contain the markdown content without frontmatter
      expect(result.stdout).toContain('# Test Integration Agent');
      expect(result.stdout).toContain('This is a test agent used for CLI integration testing');
      expect(result.stdout).toContain('## Instructions');
      
      // Should NOT contain frontmatter metadata in text mode
      expect(result.stdout).not.toContain('---');
      expect(result.stdout).not.toContain('name: test-integration-agent');
      expect(result.stdout).not.toContain('category: testing');
    });

    it('should display agent content in JSON format when requested', async () => {
      // Purpose: Verify that JSON format provides complete agent metadata
      // for programmatic consumption while ensuring valid JSON structure.
      const result = await runCliCommand(['show', 'agent', 'test-integration-agent', '--format', 'json']);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      // Should be valid JSON
      const agentData: AgentDefinition = JSON.parse(result.stdout) as AgentDefinition;

      // Should contain all expected metadata fields
      expect(agentData).toMatchObject({
        id: 'test-integration-agent',
        name: 'test-integration-agent',
        description: 'A test agent for CLI integration testing',
        category: 'testing',
        displayName: 'Test Integration Agent',
        color: 'blue',
      });
      
      // Tools field should be undefined when specified as string in frontmatter
      // (the current parser doesn't convert comma-separated strings to arrays)
      expect(agentData.tools).toBeUndefined();

      // Should contain the content without frontmatter
      expect(agentData.content).toContain('# Test Integration Agent');
      expect(agentData.content).not.toContain('---');

      // Should include file path
      expect(agentData.filePath).toContain('test-integration-agent.md');
    });

    it('should handle agents with complex metadata correctly', async () => {
      // Purpose: Verify that agents with more complex frontmatter are parsed
      // correctly and all metadata fields are preserved in JSON output.
      const result = await runCliCommand(['show', 'agent', 'typescript-expert', '-f', 'json'], {
      });

      expect(result.exitCode).toBe(0);
      
      const agentData = JSON.parse(result.stdout);
      expect(agentData).toMatchObject({
        id: 'typescript-expert',
        name: 'typescript-expert',
        description: 'TypeScript and JavaScript expert with deep knowledge of type-level programming, performance optimization, monorepo management, migration strategies, and modern tooling. Use PROACTIVELY for any TypeScript/JavaScript issues including complex type gymnastics, build performance, debugging, and architectural decisions. If a specialized expert is a better fit, I will recommend switching and stop.',
        category: 'framework',
        displayName: 'TypeScript',
        color: 'blue',
      });

      // Should have bundle field
      expect(agentData.bundle).toEqual(['typescript-type-expert', 'typescript-build-expert']);
    });

    it('should return error for non-existent agent', async () => {
      // Purpose: Verify that attempting to show a non-existent agent provides
      // a helpful error message and proper exit code for script error handling.
      const result = await runCliCommand(['show', 'agent', 'non-existent-agent'], {
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain("Try 'claudekit list agents' to see available agents");
    });

    it('should handle text output that can be piped cleanly', async () => {
      // Purpose: Verify that text output is clean and suitable for piping
      // to other commands without extraneous formatting or metadata.
      const result = await runCliCommand(['show', 'agent', 'test-integration-agent'], {
      });

      expect(result.exitCode).toBe(0);
      
      // Should not have any console.log artifacts or formatting
      const lines = result.stdout.split('\n');
      expect(lines[0]).toBe('# Test Integration Agent');
      
      // Should be pure markdown content
      expect(result.stdout).not.toContain('[object Object]');
      expect(result.stdout).not.toContain('undefined');
      expect(result.stdout).not.toContain('null');
    });
  });

  describe('show command command', () => {
    it('should display command content in text format by default', async () => {
      // Purpose: Verify that command content is displayed cleanly without
      // frontmatter metadata, suitable for understanding command purpose.
      const result = await runCliCommand(['show', 'command', 'test-integration-command'], {
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Should contain the markdown content without frontmatter
      expect(result.stdout).toContain('# Test Integration Command');
      expect(result.stdout).toContain('This is a test command for CLI integration testing');
      expect(result.stdout).toContain('Execute with:');
      expect(result.stdout).toContain('$ARGUMENTS');
      
      // Should NOT contain frontmatter metadata in text mode
      expect(result.stdout).not.toContain('---');
      expect(result.stdout).not.toContain('description: Test command');
      expect(result.stdout).not.toContain('allowed-tools:');
    });

    it('should display command content in JSON format when requested', async () => {
      // Purpose: Verify that JSON format provides complete command metadata
      // including allowed tools and argument hints for programmatic use.
      const result = await runCliCommand(['show', 'command', 'test-integration-command', '--format', 'json'], {
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      // Should be valid JSON
      const commandData: CommandDefinition = JSON.parse(result.stdout) as CommandDefinition;

      // Should contain all expected metadata fields
      expect(commandData).toMatchObject({
        id: 'test-integration-command',
        name: 'test-integration-command',
        description: 'Test command for CLI integration testing',
        category: 'testing',
        allowedTools: ['Read', 'Write'],
        argumentHint: '[optional-arg]',
      });

      // Should contain the content without frontmatter
      expect(commandData.content).toContain('# Test Integration Command');
      expect(commandData.content).not.toContain('---');

      // Should include file path
      expect(commandData.filePath).toContain('test-integration-command.md');
    });

    it('should handle namespaced commands correctly', async () => {
      // Purpose: Verify that commands with namespace separators (git:status)
      // are loaded correctly from subdirectory structure.
      const result = await runCliCommand(['show', 'command', 'git:status', '-f', 'json'], {
      });

      expect(result.exitCode).toBe(0);
      
      const commandData = JSON.parse(result.stdout);
      expect(commandData).toMatchObject({
        id: 'git:status',
        name: 'status',
        description: 'Intelligently analyze git status and provide insights about current project state',
        category: 'workflow',
        allowedTools: ['Bash(git:*)'],
      });

      expect(commandData.content).toContain('Analyze the current git status and provide an intelligent summary');
      expect(commandData.filePath).toContain(path.join('git', 'status.md'));
    });

    it('should return error for non-existent command', async () => {
      // Purpose: Verify that attempting to show a non-existent command provides
      // a helpful error message and proper exit code for script error handling.
      const result = await runCliCommand(['show', 'command', 'non-existent-command'], {
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain("Try 'claudekit list commands' to see available commands");
    });

    it('should handle command content that can be piped cleanly', async () => {
      // Purpose: Verify that command text output is clean and suitable for
      // piping to other commands or processing tools.
      const result = await runCliCommand(['show', 'command', 'test-integration-command'], {
      });

      expect(result.exitCode).toBe(0);
      
      // Should be pure markdown content
      const lines = result.stdout.split('\n');
      expect(lines[0]).toBe('# Test Integration Command');
      
      // Should not have any artifacts
      expect(result.stdout).not.toContain('[object Object]');
      expect(result.stdout).not.toContain('undefined');
      expect(result.stdout).not.toContain('null');
    });
  });

  describe('format option handling', () => {
    it('should accept -f as shorthand for --format', async () => {
      // Purpose: Verify that the shorthand format option works identically
      // to the long form for user convenience.
      const longResult = await runCliCommand(['show', 'agent', 'test-integration-agent', '--format', 'json'], {
      });
      
      const shortResult = await runCliCommand(['show', 'agent', 'test-integration-agent', '-f', 'json'], {
      });

      expect(longResult.exitCode).toBe(0);
      expect(shortResult.exitCode).toBe(0);
      expect(longResult.stdout).toBe(shortResult.stdout);
    });

    it('should default to text format when format is not specified', async () => {
      // Purpose: Verify that omitting the format option defaults to text mode
      // for human-readable output.
      const result = await runCliCommand(['show', 'agent', 'test-integration-agent'], {
      });

      expect(result.exitCode).toBe(0);
      
      // Should be text format (starts with markdown heading)
      expect(result.stdout).toMatch(/^# Test Integration Agent/);
      
      // Should not be JSON (would start with {)
      expect(result.stdout).not.toMatch(/^\s*{/);
    });

    it('should handle invalid format gracefully', async () => {
      // Purpose: Verify that invalid format options are handled gracefully
      // rather than causing crashes or unclear behavior.
      const result = await runCliCommand(['show', 'agent', 'test-integration-agent', '--format', 'xml'], {
      });

      // Should either error cleanly or default to text format
      // (depending on implementation - both are acceptable)
      if (result.exitCode !== 0) {
        expect(result.stderr).toContain('format');
      } else {
        // If it defaults to text, should show content
        expect(result.stdout).toContain('# Test Integration Agent');
      }
    });
  });

  describe('output validation', () => {
    it('should produce valid JSON that can be parsed programmatically', async () => {
      // Purpose: Verify that JSON output is valid and can be consumed by
      // other tools and scripts for automation purposes.
      const agentResult = await runCliCommand(['show', 'agent', 'test-integration-agent', '-f', 'json'], {
      });
      
      const commandResult = await runCliCommand(['show', 'command', 'test-integration-command', '-f', 'json'], {
      });

      expect(agentResult.exitCode).toBe(0);
      expect(commandResult.exitCode).toBe(0);

      // Both should be valid JSON
      const agentData: AgentDefinition = JSON.parse(agentResult.stdout) as AgentDefinition;
      const commandData: CommandDefinition = JSON.parse(commandResult.stdout) as CommandDefinition;

      // Should have expected structure
      expect(typeof agentData).toBe('object');
      expect(typeof commandData).toBe('object');
      expect(agentData.id).toBe('test-integration-agent');
      expect(commandData.id).toBe('test-integration-command');
    });

    it('should not mix stdout and stderr in successful operations', async () => {
      // Purpose: Verify that successful operations only output to stdout,
      // ensuring clean output suitable for piping and processing.
      const textResult = await runCliCommand(['show', 'agent', 'test-integration-agent'], {
      });
      
      const jsonResult = await runCliCommand(['show', 'agent', 'test-integration-agent', '-f', 'json'], {
      });

      expect(textResult.exitCode).toBe(0);
      expect(jsonResult.exitCode).toBe(0);
      
      // Successful operations should not output to stderr
      expect(textResult.stderr).toBe('');
      expect(jsonResult.stderr).toBe('');
      
      // Should have content in stdout
      expect(textResult.stdout.length).toBeGreaterThan(0);
      expect(jsonResult.stdout.length).toBeGreaterThan(0);
    });

    it('should handle special characters in content correctly', async () => {
      // Purpose: Verify that content with special characters, quotes, and
      // formatting is handled correctly in both text and JSON modes.
      
      // Create a unique subdirectory for this test
      const testDir = path.join(process.cwd(), 'src/agents/tmp-special-chars');
      await fs.mkdir(testDir, { recursive: true });
      
      // Create agent with special characters
      await testFs.writeFile(
        path.join(testDir, 'special-chars.md'),
        `---
name: special-chars
description: "Agent with special chars: quotes, newlines, and Unicode 🚀"
category: testing
---

# Special Characters Test

This content has:
- "Double quotes"
- 'Single quotes'
- \`Backticks\`
- Unicode: 🚀 ✨ 🎯
- Line breaks and formatting

## Code Example

\`\`\`javascript
const example = "Hello, world!";
console.log(example);
\`\`\`
`
      );

      const textResult = await runCliCommand(['show', 'agent', 'special-chars']);
      
      const jsonResult = await runCliCommand(['show', 'agent', 'special-chars', '-f', 'json']);

      expect(textResult.exitCode).toBe(0);
      expect(jsonResult.exitCode).toBe(0);

      // Text should preserve all formatting
      expect(textResult.stdout).toContain('🚀 ✨ 🎯');
      expect(textResult.stdout).toContain('"Double quotes"');
      expect(textResult.stdout).toContain('```javascript');

      // JSON should be valid and preserve content
      const agentData = JSON.parse(jsonResult.stdout);
      expect(agentData.description).toContain('🚀');
      expect(agentData.content).toContain('Unicode: 🚀 ✨ 🎯');
      expect(agentData.content).toContain('"Double quotes"');
      
      // Clean up test-specific directory
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle corrupted agent files gracefully', async () => {
      // Purpose: Verify that corrupted or malformed agent files produce
      // clear error messages rather than crashing the CLI.
      
      // Create a unique subdirectory for this test
      const testDir = path.join(process.cwd(), 'src/agents/tmp-corrupted');
      await fs.mkdir(testDir, { recursive: true });
      
      // Create malformed agent file
      await testFs.writeFile(
        path.join(testDir, 'corrupted.md'),
        `---
name: corrupted
description: This frontmatter is not closed properly
category: testing
# Missing closing ---

# Corrupted Agent

This file has malformed frontmatter.
`
      );

      const result = await runCliCommand(['show', 'agent', 'corrupted'], {
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
      // Should suggest listing available agents
      expect(result.stderr).toContain("Try 'claudekit list agents'");
      
      // Clean up test-specific directory
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should handle empty agent directory gracefully', async () => {
      // Purpose: Verify that attempting to show agents when none exist
      // provides helpful guidance rather than confusing errors.
      
      // Create empty temp directory
      const emptyDir = await testFs.createTempDir();
      await testFs.createFileStructure(emptyDir, {
        '.claude': {
          agents: {},
        },
      });

      const result = await runCliCommand(['show', 'agent', 'any-agent'], {
        cwd: emptyDir,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain("Try 'claudekit list agents'");
    });

    it('should handle missing .claude directory gracefully', async () => {
      // Purpose: Verify that running show commands in directories without
      // claudekit setup provides helpful error messages.
      
      const bareDir = await testFs.createTempDir();

      const result = await runCliCommand(['show', 'agent', 'test-agent'], {
        cwd: bareDir,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
    });
  });
});