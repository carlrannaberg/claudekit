/**
 * Tests for the validate command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { validate } from '@/commands/validate.js';
import {
  TestFileSystem,
  // TestAssertions, // Removed unused import
  CommandTestHelper,
  ConsoleTestHelper,
} from '@tests/utils/test-helpers.js';

// Mock external dependencies
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}));

vi.mock('chalk', () => {
  interface ChalkInstance {
    (text: string): string;
    bold: ChalkInstance;
    dim: ChalkInstance;
    italic: ChalkInstance;
    underline: ChalkInstance;
    green: ChalkInstance;
    red: ChalkInstance;
    yellow: ChalkInstance;
    blue: ChalkInstance;
    gray: ChalkInstance;
  }

  const createChainableInstance = (): ChalkInstance => {
    const mock: ChalkInstance = ((text: string) => text) as ChalkInstance;
    mock.bold = createChainableInstance();
    mock.dim = createChainableInstance();
    mock.italic = createChainableInstance();
    mock.underline = createChainableInstance();
    mock.green = createChainableInstance();
    mock.red = createChainableInstance();
    mock.yellow = createChainableInstance();
    mock.blue = createChainableInstance();
    mock.gray = createChainableInstance();
    return mock;
  };

  return {
    default: {
      green: createChainableInstance(),
      red: createChainableInstance(),
      yellow: createChainableInstance(),
      blue: createChainableInstance(),
      gray: createChainableInstance(),
      bold: createChainableInstance(),
      dim: createChainableInstance(),
    },
  };
});

describe('validate command', () => {
  let testFs: TestFileSystem;
  let tempDir: string;
  let restoreCwd: () => void;
  // let console: ReturnType<typeof ConsoleTestHelper.mockConsole>; // Removed unused variable
  let processExit: ReturnType<typeof CommandTestHelper.mockProcessExit>;

  beforeEach(async () => {
    testFs = new TestFileSystem();
    tempDir = await testFs.createTempDir();
    restoreCwd = CommandTestHelper.mockProcessCwd(tempDir);
    ConsoleTestHelper.mockConsole();
    processExit = CommandTestHelper.mockProcessExit();

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await testFs.cleanup();
    restoreCwd();
    ConsoleTestHelper.restore();
    processExit.cleanup();
    vi.clearAllMocks();
  });

  describe('successful validation', () => {
    it('should pass validation with complete setup', async () => {
      // Create complete .claude setup
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': JSON.stringify(
            {
              hooks: {
                PostToolUse: [],
                Stop: [],
              },
            },
            null,
            2
          ),
          hooks: {
            'typecheck.sh': '#!/bin/bash\necho "TypeScript check"',
            'eslint.sh': '#!/bin/bash\necho "ESLint check"',
          },
          commands: {},
        },
      });

      await validate({});

      // Should not exit with error
      expect(processExit.exit).not.toHaveBeenCalled();

      // Check success messages
      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('✓');
      expect(output).toContain('.claude directory exists');
      expect(output).toContain('settings.json is valid');
      expect(output).toContain('Found 2 hook(s)');
      expect(output).toContain('All validation checks passed!');
    });

    it('should handle empty hooks directory', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': JSON.stringify({ hooks: {} }),
          hooks: {},
          commands: {},
        },
      });

      await validate({});

      expect(processExit.exit).not.toHaveBeenCalled();

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('Found 0 hook(s)');
    });
  });

  describe('validation failures', () => {
    it('should fail when .claude directory does not exist', async () => {
      await validate({});

      expect(processExit.exit).toHaveBeenCalledWith(1);

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('✗');
      expect(output).toContain('.claude directory not found');
      expect(output).toContain('run "claudekit init" first');
      expect(output).toContain('Some validation checks failed.');
    });

    it('should fail when settings.json does not exist', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          hooks: {},
        },
      });

      await validate({});

      expect(processExit.exit).toHaveBeenCalledWith(1);

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('✓'); // .claude directory exists
      expect(output).toContain('✗'); // settings.json issues
      expect(output).toContain('settings.json not found');
    });

    it('should fail when settings.json contains invalid JSON', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': '{ invalid json }',
          hooks: {},
        },
      });

      await validate({});

      expect(processExit.exit).toHaveBeenCalledWith(1);

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('settings.json contains invalid JSON');
    });

    it('should fail when hooks directory does not exist', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': JSON.stringify({ hooks: {} }),
        },
      });

      await validate({});

      expect(processExit.exit).toHaveBeenCalledWith(1);

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('hooks directory not found');
    });

    it('should show multiple failures', async () => {
      // Only create .claude directory, nothing else
      await fs.mkdir(path.join(tempDir, '.claude'));

      await validate({});

      expect(processExit.exit).toHaveBeenCalledWith(1);

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('✓'); // .claude directory exists
      expect(output).toContain('settings.json not found');
      expect(output).toContain('hooks directory not found');

      // Should have multiple ✗ symbols
      const failureCount = (output.match(/✗/g) || []).length;
      expect(failureCount).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('should handle valid JSON that is not an object', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': '"string is valid JSON but not config"',
          hooks: {},
        },
      });

      await validate({});

      // Should still pass JSON validation (this tests that we don't schema validate in the validate command)
      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('settings.json is valid');
    });

    it('should handle empty settings.json', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': '',
          hooks: {},
        },
      });

      await validate({});

      expect(processExit.exit).toHaveBeenCalledWith(1);

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      expect(output).toContain('settings.json contains invalid JSON');
    });

    it('should count hooks correctly with nested directories', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': JSON.stringify({ hooks: {} }),
          hooks: {
            'typecheck.sh': '#!/bin/bash',
            nested: {
              'other.sh': '#!/bin/bash',
            },
            '.hidden': 'hidden file',
            'README.md': 'documentation',
          },
        },
      });

      await validate({});

      const output = ConsoleTestHelper.getOutput('log').join('\n');
      // Should count all items in hooks directory (files and subdirectories)
      expect(output).toMatch(/Found \d+ hook\(s\)/);
    });
  });

  describe('ora spinner integration', () => {
    it('should use spinner during validation', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': JSON.stringify({ hooks: {} }),
          hooks: {},
        },
      });

      await validate({});

      // Verify ora was called
      const ora = await import('ora');
      expect(ora.default).toHaveBeenCalledWith('Validating project structure...');
    });

    it('should handle spinner errors gracefully', async () => {
      // Mock fs.access to throw an unexpected error
      const accessSpy = vi
        .spyOn(fs, 'access')
        .mockRejectedValueOnce(new Error('Unexpected filesystem error'));

      // Should not throw, but handle error gracefully
      await validate({});

      // Verify that the error was handled (access was called)
      expect(accessSpy).toHaveBeenCalled();

      accessSpy.mockRestore();
    });
  });

  describe('options parameter', () => {
    it('should accept options parameter without using it', async () => {
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          'settings.json': JSON.stringify({ hooks: {} }),
          hooks: {},
        },
      });

      // Test that options parameter is accepted but doesn't affect behavior
      await validate({ type: 'full' });
      await validate({ type: 'quick' });
      await validate({});

      // All should behave the same way
      expect(processExit.exit).not.toHaveBeenCalled();
    });
  });
});
