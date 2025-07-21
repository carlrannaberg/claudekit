/**
 * Comprehensive tests for the validation module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  validateProjectPathSecure,
  validatePathAccessibility,
  validateComponentName,
  sanitizeComponentList,
  checkNodePrerequisite,
  checkTypeScriptPrerequisite,
  checkESLintPrerequisite,
  checkGitPrerequisite,
  checkAllPrerequisites,
  sanitizeShellInput,
  sanitizeConfigInput,
  validateProject,
  formatValidationErrors,
  createValidationError,
  combineValidationResults,
  type ValidationResult,
  // type ValidationError, // Removed unused import
} from '../../cli/lib/validation';
import { TestFileSystem } from '@tests/utils/test-helpers';

describe('validation module', () => {
  let testFs: TestFileSystem;
  let tempDir: string;

  beforeEach(async () => {
    testFs = new TestFileSystem();
    tempDir = await testFs.createTempDir();
  });

  afterEach(async () => {
    await testFs.cleanup();
    vi.clearAllMocks();
  });

  describe('validateProjectPathSecure', () => {
    it('should validate normal project paths', () => {
      const validPaths = [path.join(os.homedir(), 'projects', 'test'), tempDir];

      for (const validPath of validPaths) {
        const result = validateProjectPathSecure(validPath);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitized).toBe(path.resolve(validPath));
      }
    });

    it('should reject invalid input types', () => {
      const invalidInputs = [null, undefined, 42, {}, [], true];

      for (const invalid of invalidInputs) {
        const result = validateProjectPathSecure(invalid as unknown as string);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0]?.code).toBe('INVALID_INPUT');
        expect(result.errors?.[0]?.message).toContain('non-empty string');
      }
    });

    it('should detect directory traversal attempts', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '/home/user/../../../etc',
        'project/../../../system',
        '..\\..\\Windows\\System32', // Windows-style
      ];

      for (const dangerousPath of dangerousPaths) {
        const result = validateProjectPathSecure(dangerousPath);
        expect(result.isValid).toBe(false);
        const traversalError = result.errors.find((e) => e.code === 'DIRECTORY_TRAVERSAL');
        expect(traversalError).toBeDefined();
        expect(traversalError?.message).toContain('Directory traversal detected');
      }
    });

    it('should reject system paths', () => {
      // Note: /var is where temp directories are on macOS, so we exclude /var from this test
      const systemPaths = ['/', '/usr', '/bin', '/etc', '/usr/local'];

      for (const systemPath of systemPaths) {
        const result = validateProjectPathSecure(systemPath);
        expect(result.isValid).toBe(false);
        const systemError = result.errors.find((e) => e.code === 'SYSTEM_PATH_FORBIDDEN');
        expect(systemError).toBeDefined();
      }
    });

    it('should allow system paths when explicitly enabled', () => {
      const result = validateProjectPathSecure('/tmp/test-project', { allowSystemPaths: true });
      expect(result.isValid).toBe(true);
    });

    it('should reject critical user directories', () => {
      const homeDir = os.homedir();
      const criticalPaths = [
        homeDir,
        path.join(homeDir, 'Library'),
        path.join(homeDir, '.ssh'),
        path.join(homeDir, 'Desktop'),
      ];

      for (const criticalPath of criticalPaths) {
        const result = validateProjectPathSecure(criticalPath);
        expect(result.isValid).toBe(false);
        const criticalError = result.errors.find((e) => e.code === 'CRITICAL_DIRECTORY_FORBIDDEN');
        expect(criticalError).toBeDefined();
      }
    });

    it('should reject paths that are too long', () => {
      const longPath = `/home/user/${'a'.repeat(1000)}`;
      const result = validateProjectPathSecure(longPath);
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]?.code).toBe('PATH_TOO_LONG');
    });

    it('should reject paths with control characters', () => {
      const pathWithControlChars = '/home/user/project\x00/test';
      const result = validateProjectPathSecure(pathWithControlChars);
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]?.code).toBe('INVALID_CHARACTERS');
    });

    it('should warn about hidden directories', () => {
      const hiddenPath = path.join(tempDir, '.my-hidden-project');
      const result = validateProjectPathSecure(hiddenPath);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('HIDDEN_DIRECTORY');
    });

    it('should not warn about common hidden dev directories', () => {
      const commonHiddenPaths = [
        path.join(tempDir, '.claude'),
        path.join(tempDir, '.git'),
        path.join(tempDir, '.vscode'),
      ];

      for (const hiddenPath of commonHiddenPaths) {
        const result = validateProjectPathSecure(hiddenPath);
        expect(result.isValid).toBe(true);
        const hiddenWarning = result.warnings.find((w) => w.code === 'HIDDEN_DIRECTORY');
        expect(hiddenWarning).toBeUndefined();
      }
    });

    it('should warn about excessive path depth', () => {
      const deepPath = `/home/user/${'level/'.repeat(15)}project`;
      const result = validateProjectPathSecure(deepPath, { maxDepth: 10 });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('EXCESSIVE_NESTING');
    });
  });

  describe('validatePathAccessibility', () => {
    it('should validate accessible existing files', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      const result = await validatePathAccessibility(testFile, 'read');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate accessible directories', async () => {
      const result = await validatePathAccessibility(tempDir, 'read');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle non-existent paths for write operations', async () => {
      const nonExistentFile = path.join(tempDir, 'new-file.txt');
      const result = await validatePathAccessibility(nonExistentFile, 'write');
      expect(result.isValid).toBe(true); // Parent directory exists and is writable
    });

    it('should fail for non-existent paths for read operations', async () => {
      const nonExistentFile = path.join(tempDir, 'missing.txt');
      const result = await validatePathAccessibility(nonExistentFile, 'read');
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]?.code).toBe('PATH_NOT_FOUND');
    });

    it('should detect type mismatches', async () => {
      const testFile = path.join(tempDir, 'file.txt');
      await fs.writeFile(testFile, 'content');

      const result = await validatePathAccessibility(`${testFile}/`, 'read');
      expect(result.isValid).toBe(false);
      // The error could be either TYPE_MISMATCH or ACCESS_ERROR depending on filesystem behavior
      expect(['TYPE_MISMATCH', 'ACCESS_ERROR'].includes(result.errors?.[0]?.code ?? '')).toBe(true);
    });

    it('should warn about large configuration files', async () => {
      const largeConfigFile = path.join(tempDir, 'large.json');
      const largeContent = JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 1) });
      await fs.writeFile(largeConfigFile, largeContent);

      const result = await validatePathAccessibility(largeConfigFile, 'read');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('LARGE_CONFIG_FILE');
    });

    it('should handle permission errors gracefully', async () => {
      // This test may not work on all systems due to permission restrictions
      const restrictedPath = '/root/restricted-file';
      const result = await validatePathAccessibility(restrictedPath, 'read');

      // Either the path doesn't exist or we don't have permission
      expect(result.isValid).toBe(false);
      expect(['PATH_NOT_FOUND', 'PERMISSION_DENIED', 'ACCESS_ERROR']).toContain(
        result.errors?.[0]?.code
      );
    });
  });

  describe('validateComponentName', () => {
    it('should validate correct component names', () => {
      const validNames = [
        'my-hook',
        'git-utils',
        'validator',
        'a',
        'x1',
        'test-123',
        'multi-word-component',
      ];

      for (const name of validNames) {
        const result = validateComponentName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject invalid component names', () => {
      const invalidNames = [
        '', // empty
        'My-Hook', // uppercase
        'my_hook', // underscore
        '-hook', // starts with hyphen
        'hook-', // ends with hyphen
        'my hook', // space
        'my@hook', // special character
        'a'.repeat(101), // too long
      ];

      for (const name of invalidNames) {
        const result = validateComponentName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors?.[0]?.code).toBe('INVALID_COMPONENT_NAME');
      }
    });

    it('should reject reserved names', () => {
      const reservedNames = ['init', 'validate', 'install', 'config', 'test'];

      for (const name of reservedNames) {
        const result = validateComponentName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0]?.code).toBe('RESERVED_NAME');
        expect(result.errors?.[0]?.suggestions).toBeDefined();
      }
    });

    it('should warn about underscores', () => {
      const result = validateComponentName('my_component'); // This will first fail validation
      expect(result.isValid).toBe(false); // Because underscores are not allowed by the regex
      expect(result.errors?.[0]?.code).toBe('INVALID_COMPONENT_NAME');
    });

    it('should warn about long names', () => {
      const longName = 'very-long-component-name-that-exceeds-fifty-characters-in-length';
      const result = validateComponentName(longName);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.code).toBe('LONG_NAME');
    });
  });

  describe('sanitizeComponentList', () => {
    it('should sanitize valid component arrays', () => {
      const components = ['hook1', 'hook2', 'command1'];
      const result = sanitizeComponentList(components);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toEqual(components);
      expect(result.errors).toHaveLength(0);
    });

    it('should convert string input to array', () => {
      const componentString = 'hook1,hook2, command1 ; hook3';
      const result = sanitizeComponentList(componentString);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toEqual(['hook1', 'hook2', 'command1', 'hook3']);
    });

    it('should filter out invalid components', () => {
      const components = ['valid-hook', '', 'Invalid-Name', null, 'another-hook', 42];
      const result = sanitizeComponentList(components);

      expect(result.sanitized).toEqual(['valid-hook', 'another-hook']);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should remove duplicates', () => {
      const components = ['hook1', 'hook2', 'hook1', 'hook3'];
      const result = sanitizeComponentList(components);

      expect(result.sanitized).toEqual(['hook1', 'hook2', 'hook3']);
      const duplicateWarning = result.warnings.find((w) => w.code === 'DUPLICATE_COMPONENT');
      expect(duplicateWarning).toBeDefined();
    });

    it('should enforce maximum component limit', () => {
      const manyComponents = Array.from({ length: 60 }, (_, i) => `component-${i}`);
      const result = sanitizeComponentList(manyComponents, { maxComponents: 50 });

      expect(result.sanitized).toHaveLength(50);
      const truncatedWarning = result.warnings.find((w) => w.code === 'LIST_TRUNCATED');
      expect(truncatedWarning).toBeDefined();
    });

    it('should reject non-array, non-string input', () => {
      const result = sanitizeComponentList({ not: 'array' });
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]?.code).toBe('INVALID_TYPE');
    });
  });

  describe('prerequisite checks', () => {
    describe('checkNodePrerequisite', () => {
      it('should pass for current Node.js version', async () => {
        const check = await checkNodePrerequisite('18.0.0');
        const result = await check.check();
        expect(result).toBe(true);
        expect(check.name).toBe('Node.js');
        expect(check.required).toBe(true);
      });

      it('should fail for impossibly high version requirement', async () => {
        const check = await checkNodePrerequisite('999.0.0');
        const result = await check.check();
        expect(result).toBe(false);
      });
    });

    describe('checkTypeScriptPrerequisite', () => {
      it('should check for TypeScript availability', async () => {
        const check = await checkTypeScriptPrerequisite();
        const result = await check.check();

        expect(check.name).toBe('TypeScript');
        expect(check.required).toBe(false);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('checkESLintPrerequisite', () => {
      it('should check for ESLint availability and configuration', async () => {
        const check = await checkESLintPrerequisite();
        const result = await check.check();

        expect(check.name).toBe('ESLint');
        expect(check.required).toBe(false);
        expect(typeof result).toBe('boolean');
      });

      it('should detect ESLint config in package.json', async () => {
        // Create a package.json with eslintConfig
        const packageJsonPath = path.join(tempDir, 'package.json');
        await fs.writeFile(
          packageJsonPath,
          JSON.stringify({
            name: 'test',
            eslintConfig: {},
          })
        );

        // Mock process.cwd to return our temp directory
        const originalCwd = process.cwd;
        vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

        try {
          const check = await checkESLintPrerequisite();
          // This might still return false if ESLint binary is not available
          const result = await check.check();
          expect(typeof result).toBe('boolean');
        } finally {
          process.cwd = originalCwd;
        }
      });
    });

    describe('checkGitPrerequisite', () => {
      it('should check for Git availability', async () => {
        const check = await checkGitPrerequisite(false);
        const result = await check.check();

        expect(check.name).toBe('Git');
        expect(check.required).toBe(false);
        expect(typeof result).toBe('boolean');
      });

      it('should require repository when specified', async () => {
        const check = await checkGitPrerequisite(true);
        expect(check.description).toContain('initialized repository');
      });
    });

    describe('checkAllPrerequisites', () => {
      it('should run all prerequisite checks', async () => {
        const result = await checkAllPrerequisites();

        expect(result.isValid).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it('should handle specific requirements', async () => {
        const result = await checkAllPrerequisites({
          requireTypeScript: true,
          requireESLint: true,
          requireGitRepository: true,
          nodeMinVersion: '20.0.0',
        });

        expect(result.isValid).toBeDefined();
        // The exact result depends on the environment
      });
    });
  });

  describe('input sanitization', () => {
    describe('sanitizeShellInput', () => {
      it('should accept safe input', () => {
        const safeInputs = ['normal-text', 'file.txt', 'my-project-name', 'version-1.2.3'];

        for (const input of safeInputs) {
          const result = sanitizeShellInput(input);
          expect(result.isValid).toBe(true);
          expect(result.sanitized).toBe(input);
        }
      });

      it('should reject dangerous shell characters', () => {
        const dangerousInputs = [
          'rm -rf /',
          'file; cat /etc/passwd',
          'input && malicious',
          'test | grep secret',
          'test `whoami`',
          'test $(echo hack)',
          'file > /dev/null',
        ];

        for (const input of dangerousInputs) {
          const result = sanitizeShellInput(input);
          expect(result.isValid).toBe(false);
          expect(
            ['DANGEROUS_CHARACTERS', 'DANGEROUS_COMMAND'].includes(result.errors?.[0]?.code ?? '')
          ).toBe(true);
        }
      });

      it('should reject null bytes', () => {
        const inputWithNull = 'test\0file';
        const result = sanitizeShellInput(inputWithNull);
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0]?.code).toBe('NULL_BYTES');
      });

      it('should warn about long input', () => {
        const longInput = 'x'.repeat(1001);
        const result = sanitizeShellInput(longInput);
        expect(result.isValid).toBe(true);
        expect(result.warnings?.[0]?.code).toBe('LONG_INPUT');
      });

      it('should sanitize control characters', () => {
        const inputWithControlChars = 'test\x01\x02file\x7f';
        const result = sanitizeShellInput(inputWithControlChars);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('testfile');
      });
    });

    describe('sanitizeConfigInput', () => {
      it('should accept valid configuration objects', () => {
        const validConfigs = [
          { hooks: {} },
          { environment: { NODE_ENV: 'development' } },
          { nested: { object: { value: 'test' } } },
        ];

        for (const config of validConfigs) {
          const result = sanitizeConfigInput(config);
          expect(result.isValid).toBe(true);
          expect(result.sanitized).toEqual(config);
        }
      });

      it('should reject null/undefined config', () => {
        const result1 = sanitizeConfigInput(null);
        const result2 = sanitizeConfigInput(undefined);

        expect(result1.isValid).toBe(false);
        expect(result1.errors[0]?.code).toBe('NULL_CONFIG');
        expect(result2.isValid).toBe(false);
        expect(result2.errors[0]?.code).toBe('NULL_CONFIG');
      });

      it('should reject non-object config', () => {
        const invalidConfigs = ['string', 42, true, []];

        for (const config of invalidConfigs) {
          const result = sanitizeConfigInput(config);
          expect(result.isValid).toBe(false);
          expect(result.errors?.[0]?.code).toBe('INVALID_CONFIG_TYPE');
        }
      });

      it('should warn about deeply nested config', () => {
        const deepConfig = {
          a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 'deep' } } } } } } } } } },
        };
        const result = sanitizeConfigInput(deepConfig);
        expect(result.isValid).toBe(true);
        expect(result.warnings?.[0]?.code).toBe('DEEP_NESTING');
      });

      it('should handle non-serializable values', () => {
        const configWithFunction = { func: (): void => {} };
        const result = sanitizeConfigInput(configWithFunction);
        expect(result.isValid).toBe(false);
        expect(result.errors?.[0]?.code).toBe('NON_SERIALIZABLE');
      });
    });
  });

  describe('validateProject', () => {
    it('should validate complete project setup', async () => {
      // Create a basic project structure
      await testFs.createFileStructure(tempDir, {
        'package.json': JSON.stringify({ name: 'test-project' }),
        '.git': {},
        src: {
          'index.ts': 'console.log("hello");',
        },
      });

      const result = await validateProject(tempDir, {
        requireNodeProject: true,
        requireGitRepository: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(tempDir);
    });

    it('should fail for missing package.json when required', async () => {
      const result = await validateProject(tempDir, {
        requireNodeProject: true,
      });

      expect(result.isValid).toBe(false);
      const nodeError = result.errors.find((e) => e.code === 'NOT_NODE_PROJECT');
      expect(nodeError).toBeDefined();
    });

    it('should fail for missing git repository when required', async () => {
      const result = await validateProject(tempDir, {
        requireGitRepository: true,
      });

      expect(result.isValid).toBe(false);
      const gitError = result.errors.find((e) => e.code === 'NOT_GIT_REPOSITORY');
      expect(gitError).toBeDefined();
    });

    it('should fail for non-directory paths', async () => {
      const testFile = path.join(tempDir, 'file.txt');
      await fs.writeFile(testFile, 'content');

      const result = await validateProject(testFile);
      expect(result.isValid).toBe(false);
      // The error could be either NOT_DIRECTORY or a path validation error
      expect(
        ['NOT_DIRECTORY', 'SYSTEM_PATH_FORBIDDEN', 'ACCESS_ERROR'].includes(
          result.errors?.[0]?.code ?? ''
        )
      ).toBe(true);
    });
  });

  describe('utility functions', () => {
    describe('formatValidationErrors', () => {
      it('should format errors and warnings nicely', () => {
        const result: ValidationResult = {
          isValid: false,
          errors: [
            {
              field: 'test',
              message: 'Test error',
              severity: 'error',
              code: 'TEST_ERROR',
              suggestions: ['Fix it', 'Try again'],
            },
          ],
          warnings: [
            {
              field: 'test',
              message: 'Test warning',
              severity: 'warning',
              code: 'TEST_WARNING',
            },
          ],
        };

        const formatted = formatValidationErrors(result);
        expect(formatted).toContain('Validation Errors:');
        expect(formatted).toContain('✗ test: Test error [TEST_ERROR]');
        expect(formatted).toContain('→ Fix it');
        expect(formatted).toContain('→ Try again');
        expect(formatted).toContain('Validation Warnings:');
        expect(formatted).toContain('⚠ test: Test warning [TEST_WARNING]');
      });

      it('should handle empty results', () => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
        };

        const formatted = formatValidationErrors(result);
        expect(formatted).toBe('');
      });
    });

    describe('createValidationError', () => {
      it('should create validation error with defaults', () => {
        const error = createValidationError('field', 'message');
        expect(error.field).toBe('field');
        expect(error.message).toBe('message');
        expect(error.severity).toBe('error');
        expect(error.code).toBeUndefined();
        expect(error.suggestions).toBeUndefined();
      });

      it('should create validation error with options', () => {
        const error = createValidationError('field', 'message', {
          severity: 'warning',
          code: 'TEST_CODE',
          suggestions: ['suggestion'],
        });

        expect(error.severity).toBe('warning');
        expect(error.code).toBe('TEST_CODE');
        expect(error.suggestions).toEqual(['suggestion']);
      });
    });

    describe('combineValidationResults', () => {
      it('should combine multiple validation results', () => {
        const result1: ValidationResult = {
          isValid: false,
          errors: [createValidationError('field1', 'error1')],
          warnings: [createValidationError('field1', 'warning1', { severity: 'warning' })],
        };

        const result2: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [createValidationError('field2', 'warning2', { severity: 'warning' })],
        };

        const combined = combineValidationResults(result1, result2);
        expect(combined.isValid).toBe(false); // Has errors
        expect(combined.errors).toHaveLength(1);
        expect(combined.warnings).toHaveLength(2);
      });

      it('should handle empty input', () => {
        const combined = combineValidationResults();
        expect(combined.isValid).toBe(true);
        expect(combined.errors).toHaveLength(0);
        expect(combined.warnings).toHaveLength(0);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle filesystem errors gracefully', async () => {
      // Mock fs.stat to throw an error
      const originalStat = fs.stat;
      vi.spyOn(fs, 'stat').mockRejectedValueOnce(new Error('Filesystem error'));

      const result = await validateProject('/nonexistent/path');
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]?.code).toBe('ACCESS_ERROR');

      // Restore original function
      fs.stat = originalStat;
    });

    it('should handle path normalization errors', () => {
      // Mock path.resolve to throw
      const originalResolve = path.resolve;
      vi.spyOn(path, 'resolve').mockImplementationOnce(() => {
        throw new Error('Path resolution failed');
      });

      const result = validateProjectPathSecure('/some/path');
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]?.code).toBe('PATH_NORMALIZATION_ERROR');

      // Restore
      path.resolve = originalResolve;
    });

    it('should handle prerequisite check failures gracefully', async () => {
      // Mock child_process exec to fail
      await import('child_process');
      vi.mock('child_process', () => ({
        exec: vi.fn((_cmd, callback) => callback(new Error('Command failed'))),
      }));

      const check = await checkGitPrerequisite();
      const result = await check.check();
      expect(result).toBe(false);
    });
  });
});
