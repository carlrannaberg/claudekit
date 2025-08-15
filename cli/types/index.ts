/**
 * Comprehensive type definitions for ClaudeKit CLI
 *
 * This file contains all interfaces, types, and enums used throughout the ClaudeKit CLI application.
 * It provides type safety and consistency across the entire codebase.
 */

// Re-export config types
export * from './config.js';

// ============================================================================
// Core Platform and Component Types
// ============================================================================

/**
 * Supported platforms for ClaudeKit components
 */
export type Platform = 'darwin' | 'linux' | 'win32' | 'all';

/**
 * Component categories for organization
 */
export type ComponentCategory =
  | 'git'
  | 'validation'
  | 'development'
  | 'testing'
  | 'ai-assistant'
  | 'workflow'
  | 'project-management'
  | 'debugging'
  | 'utility';

/**
 * Component types in the ClaudeKit ecosystem
 */
export type ComponentType = 'command' | 'hook' | 'agent';

/**
 * Package managers that can be detected and used
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * Log levels for the logging system
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Installation targets for components
 */
export type InstallTarget = 'user' | 'project' | 'both';

/**
 * Validation types for different validation operations
 */
export type ValidationType = 'all' | 'config' | 'structure' | 'dependencies' | 'permissions';

/**
 * Output formats for list and display operations
 */
export type OutputFormat = 'json' | 'table' | 'yaml' | 'compact';

/**
 * Template types for component generation
 */
export type TemplateType = 'default' | 'basic' | 'advanced' | 'custom';

// ============================================================================
// Core Component Interface
// ============================================================================

/**
 * Represents a ClaudeKit component (command or hook)
 */
export interface Component {
  /** Unique identifier for the component */
  id: string;

  /** Type of component */
  type: ComponentType;

  /** Human-readable name */
  name: string;

  /** Brief description of what the component does */
  description: string;

  /** File system path to the component */
  path: string;

  /** List of dependencies required by this component */
  dependencies: string[];

  /** Category for organization */
  category: ComponentCategory;

  /** Version of the component */
  version?: string;

  /** Author information */
  author?: string;

  /** Configuration options specific to this component */
  config?: Record<string, unknown>;

  /** Creation timestamp */
  createdAt?: Date;

  /** Last modified timestamp */
  updatedAt?: Date;
}

// ============================================================================
// Project Detection and Information
// ============================================================================

/**
 * Project information detected from the file system
 */
export interface ProjectInfo {
  /** Whether TypeScript is configured in the project */
  hasTypeScript: boolean;

  /** Whether ESLint is configured in the project */
  hasESLint: boolean;

  /** Whether Prettier is configured in the project */
  hasPrettier?: boolean;

  /** Whether Jest is configured in the project */
  hasJest?: boolean;

  /** Whether Vitest is configured in the project */
  hasVitest?: boolean;

  /** Detected package manager */
  packageManager: PackageManager | null;

  /** Absolute path to the project root */
  projectPath: string;

  /** Whether the project is a git repository */
  isGitRepository?: boolean;

  /** Whether the project has a .claude directory */
  hasClaudeConfig?: boolean;

  /** Node.js version if detected */
  nodeVersion?: string;

  /** Project name from package.json */
  projectName?: string;

  /** Project version from package.json */
  projectVersion?: string;

  /** List of detected frameworks/libraries */
  frameworks?: string[];

  /** Environment type (development, production, etc.) */
  environment?: string;
}

// ============================================================================
// Installation and Setup
// ============================================================================

/**
 * Installation configuration and context
 */
export interface Installation {
  /** Components to install */
  components: Component[];

  /** Where to install the components */
  target: InstallTarget;

  /** Whether to create backups before installation */
  backup: boolean;

  /** Whether this is a dry run (no actual changes) */
  dryRun: boolean;

  /** Project information for context-aware installation */
  projectInfo?: ProjectInfo;

  /** Template to use for new components */
  template?: TemplateType;

  /** Force installation even if components exist */
  force?: boolean;

  /** Whether to install dependencies automatically */
  installDependencies?: boolean;

  /** Custom installation directory */
  customPath?: string;
}

/**
 * Installation result with details about what was installed
 */
export interface InstallationResult {
  /** Whether the installation was successful */
  success: boolean;

  /** Number of components successfully installed */
  installedCount: number;

  /** Number of components that failed to install */
  failedCount: number;

  /** List of successfully installed components */
  installed: Component[];

  /** List of components that failed with error details */
  failed: Array<{
    component: Component;
    error: string;
  }>;

  /** Warnings generated during installation */
  warnings: string[];

  /** Time taken for the installation */
  duration?: number;

  /** Backup information if backups were created */
  backups?: BackupInfo[];
}

/**
 * Backup information for rollback purposes
 */
export interface BackupInfo {
  /** Original file path */
  originalPath: string;

  /** Backup file path */
  backupPath: string;

  /** Timestamp when backup was created */
  timestamp: Date;

  /** File hash for integrity verification */
  hash?: string;
}

// ============================================================================
// Command Options and Results
// ============================================================================

/**
 * Global options available for all commands
 */
export interface GlobalOptions {
  /** Enable verbose output */
  verbose?: boolean;

  /** Suppress non-error output */
  quiet?: boolean;

  /** Perform dry run without making changes */
  dryRun?: boolean;

  /** Force operation even if warnings exist */
  force?: boolean;

  /** Configuration file path */
  config?: string;
}

/**
 * Options for the init/setup command
 */
export interface InitOptions extends GlobalOptions {
  /** Template to use for initialization */
  template?: TemplateType;

  /** Skip interactive prompts */
  skipPrompts?: boolean;

  /** Git repository URL for template */
  templateRepo?: string;
}

/**
 * Options for the add command
 */
export interface AddOptions extends GlobalOptions {
  /** Template to use for the new component */
  template?: TemplateType;

  /** Custom path for the component */
  path?: string;

  /** Category for the component */
  category?: ComponentCategory;

  /** Dependencies for the component */
  dependencies?: string[];

  /** Platforms the component supports */
  platforms?: Platform[];
}

/**
 * Options for the remove command
 */
export interface RemoveOptions extends GlobalOptions {
  /** Skip confirmation prompts */
  skipConfirmation?: boolean;

  /** Remove dependencies that are no longer needed */
  removeDependencies?: boolean;

  /** Create backup before removal */
  backup?: boolean;
}

/**
 * Options for the update command
 */
export interface UpdateOptions extends GlobalOptions {
  /** Configuration as JSON string */
  config?: string;

  /** Configuration from file */
  file?: string;

  /** Update all components */
  all?: boolean;

  /** Check for updates without applying them */
  checkOnly?: boolean;
}

/**
 * Options for the list command
 */
export interface ListOptions extends GlobalOptions {
  /** Output format */
  format?: OutputFormat;

  /** Filter pattern */
  filter?: string;

  /** Include disabled components */
  includeDisabled?: boolean;

  /** Sort by field */
  sortBy?: keyof Component;

  /** Sort in descending order */
  descending?: boolean;
}

/**
 * Options for the validate command
 */
export interface ValidateOptions extends GlobalOptions {
  /** Type of validation to perform */
  type?: ValidationType;

  /** Fix issues automatically where possible */
  autoFix?: boolean;

  /** Output validation report to file */
  outputFile?: string;
}

// ============================================================================
// Validation and Results
// ============================================================================

/**
 * Validation result for a single check
 */
export interface ValidationResult {
  /** Whether the validation passed */
  passed: boolean;

  /** Human-readable message */
  message: string;

  /** Validation type that was performed */
  type: ValidationType;

  /** Severity level of any issues found */
  severity?: 'info' | 'warning' | 'error';

  /** Detailed error information */
  details?: string;

  /** Suggestions for fixing issues */
  suggestions?: string[];

  /** Whether the issue can be auto-fixed */
  autoFixable?: boolean;
}

/**
 * Comprehensive validation report
 */
export interface ValidationReport {
  /** Overall validation status */
  passed: boolean;

  /** Individual validation results */
  results: ValidationResult[];

  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };

  /** Project information used for validation */
  projectInfo: ProjectInfo;

  /** Timestamp when validation was performed */
  timestamp: Date;

  /** Time taken for validation */
  duration: number;
}

// ============================================================================
// Operation Results
// ============================================================================

/**
 * Generic operation result interface
 */
export interface OperationResult<T = unknown> {
  /** Whether the operation was successful */
  success: boolean;

  /** Result data if successful */
  data?: T;

  /** Error message if failed */
  error?: string;

  /** Warnings generated during operation */
  warnings?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a component listing operation
 */
export interface ListResult {
  /** List of components */
  components: Component[];

  /** Total count */
  total: number;

  /** Filters applied */
  filters: {
    type?: ComponentType;
    category?: ComponentCategory;
    enabled?: boolean;
    pattern?: string;
  };

  /** Project information */
  projectInfo: ProjectInfo;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  /** Path to the file */
  path: string;

  /** Operation performed */
  operation: 'create' | 'update' | 'delete' | 'backup' | 'restore';

  /** Whether the operation was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** File size after operation */
  size?: number;

  /** File permissions */
  permissions?: string;

  /** Backup path if backup was created */
  backupPath?: string;
}

// ============================================================================
// Configuration and Settings
// ============================================================================

/**
 * User settings that can be configured
 */
export interface UserSettings {
  /** Default template preference */
  defaultTemplate?: TemplateType;

  /** Default installation target */
  defaultTarget?: InstallTarget;

  /** Whether to create backups by default */
  autoBackup?: boolean;

  /** Default log level */
  logLevel?: LogLevel;

  /** Environment variables */
  environment?: Record<string, string>;

  /** Custom component paths */
  componentPaths?: string[];

  /** Editor preferences */
  editor?: string;

  /** Color preferences */
  colorOutput?: boolean;

  /** Auto-update settings */
  autoUpdate?: boolean;

  /** Notification preferences */
  notifications?: boolean;
}

/**
 * Project-specific settings
 */
export interface ProjectSettings {
  /** Project-specific hooks configuration */
  hooks?: Record<string, unknown>;

  /** Environment variables for this project */
  environment?: Record<string, string>;

  /** Custom commands for this project */
  commands?: Record<string, unknown>;

  /** Project-specific component overrides */
  components?: Partial<Component>[];

  /** Validation rules for this project */
  validation?: {
    rules: string[];
    autoFix: boolean;
    reportPath?: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Template configuration for generating new components
 */
export interface TemplateConfig {
  /** Template name */
  name: string;

  /** Template description */
  description: string;

  /** Template type */
  type: TemplateType;

  /** Supported component types */
  supportedTypes: ComponentType[];

  /** Template variables */
  variables: Record<
    string,
    {
      description: string;
      default?: string;
      required?: boolean;
      type: 'string' | 'number' | 'boolean' | 'array';
    }
  >;

  /** Template files */
  files: Array<{
    path: string;
    content: string;
    executable?: boolean;
  }>;
}

/**
 * Dependency information
 */
export interface DependencyInfo {
  /** Name of the dependency */
  name: string;

  /** Required version or version range */
  version?: string;

  /** Whether the dependency is optional */
  optional?: boolean;

  /** Installation command */
  installCommand?: string;

  /** Platforms where this dependency is available */
  platforms?: Platform[];

  /** Description of what this dependency provides */
  description?: string;
}

/**
 * Error details for better error handling
 */
export interface ErrorDetails {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Detailed error description */
  details?: string;

  /** Stack trace if available */
  stack?: string;

  /** Context information */
  context?: Record<string, unknown>;

  /** Suggestions for resolution */
  suggestions?: string[];

  /** Whether the error is recoverable */
  recoverable?: boolean;
}

// ============================================================================
// Event and Hook Types
// ============================================================================

/**
 * Hook event types that can trigger hook execution
 */
export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SubagentStop' | 'Notification' | 'UserPromptSubmit' | 'PreCompact' | 'SessionStart';

/**
 * Hook execution context
 */
export interface HookContext {
  /** Event that triggered the hook */
  event: HookEvent;

  /** Tool that was used (for PostToolUse events) */
  toolName?: string;

  /** File paths affected by the operation */
  filePaths?: string[];

  /** Project information */
  projectInfo: ProjectInfo;

  /** Environment variables */
  environment: Record<string, string>;

  /** Timestamp when the hook was triggered */
  timestamp: Date;
}

/**
 * Hook execution result
 */
export interface HookExecutionResult {
  /** Hook that was executed */
  hook: Component;

  /** Whether execution was successful */
  success: boolean;

  /** Exit code from hook execution */
  exitCode: number;

  /** Standard output */
  stdout?: string;

  /** Standard error */
  stderr?: string;

  /** Execution time in milliseconds */
  duration: number;

  /** Error details if execution failed */
  error?: ErrorDetails;
}

// ============================================================================
// Type Guards and Utility Functions
// ============================================================================

/**
 * Type guard to check if a value is a valid Platform
 */
export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && ['darwin', 'linux', 'win32', 'all'].includes(value);
}

/**
 * Type guard to check if a value is a valid ComponentType
 */
export function isComponentType(value: unknown): value is ComponentType {
  return typeof value === 'string' && ['command', 'hook', 'agent'].includes(value);
}

/**
 * Type guard to check if a value is a valid PackageManager
 */
export function isPackageManager(value: unknown): value is PackageManager {
  return typeof value === 'string' && ['npm', 'yarn', 'pnpm', 'bun'].includes(value);
}

/**
 * Type guard to check if a value is a valid LogLevel
 */
export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && ['debug', 'info', 'warn', 'error'].includes(value);
}

/**
 * Type guard to check if a value is a valid Component
 */
export function isComponent(value: unknown): value is Component {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    isComponentType(obj['type']) &&
    typeof obj['name'] === 'string' &&
    typeof obj['description'] === 'string' &&
    typeof obj['path'] === 'string' &&
    Array.isArray(obj['dependencies']) &&
    typeof obj['category'] === 'string'
  );
}

// ============================================================================
// Constants and Enums
// ============================================================================

/**
 * Default values for various configuration options
 */
export const DEFAULT_VALUES = {
  TEMPLATE: 'default' as TemplateType,
  TARGET: 'project' as InstallTarget,
  LOG_LEVEL: 'info' as LogLevel,
  OUTPUT_FORMAT: 'table' as OutputFormat,
  VALIDATION_TYPE: 'all' as ValidationType,
  BACKUP: true,
  AUTO_FIX: false,
  COLOR_OUTPUT: true,
} as const;

/**
 * File extensions associated with different component types
 */
export const FILE_EXTENSIONS = {
  command: '.md',
} as const;

/**
 * Common directories used by ClaudeKit
 */
export const DIRECTORIES = {
  CLAUDE: '.claude',
  COMMANDS: '.claude/commands',
  USER_HOME: '~/.claude',
  TEMP: 'temp',
  REPORTS: 'reports',
} as const;

/**
 * Exit codes used by the CLI
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  BLOCK_OPERATION: 2,
  VALIDATION_FAILED: 3,
  DEPENDENCY_ERROR: 4,
  PERMISSION_ERROR: 5,
} as const;
