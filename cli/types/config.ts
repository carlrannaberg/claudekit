import { z } from 'zod';

// ============================================================================
// Core Configuration Schemas
// ============================================================================

/**
 * Platform schema for component and system compatibility
 */
export const PlatformSchema = z.enum(['darwin', 'linux', 'win32', 'all']);

/**
 * Component type schema
 */
export const ComponentTypeSchema = z.enum(['command', 'hook']);

/**
 * Package manager schema
 */
export const PackageManagerSchema = z.enum(['npm', 'yarn', 'pnpm', 'bun']);

/**
 * Log level schema
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

/**
 * Installation target schema
 */
export const InstallTargetSchema = z.enum(['user', 'project', 'both']);

/**
 * Output format schema
 */
export const OutputFormatSchema = z.enum(['json', 'table', 'yaml', 'compact']);

/**
 * Template type schema
 */
export const TemplateTypeSchema = z.enum(['default', 'basic', 'advanced', 'custom']);

/**
 * Component category schema
 */
export const ComponentCategorySchema = z.enum([
  'git',
  'validation',
  'development',
  'testing',
  'ai-assistant',
  'workflow',
  'project-management',
  'debugging',
  'utility',
]);

// ============================================================================
// Hook Configuration Schemas
// ============================================================================

/**
 * Individual hook configuration schema
 */
export const HookSchema = z.object({
  type: z.literal('command'),
  command: z.string(),
  enabled: z.boolean().optional().default(true),
  timeout: z.number().optional(),
  retries: z.number().optional().default(0),
  conditions: z.array(z.string()).optional(),
});

/**
 * Hook matcher configuration schema
 */
export const HookMatcherSchema = z.object({
  matcher: z.string(),
  hooks: z.array(HookSchema),
  description: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

/**
 * Hook event configuration schema
 */
export const HookEventSchema = z.enum(['PostToolUse', 'Stop', 'PreAction', 'PostAction']);

/**
 * Complete hooks configuration schema
 */
export const HooksConfigSchema = z.object({
  PostToolUse: z.array(HookMatcherSchema).optional(),
  Stop: z.array(HookMatcherSchema).optional(),
  PreAction: z.array(HookMatcherSchema).optional(),
  PostAction: z.array(HookMatcherSchema).optional(),
});

// ============================================================================
// Component Configuration Schema
// ============================================================================

/**
 * Dependency information schema
 */
export const DependencyInfoSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  optional: z.boolean().optional().default(false),
  installCommand: z.string().optional(),
  platforms: z.array(PlatformSchema).optional(),
  description: z.string().optional(),
});

/**
 * Component configuration schema
 */
export const ComponentSchema = z.object({
  id: z.string(),
  type: ComponentTypeSchema,
  name: z.string(),
  description: z.string(),
  path: z.string(),
  dependencies: z.array(z.string()).default([]),
  platforms: z.array(PlatformSchema).default(['all']),
  category: ComponentCategorySchema,
  version: z.string().optional(),
  author: z.string().optional(),
  enabled: z.boolean().optional().default(true),
  config: z.record(z.unknown()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// Project Information Schema
// ============================================================================

/**
 * Project detection and information schema
 */
export const ProjectInfoSchema = z.object({
  hasTypeScript: z.boolean(),
  hasESLint: z.boolean(),
  hasPrettier: z.boolean().optional(),
  hasJest: z.boolean().optional(),
  hasVitest: z.boolean().optional(),
  packageManager: PackageManagerSchema.nullable(),
  projectPath: z.string(),
  isGitRepository: z.boolean().optional(),
  hasClaudeConfig: z.boolean().optional(),
  nodeVersion: z.string().optional(),
  projectName: z.string().optional(),
  projectVersion: z.string().optional(),
  frameworks: z.array(z.string()).optional(),
  environment: z.string().optional(),
});

// ============================================================================
// Configuration Schemas
// ============================================================================

/**
 * User settings configuration schema
 */
export const UserSettingsSchema = z.object({
  defaultTemplate: TemplateTypeSchema.optional(),
  defaultTarget: InstallTargetSchema.optional(),
  autoBackup: z.boolean().optional().default(true),
  logLevel: LogLevelSchema.optional().default('info'),
  environment: z.record(z.string()).optional(),
  componentPaths: z.array(z.string()).optional(),
  editor: z.string().optional(),
  colorOutput: z.boolean().optional().default(true),
  autoUpdate: z.boolean().optional().default(false),
  notifications: z.boolean().optional().default(true),
});

/**
 * Project-specific settings schema
 */
export const ProjectSettingsSchema = z.object({
  hooks: z.record(z.unknown()).optional(),
  environment: z.record(z.string()).optional(),
  commands: z.record(z.unknown()).optional(),
  components: z.array(ComponentSchema.partial()).optional(),
  validation: z
    .object({
      rules: z.array(z.string()),
      autoFix: z.boolean().default(false),
      reportPath: z.string().optional(),
    })
    .optional(),
});

/**
 * Main configuration schema combining hooks and environment
 */
export const ConfigSchema = z.object({
  hooks: HooksConfigSchema,
  environment: z.record(z.string()).optional(),
  components: z.array(ComponentSchema).optional(),
  settings: UserSettingsSchema.optional(),
  projectSettings: ProjectSettingsSchema.optional(),
  version: z.string().optional(),
  lastUpdated: z.date().optional(),
});

// ============================================================================
// Operation Configuration Schemas
// ============================================================================

/**
 * Global options schema for CLI operations
 */
export const GlobalOptionsSchema = z.object({
  verbose: z.boolean().optional(),
  quiet: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
  config: z.string().optional(),
});

/**
 * Installation configuration schema
 */
export const InstallationSchema = z.object({
  components: z.array(ComponentSchema),
  target: InstallTargetSchema,
  backup: z.boolean().default(true),
  dryRun: z.boolean().default(false),
  projectInfo: ProjectInfoSchema.optional(),
  template: TemplateTypeSchema.optional(),
  force: z.boolean().optional(),
  installDependencies: z.boolean().optional().default(true),
  customPath: z.string().optional(),
});

/**
 * Validation result schema
 */
export const ValidationResultSchema = z.object({
  passed: z.boolean(),
  message: z.string(),
  type: z.enum(['all', 'config', 'structure', 'dependencies', 'permissions']),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  details: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  autoFixable: z.boolean().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

// Core types
export type Platform = z.infer<typeof PlatformSchema>;
export type ComponentType = z.infer<typeof ComponentTypeSchema>;
export type PackageManager = z.infer<typeof PackageManagerSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type InstallTarget = z.infer<typeof InstallTargetSchema>;
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type TemplateType = z.infer<typeof TemplateTypeSchema>;
export type ComponentCategory = z.infer<typeof ComponentCategorySchema>;

// Hook types
export type Hook = z.infer<typeof HookSchema>;
export type HookMatcher = z.infer<typeof HookMatcherSchema>;
export type HookEvent = z.infer<typeof HookEventSchema>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;

// Component and project types
export type Component = z.infer<typeof ComponentSchema>;
export type DependencyInfo = z.infer<typeof DependencyInfoSchema>;
export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;

// Configuration types
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Operation types
export type GlobalOptions = z.infer<typeof GlobalOptionsSchema>;
export type Installation = z.infer<typeof InstallationSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates and parses configuration data
 */
export function validateConfig(data: unknown): Config {
  return ConfigSchema.parse(data);
}

/**
 * Type guard to check if data is a valid configuration
 */
export function isValidConfig(data: unknown): data is Config {
  try {
    ConfigSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates component data
 */
export function validateComponent(data: unknown): Component {
  return ComponentSchema.parse(data);
}

/**
 * Type guard to check if data is a valid component
 */
export function isValidComponent(data: unknown): data is Component {
  try {
    ComponentSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates project information
 */
export function validateProjectInfo(data: unknown): ProjectInfo {
  return ProjectInfoSchema.parse(data);
}

/**
 * Type guard to check if data is valid project information
 */
export function isValidProjectInfo(data: unknown): data is ProjectInfo {
  try {
    ProjectInfoSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates installation configuration
 */
export function validateInstallation(data: unknown): Installation {
  return InstallationSchema.parse(data);
}

/**
 * Type guard to check if data is a valid installation configuration
 */
export function isValidInstallation(data: unknown): data is Installation {
  try {
    InstallationSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates global options
 */
export function validateGlobalOptions(data: unknown): GlobalOptions {
  return GlobalOptionsSchema.parse(data);
}

/**
 * Parses and validates configuration with detailed error reporting
 */
export function parseConfig(
  data: unknown
): { success: true; data: Config } | { success: false; errors: string[] } {
  try {
    const parsed = ConfigSchema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

// ============================================================================
// Installation Progress Types - Re-exported from installer.ts
// ============================================================================

// Re-export installer types to avoid duplication
export type {
  InstallStep,
  InstallProgress,
  InstallResult,
  InstallOptions,
} from '../lib/installer.js';
