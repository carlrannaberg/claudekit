/**
 * Vitest setup file for global test configuration and mocks
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env['NODE_ENV'] = 'test';
  process.env['CI'] = 'false';

  // Suppress console output during tests (can be overridden in individual tests)
  if (process.env['VERBOSE_TESTS'] === undefined || process.env['VERBOSE_TESTS'] === '') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Per-test cleanup
beforeEach(() => {
  // Reset any environment variables that might have been set during tests
  delete process.env['DEBUG'];
  delete process.env['FORCE'];
  delete process.env['CLAUDEKIT_CONFIG_PATH'];
});

afterEach(() => {
  vi.clearAllMocks();
});

// Mock external dependencies only if not already mocked
vi.mock('picocolors', () => ({
  default: {
    red: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
    blue: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    cyan: vi.fn((text: string) => text),
    magenta: vi.fn((text: string) => text),
    white: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
    bold: vi.fn((text: string) => text),
    dim: vi.fn((text: string) => text),
    underline: vi.fn((text: string) => text),
    strikethrough: vi.fn((text: string) => text),
    inverse: vi.fn((text: string) => text),
    bgRed: vi.fn((text: string) => text),
    bgGreen: vi.fn((text: string) => text),
    bgBlue: vi.fn((text: string) => text),
    bgYellow: vi.fn((text: string) => text),
    bgCyan: vi.fn((text: string) => text),
    bgMagenta: vi.fn((text: string) => text),
    bgWhite: vi.fn((text: string) => text),
    isColorSupported: true,
  },
}));

// Global test utilities
declare global {
  var testUtils: {
    createTempDir: () => Promise<string>;
    cleanupTempDir: (dir: string) => Promise<void>;
    createMockConfig: (overrides?: Record<string, unknown>) => Record<string, unknown>;
    createMockFileSystem: (
      structure: Record<string, string | Record<string, unknown>>
    ) => Promise<string>;
    resetMocks: () => void;
  };
}

// Test utilities
global.testUtils = {
  async createTempDir(): Promise<string> {
    return await fs.mkdtemp(path.join(os.tmpdir(), 'claudekit-test-'));
  },

  async cleanupTempDir(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors in tests
    }
  },

  createMockConfig(overrides = {}): Record<string, unknown> {
    return {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              { type: 'command', command: '.claude/hooks/typecheck.sh', enabled: true, retries: 0 },
            ],
            enabled: true,
          },
        ],
        Stop: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: '.claude/hooks/auto-checkpoint.sh',
                enabled: true,
                retries: 0,
              },
            ],
            enabled: true,
          },
        ],
      },
      ...overrides,
    };
  },

  async createMockFileSystem(
    structure: Record<string, string | Record<string, unknown>>
  ): Promise<string> {
    const tempDir = await global.testUtils.createTempDir();

    async function createStructure(
      basePath: string,
      struct: Record<string, unknown>
    ): Promise<void> {
      for (const [name, content] of Object.entries(struct)) {
        const fullPath = path.join(basePath, name);

        if (typeof content === 'string') {
          // It's a file
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
        } else if (typeof content === 'object' && content !== null) {
          // It's a directory
          await fs.mkdir(fullPath, { recursive: true });
          await createStructure(fullPath, content as Record<string, unknown>);
        }
      }
    }

    await createStructure(tempDir, structure);
    return tempDir;
  },

  resetMocks(): void {
    vi.clearAllMocks();
  },
};
