import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { lintSubagentFile } from '../../../cli/lib/linters/subagents';

describe('subagents linter', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'subagent-lint-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('tools field validation', () => {
    it('should pass when tools field is omitted (inherits all)', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.valid).toBe(true);
      expect(result.warnings).not.toContain(
        expect.stringContaining('Empty tools field')
      );
    });

    it('should warn when tools field is empty (null)', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: 
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.warnings).toContain(
        'Empty tools field detected - this will grant NO tools. Remove the field entirely to inherit all tools, or specify tools explicitly'
      );
    });

    it('should warn when tools field has only a comment', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: # This should inherit all tools but doesn't
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.warnings).toContain(
        'Empty tools field detected - this will grant NO tools. Remove the field entirely to inherit all tools, or specify tools explicitly'
      );
    });

    it('should pass when tools are explicitly specified', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: Read, Grep, Bash
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.valid).toBe(true);
      expect(result.warnings).not.toContain(
        expect.stringContaining('Empty tools field')
      );
    });

    it('should warn when tools field is empty string', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: ""
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.warnings).toContain(
        'Empty tools field detected - this will grant NO tools. Remove the field entirely to inherit all tools, or specify tools explicitly'
      );
    });

    it('should warn when tools field has only whitespace', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: "   "
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.warnings).toContain(
        'Empty tools field detected - this will grant NO tools. Remove the field entirely to inherit all tools, or specify tools explicitly'
      );
    });

    it('should error when tools is an array instead of string', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: [Read, Grep, Bash]
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.errors).toContain('tools field must be a comma-separated string, not an array');
    });

    it('should warn about unknown tools', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: Read, UnknownTool, Bash
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.warnings.some(w => w.includes('Unknown tool: UnknownTool'))).toBe(true);
    });
  });

  describe('required fields validation', () => {
    it('should error when name field is missing', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
description: Test agent for validation
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
    });

    it('should error when description field is missing', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: description');
    });
  });

  describe('file without frontmatter', () => {
    it('should return valid for files without frontmatter (like README)', async () => {
      const filePath = path.join(tempDir, 'README.md');
      await fs.writeFile(
        filePath,
        `# README

This is just a regular markdown file without frontmatter.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('additional fields', () => {
    it('should accept model field but warn about universal and defaultSelected', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: Read, Grep
universal: true
defaultSelected: false
model: opus
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      // With strict mode, unrecognized fields make it invalid
      expect(result.valid).toBe(false);
      // universal and defaultSelected should be flagged as unrecognized
      expect(result.unusedFields).toContain('universal');
      expect(result.unusedFields).toContain('defaultSelected');
      expect(result.warnings.some(w => w.includes('Unrecognized fields'))).toBe(true);
    });

    it('should accept model field without warnings', async () => {
      const filePath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(
        filePath,
        `---
name: test-agent
description: Test agent for validation
tools: Read, Grep
model: opus
---

Agent content here.`
      );

      const result = await lintSubagentFile(filePath);
      expect(result.valid).toBe(true);
      expect(result.unusedFields).toHaveLength(0);
      expect(result.warnings.filter(w => w.includes('Unrecognized'))).toHaveLength(0);
    });
  });
});