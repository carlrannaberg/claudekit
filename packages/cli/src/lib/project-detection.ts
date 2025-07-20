import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
// import { promisify } from 'util'; // Unused
import { ProjectInfo, PackageManager } from '../types/index.js';
import { pathExists, normalizePath, expandHomePath } from './filesystem.js';

/**
 * Project Detection System for ClaudeKit CLI
 * 
 * Provides comprehensive project context detection for smart component recommendations.
 * Detects TypeScript, ESLint, package managers, and other project characteristics.
 */

// ============================================================================
// Core Project Detection Function
// ============================================================================

/**
 * Detects comprehensive project context including tools, frameworks, and configuration
 * 
 * @param projectPath - Path to the project directory (supports ~ expansion)
 * @returns ProjectInfo object with detected project characteristics
 */
export async function detectProjectContext(projectPath: string): Promise<ProjectInfo> {
  const resolvedPath = resolveProjectPath(projectPath);

  // Run all detection functions concurrently for performance
  const [
    hasTypeScript,
    hasESLint,
    hasPrettier,
    hasJest,
    hasVitest,
    packageManager,
    isGitRepository,
    hasClaudeConfig,
    nodeVersion,
    packageInfo,
    frameworks
  ] = await Promise.all([
    detectTypeScript(resolvedPath),
    detectESLint(resolvedPath),
    detectPrettier(resolvedPath),
    detectJest(resolvedPath),
    detectVitest(resolvedPath),
    detectPackageManager(resolvedPath),
    detectGitRepository(resolvedPath),
    detectClaudeConfig(resolvedPath),
    detectNodeVersion(),
    detectPackageInfo(resolvedPath),
    detectFrameworks(resolvedPath)
  ]);

  return {
    hasTypeScript,
    hasESLint,
    hasPrettier,
    hasJest,
    hasVitest,
    packageManager,
    projectPath: resolvedPath,
    isGitRepository,
    hasClaudeConfig,
    ...(nodeVersion && { nodeVersion }),
    ...(packageInfo?.name && { projectName: packageInfo.name }),
    ...(packageInfo?.version && { projectVersion: packageInfo.version }),
    frameworks,
    environment: process.env['NODE_ENV'] || 'development'
  };
}

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Resolves and normalizes project path with proper ~ expansion
 * 
 * @param projectPath - Input path (may contain ~)
 * @returns Absolute normalized path
 */
export function resolveProjectPath(projectPath: string): string {
  if (!projectPath) {
    return process.cwd();
  }
  
  const expanded = expandHomePath(projectPath);
  return normalizePath(expanded);
}

// ============================================================================
// TypeScript Detection
// ============================================================================

/**
 * Detects if project uses TypeScript by checking for configuration files
 * 
 * @param projectPath - Absolute path to project
 * @returns true if TypeScript is configured
 */
export async function detectTypeScript(projectPath: string): Promise<boolean> {
  const tsConfigFiles = [
    'tsconfig.json',
    'tsconfig.build.json',
    'tsconfig.app.json',
    'tsconfig.spec.json'
  ];

  for (const configFile of tsConfigFiles) {
    if (await pathExists(path.join(projectPath, configFile))) {
      return true;
    }
  }

  // Check for TypeScript files in common directories
  const commonTsDirs = ['src', 'lib', 'app', 'components'];
  for (const dir of commonTsDirs) {
    const dirPath = path.join(projectPath, dir);
    if (await pathExists(dirPath)) {
      try {
        const files = await fs.readdir(dirPath);
        if (files.some(file => file.endsWith('.ts') || file.endsWith('.tsx'))) {
          return true;
        }
      } catch {
        // Directory not accessible, continue
      }
    }
  }

  return false;
}

// ============================================================================
// ESLint Detection
// ============================================================================

/**
 * Detects ESLint configuration in various formats
 * 
 * @param projectPath - Absolute path to project
 * @returns true if ESLint is configured
 */
export async function detectESLint(projectPath: string): Promise<boolean> {
  const eslintConfigFiles = [
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.mjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs'
  ];

  for (const configFile of eslintConfigFiles) {
    if (await pathExists(path.join(projectPath, configFile))) {
      return true;
    }
  }

  // Check package.json for eslintConfig field
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.eslintConfig) {
        return true;
      }
    }
  } catch {
    // Error reading package.json, continue
  }

  return false;
}

// ============================================================================
// Prettier Detection
// ============================================================================

/**
 * Detects Prettier configuration
 * 
 * @param projectPath - Absolute path to project
 * @returns true if Prettier is configured
 */
export async function detectPrettier(projectPath: string): Promise<boolean> {
  const prettierConfigFiles = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    '.prettierrc.mjs',
    '.prettierrc.yaml',
    '.prettierrc.yml',
    'prettier.config.js',
    'prettier.config.cjs',
    'prettier.config.mjs'
  ];

  for (const configFile of prettierConfigFiles) {
    if (await pathExists(path.join(projectPath, configFile))) {
      return true;
    }
  }

  // Check package.json for prettier field
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.prettier) {
        return true;
      }
    }
  } catch {
    // Error reading package.json, continue
  }

  return false;
}

// ============================================================================
// Testing Framework Detection
// ============================================================================

/**
 * Detects Jest testing framework
 * 
 * @param projectPath - Absolute path to project
 * @returns true if Jest is configured
 */
export async function detectJest(projectPath: string): Promise<boolean> {
  const jestConfigFiles = [
    'jest.config.js',
    'jest.config.ts',
    'jest.config.mjs',
    'jest.config.cjs',
    'jest.config.json'
  ];

  for (const configFile of jestConfigFiles) {
    if (await pathExists(path.join(projectPath, configFile))) {
      return true;
    }
  }

  // Check package.json for jest config or dependency
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.jest) {
        return true;
      }
      
      // Check dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };
      
      if (allDeps.jest || allDeps['@types/jest']) {
        return true;
      }
    }
  } catch {
    // Error reading package.json, continue
  }

  return false;
}

/**
 * Detects Vitest testing framework
 * 
 * @param projectPath - Absolute path to project
 * @returns true if Vitest is configured
 */
export async function detectVitest(projectPath: string): Promise<boolean> {
  const vitestConfigFiles = [
    'vitest.config.js',
    'vitest.config.ts',
    'vitest.config.mjs',
    'vitest.config.cjs',
    'vite.config.js',
    'vite.config.ts',
    'vite.config.mjs',
    'vite.config.cjs'
  ];

  for (const configFile of vitestConfigFiles) {
    if (await pathExists(path.join(projectPath, configFile))) {
      // For Vite config files, check if they contain vitest configuration
      if (configFile.startsWith('vite.')) {
        try {
          const content = await fs.readFile(path.join(projectPath, configFile), 'utf-8');
          if (content.includes('vitest') || content.includes('test:')) {
            return true;
          }
        } catch {
          // Error reading config file, continue
        }
      } else {
        return true;
      }
    }
  }

  // Check package.json for vitest dependency
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };
      
      if (allDeps.vitest) {
        return true;
      }
    }
  } catch {
    // Error reading package.json, continue
  }

  return false;
}

// ============================================================================
// Package Manager Detection
// ============================================================================

/**
 * Detects the package manager used by the project
 * 
 * @param projectPath - Absolute path to project
 * @returns Detected package manager or null
 */
export async function detectPackageManager(projectPath: string): Promise<PackageManager | null> {
  // Check for lock files in order of preference
  const lockFileChecks: Array<{ file: string; manager: PackageManager }> = [
    { file: 'bun.lockb', manager: 'bun' },
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'package-lock.json', manager: 'npm' }
  ];

  for (const { file, manager } of lockFileChecks) {
    if (await pathExists(path.join(projectPath, file))) {
      return manager;
    }
  }

  // Check package.json for packageManager field
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.packageManager) {
        const pm = packageJson.packageManager.split('@')[0];
        if (['npm', 'yarn', 'pnpm', 'bun'].includes(pm)) {
          return pm as PackageManager;
        }
      }
    }
  } catch {
    // Error reading package.json, continue
  }

  // Fallback to npm if package.json exists and is valid
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      // Try to parse to ensure it's valid JSON
      await fs.readFile(packageJsonPath, 'utf-8').then(JSON.parse);
      return 'npm';
    }
  } catch {
    // Invalid or unreadable package.json, don't assume npm
  }

  return null;
}

// ============================================================================
// Git Repository Detection
// ============================================================================

/**
 * Detects if the project is a git repository
 * 
 * @param projectPath - Absolute path to project
 * @returns true if project is a git repository
 */
export async function detectGitRepository(projectPath: string): Promise<boolean> {
  return await pathExists(path.join(projectPath, '.git'));
}

// ============================================================================
// Claude Configuration Detection
// ============================================================================

/**
 * Detects if the project has Claude configuration
 * 
 * @param projectPath - Absolute path to project
 * @returns true if .claude directory exists
 */
export async function detectClaudeConfig(projectPath: string): Promise<boolean> {
  return await pathExists(path.join(projectPath, '.claude'));
}

// ============================================================================
// Node.js Version Detection
// ============================================================================

/**
 * Detects the Node.js version in use
 * 
 * @returns Node.js version string or undefined if not detected
 */
export async function detectNodeVersion(): Promise<string | undefined> {
  try {
    const nodeVersion = await executeCommand('node', ['--version']);
    return nodeVersion.trim().replace(/^v/, '');
  } catch {
    return undefined;
  }
}

// ============================================================================
// Package Information Detection
// ============================================================================

/**
 * Reads package.json information
 * 
 * @param projectPath - Absolute path to project
 * @returns Package information or undefined
 */
export async function detectPackageInfo(projectPath: string): Promise<{ name?: string; version?: string } | undefined> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      return {
        name: packageJson.name,
        version: packageJson.version
      };
    }
  } catch {
    // Error reading package.json
  }
  
  return undefined;
}

// ============================================================================
// Framework Detection
// ============================================================================

/**
 * Detects frameworks and libraries used by the project
 * 
 * @param projectPath - Absolute path to project
 * @returns Array of detected framework names
 */
export async function detectFrameworks(projectPath: string): Promise<string[]> {
  const frameworks: string[] = [];

  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      // Common framework patterns
      const frameworkPatterns = [
        { pattern: /^react$/, name: 'React' },
        { pattern: /^vue$/, name: 'Vue.js' },
        { pattern: /^@angular\/core$/, name: 'Angular' },
        { pattern: /^svelte$/, name: 'Svelte' },
        { pattern: /^next$/, name: 'Next.js' },
        { pattern: /^nuxt/, name: 'Nuxt.js' },
        { pattern: /^gatsby$/, name: 'Gatsby' },
        { pattern: /^vite$/, name: 'Vite' },
        { pattern: /^webpack$/, name: 'Webpack' },
        { pattern: /^rollup$/, name: 'Rollup' },
        { pattern: /^express$/, name: 'Express' },
        { pattern: /^fastify$/, name: 'Fastify' },
        { pattern: /^nestjs/, name: 'NestJS' },
        { pattern: /^@nestjs\/core$/, name: 'NestJS' },
        { pattern: /^electron$/, name: 'Electron' },
        { pattern: /^playwright$/, name: 'Playwright' },
        { pattern: /^cypress$/, name: 'Cypress' },
        { pattern: /^@testing-library/, name: 'Testing Library' },
        { pattern: /^storybook/, name: 'Storybook' },
        { pattern: /^@storybook/, name: 'Storybook' }
      ];

      for (const [depName] of Object.entries(allDeps)) {
        for (const { pattern, name } of frameworkPatterns) {
          if (pattern.test(depName) && !frameworks.includes(name)) {
            frameworks.push(name);
          }
        }
      }
    }
  } catch {
    // Error reading package.json
  }

  // Check for framework-specific config files
  const configFileChecks = [
    { file: 'next.config.js', framework: 'Next.js' },
    { file: 'next.config.mjs', framework: 'Next.js' },
    { file: 'nuxt.config.js', framework: 'Nuxt.js' },
    { file: 'nuxt.config.ts', framework: 'Nuxt.js' },
    { file: 'svelte.config.js', framework: 'Svelte' },
    { file: 'vite.config.js', framework: 'Vite' },
    { file: 'vite.config.ts', framework: 'Vite' },
    { file: 'webpack.config.js', framework: 'Webpack' },
    { file: 'rollup.config.js', framework: 'Rollup' },
    { file: 'gatsby-config.js', framework: 'Gatsby' },
    { file: 'angular.json', framework: 'Angular' },
    { file: '.storybook/main.js', framework: 'Storybook' },
    { file: 'playwright.config.js', framework: 'Playwright' },
    { file: 'playwright.config.ts', framework: 'Playwright' },
    { file: 'cypress.config.js', framework: 'Cypress' },
    { file: 'cypress.config.ts', framework: 'Cypress' }
  ];

  for (const { file, framework } of configFileChecks) {
    if (await pathExists(path.join(projectPath, file)) && !frameworks.includes(framework)) {
      frameworks.push(framework);
    }
  }

  return frameworks.sort();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Executes a command and returns the output
 * 
 * @param command - Command to execute
 * @param args - Command arguments
 * @returns Command output as string
 */
async function executeCommand(command: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { 
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: false 
    });
    
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}