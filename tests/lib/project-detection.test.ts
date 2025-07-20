import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  detectProjectContext,
  resolveProjectPath,
  detectTypeScript,
  detectESLint,
  detectPrettier,
  detectJest,
  detectVitest,
  detectPackageManager,
  detectGitRepository,
  detectClaudeConfig,
  detectNodeVersion,
  detectPackageInfo,
  detectFrameworks,
} from '../../cli/lib/project-detection.js';

/**
 * Test suite for project detection system
 *
 * Tests various project configurations to ensure accurate detection
 * of TypeScript, ESLint, package managers, frameworks, and other tools.
 */

describe('Project Detection System', () => {
  let tempDir: string;
  let testProjectPath: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudekit-test-'));
    testProjectPath = path.join(tempDir, 'test-project');
    await fs.mkdir(testProjectPath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('resolveProjectPath', () => {
    it('should resolve current directory when no path provided', () => {
      const result = resolveProjectPath('');
      expect(result).toBe(process.cwd());
    });

    it('should expand home directory path', () => {
      const result = resolveProjectPath('~/Documents');
      expect(result).toBe(path.join(os.homedir(), 'Documents'));
    });

    it('should resolve relative paths', () => {
      const result = resolveProjectPath('./test');
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('test');
    });

    it('should handle absolute paths', () => {
      const absolutePath = '/tmp/test';
      const result = resolveProjectPath(absolutePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe('detectTypeScript', () => {
    it('should detect TypeScript via tsconfig.json', async () => {
      await fs.writeFile(path.join(testProjectPath, 'tsconfig.json'), '{}');

      const result = await detectTypeScript(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect TypeScript via tsconfig.build.json', async () => {
      await fs.writeFile(path.join(testProjectPath, 'tsconfig.build.json'), '{}');

      const result = await detectTypeScript(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect TypeScript via .ts files in src directory', async () => {
      const srcDir = path.join(testProjectPath, 'src');
      await fs.mkdir(srcDir);
      await fs.writeFile(path.join(srcDir, 'index.ts'), 'export {};');

      const result = await detectTypeScript(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect TypeScript via .tsx files', async () => {
      const srcDir = path.join(testProjectPath, 'src');
      await fs.mkdir(srcDir);
      await fs.writeFile(path.join(srcDir, 'App.tsx'), 'export {};');

      const result = await detectTypeScript(testProjectPath);
      expect(result).toBe(true);
    });

    it('should return false when no TypeScript detected', async () => {
      await fs.writeFile(path.join(testProjectPath, 'index.js'), 'console.log("hello");');

      const result = await detectTypeScript(testProjectPath);
      expect(result).toBe(false);
    });
  });

  describe('detectESLint', () => {
    it('should detect ESLint via .eslintrc.json', async () => {
      await fs.writeFile(path.join(testProjectPath, '.eslintrc.json'), '{}');

      const result = await detectESLint(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect ESLint via eslint.config.js', async () => {
      await fs.writeFile(path.join(testProjectPath, 'eslint.config.js'), 'module.exports = {};');

      const result = await detectESLint(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect ESLint via package.json eslintConfig', async () => {
      const packageJson = {
        name: 'test',
        eslintConfig: {
          extends: ['eslint:recommended'],
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectESLint(testProjectPath);
      expect(result).toBe(true);
    });

    it('should return false when no ESLint detected', async () => {
      const result = await detectESLint(testProjectPath);
      expect(result).toBe(false);
    });
  });

  describe('detectPrettier', () => {
    it('should detect Prettier via .prettierrc', async () => {
      await fs.writeFile(path.join(testProjectPath, '.prettierrc'), '{}');

      const result = await detectPrettier(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect Prettier via prettier.config.js', async () => {
      await fs.writeFile(path.join(testProjectPath, 'prettier.config.js'), 'module.exports = {};');

      const result = await detectPrettier(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect Prettier via package.json prettier field', async () => {
      const packageJson = {
        name: 'test',
        prettier: {
          semi: false,
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectPrettier(testProjectPath);
      expect(result).toBe(true);
    });

    it('should return false when no Prettier detected', async () => {
      const result = await detectPrettier(testProjectPath);
      expect(result).toBe(false);
    });
  });

  describe('detectJest', () => {
    it('should detect Jest via jest.config.js', async () => {
      await fs.writeFile(path.join(testProjectPath, 'jest.config.js'), 'module.exports = {};');

      const result = await detectJest(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect Jest via package.json jest field', async () => {
      const packageJson = {
        name: 'test',
        jest: {
          testEnvironment: 'node',
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectJest(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect Jest via dependencies', async () => {
      const packageJson = {
        name: 'test',
        devDependencies: {
          jest: '^29.0.0',
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectJest(testProjectPath);
      expect(result).toBe(true);
    });

    it('should return false when no Jest detected', async () => {
      const result = await detectJest(testProjectPath);
      expect(result).toBe(false);
    });
  });

  describe('detectVitest', () => {
    it('should detect Vitest via vitest.config.js', async () => {
      await fs.writeFile(path.join(testProjectPath, 'vitest.config.js'), 'export default {};');

      const result = await detectVitest(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect Vitest via vite.config.js with vitest content', async () => {
      const viteConfig = `
        import { defineConfig } from 'vite';
        export default defineConfig({
          test: {
            globals: true
          }
        });
      `;
      await fs.writeFile(path.join(testProjectPath, 'vite.config.js'), viteConfig);

      const result = await detectVitest(testProjectPath);
      expect(result).toBe(true);
    });

    it('should detect Vitest via dependencies', async () => {
      const packageJson = {
        name: 'test',
        devDependencies: {
          vitest: '^1.0.0',
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectVitest(testProjectPath);
      expect(result).toBe(true);
    });

    it('should return false when no Vitest detected', async () => {
      const result = await detectVitest(testProjectPath);
      expect(result).toBe(false);
    });
  });

  describe('detectPackageManager', () => {
    it('should detect npm via package-lock.json', async () => {
      await fs.writeFile(path.join(testProjectPath, 'package-lock.json'), '{}');

      const result = await detectPackageManager(testProjectPath);
      expect(result).toBe('npm');
    });

    it('should detect yarn via yarn.lock', async () => {
      await fs.writeFile(path.join(testProjectPath, 'yarn.lock'), '');

      const result = await detectPackageManager(testProjectPath);
      expect(result).toBe('yarn');
    });

    it('should detect pnpm via pnpm-lock.yaml', async () => {
      await fs.writeFile(path.join(testProjectPath, 'pnpm-lock.yaml'), '');

      const result = await detectPackageManager(testProjectPath);
      expect(result).toBe('pnpm');
    });

    it('should detect bun via bun.lockb', async () => {
      await fs.writeFile(path.join(testProjectPath, 'bun.lockb'), '');

      const result = await detectPackageManager(testProjectPath);
      expect(result).toBe('bun');
    });

    it('should prioritize bun over other package managers', async () => {
      // Create multiple lock files
      await fs.writeFile(path.join(testProjectPath, 'package-lock.json'), '{}');
      await fs.writeFile(path.join(testProjectPath, 'yarn.lock'), '');
      await fs.writeFile(path.join(testProjectPath, 'bun.lockb'), '');

      const result = await detectPackageManager(testProjectPath);
      expect(result).toBe('bun');
    });

    it('should detect package manager via package.json packageManager field', async () => {
      const packageJson = {
        name: 'test',
        packageManager: 'pnpm@8.0.0',
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectPackageManager(testProjectPath);
      expect(result).toBe('pnpm');
    });

    it('should fallback to npm when package.json exists but no lock files', async () => {
      const packageJson = { name: 'test' };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectPackageManager(testProjectPath);
      expect(result).toBe('npm');
    });

    it('should return null when no package.json or lock files exist', async () => {
      const result = await detectPackageManager(testProjectPath);
      expect(result).toBeNull();
    });
  });

  describe('detectGitRepository', () => {
    it('should detect git repository via .git directory', async () => {
      await fs.mkdir(path.join(testProjectPath, '.git'));

      const result = await detectGitRepository(testProjectPath);
      expect(result).toBe(true);
    });

    it('should return false when no .git directory exists', async () => {
      const result = await detectGitRepository(testProjectPath);
      expect(result).toBe(false);
    });
  });

  describe('detectClaudeConfig', () => {
    it('should detect Claude configuration via .claude directory', async () => {
      await fs.mkdir(path.join(testProjectPath, '.claude'));

      const result = await detectClaudeConfig(testProjectPath);
      expect(result).toBe(true);
    });

    it('should return false when no .claude directory exists', async () => {
      const result = await detectClaudeConfig(testProjectPath);
      expect(result).toBe(false);
    });
  });

  describe('detectNodeVersion', () => {
    it('should detect Node.js version', async () => {
      const result = await detectNodeVersion();

      // Should return a version string or undefined if Node.js not available
      if (result) {
        expect(typeof result).toBe('string');
        expect(result).toMatch(/^\d+\.\d+\.\d+/);
      } else {
        expect(result).toBeUndefined();
      }
    });
  });

  describe('detectPackageInfo', () => {
    it('should extract package information from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project',
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectPackageInfo(testProjectPath);
      expect(result).toEqual({
        name: 'test-project',
        version: '1.0.0',
      });
    });

    it('should return undefined when no package.json exists', async () => {
      const result = await detectPackageInfo(testProjectPath);
      expect(result).toBeUndefined();
    });

    it('should handle malformed package.json gracefully', async () => {
      await fs.writeFile(path.join(testProjectPath, 'package.json'), 'invalid json');

      const result = await detectPackageInfo(testProjectPath);
      expect(result).toBeUndefined();
    });
  });

  describe('detectFrameworks', () => {
    it('should detect React framework via dependencies', async () => {
      const packageJson = {
        name: 'test',
        dependencies: {
          react: '^18.0.0',
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectFrameworks(testProjectPath);
      expect(result).toContain('React');
    });

    it('should detect Next.js via config file', async () => {
      await fs.writeFile(path.join(testProjectPath, 'next.config.js'), 'module.exports = {};');

      const result = await detectFrameworks(testProjectPath);
      expect(result).toContain('Next.js');
    });

    it('should detect multiple frameworks', async () => {
      const packageJson = {
        name: 'test',
        dependencies: {
          react: '^18.0.0',
          express: '^4.18.0',
        },
        devDependencies: {
          vite: '^4.0.0',
          '@testing-library/react': '^13.0.0',
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectFrameworks(testProjectPath);
      expect(result).toContain('React');
      expect(result).toContain('Express');
      expect(result).toContain('Vite');
      expect(result).toContain('Testing Library');
    });

    it('should not duplicate framework names', async () => {
      const packageJson = {
        name: 'test',
        dependencies: {
          react: '^18.0.0',
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));
      await fs.writeFile(path.join(testProjectPath, 'next.config.js'), 'module.exports = {};');

      const result = await detectFrameworks(testProjectPath);
      expect(result.filter((f) => f === 'Next.js')).toHaveLength(1);
    });

    it('should return empty array when no frameworks detected', async () => {
      const result = await detectFrameworks(testProjectPath);
      expect(result).toEqual([]);
    });

    it('should return sorted framework list', async () => {
      const packageJson = {
        name: 'test',
        dependencies: {
          react: '^18.0.0',
          express: '^4.18.0',
          vue: '^3.0.0',
        },
      };
      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const result = await detectFrameworks(testProjectPath);
      expect(result).toEqual(['Express', 'React', 'Vue.js']);
    });
  });

  describe('detectProjectContext', () => {
    it('should detect comprehensive project information', async () => {
      // Set up a comprehensive test project
      const packageJson = {
        name: 'comprehensive-test',
        version: '2.1.0',
        dependencies: {
          react: '^18.0.0',
          express: '^4.18.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          eslint: '^8.0.0',
          prettier: '^2.8.0',
          vitest: '^1.0.0',
        },
        packageManager: 'pnpm@8.0.0',
      };

      await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson));
      await fs.writeFile(path.join(testProjectPath, 'tsconfig.json'), '{}');
      await fs.writeFile(path.join(testProjectPath, '.eslintrc.json'), '{}');
      await fs.writeFile(path.join(testProjectPath, '.prettierrc'), '{}');
      await fs.writeFile(path.join(testProjectPath, 'vitest.config.js'), 'export default {};');
      await fs.writeFile(path.join(testProjectPath, 'pnpm-lock.yaml'), '');
      await fs.mkdir(path.join(testProjectPath, '.git'));
      await fs.mkdir(path.join(testProjectPath, '.claude'));

      const result = await detectProjectContext(testProjectPath);

      expect(result).toMatchObject({
        hasTypeScript: true,
        hasESLint: true,
        hasPrettier: true,
        hasJest: false,
        hasVitest: true,
        packageManager: 'pnpm',
        projectPath: testProjectPath,
        isGitRepository: true,
        hasClaudeConfig: true,
        projectName: 'comprehensive-test',
        projectVersion: '2.1.0',
        frameworks: expect.arrayContaining(['React', 'Express']),
        environment: expect.any(String),
      });

      if (result.nodeVersion) {
        expect(result.nodeVersion).toMatch(/^\d+\.\d+\.\d+/);
      }
    });

    it('should handle minimal project setup', async () => {
      const result = await detectProjectContext(testProjectPath);

      expect(result).toMatchObject({
        hasTypeScript: false,
        hasESLint: false,
        packageManager: null,
        projectPath: testProjectPath,
        frameworks: [],
      });
    });

    it('should resolve path correctly', async () => {
      const relativePath = path.relative(process.cwd(), testProjectPath);
      const result = await detectProjectContext(relativePath);

      expect(result.projectPath).toBe(testProjectPath);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing directories gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent');

      const result = await detectProjectContext(nonExistentPath);
      expect(result.projectPath).toBe(nonExistentPath);
      expect(result.hasTypeScript).toBe(false);
      expect(result.hasESLint).toBe(false);
    });

    it('should handle corrupted package.json files', async () => {
      await fs.writeFile(path.join(testProjectPath, 'package.json'), 'invalid json content');

      const result = await detectProjectContext(testProjectPath);
      expect(result.packageManager).toBe(null);
      expect(result.projectName).toBeUndefined();
      expect(result.frameworks).toEqual([]);
    });

    it('should handle permission errors gracefully', async () => {
      // Create a directory with restricted permissions (if supported)
      const restrictedDir = path.join(testProjectPath, 'restricted');
      await fs.mkdir(restrictedDir);

      try {
        await fs.chmod(restrictedDir, 0o000);

        const result = await detectFrameworks(testProjectPath);
        expect(Array.isArray(result)).toBe(true);
      } catch {
        // If chmod is not supported or fails, skip this test
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(restrictedDir, 0o755);
        } catch {
          // Ignore errors during cleanup
        }
      }
    });
  });
});
