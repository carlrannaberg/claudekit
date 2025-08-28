import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { z } from 'zod';
import { pathExists, normalizePath } from './filesystem.js';
import type { ComponentCategory, ComponentType } from '../types/config.js';

/**
 * Comprehensive Validation Module
 *
 * Provides security checks, prerequisite validation, input sanitization,
 * and clear error reporting for ClaudeKit CLI operations.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[];
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  sanitized?: unknown;
}

export interface PrerequisiteCheck {
  name: string;
  description: string;
  required: boolean;
  check: () => Promise<boolean>;
  installHint?: string;
}

export interface ProjectValidationOptions {
  allowSystemPaths?: boolean;
  maxDepth?: number;
  requireGitRepository?: boolean;
  requireNodeProject?: boolean;
}

export interface ComponentValidationOptions {
  maxComponents?: number;
  allowedCategories?: ComponentCategory[];
  allowedTypes?: ComponentType[];
  requireDescriptions?: boolean;
}

// ============================================================================
// Path Validation with Enhanced Security
// ============================================================================

/**
 * Enhanced project path validation with comprehensive security checks
 */
export function validateProjectPathSecure(
  input: string,
  options: ProjectValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Basic input validation
  if (!input || typeof input !== 'string') {
    errors.push({
      field: 'path',
      message: 'Path must be a non-empty string',
      severity: 'error',
      code: 'INVALID_INPUT',
    });
    return { isValid: false, errors, warnings };
  }

  // Normalize and expand the path
  let normalizedPath: string;
  try {
    normalizedPath = normalizePath(input);
  } catch (error) {
    errors.push({
      field: 'path',
      message: `Failed to normalize path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      code: 'PATH_NORMALIZATION_ERROR',
    });
    return { isValid: false, errors, warnings };
  }

  // Check for directory traversal attempts
  if (input.includes('..') || normalizedPath.includes('..')) {
    errors.push({
      field: 'path',
      message: 'Directory traversal detected in path',
      severity: 'error',
      code: 'DIRECTORY_TRAVERSAL',
      suggestions: ['Use absolute paths or paths relative to current directory without ".."'],
    });
  }

  // Path length validation
  if (normalizedPath.length > 1000) {
    errors.push({
      field: 'path',
      message: 'Path exceeds maximum length of 1000 characters',
      severity: 'error',
      code: 'PATH_TOO_LONG',
    });
  }

  // Check for control characters
  const hasControlChars = ((): boolean => {
    for (let i = 0; i < normalizedPath.length; i++) {
      const charCode = normalizedPath.charCodeAt(i);
      if (charCode <= 31 || charCode === 127) {
        return true;
      }
    }
    return false;
  })();

  if (hasControlChars) {
    errors.push({
      field: 'path',
      message: 'Path contains invalid control characters',
      severity: 'error',
      code: 'INVALID_CHARACTERS',
    });
  }

  // System path protection (unless explicitly allowed)
  if (options.allowSystemPaths !== true) {
    const systemPaths = ['/', '/usr', '/bin', '/sbin', '/etc', '/boot', '/dev', '/proc', '/sys'];
    // Allow temporary directories which may be under /var or /tmp
    const tempDir = os.tmpdir();
    const isInTempDir = normalizedPath.startsWith(`${tempDir}/`) || normalizedPath === tempDir;

    if (
      !isInTempDir &&
      systemPaths.some(
        (sysPath) => normalizedPath === sysPath || normalizedPath.startsWith(`${sysPath}/`)
      )
    ) {
      errors.push({
        field: 'path',
        message: 'Access to system directories is not allowed',
        severity: 'error',
        code: 'SYSTEM_PATH_FORBIDDEN',
        suggestions: ['Use a directory in your home folder or project workspace'],
      });
    }
  }

  // Critical user directory protection
  const homeDir = os.homedir();
  const criticalUserPaths = [
    homeDir,
    path.join(homeDir, 'Library'),
    path.join(homeDir, '.ssh'),
    path.join(homeDir, '.gnupg'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Downloads'),
  ];

  if (criticalUserPaths.includes(normalizedPath)) {
    errors.push({
      field: 'path',
      message: 'Direct access to critical user directories is not allowed',
      severity: 'error',
      code: 'CRITICAL_DIRECTORY_FORBIDDEN',
      suggestions: ['Create a subdirectory or use a dedicated project folder'],
    });
  }

  // Hidden directory warning (except for .claude and common dev directories)
  const basename = path.basename(normalizedPath);
  if (
    basename.startsWith('.') &&
    !['..', '.', '.claude', '.git', '.vscode', '.idea'].includes(basename)
  ) {
    warnings.push({
      field: 'path',
      message: 'Working with hidden directories may cause unexpected behavior',
      severity: 'warning',
      code: 'HIDDEN_DIRECTORY',
    });
  }

  // Maximum nesting depth check
  const maxDepth = options.maxDepth ?? 10;
  const pathSegments = normalizedPath.split(path.sep).filter((segment) => segment.length > 0);
  if (pathSegments.length > maxDepth) {
    warnings.push({
      field: 'path',
      message: `Path depth (${pathSegments.length}) exceeds recommended maximum (${maxDepth})`,
      severity: 'warning',
      code: 'EXCESSIVE_NESTING',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized: normalizedPath,
  };
}

/**
 * Validates that a path exists and is accessible for the intended operation
 */
export async function validatePathAccessibility(
  targetPath: string,
  operation: 'read' | 'write' | 'execute' = 'read'
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    const stats = await fs.stat(targetPath);

    // Check if path is a directory when expected to be a file (and vice versa)
    if (targetPath.endsWith('/') && !stats.isDirectory()) {
      errors.push({
        field: 'path',
        message: 'Path appears to reference a directory but points to a file',
        severity: 'error',
        code: 'TYPE_MISMATCH',
      });
    }

    // Check permissions based on operation
    try {
      if (operation === 'read') {
        await fs.access(targetPath, fs.constants.R_OK);
      } else if (operation === 'write') {
        await fs.access(targetPath, fs.constants.W_OK);
      } else if (operation === 'execute') {
        await fs.access(targetPath, fs.constants.X_OK);
      }
    } catch {
      errors.push({
        field: 'path',
        message: `Insufficient ${operation} permissions for path`,
        severity: 'error',
        code: 'PERMISSION_DENIED',
        suggestions: [`Check file permissions and ownership of ${targetPath}`],
      });
    }

    // Warn about unusual file sizes for configuration files
    if (stats.isFile() && targetPath.endsWith('.json') && stats.size > 1024 * 1024) {
      warnings.push({
        field: 'path',
        message: 'Configuration file is unusually large (>1MB)',
        severity: 'warning',
        code: 'LARGE_CONFIG_FILE',
      });
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // For write operations, check if parent directory exists and is writable
      if (operation === 'write') {
        const parentDir = path.dirname(targetPath);
        try {
          await fs.access(parentDir, fs.constants.W_OK);
          // Parent is writable, this is OK for write operations
        } catch {
          errors.push({
            field: 'path',
            message: 'Parent directory does not exist or is not writable',
            severity: 'error',
            code: 'PARENT_NOT_WRITABLE',
            suggestions: ['Create the parent directory first', `mkdir -p ${parentDir}`],
          });
        }
      } else {
        errors.push({
          field: 'path',
          message: 'Path does not exist',
          severity: 'error',
          code: 'PATH_NOT_FOUND',
          ...(operation === 'read'
            ? { suggestions: ['Check if the path is correct', 'Ensure the file was created'] }
            : {}),
        });
      }
    } else {
      errors.push({
        field: 'path',
        message: `Failed to access path: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
        code: 'ACCESS_ERROR',
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================================================
// Component Validation
// ============================================================================

/**
 * Component name validation schema
 */
const ComponentNameSchema = z
  .string()
  .min(1, 'Component name cannot be empty')
  .max(100, 'Component name cannot exceed 100 characters')
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    'Component name must start and end with alphanumeric characters and contain only lowercase letters, numbers, and hyphens'
  );

/**
 * Validates component names with enhanced rules
 */
export function validateComponentName(name: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    ComponentNameSchema.parse(name);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        errors.push({
          field: 'componentName',
          message: err.message,
          severity: 'error',
          code: 'INVALID_COMPONENT_NAME',
          suggestions: [
            'Use lowercase letters, numbers, and hyphens only',
            'Start and end with alphanumeric characters',
            'Examples: "my-hook", "git-utils", "validator"',
          ],
        });
      });
    }
  }

  // Reserved name check
  const reservedNames = [
    'init',
    'validate',
    'install',
    'remove',
    'list',
    'update',
    'add',
    'system',
    'config',
    'settings',
    'main',
    'index',
    'default',
    'test',
    'spec',
    'example',
    'sample',
    'demo',
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    errors.push({
      field: 'componentName',
      message: `"${name}" is a reserved name and cannot be used`,
      severity: 'error',
      code: 'RESERVED_NAME',
      suggestions: [`Try "${name}-custom"`, `Try "my-${name}"`, `Try "${name}-hook"`],
    });
  }

  // Naming convention warnings
  if (name.includes('_')) {
    warnings.push({
      field: 'componentName',
      message: 'Underscores in component names may cause compatibility issues',
      severity: 'warning',
      code: 'UNDERSCORE_IN_NAME',
      suggestions: ['Use hyphens instead of underscores'],
    });
  }

  if (name.length > 50) {
    warnings.push({
      field: 'componentName',
      message: 'Component name is quite long and may be difficult to work with',
      severity: 'warning',
      code: 'LONG_NAME',
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Sanitizes and validates a list of component identifiers
 */
export function sanitizeComponentList(
  components: unknown,
  options: ComponentValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const sanitized: string[] = [];

  // Basic type validation
  let componentArray: unknown[];
  if (!Array.isArray(components)) {
    if (typeof components === 'string') {
      // Try to split string by common delimiters
      componentArray = components.split(/[,\s;]+/).filter((c) => c.length > 0);
    } else {
      errors.push({
        field: 'components',
        message: 'Components must be provided as an array or comma-separated string',
        severity: 'error',
        code: 'INVALID_TYPE',
      });
      return { isValid: false, errors, warnings };
    }
  } else {
    componentArray = components;
  }

  // Validate each component
  for (let i = 0; i < componentArray.length; i++) {
    const component = componentArray[i];

    if (typeof component !== 'string') {
      warnings.push({
        field: `components[${i}]`,
        message: `Component at index ${i} is not a string and will be skipped`,
        severity: 'warning',
        code: 'NON_STRING_COMPONENT',
      });
      continue;
    }

    const trimmed = component.trim();
    if (!trimmed) {
      warnings.push({
        field: `components[${i}]`,
        message: `Empty component at index ${i} will be skipped`,
        severity: 'warning',
        code: 'EMPTY_COMPONENT',
      });
      continue;
    }

    // Validate component name
    const nameValidation = validateComponentName(trimmed);
    if (!nameValidation.isValid) {
      nameValidation.errors.forEach((error) => {
        errors.push({
          ...error,
          field: `components[${i}]`,
        });
      });
      continue;
    }

    // Check for duplicates
    if (sanitized.includes(trimmed)) {
      warnings.push({
        field: `components[${i}]`,
        message: `Duplicate component "${trimmed}" will be ignored`,
        severity: 'warning',
        code: 'DUPLICATE_COMPONENT',
      });
      continue;
    }

    sanitized.push(trimmed);
  }

  // Apply limits
  const maxComponents = options.maxComponents ?? 50;
  if (sanitized.length > maxComponents) {
    warnings.push({
      field: 'components',
      message: `Component list truncated to ${maxComponents} items (had ${sanitized.length})`,
      severity: 'warning',
      code: 'LIST_TRUNCATED',
    });
    sanitized.splice(maxComponents);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Prerequisite Checking
// ============================================================================

/**
 * Checks if Node.js is available and meets version requirements
 */
export async function checkNodePrerequisite(minVersion = '18.0.0'): Promise<PrerequisiteCheck> {
  return {
    name: 'Node.js',
    description: `Node.js runtime (>= ${minVersion})`,
    required: true,
    installHint: 'Install Node.js from https://nodejs.org/',
    check: async (): Promise<boolean> => {
      try {
        const nodeVersion = process.version;
        const currentVersion = nodeVersion.slice(1); // Remove 'v' prefix

        // Simple version comparison (works for semantic versions)
        const currentParts = currentVersion.split('.').map(Number);
        const requiredParts = minVersion.split('.').map(Number);

        for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
          const current = currentParts[i] ?? 0;
          const required = requiredParts[i] ?? 0;

          if (current > required) {
            return true;
          }
          if (current < required) {
            return false;
          }
        }

        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Checks if TypeScript is available (globally or locally)
 */
export async function checkTypeScriptPrerequisite(): Promise<PrerequisiteCheck> {
  return {
    name: 'TypeScript',
    description: 'TypeScript compiler (tsc)',
    required: false,
    installHint: 'npm install -g typescript',
    check: async (): Promise<boolean> => {
      try {
        // Check for local TypeScript first
        const localTsc = path.join(process.cwd(), 'node_modules', '.bin', 'tsc');
        if (await pathExists(localTsc)) {
          return true;
        }

        // Check for global TypeScript
        const { exec } = await import('node:child_process');
        return new Promise((resolve) => {
          exec('tsc --version', (error) => {
            resolve(!error);
          });
        });
      } catch {
        return false;
      }
    },
  };
}

/**
 * Checks if ESLint is available with proper configuration
 */
export async function checkESLintPrerequisite(): Promise<PrerequisiteCheck> {
  return {
    name: 'ESLint',
    description: 'ESLint linter with valid configuration',
    required: false,
    installHint: 'npm install eslint',
    check: async (): Promise<boolean> => {
      try {
        // Check for ESLint binary
        const localESLint = path.join(process.cwd(), 'node_modules', '.bin', 'eslint');
        if (!(await pathExists(localESLint))) {
          // Check global ESLint
          const { exec } = await import('node:child_process');
          const hasGlobalESLint = await new Promise<boolean>((resolve) => {
            exec('eslint --version', (error) => {
              resolve(!error);
            });
          });

          if (!hasGlobalESLint) {
            return false;
          }
        }

        // Check for ESLint configuration
        const configFiles = [
          '.eslintrc.js',
          '.eslintrc.json',
          '.eslintrc.yml',
          '.eslintrc.yaml',
          'eslint.config.js',
          'eslint.config.mjs',
        ];

        for (const configFile of configFiles) {
          if (await pathExists(path.join(process.cwd(), configFile))) {
            return true;
          }
        }

        // Check package.json for eslintConfig
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (await pathExists(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            return packageJson.eslintConfig !== undefined && packageJson.eslintConfig !== null;
          } catch {
            // Ignore JSON parsing errors
          }
        }

        return false;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Checks if Git is available and the current directory is a Git repository
 */
export async function checkGitPrerequisite(requireRepository = false): Promise<PrerequisiteCheck> {
  return {
    name: 'Git',
    description: requireRepository
      ? 'Git with initialized repository'
      : 'Git version control system',
    required: false,
    installHint: 'Install Git from https://git-scm.com/',
    check: async (): Promise<boolean> => {
      try {
        const { exec } = await import('node:child_process');

        // Check if git is available
        const hasGit = await new Promise<boolean>((resolve) => {
          exec('git --version', (error) => {
            resolve(!error);
          });
        });

        if (!hasGit) {
          return false;
        }

        if (requireRepository) {
          // Check if current directory is a Git repository
          return new Promise((resolve) => {
            exec('git rev-parse --git-dir', (error) => {
              resolve(!error);
            });
          });
        }

        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Runs all relevant prerequisite checks for ClaudeKit operations
 */
export async function checkAllPrerequisites(
  options: {
    requireTypeScript?: boolean;
    requireESLint?: boolean;
    requireGitRepository?: boolean;
    nodeMinVersion?: string;
  } = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const checks: PrerequisiteCheck[] = [
    await checkNodePrerequisite(options.nodeMinVersion),
    await checkTypeScriptPrerequisite(),
    await checkESLintPrerequisite(),
    await checkGitPrerequisite(options.requireGitRepository),
  ];

  for (const check of checks) {
    const isAvailable = await check.check();

    if (!isAvailable) {
      const error: ValidationError = {
        field: 'prerequisites',
        message: `${check.name}: ${check.description} is not available`,
        severity: check.required ? 'error' : 'warning',
        code: `MISSING_${check.name.toUpperCase().replace(/[^A-Z]/g, '_')}`,
        ...(check.installHint !== undefined && check.installHint !== ''
          ? { suggestions: [check.installHint] }
          : {}),
      };

      if (check.required) {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitizes user input for safe use in shell commands
 */
export function sanitizeShellInput(input: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (typeof input !== 'string') {
    errors.push({
      field: 'input',
      message: 'Input must be a string',
      severity: 'error',
      code: 'INVALID_TYPE',
    });
    return { isValid: false, errors, warnings };
  }

  // Check for dangerous characters and patterns
  const dangerousChars = /[;&|`$(){}[\]<>\\]/;
  if (dangerousChars.test(input)) {
    errors.push({
      field: 'input',
      message: 'Input contains potentially dangerous shell characters',
      severity: 'error',
      code: 'DANGEROUS_CHARACTERS',
      suggestions: ['Remove or escape special characters: ; & | ` $ ( ) { } [ ] < > \\'],
    });
  }

  // Check for dangerous command patterns
  const dangerousPatterns = [
    /\brm\s+(-[rf]+\s*)*\/+/i, // rm -rf / variants
    /\bsudo\s+rm\b/i, // sudo rm
    /\bmkfs\b/i, // mkfs (format filesystem)
    /\bdd\s+if=/i, // dd if= (dangerous copy)
    /\bchmod\s+777\b/i, // chmod 777
    /\b(cat|grep|awk|sed)\s+.*\/etc\/passwd/i, // reading passwd
    /\b(wget|curl).*http/i, // downloading from internet
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      errors.push({
        field: 'input',
        message: 'Input contains potentially dangerous command patterns',
        severity: 'error',
        code: 'DANGEROUS_COMMAND',
        suggestions: ['Avoid destructive commands or system access patterns'],
      });
      break;
    }
  }

  // Check for null bytes
  if (input.includes('\0')) {
    errors.push({
      field: 'input',
      message: 'Input contains null bytes',
      severity: 'error',
      code: 'NULL_BYTES',
    });
  }

  // Length check
  if (input.length > 1000) {
    warnings.push({
      field: 'input',
      message: 'Input is very long and may cause issues',
      severity: 'warning',
      code: 'LONG_INPUT',
    });
  }

  // Sanitize the input
  const sanitized = input
    .replace(/./g, (char) => {
      const charCode = char.charCodeAt(0);
      return charCode <= 31 || charCode === 127 ? '' : char;
    }) // Remove control characters
    .trim();

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

/**
 * Validates and sanitizes configuration objects
 */
export function sanitizeConfigInput(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (config === null || config === undefined) {
    errors.push({
      field: 'config',
      message: 'Configuration cannot be null or undefined',
      severity: 'error',
      code: 'NULL_CONFIG',
    });
    return { isValid: false, errors, warnings };
  }

  if (typeof config !== 'object' || Array.isArray(config)) {
    errors.push({
      field: 'config',
      message: 'Configuration must be a plain object',
      severity: 'error',
      code: 'INVALID_CONFIG_TYPE',
    });
    return { isValid: false, errors, warnings };
  }

  // Check for functions and other non-serializable values before cloning
  function hasNonSerializableValues(obj: unknown, visited = new Set()): boolean {
    if (visited.has(obj)) {
      return true;
    } // Circular reference
    if (obj === null || typeof obj !== 'object') {
      return false;
    }
    if (typeof obj === 'function') {
      return true;
    }

    visited.add(obj);

    for (const value of Object.values(obj)) {
      if (typeof value === 'function' || typeof value === 'symbol') {
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        if (hasNonSerializableValues(value, visited)) {
          return true;
        }
      }
    }

    visited.delete(obj);
    return false;
  }

  if (hasNonSerializableValues(config)) {
    errors.push({
      field: 'config',
      message: 'Configuration contains non-serializable values',
      severity: 'error',
      code: 'NON_SERIALIZABLE',
      suggestions: ['Remove functions, symbols, or circular references from configuration'],
    });
    return { isValid: false, errors, warnings };
  }

  // Deep clone to avoid mutation
  let sanitized: unknown;
  try {
    sanitized = JSON.parse(JSON.stringify(config));
  } catch {
    errors.push({
      field: 'config',
      message: 'Configuration contains non-serializable values',
      severity: 'error',
      code: 'NON_SERIALIZABLE',
      suggestions: ['Remove functions, symbols, or circular references from configuration'],
    });
    return { isValid: false, errors, warnings };
  }

  // Check for overly nested configuration
  function getMaxDepth(obj: unknown, currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      maxDepth = Math.max(maxDepth, getMaxDepth(value, currentDepth + 1));
    }

    return maxDepth;
  }

  const maxDepth = getMaxDepth(sanitized);
  if (maxDepth > 10) {
    warnings.push({
      field: 'config',
      message: `Configuration is deeply nested (depth: ${maxDepth}). This may impact performance.`,
      severity: 'warning',
      code: 'DEEP_NESTING',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Project Validation
// ============================================================================

/**
 * Comprehensive project validation including structure and prerequisites
 */
export async function validateProject(
  projectPath: string,
  options: ProjectValidationOptions = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Path validation
  const pathValidation = validateProjectPathSecure(projectPath, options);
  errors.push(...pathValidation.errors);
  warnings.push(...pathValidation.warnings);

  if (!pathValidation.isValid) {
    return { isValid: false, errors, warnings };
  }

  const sanitizedPath = pathValidation.sanitized as string;

  // Check path accessibility
  const accessValidation = await validatePathAccessibility(sanitizedPath, 'read');
  errors.push(...accessValidation.errors);
  warnings.push(...accessValidation.warnings);

  // Check if it's a valid project directory
  try {
    const stats = await fs.stat(sanitizedPath);
    if (!stats.isDirectory()) {
      errors.push({
        field: 'projectPath',
        message: 'Project path must be a directory',
        severity: 'error',
        code: 'NOT_DIRECTORY',
      });
      return { isValid: false, errors, warnings };
    }
  } catch (error: unknown) {
    errors.push({
      field: 'projectPath',
      message: `Cannot access project directory: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
      code: 'ACCESS_ERROR',
    });
    return { isValid: false, errors, warnings };
  }

  // Optional: Check for Node.js project
  if (options.requireNodeProject === true) {
    const packageJsonPath = path.join(sanitizedPath, 'package.json');
    if (!(await pathExists(packageJsonPath))) {
      errors.push({
        field: 'projectPath',
        message: 'Project directory must contain a package.json file',
        severity: 'error',
        code: 'NOT_NODE_PROJECT',
        suggestions: ['Run "npm init" to create a package.json file'],
      });
    }
  }

  // Optional: Check for Git repository
  if (options.requireGitRepository === true) {
    const gitPath = path.join(sanitizedPath, '.git');
    if (!(await pathExists(gitPath))) {
      errors.push({
        field: 'projectPath',
        message: 'Project directory must be a Git repository',
        severity: 'error',
        code: 'NOT_GIT_REPOSITORY',
        suggestions: ['Run "git init" to initialize a Git repository'],
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized: sanitizedPath,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats validation results into a human-readable error message
 */
export function formatValidationErrors(result: ValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('Validation Errors:');
    result.errors.forEach((error) => {
      let message = `  ✗ ${error.field}: ${error.message}`;
      if (error.code !== undefined && error.code !== '') {
        message += ` [${error.code}]`;
      }
      messages.push(message);

      if (error.suggestions) {
        error.suggestions.forEach((suggestion) => {
          messages.push(`    → ${suggestion}`);
        });
      }
    });
  }

  if (result.warnings.length > 0) {
    if (messages.length > 0) {
      messages.push('');
    }
    messages.push('Validation Warnings:');
    result.warnings.forEach((warning) => {
      let message = `  ⚠ ${warning.field}: ${warning.message}`;
      if (warning.code !== undefined && warning.code !== '') {
        message += ` [${warning.code}]`;
      }
      messages.push(message);
    });
  }

  return messages.join('\n');
}

/**
 * Creates a validation error with consistent formatting
 */
export function createValidationError(
  field: string,
  message: string,
  options: {
    severity?: 'error' | 'warning' | 'info';
    code?: string;
    suggestions?: string[];
  } = {}
): ValidationError {
  return {
    field,
    message,
    severity: options.severity || 'error',
    ...(options.code !== undefined && options.code !== '' ? { code: options.code } : {}),
    ...(options.suggestions ? { suggestions: options.suggestions } : {}),
  };
}

/**
 * Combines multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
