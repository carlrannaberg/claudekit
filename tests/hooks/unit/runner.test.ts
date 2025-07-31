import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';

// Mock all dependencies before imports
vi.mock('fs-extra', () => ({
  default: {
    readJson: vi.fn()
  },
  readJson: vi.fn()
}));

vi.mock('../../../cli/hooks/utils.js', () => ({
  readStdin: vi.fn(),
  findProjectRoot: vi.fn(),
  detectPackageManager: vi.fn(),
  execCommand: vi.fn(),
  formatError: vi.fn()
}));

vi.mock('../../../cli/hooks/base.js');

// Mock all hook modules
vi.mock('../../../cli/hooks/typecheck.js', () => ({ TypecheckHook: vi.fn() }));
vi.mock('../../../cli/hooks/no-any.js', () => ({ NoAnyHook: vi.fn() }));
vi.mock('../../../cli/hooks/eslint.js', () => ({ EslintHook: vi.fn() }));
vi.mock('../../../cli/hooks/auto-checkpoint.js', () => ({ AutoCheckpointHook: vi.fn() }));
vi.mock('../../../cli/hooks/run-related-tests.js', () => ({ RunRelatedTestsHook: vi.fn() }));
vi.mock('../../../cli/hooks/project-validation.js', () => ({ ProjectValidationHook: vi.fn() }));
vi.mock('../../../cli/hooks/validate-todo.js', () => ({ ValidateTodoCompletionHook: vi.fn() }));

// Now import after mocks
import { HookRunner } from '../../../cli/hooks/runner.js';
import * as utils from '../../../cli/hooks/utils.js';
import * as fs from 'fs-extra';

describe('HookRunner', () => {
  let runner: HookRunner;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

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
      test: 'npm test'
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
      
      expect(hooks.has('typecheck')).toBe(true);
      expect(hooks.has('no-any')).toBe(true);
      expect(hooks.has('eslint')).toBe(true);
      expect(hooks.has('auto-checkpoint')).toBe(true);
      expect(hooks.has('run-related-tests')).toBe(true);
      expect(hooks.has('project-validation')).toBe(true);
      expect(hooks.has('validate-todo-completion')).toBe(true);
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
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      
      // Mock the hook constructor
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('test-hook', MockHook as any);

      await runner.run('test-hook');
      
      expect(utils.readStdin).toHaveBeenCalled();
      expect(mockHookInstance.run).toHaveBeenCalledWith(testPayload);
    });

    it('should handle empty stdin input', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('test-hook', MockHook as any);

      const exitCode = await runner.run('test-hook');
      
      expect(exitCode).toBe(0);
      expect(mockHookInstance.run).toHaveBeenCalledWith({});
    });

    it('should handle invalid JSON from stdin', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('invalid json');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('test-hook', MockHook as any);

      const exitCode = await runner.run('test-hook');
      
      expect(exitCode).toBe(0);
      expect(mockHookInstance.run).toHaveBeenCalledWith({});
    });

    it('should load hook configuration from config file', async () => {
      const config = {
        hooks: {
          typecheck: { timeout: 60000, customOption: 'test' }
        }
      };
      vi.mocked(fs.readJson).mockResolvedValue(config);
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('typecheck', MockHook as any);

      await runner.run('typecheck');
      
      expect(fs.readJson).toHaveBeenCalledWith(path.resolve('.claudekit/config.json'));
      expect(MockHook).toHaveBeenCalledWith(config.hooks.typecheck);
    });

    it('should use empty config when hook not configured', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({ hooks: {} });
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('typecheck', MockHook as any);

      const exitCode = await runner.run('typecheck');
      
      expect(exitCode).toBe(0);
      expect(MockHook).toHaveBeenCalledWith({});
    });

    it('should handle JSON response from hook', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const jsonResponse = { result: 'success', data: 42 };
      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ 
          exitCode: 0,
          jsonResponse 
        })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('test-hook', MockHook as any);

      await runner.run('test-hook');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(jsonResponse));
    });

    it('should return exit code from hook', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 2 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('failing', MockHook as any);

      const exitCode = await runner.run('failing');
      
      expect(exitCode).toBe(2);
    });

    it('should pass payload to hook', async () => {
      const testPayload = {
        tool_input: { file_path: '/test/file.ts' },
        custom_field: 'value'
      };
      vi.mocked(utils.readStdin).mockResolvedValue(JSON.stringify(testPayload));

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('test-hook', MockHook as any);
      
      await runner.run('test-hook');
      
      expect(mockHookInstance.run).toHaveBeenCalledWith(testPayload);
    });

    it('should pass hook config to hook constructor', async () => {
      const hookConfig = { timeout: 45000, strictMode: true };
      vi.mocked(fs.readJson).mockResolvedValue({
        hooks: {
          'config-test': hookConfig
        }
      });
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('config-test', MockHook as any);
      
      await runner.run('config-test');
      
      expect(MockHook).toHaveBeenCalledWith(hookConfig);
    });
  });

  describe('loadConfig', () => {
    it('should load and parse configuration file', async () => {
      const testConfig = {
        hooks: {
          typecheck: { timeout: 60000 },
          eslint: { fix: true }
        }
      };
      vi.mocked(fs.readJson).mockResolvedValue(testConfig);

      const config = await runner['loadConfig']();
      
      // The schema adds default timeout
      expect(config).toEqual({
        hooks: {
          typecheck: { timeout: 60000 },
          eslint: { fix: true, timeout: 30000 }
        }
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
            timeout: 'not a number' // Invalid type - but zod will coerce
          }
        }
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
          typecheck: {
            timeout: 30000,
            customOption: 'value',
            anotherOption: true
          }
        }
      };
      vi.mocked(fs.readJson).mockResolvedValue(configWithExtras);

      const config = await runner['loadConfig']();
      
      expect(config.hooks['typecheck']).toEqual({
        timeout: 30000,
        customOption: 'value',
        anotherOption: true
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle full execution flow with typecheck hook', async () => {
      const payload = { tool_input: { file_path: '/test/app.ts' } };
      const config = {
        hooks: {
          typecheck: { timeout: 45000 }
        }
      };

      vi.mocked(utils.readStdin).mockResolvedValue(JSON.stringify(payload));
      vi.mocked(fs.readJson).mockResolvedValue(config);

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({ exitCode: 0 })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('typecheck', MockHook as any);

      const exitCode = await runner.run('typecheck');
      
      expect(exitCode).toBe(0);
      expect(utils.readStdin).toHaveBeenCalled();
      expect(fs.readJson).toHaveBeenCalled();
      expect(MockHook).toHaveBeenCalledWith(config.hooks.typecheck);
      expect(mockHookInstance.run).toHaveBeenCalledWith(payload);
    });

    it('should handle hook that returns suppress output', async () => {
      vi.mocked(utils.readStdin).mockResolvedValue('{}');

      const mockHookInstance = {
        run: vi.fn().mockResolvedValue({
          exitCode: 0,
          suppressOutput: true
        })
      };
      const MockHook = vi.fn().mockReturnValue(mockHookInstance);
      runner['hooks'].set('silent', MockHook as any);

      const exitCode = await runner.run('silent');
      
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle concurrent hook registrations', () => {
      // Register multiple hooks at once
      const hookNames = ['hook1', 'hook2', 'hook3'];
      
      hookNames.forEach(name => {
        const mockHookInstance = { run: vi.fn() };
        const MockHook = vi.fn().mockReturnValue(mockHookInstance);
        runner['hooks'].set(name, MockHook as any);
      });

      hookNames.forEach(name => {
        expect(runner['hooks'].has(name)).toBe(true);
      });
    });
  });
});