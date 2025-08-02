/**
 * ClaudeKit CLI Library Modules
 *
 * Provides core functionality for file operations, validation,
 * and other utilities used throughout the CLI.
 */

export {
  // Path validation
  validateProjectPath,

  // Directory operations
  ensureDirectoryExists,

  // Permission operations
  checkWritePermission,

  // File hashing and comparison
  getFileHash,
  needsUpdate,

  // File operations with backup
  copyFileWithBackup,

  // Utility functions
  pathExists,
  getFileStats,
  safeRemove,
  expandHomePath,
  normalizePath,
} from './filesystem.js';

export {
  // Validation types
  type ValidationError,
  type ValidationResult,
  type PrerequisiteCheck,
  type ProjectValidationOptions,
  type ComponentValidationOptions,

  // Path validation with security
  validateProjectPathSecure,
  validatePathAccessibility,

  // Component validation
  validateComponentName,
  sanitizeComponentList,

  // Prerequisite checking
  checkNodePrerequisite,
  checkTypeScriptPrerequisite,
  checkESLintPrerequisite,
  checkGitPrerequisite,
  checkAllPrerequisites,

  // Input sanitization
  sanitizeShellInput,
  sanitizeConfigInput,

  // Project validation
  validateProject,

  // Utility functions
  formatValidationErrors,
  createValidationError,
  combineValidationResults,
} from './validation.js';

export {
  // Core project detection
  detectProjectContext,
  resolveProjectPath,

  // Individual detection functions
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
} from './project-detection.js';

export {
  // Component discovery
  discoverComponents,
  getComponent,
  getComponentsByCategory,
  getComponentsByType,
  getDependents,
  getDependencies,
  searchComponents,
  registryToComponents,

  // Dependency resolution
  resolveDependencyOrder,
  resolveAllDependencies,
  getMissingDependencies,
  getTransitiveDependencies,
  wouldCreateCircularDependency,

  // Cache management
  invalidateCache,
  getDiscoveryStats,

  // Component recommendation
  recommendComponents,
  formatRecommendationSummary,
  type ComponentRecommendation,
  type RecommendationResult,
} from './components.js';

export {
  // Installation types
  type InstallStep,
  type InstallPlan,
  type InstallProgress,
  type InstallResult,
  type InstallOptions,

  // Installation functions
  createInstallPlan,
  validateInstallPlan,
  simulateInstallation,
  executeInstallation,
  installComponents,

  // Installer class
  Installer,
} from './installer.js';

export {
  // Path utilities
  findComponentsDirectory,
  getUserClaudeDirectory,
  getProjectClaudeDirectory,
} from './paths.js';
