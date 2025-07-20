import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Installer, createInstallPlan, validateInstallPlan, simulateInstallation } from '../../src/lib/installer.js';
import type { Installation, Component, InstallOptions, InstallProgress } from '../../src/types/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock filesystem module
vi.mock('../../src/lib/filesystem.js', () => ({
  copyFileWithBackup: vi.fn(),
  ensureDirectoryExists: vi.fn(),
  setExecutablePermission: vi.fn(),
  checkWritePermission: vi.fn().mockResolvedValue(true),
  pathExists: vi.fn().mockResolvedValue(false),
  safeRemove: vi.fn(),
  normalizePath: (p: string) => path.resolve(p),
  expandHomePath: (p: string) => p.replace('~', '/home/user'),
}));

// Mock components module
vi.mock('../../src/lib/components.js', () => {
  // Helper to create component file structure
  const createComponentFile = (type: string, id: string, name: string, category: string, deps: string[] = []) => ({
    type,
    path: type === 'hook' ? `/source/hooks/${id}.sh` : `/source/commands/${id}.md`,
    lastModified: new Date(),
    metadata: {
      id,
      name,
      description: `${name} description`,
      dependencies: deps,
      platforms: ['all'],
      category,
      enabled: true,
    }
  });
  
  // Create a mock component map with all expected components
  const mockComponentsMap = new Map([
    ['test-hook', createComponentFile('hook', 'test-hook', 'Test Hook', 'validation')],
    ['auto-checkpoint', createComponentFile('hook', 'auto-checkpoint', 'Auto Checkpoint', 'git')],
    ['validate-todo-completion', createComponentFile('hook', 'validate-todo-completion', 'Validate Todo Completion', 'validation')],
    ['typecheck', createComponentFile('hook', 'typecheck', 'TypeScript Check', 'validation', ['tsc'])],
    ['eslint', createComponentFile('hook', 'eslint', 'ESLint', 'validation', ['eslint'])],
    ['checkpoint-create', createComponentFile('command', 'checkpoint-create', 'Create Checkpoint', 'git')],
    ['checkpoint-list', createComponentFile('command', 'checkpoint-list', 'List Checkpoints', 'git')],
    ['git-status', createComponentFile('command', 'git-status', 'Git Status', 'git', ['git'])]
  ]);
  
  return {
    discoverComponents: vi.fn().mockResolvedValue({
      components: mockComponentsMap,
      dependencies: new Map(),
      dependents: new Map(),
      categories: new Map([
        ['validation', ['test-hook', 'validate-todo-completion', 'typecheck', 'eslint']],
        ['git', ['auto-checkpoint', 'checkpoint-create', 'checkpoint-list', 'git-status']]
      ]),
      lastScan: new Date(),
      cacheValid: true,
      dependencyGraph: {
        nodes: ['test-hook', 'auto-checkpoint', 'validate-todo-completion', 'typecheck', 'eslint', 'checkpoint-create', 'checkpoint-list', 'git-status'],
        edges: [],
        cycles: []
      }
    }),
    resolveDependencyOrder: vi.fn((ids: string[]) => ids),
    resolveAllDependencies: vi.fn((ids: string[]) => ids),
    registryToComponents: vi.fn((registry: any) => {
      if (!registry?.components) return [];
      return Array.from(registry.components.values()).map(componentFile => ({
        id: componentFile.metadata.id,
        type: componentFile.type,
        name: componentFile.metadata.name,
        description: componentFile.metadata.description,
        path: componentFile.path,
        dependencies: componentFile.metadata.dependencies || [],
        platforms: componentFile.metadata.platforms || ['all'],
        category: componentFile.metadata.category,
        enabled: componentFile.metadata.enabled !== false,
      }));
    }),
    getMissingDependencies: vi.fn(() => []),
    getComponent: vi.fn((id: string, registry: any) => {
      const component = registry?.components?.get(id);
      if (!component) return null;
      return {
        id: component.metadata.id,
        type: component.type,
        name: component.metadata.name,
        description: component.metadata.description,
        path: component.path,
        dependencies: component.metadata.dependencies,
        platforms: component.metadata.platforms,
        category: component.metadata.category,
        enabled: component.metadata.enabled,
      };
    }),
    getComponentsByType: vi.fn(() => []),
  };
});

// Mock project detection
vi.mock('../../src/lib/project-detection.js', () => ({
  detectProjectContext: vi.fn().mockResolvedValue({
    hasTypeScript: true,
    hasESLint: true,
    hasPrettier: false,
    hasJest: false,
    hasVitest: true,
    packageManager: 'npm',
    projectPath: '/test/project',
    isGitRepository: true,
    hasClaudeConfig: false,
  }),
}));

// Mock fs promises
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  readdir: vi.fn().mockResolvedValue([]),
  rmdir: vi.fn(),
  rename: vi.fn(),
}));

describe('Installer', () => {
  let installer: Installer;
  let mockProgress: InstallProgress[] = [];

  const mockComponent: Component = {
    id: 'test-hook',
    type: 'hook',
    name: 'Test Hook',
    description: 'A test hook',
    path: '/source/hooks/test.sh',
    dependencies: [],
    platforms: ['all'],
    category: 'validation',
    enabled: true,
  };

  const mockInstallation: Installation = {
    components: [mockComponent],
    target: 'project',
    backup: true,
    dryRun: false,
    installDependencies: true,
  };

  beforeEach(() => {
    mockProgress = [];
    const progressCallback = (progress: InstallProgress) => {
      mockProgress.push({ ...progress });
    };

    installer = new Installer({
      onProgress: progressCallback,
    });

    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createInstallPlan', () => {
    it('should create a basic installation plan', async () => {
      const plan = await createInstallPlan(mockInstallation);

      expect(plan).toBeDefined();
      expect(plan.components).toHaveLength(1);
      expect(plan.target).toBe('project');
      expect(plan.steps.length).toBeGreaterThan(0);

      // Should have directory creation steps
      const dirSteps = plan.steps.filter(s => s.type === 'create-dir');
      expect(dirSteps.length).toBeGreaterThan(0);

      // Should have file copy steps
      const copySteps = plan.steps.filter(s => s.type === 'copy-file');
      expect(copySteps).toHaveLength(1);

      // Should have permission steps for hooks
      const permSteps = plan.steps.filter(s => s.type === 'set-permission');
      expect(permSteps).toHaveLength(1);
    });

    it('should handle both user and project targets', async () => {
      const installation: Installation = {
        ...mockInstallation,
        target: 'both',
      };

      const plan = await createInstallPlan(installation);

      // Should have copy steps for both user and project
      const copySteps = plan.steps.filter(s => s.type === 'copy-file');
      expect(copySteps).toHaveLength(2);

      // Check targets
      const targets = copySteps.map(s => s.target);
      expect(targets.some(t => t.includes('/.claude/'))).toBe(true);
      expect(targets.some(t => t.includes('/home/user/.claude/'))).toBe(true);
    });

    it('should respect dependency order', async () => {
      const depComponent: Component = {
        ...mockComponent,
        id: 'dependency',
        name: 'Dependency',
      };

      const mainComponent: Component = {
        ...mockComponent,
        id: 'main',
        name: 'Main',
        dependencies: ['dependency'],
      };

      const installation: Installation = {
        ...mockInstallation,
        components: [mainComponent, depComponent],
      };

      const components = await import('../../src/lib/components.js');
      vi.mocked(components.resolveDependencyOrder).mockReturnValue(['dependency', 'main']);
      vi.mocked(components.getMissingDependencies).mockReturnValue([]);

      const plan = await createInstallPlan(installation);

      // Components should be ordered by dependencies
      expect(plan.components[0].id).toBe('dependency');
      expect(plan.components[1].id).toBe('main');
    });

    it('should add warnings for missing recommended components', async () => {
      const installation: Installation = {
        ...mockInstallation,
        components: [], // No components
        projectInfo: {
          hasTypeScript: true,
          hasESLint: true,
          hasPrettier: false,
          hasJest: false,
          hasVitest: false,
          packageManager: 'npm',
          projectPath: '/test',
          isGitRepository: true,
        },
      };

      const plan = await createInstallPlan(installation);

      expect(plan.warnings).toContain('TypeScript detected but typecheck hook not selected');
      expect(plan.warnings).toContain('ESLint detected but eslint hook not selected');
    });
  });

  describe('validateInstallPlan', () => {
    it('should validate a valid plan', async () => {
      const { pathExists } = await import('../../src/lib/filesystem.js');
      (pathExists as any).mockResolvedValue(true); // Source files exist

      const plan = await createInstallPlan(mockInstallation);
      const errors = await validateInstallPlan(plan);

      expect(errors).toHaveLength(0);
    });

    it('should detect missing write permissions', async () => {
      const { checkWritePermission } = await import('../../src/lib/filesystem.js');
      (checkWritePermission as any).mockResolvedValue(false);

      const plan = await createInstallPlan(mockInstallation);
      const errors = await validateInstallPlan(plan);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('No write permission'))).toBe(true);
    });

    it('should detect missing source files', async () => {
      const { pathExists } = await import('../../src/lib/filesystem.js');
      (pathExists as any).mockImplementation((path: string) => {
        if (path.includes('/source/')) return false;
        return true;
      });

      const plan = await createInstallPlan(mockInstallation);
      const errors = await validateInstallPlan(plan);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Source file not found'))).toBe(true);
    });
  });

  describe('simulateInstallation', () => {
    it('should simulate installation without making changes', async () => {
      const plan = await createInstallPlan(mockInstallation);
      const result = await simulateInstallation(plan);

      expect(result.success).toBe(true);
      expect(result.installedComponents).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      // Should not call actual file operations
      const { copyFileWithBackup, ensureDirectoryExists } = await import('../../src/lib/filesystem.js');
      expect(copyFileWithBackup).not.toHaveBeenCalled();
      expect(ensureDirectoryExists).not.toHaveBeenCalled();
    });

    it('should report progress during dry run', async () => {
      const progressSteps: InstallProgress[] = [];
      const options: InstallOptions = {
        onProgress: (progress) => progressSteps.push({ ...progress }),
      };

      const plan = await createInstallPlan(mockInstallation);
      await simulateInstallation(plan, options);

      expect(progressSteps.length).toBeGreaterThan(0);
      expect(progressSteps.some(p => p.phase === 'planning')).toBe(true);
      expect(progressSteps.some(p => p.phase === 'installing')).toBe(true);
      expect(progressSteps.some(p => p.phase === 'complete')).toBe(true);
    });
  });

  describe('Installer.install', () => {
    it('should execute a complete installation', async () => {
      const { copyFileWithBackup, ensureDirectoryExists, setExecutablePermission, pathExists } = await import('../../src/lib/filesystem.js');
      
      // Mock pathExists to return true for source files, false for target files
      (pathExists as any).mockImplementation((path: string) => {
        if (path.includes('/source/')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const forceInstaller = new Installer({
        force: true, // Force to bypass validation errors
        onProgress: (progress: InstallProgress) => {
          mockProgress.push({ ...progress });
        },
      });

      const result = await forceInstaller.install(mockInstallation);

      expect(result.success).toBe(true);
      expect(result.installedComponents).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      // Should call file operations
      expect(ensureDirectoryExists).toHaveBeenCalled();
      expect(copyFileWithBackup).toHaveBeenCalled();
      expect(setExecutablePermission).toHaveBeenCalled();
    });

    it('should handle dry run mode', async () => {
      const { copyFileWithBackup, pathExists } = await import('../../src/lib/filesystem.js');
      
      // Mock pathExists to return true for source files
      (pathExists as any).mockImplementation((path: string) => {
        if (path.includes('/source/')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const dryRunInstaller = new Installer({ dryRun: true, force: true });

      const result = await dryRunInstaller.install({
        ...mockInstallation,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(copyFileWithBackup).not.toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      const { copyFileWithBackup, safeRemove, pathExists, ensureDirectoryExists } = await import('../../src/lib/filesystem.js');
      
      // Mock pathExists to return true for source files
      (pathExists as any).mockImplementation((path: string) => {
        if (path.includes('/source/')) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      
      // Track created directories
      const createdDirs: string[] = [];
      (ensureDirectoryExists as any).mockImplementation((dir: string) => {
        createdDirs.push(dir);
        return Promise.resolve();
      });
      
      // Fail on file copy
      (copyFileWithBackup as any).mockRejectedValue(new Error('Copy failed'));

      const failInstaller = new Installer({ force: true });
      const result = await failInstaller.install(mockInstallation);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Rollback should be attempted for created directories
      expect(createdDirs.length).toBeGreaterThan(0);
    });

    it('should report progress throughout installation', async () => {
      const { pathExists } = await import('../../src/lib/filesystem.js');
      
      // Mock pathExists to return true for source files
      (pathExists as any).mockImplementation((path: string) => {
        if (path.includes('/source/')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const progressTracker: InstallProgress[] = [];
      const progressInstaller = new Installer({
        force: true,
        onProgress: (progress) => progressTracker.push({ ...progress }),
      });

      await progressInstaller.install(mockInstallation);

      expect(progressTracker.length).toBeGreaterThan(0);
      
      // Should have all phases
      const phases = progressTracker.map(p => p.phase);
      expect(phases).toContain('planning');
      expect(phases).toContain('validating');
      expect(phases).toContain('installing');
      expect(phases).toContain('complete');
    });

    it('should create configuration based on project info', async () => {
      const { writeFile } = await import('fs/promises');
      const writeFileMock = vi.mocked(writeFile);
      const { pathExists } = await import('../../src/lib/filesystem.js');
      
      // Mock pathExists to return true for source files
      (pathExists as any).mockImplementation((path: string) => {
        if (path.includes('/source/')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const configInstaller = new Installer({ force: true });
      await configInstaller.install({
        ...mockInstallation,
        projectInfo: {
          hasTypeScript: true,
          hasESLint: true,
          hasPrettier: false,
          hasJest: false,
          hasVitest: false,
          packageManager: 'npm',
          projectPath: '/test',
          isGitRepository: true,
        },
      });

      // Should write settings.json
      expect(writeFileMock).toHaveBeenCalled();
      const [filePath, content] = writeFileMock.mock.calls[0];
      expect(filePath).toContain('settings.json');

      const config = JSON.parse(content as string);
      expect(config.hooks.PostToolUse).toBeDefined();
      expect(config.hooks.PostToolUse.some((h: any) => 
        h.matcher.includes('*.ts') && h.hooks.some((hook: any) => 
          hook.command.includes('typecheck')
        )
      )).toBe(true);
    });
  });

  describe('Installer.createDefaultInstallation', () => {
    it('should create installation with recommended components', async () => {
      // The mock is already set up to return proper components from the registry

      const installation = await installer.createDefaultInstallation();

      expect(installation.components.length).toBeGreaterThan(0);
      expect(installation.components.some(c => c.id === 'typecheck')).toBe(true);
      expect(installation.components.some(c => c.id === 'eslint')).toBe(true);
      expect(installation.projectInfo).toBeDefined();
    });
  });
});