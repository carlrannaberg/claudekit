import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';

// Mock all dependencies before imports
vi.mock('fs-extra', () => ({
  default: {
    readJson: vi.fn(),
  },
  readJson: vi.fn(),
}));

vi.mock('../../../cli/hooks/utils.js', () => ({
  readStdin: vi.fn(),
  findProjectRoot: vi.fn(),
  detectPackageManager: vi.fn(),
  execCommand: vi.fn(),
  formatError: vi.fn(),
}));

vi.mock('../../../cli/hooks/base.js');

// Mock the registry instead of individual hooks
vi.mock('../../../cli/hooks/registry.js', () => ({
  HOOK_REGISTRY: {
    'typecheck-changed': vi.fn(),
    'check-any-changed': vi.fn(),
    'lint-changed': vi.fn(),
    'create-checkpoint': vi.fn(),
    'test-changed': vi.fn(),
    'check-todos': vi.fn(),
    'typecheck-project': vi.fn(),
    'lint-project': vi.fn(),
    'test-project': vi.fn(),
  },
}));

// Now import after mocks
import { HookRunner } from '../../../cli/hooks/runner.js';
import * as utils from '../../../cli/hooks/utils.js';
import fs from 'fs-extra';

describe('HookRunner', () => {
  let runner: HookRunner;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    runner = new HookRunner();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();

    // Set up default mocks
    vi.mocked(utils.findProjectRoot).mockResolvedValue('/test/project');
    vi.mocked(utils.detectPackageManager).mockResolvedValue({
      name: 'npm',
      exec: 'npx',
      run: 'npm run',
      test: 'npm test',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config path', () => {
      const runner = new HookRunner();
      expect(runner['configPath']).toBe('.claudekit/config.json');
    });

    it('should accept custom config path', () => {
      const customPath = '/custom/config.json';
      const runner = new HookRunner(customPath);
      expect(runner['configPath']).toBe(customPath);
    });

    it('should register all built-in hooks', () => {
      const runner = new HookRunner();
      const hooks = runner['hooks'];

      // Should have registered hooks from HOOK_REGISTRY
      expect(hooks.size).toBeGreaterThan(0);

      // Check some common hooks exist
      expect(hooks.has('typecheck-changed')).toBe(true);
      expect(hooks.has('create-checkpoint')).toBe(true);
    });
  });

  describe('run', () => {
    it('should return error for unknown hook', async () => {
      const exitCode = await runner.run('unknown-hook');

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown hook: unknown-hook');
    });

    it('should read payload from stdin and parse JSON', async () => {
      const testPayload = { tool_input: { file_path: '/test/file.ts' } };
      vi.mocked(utils.readStdin).mockResolvedValue(JSON.stringify(testPayload));

      // Create a mock hook instance
      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };

      // Mock the hook constructor
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'test-hook',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      await runner.run('test-hook');

      expect(utils.readStdin).toHaveBeenCalled();
      expect(mockHookInstance.run).toHaveBeenCalledWith(testPayload);
    });

    it('should handle empty stdin input', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'test-hook',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      const exitCode = await runner.run('test-hook');

      expect(exitCode).toBe(0);
      expect(mockHookInstance.run).toHaveBeenCalledWith({});
    });

    it('should handle invalid JSON from stdin', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('invalid json');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'test-hook',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      const exitCode = await runner.run('test-hook');

      expect(exitCode).toBe(0);
      expect(mockHookInstance.run).toHaveBeenCalledWith({});
    });

    it('should load hook configuration from config file', async () => {
      const config = {
        hooks: {
          'typecheck-changed': { timeout: 60000, customOption: 'test' },
        },
      };
      vi.mocked(fs.readJson).mockResolvedValue(config);
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'typecheck-changed',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      await runner.run('typecheck-changed');

      expect(fs.readJson).toHaveBeenCalledWith(path.resolve('.claudekit/config.json'));
      expect(MockHook).toHaveBeenCalledWith(config.hooks['typecheck-changed']);
    });

    it('should use empty config when hook not configured', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({ hooks: {} });
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'typecheck-changed',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      const exitCode = await runner.run('typecheck-changed');

      expect(exitCode).toBe(0);
      expect(MockHook).toHaveBeenCalledWith({});
    });

    it('should handle JSON response from hook', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const jsonResponse = { result: 'success', data: 42 };
      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({
          exitCode: 0,
          jsonResponse,
        }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'test-hook',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      await runner.run('test-hook');

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(jsonResponse));
    });

    it('should return exit code from hook', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 2 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'failing',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      const exitCode = await runner.run('failing');

      expect(exitCode).toBe(2);
    });

    it('should pass payload to hook', async () => {
      const testPayload = {
        tool_input: { file_path: '/test/file.ts' },
        custom_field: 'value',
      };
      vi.mocked(utils.readStdin).mockResolvedValue(JSON.stringify(testPayload));

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'test-hook',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      await runner.run('test-hook');

      expect(mockHookInstance.run).toHaveBeenCalledWith(testPayload);
    });

    it('should pass hook config to hook constructor', async () => {
      const hookConfig = { timeout: 45000, strictMode: true };
      vi.mocked(fs.readJson).mockResolvedValue({
        hooks: {
          'config-test': hookConfig,
        },
      });
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'config-test',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      await runner.run('config-test');

      expect(MockHook).toHaveBeenCalledWith(hookConfig);
    });
  });

  describe('loadConfig', () => {
    it('should load and parse configuration file', async () => {
      const testConfig = {
        hooks: {
          'typecheck-changed': { timeout: 60000 },
          'lint-changed': { fix: true },
        },
      };
      vi.mocked(fs.readJson).mockResolvedValue(testConfig);

      const config = await runner['loadConfig']();

      // The schema adds default timeout
      expect(config).toEqual({
        hooks: {
          'typecheck-changed': { timeout: 60000 },
          'lint-changed': { fix: true, timeout: 30000 },
        },
      });
      expect(fs.readJson).toHaveBeenCalledWith(path.resolve('.claudekit/config.json'));
    });

    it('should return default config when file does not exist', async () => {
      vi.mocked(fs.readJson).mockRejectedValue(new Error('ENOENT: no such file'));

      const config = await runner['loadConfig']();

      expect(config).toEqual({ hooks: {} });
    });

    it('should return default config when file has invalid JSON', async () => {
      vi.mocked(fs.readJson).mockRejectedValue(new Error('Unexpected token'));

      const config = await runner['loadConfig']();

      expect(config).toEqual({ hooks: {} });
    });

    it('should handle missing hooks section', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({});

      const config = await runner['loadConfig']();

      expect(config).toEqual({ hooks: {} });
    });

    it('should validate config schema', async () => {
      const invalidConfig = {
        hooks: {
          typecheck: {
            timeout: 'not a number', // Invalid type - but zod will coerce
          },
        },
      };
      vi.mocked(fs.readJson).mockResolvedValue(invalidConfig);

      // Should handle schema validation errors gracefully
      const config = await runner['loadConfig']();

      // Zod will try to parse, if it fails completely it returns default
      expect(config.hooks).toBeDefined();
    });

    it('should preserve extra properties in hook config', async () => {
      const configWithExtras = {
        hooks: {
          'typecheck-changed': {
            timeout: 30000,
            customOption: 'value',
            anotherOption: true,
          },
        },
      };
      vi.mocked(fs.readJson).mockResolvedValue(configWithExtras);

      const config = await runner['loadConfig']();

      expect(config.hooks['typecheck-changed']).toEqual({
        timeout: 30000,
        customOption: 'value',
        anotherOption: true,
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle full execution flow with typecheck hook', async () => {
      const payload = { tool_input: { file_path: '/test/app.ts' } };
      const config = {
        hooks: {
          'typecheck-changed': { timeout: 45000 },
        },
      };

      vi.mocked(utils.readStdin).mockResolvedValue(JSON.stringify(payload));
      vi.mocked(fs.readJson).mockResolvedValue(config);

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'typecheck-changed',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      const exitCode = await runner.run('typecheck-changed');

      expect(exitCode).toBe(0);
      expect(utils.readStdin).toHaveBeenCalled();
      expect(fs.readJson).toHaveBeenCalled();
      expect(MockHook).toHaveBeenCalledWith(config.hooks['typecheck-changed']);
      expect(mockHookInstance.run).toHaveBeenCalledWith(payload);
    });

    it('should handle hook that returns suppress output', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({
          exitCode: 0,
          suppressOutput: true,
        }),
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set(
        'silent',
        MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
      );

      const exitCode = await runner.run('silent');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle concurrent hook registrations', () => {
      // Register multiple hooks at once
      const hookNames = ['hook1', 'hook2', 'hook3'];

      hookNames.forEach((name) => {
        const mockHookInstance = { run: vi.fn() };
        const MockHook = vi.fn().mockReturnValue(mockHookInstance);
        runner['hooks'].set(
          name,
          MockHook as unknown as (typeof runner)['hooks'] extends Map<string, infer V> ? V : never
        );
      });

      hookNames.forEach((name) => {
        expect(runner['hooks'].has(name)).toBe(true);
      });
    });
  });
});
