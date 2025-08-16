/**
 * Comprehensive tests for CommandLoader class
 * 
 * Purpose: Validate that CommandLoader correctly loads command definitions from markdown files,
 * handles namespaced commands, parses frontmatter (especially allowed-tools), and provides proper error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { CommandLoader } from '../../../cli/lib/loaders/command-loader.js';
import { TestFileSystem } from '../../utils/test-helpers.js';
import * as paths from '../../../cli/lib/paths.js';

describe('CommandLoader', () => {
  let testFs: TestFileSystem;
  let tempDir: string;
  let commandsDir: string;

  beforeEach(async () => {
    testFs = new TestFileSystem();
    tempDir = await testFs.createTempDir();
    commandsDir = path.join(tempDir, 'src', 'commands');
    await fs.mkdir(commandsDir, { recursive: true });
    
    // Create .claude directory for project-level commands
    const projectClaudeDir = path.join(tempDir, '.claude', 'commands');
    await fs.mkdir(projectClaudeDir, { recursive: true });
    
    // Mock the path functions to use our test directories
    vi.spyOn(paths, 'getProjectClaudeDirectory').mockReturnValue(path.join(tempDir, '.claude'));
    vi.spyOn(paths, 'getUserClaudeDirectory').mockReturnValue(path.join(tempDir, 'user-claude'));
    vi.spyOn(paths, 'findComponentsDirectory').mockResolvedValue(path.join(tempDir, 'src'));
  });

  afterEach(async () => {
    await testFs.cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // Helper function to create a test CommandLoader that uses our test directory
  const createTestLoader = (): CommandLoader => {
    return new CommandLoader();
  };

  describe('constructor', () => {
    it('should initialize successfully when command directories exist', () => {
      // Purpose: Verify constructor properly initializes with valid search paths
      const loader = createTestLoader();
      expect(loader).toBeInstanceOf(CommandLoader);
    });
  });

  describe('loadCommand', () => {
    describe('namespaced command loading', () => {
      it('should load namespaced command (e.g., "spec:create")', async () => {
        // Purpose: Test namespaced command loading with colon notation
        const specDir = path.join(commandsDir, 'spec');
        await fs.mkdir(specDir, { recursive: true });

        const commandContent = `---
description: Generate a spec file for a new feature or bugfix
category: validation
allowed-tools: Read, Write, Grep, Glob, TodoWrite, Task
argument-hint: "<feature-or-bugfix-description>"
---

# Spec Create Command

Generate comprehensive specification documents.`;

        await fs.writeFile(path.join(specDir, 'create.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('spec:create');

        expect(result).toEqual({
          id: 'spec:create',
          name: 'create',
          description: 'Generate a spec file for a new feature or bugfix',
          category: 'validation',
          allowedTools: ['Read', 'Write', 'Grep', 'Glob', 'TodoWrite', 'Task'],
          argumentHint: '<feature-or-bugfix-description>',
          content: '# Spec Create Command\n\nGenerate comprehensive specification documents.',
          filePath: path.join(specDir, 'create.md')
        });
      });

      it('should load nested namespaced commands', async () => {
        // Purpose: Test deeply nested command directory structure
        const nestedDir = path.join(commandsDir, 'git', 'workflow');
        await fs.mkdir(nestedDir, { recursive: true });

        const commandContent = `---
description: Advanced git workflow command
allowed-tools: ["Bash", "Read"]
---

# Git Workflow Command`;

        await fs.writeFile(path.join(nestedDir, 'advanced.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('git:workflow/advanced');

        expect(result.id).toBe('git:workflow/advanced');
        expect(result.name).toBe('advanced');
        expect(result.description).toBe('Advanced git workflow command');
      });
    });

    describe('simple command loading', () => {
      it('should load simple command (e.g., "validate-and-fix")', async () => {
        // Purpose: Test direct file matching for simple command names
        const commandContent = `---
description: Run quality checks and automatically fix issues using concurrent agents
category: workflow
allowed-tools: Bash, Task, TodoWrite, Read, Edit, MultiEdit
---

# Validate and Fix

Run quality checks and automatically fix discovered issues.`;

        await fs.writeFile(path.join(commandsDir, 'validate-and-fix.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('validate-and-fix');

        expect(result).toEqual({
          id: 'validate-and-fix',
          name: 'validate-and-fix',
          description: 'Run quality checks and automatically fix issues using concurrent agents',
          category: 'workflow',
          allowedTools: ['Bash', 'Task', 'TodoWrite', 'Read', 'Edit', 'MultiEdit'],
          argumentHint: undefined,
          content: '# Validate and Fix\n\nRun quality checks and automatically fix discovered issues.',
          filePath: path.join(commandsDir, 'validate-and-fix.md')
        });
      });

      it('should handle commands with minimal frontmatter', async () => {
        // Purpose: Ensure loader provides sensible defaults for missing frontmatter fields
        const commandContent = `---
description: Basic command
---

# Basic Command
Just the essentials.`;

        await fs.writeFile(path.join(commandsDir, 'basic.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('basic');

        expect(result.description).toBe('Basic command');
        expect(result.category).toBeUndefined();
        expect(result.allowedTools).toEqual([]);
        expect(result.argumentHint).toBeUndefined();
        expect(result.content).toBe('# Basic Command\nJust the essentials.');
      });
    });

    describe('parseAllowedTools', () => {
      it('should parse allowed-tools as string format', async () => {
        // Purpose: Test parsing of comma-separated string format for allowed-tools
        const commandContent = `---
description: Command with string tools
allowed-tools: Read, Write, Bash, Edit
---

# String Tools Command`;

        await fs.writeFile(path.join(commandsDir, 'string-tools.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('string-tools');

        expect(result.allowedTools).toEqual(['Read', 'Write', 'Bash', 'Edit']);
      });

      it('should parse allowed-tools as array format', async () => {
        // Purpose: Test parsing of YAML array format for allowed-tools
        const commandContent = `---
description: Command with array tools
allowed-tools: ["Bash", "Read", "TodoWrite", "Task"]
---

# Array Tools Command`;

        await fs.writeFile(path.join(commandsDir, 'array-tools.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('array-tools');

        expect(result.allowedTools).toEqual(['Bash', 'Read', 'TodoWrite', 'Task']);
      });

      it('should handle complex tool specifications', async () => {
        // Purpose: Test parsing of complex tool patterns like Bash(git:*)
        const commandContent = `---
description: Command with complex tools
allowed-tools: Bash(git:*), Read, Write, Bash(npm:*)
---

# Complex Tools Command`;

        await fs.writeFile(path.join(commandsDir, 'complex-tools.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('complex-tools');

        expect(result.allowedTools).toEqual(['Bash(git:*)', 'Read', 'Write', 'Bash(npm:*)']);
      });

      it('should handle whitespace in allowed-tools string', async () => {
        // Purpose: Test proper trimming of whitespace in tool lists
        const commandContent = `---
description: Command with messy spacing
allowed-tools: "  Read  ,  Write,Bash  , Edit  "
---

# Messy Spacing Command`;

        await fs.writeFile(path.join(commandsDir, 'messy-spacing.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('messy-spacing');

        expect(result.allowedTools).toEqual(['Read', 'Write', 'Bash', 'Edit']);
      });

      it('should handle empty allowed-tools', async () => {
        // Purpose: Test behavior when allowed-tools is null, undefined, or empty
        const commandContent = `---
description: Command with no tools
allowed-tools: 
---

# No Tools Command`;

        await fs.writeFile(path.join(commandsDir, 'no-tools.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('no-tools');

        expect(result.allowedTools).toEqual([]);
      });

      it('should filter out empty tool entries', async () => {
        // Purpose: Test filtering of empty strings in tool lists
        const commandContent = `---
description: Command with empty entries
allowed-tools: "Read, , Write, , Bash"
---

# Empty Entries Command`;

        await fs.writeFile(path.join(commandsDir, 'empty-entries.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('empty-entries');

        expect(result.allowedTools).toEqual(['Read', 'Write', 'Bash']);
      });
    });

    describe('recursive command search', () => {
      it('should find commands through recursive search', async () => {
        // Purpose: Test recursive directory traversal for command discovery
        const deepDir = path.join(commandsDir, 'deep', 'nested', 'structure');
        await fs.mkdir(deepDir, { recursive: true });

        const commandContent = `---
description: Deeply nested command
allowed-tools: Read
---

# Deep Command`;

        await fs.writeFile(path.join(deepDir, 'deep-command.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('deep-command');

        expect(result.id).toBe('deep-command');
        expect(result.name).toBe('deep-command');
        expect(result.filePath).toBe(path.join(deepDir, 'deep-command.md'));
      });

      it('should prefer direct matches over recursive matches', async () => {
        // Purpose: Test search priority - direct match should win over recursive
        const directContent = `---
description: Direct match command
allowed-tools: Read
---

# Direct Command`;

        const nestedDir = path.join(commandsDir, 'nested');
        await fs.mkdir(nestedDir, { recursive: true });

        const nestedContent = `---
description: Nested command
allowed-tools: Write
---

# Nested Command`;

        await fs.writeFile(path.join(commandsDir, 'priority-test.md'), directContent);
        await fs.writeFile(path.join(nestedDir, 'priority-test.md'), nestedContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('priority-test');

        expect(result.description).toBe('Direct match command');
        expect(result.filePath).toBe(path.join(commandsDir, 'priority-test.md'));
      });
    });

    describe('command name derivation', () => {
      it('should derive name from filename without extension', async () => {
        // Purpose: Test that command name is correctly derived from filename
        const commandContent = `---
description: Test command naming
---

# Command`;

        await fs.writeFile(path.join(commandsDir, 'complex-command-name.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('complex-command-name');

        expect(result.name).toBe('complex-command-name');
        expect(result.id).toBe('complex-command-name');
      });

      it('should handle filenames with multiple dots', async () => {
        // Purpose: Test filename handling with multiple dots
        const commandContent = `---
description: Command with dots in name
---

# Dotted Command`;

        await fs.writeFile(path.join(commandsDir, 'my.special.command.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('my.special.command');

        expect(result.name).toBe('my.special.command');
      });
    });

    describe('content processing', () => {
      it('should trim whitespace from content', async () => {
        // Purpose: Verify content processing removes leading/trailing whitespace
        const commandContent = `---
description: Whitespace test
---

    
# Command Content
Some content here.
    
    `;

        await fs.writeFile(path.join(commandsDir, 'whitespace-test.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('whitespace-test');

        expect(result.content).toBe('# Command Content\nSome content here.');
        expect(result.content).not.toMatch(/^\s+/);
        expect(result.content).not.toMatch(/\s+$/);
      });

      it('should preserve internal content formatting', async () => {
        // Purpose: Ensure content formatting within the document is preserved
        const commandContent = `---
description: Formatting test
---

# Command Title

## Section 1
- Item 1
- Item 2

\`\`\`bash
echo "test"
\`\`\`

Regular paragraph with **bold** text.`;

        await fs.writeFile(path.join(commandsDir, 'formatting-test.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('formatting-test');

        expect(result.content).toContain('# Command Title');
        expect(result.content).toContain('## Section 1');
        expect(result.content).toContain('```bash');
        expect(result.content).toContain('**bold**');
      });
    });

    describe('error handling', () => {
      it('should throw error for non-existent command', async () => {
        // Purpose: Verify proper error handling when command file doesn't exist
        const loader = createTestLoader();
        await expect(loader.loadCommand('non-existent-command')).rejects.toThrow('Command not found: non-existent-command');
      });

      it('should handle file system permission errors', async () => {
        // Purpose: Test graceful handling of file system access issues
        const commandPath = path.join(commandsDir, 'permission-test.md');
        await fs.writeFile(commandPath, 'content');

        // Mock fs.readFile to simulate permission error
        vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Permission denied'));

        const loader = createTestLoader();
        await expect(loader.loadCommand('permission-test')).rejects.toThrow('Permission denied');
      });

      it('should handle corrupted file content', async () => {
        // Purpose: Ensure loader handles files that can't be parsed gracefully
        const commandPath = path.join(commandsDir, 'corrupted.md');
        // Create a file with invalid UTF-8 content
        await fs.writeFile(commandPath, Buffer.from([0xFF, 0xFE, 0xFD]));

        const loader = createTestLoader();
        // The loader now gracefully handles corrupted content by treating
        // the entire file as content when frontmatter parsing fails
        const result = await loader.loadCommand('corrupted');
        expect(result).toBeDefined();
        expect(result.id).toBe('corrupted');
        // Content will be the raw file data (possibly with replacement chars for invalid UTF-8)
        expect(result.content).toBeDefined();
      });

      it('should handle malformed frontmatter gracefully', async () => {
        // Purpose: Test behavior with invalid YAML frontmatter
        const commandContent = `---
description: "Unclosed quote
allowed-tools: broken yaml
---

# Malformed Command`;

        await fs.writeFile(path.join(commandsDir, 'malformed.md'), commandContent);

        const loader = createTestLoader();
        // The loader now gracefully handles malformed frontmatter by treating
        // the entire file as content when YAML parsing fails
        const result = await loader.loadCommand('malformed');
        expect(result.id).toBe('malformed');
        expect(result.name).toBe('malformed');
        expect(result.description).toBe(''); // No frontmatter parsed
        expect(result.allowedTools).toEqual([]);
        // Content includes the entire file since frontmatter couldn't be parsed
        expect(result.content).toContain('# Malformed Command');
      });
    });

    describe('edge cases', () => {
      it('should handle empty markdown files', async () => {
        // Purpose: Test behavior with empty command files
        await fs.writeFile(path.join(commandsDir, 'empty.md'), '');

        const loader = createTestLoader();
        const result = await loader.loadCommand('empty');

        expect(result.id).toBe('empty');
        expect(result.name).toBe('empty');
        expect(result.description).toBe('');
        expect(result.allowedTools).toEqual([]);
        expect(result.content).toBe('');
      });

      it('should handle files with only frontmatter', async () => {
        // Purpose: Test files with frontmatter but no content
        const commandContent = `---
description: Only frontmatter
allowed-tools: Read
---`;

        await fs.writeFile(path.join(commandsDir, 'frontmatter-only.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('frontmatter-only');

        expect(result.description).toBe('Only frontmatter');
        expect(result.content).toBe('');
      });

      it('should handle files with no frontmatter', async () => {
        // Purpose: Test markdown files without YAML frontmatter
        const commandContent = `# No Frontmatter Command

This command has no frontmatter section.`;

        await fs.writeFile(path.join(commandsDir, 'no-frontmatter.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('no-frontmatter');

        expect(result.id).toBe('no-frontmatter');
        expect(result.name).toBe('no-frontmatter');
        expect(result.description).toBe('');
        expect(result.allowedTools).toEqual([]);
        expect(result.content).toBe('# No Frontmatter Command\n\nThis command has no frontmatter section.');
      });

      it('should handle complex namespaced command IDs', async () => {
        // Purpose: Test handling of complex namespace patterns
        const complexDir = path.join(commandsDir, 'namespace', 'sub', 'deep');
        await fs.mkdir(complexDir, { recursive: true });

        const commandContent = `---
description: Complex namespaced command
allowed-tools: Read
---

# Complex Command`;

        await fs.writeFile(path.join(complexDir, 'command.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('namespace:sub/deep/command');

        expect(result.id).toBe('namespace:sub/deep/command');
        expect(result.name).toBe('command');
      });
    });

    describe('comprehensive frontmatter parsing', () => {
      it('should parse all frontmatter fields correctly', async () => {
        // Purpose: Validate comprehensive frontmatter parsing including all supported fields
        const commandContent = `---
description: Comprehensive command with all fields
category: testing
allowed-tools: ["Read", "Write", "Bash(git:*)", "Edit"]
argument-hint: "<comprehensive-args>"
---

# Comprehensive Command
This command has all possible frontmatter fields.`;

        await fs.writeFile(path.join(commandsDir, 'comprehensive.md'), commandContent);

        const loader = createTestLoader();
        const result = await loader.loadCommand('comprehensive');

        expect(result).toEqual({
          id: 'comprehensive',
          name: 'comprehensive',
          description: 'Comprehensive command with all fields',
          category: 'testing',
          allowedTools: ['Read', 'Write', 'Bash(git:*)', 'Edit'],
          argumentHint: '<comprehensive-args>',
          content: '# Comprehensive Command\nThis command has all possible frontmatter fields.',
          filePath: path.join(commandsDir, 'comprehensive.md')
        });
      });
    });
  });
});