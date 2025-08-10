import { describe, it, expect } from 'vitest';
import {
  recommendComponents,
  formatRecommendationSummary,
  // type ComponentRecommendation, // Removed unused import
  type RecommendationResult,
} from '../../cli/lib/components';
import type { ProjectInfo, Platform } from '../../cli/types/index';

describe('Component Recommendation Engine', () => {
  // Mock component registry with test components
  const mockRegistry = {
    components: new Map([
      [
        'typecheck-changed',
        {
          path: '../cli/hooks/typecheck-changed.sh',
          type: 'hook' as const,
          metadata: {
            id: 'typecheck-changed',
            name: 'TypeScript Type Checker (Changed Files)',
            description: 'Validates TypeScript types for changed files only',
            category: 'validation' as const,
            dependencies: ['validation-lib'],
            platforms: ['all'] as Platform[],
            enabled: true,
          },
          hash: 'hash1',
          lastModified: new Date(),
        },
      ],
      [
        'lint-changed',
        {
          path: '../cli/hooks/lint-changed.sh',
          type: 'hook' as const,
          metadata: {
            id: 'lint-changed',
            name: 'ESLint Validator (Changed Files)',
            description: 'Runs ESLint on changed JavaScript/TypeScript files only',
            category: 'validation' as const,
            dependencies: ['validation-lib'],
            platforms: ['all'] as Platform[],
            enabled: true,
          },
          hash: 'hash2',
          lastModified: new Date(),
        },
      ],
      [
        'create-checkpoint',
        {
          path: '../cli/hooks/create-checkpoint.sh',
          type: 'hook' as const,
          metadata: {
            id: 'create-checkpoint',
            name: 'Create Checkpoint',
            description: 'Creates git checkpoints',
            category: 'git' as const,
            dependencies: [],
            platforms: ['all'] as Platform[],
            enabled: true,
          },
          hash: 'hash4',
          lastModified: new Date(),
        },
      ],
      [
        'test-changed',
        {
          path: '../cli/hooks/test-changed.sh',
          type: 'hook' as const,
          metadata: {
            id: 'test-changed',
            name: 'Run Related Tests',
            description: 'Runs tests related to changed files',
            category: 'testing' as const,
            dependencies: ['validation-lib', 'test-discovery'],
            platforms: ['all'] as Platform[],
            enabled: true,
          },
          hash: 'hash5',
          lastModified: new Date(),
        },
      ],
      [
        'validation-lib',
        {
          path: '../cli/hooks/validation-lib.sh',
          type: 'hook' as const,
          metadata: {
            id: 'validation-lib',
            name: 'Validation Library',
            description: 'Common validation utilities',
            category: 'utility' as const,
            dependencies: ['package-manager-detect'],
            platforms: ['all'] as Platform[],
            enabled: true,
          },
          hash: 'hash6',
          lastModified: new Date(),
        },
      ],
      [
        'dev-cleanup',
        {
          path: '../cli/commands/dev/cleanup.md',
          type: 'command' as const,
          metadata: {
            id: 'dev-cleanup',
            name: 'Dev Cleanup',
            description: 'Clean up development artifacts',
            category: 'development' as const,
            dependencies: [],
            platforms: ['all'] as Platform[],
            enabled: true,
          },
          hash: 'hash7',
          lastModified: new Date(),
        },
      ],
      [
        'agent-init',
        {
          path: '../cli/commands/agent/init.md',
          type: 'command' as const,
          metadata: {
            id: 'agent-init',
            name: 'Agent Init',
            description: 'Initialize AI assistant configuration',
            category: 'ai-assistant' as const,
            dependencies: [],
            platforms: ['all'] as Platform[],
            enabled: true,
          },
          hash: 'hash8',
          lastModified: new Date(),
        },
      ],
    ]),
    dependencies: new Map(),
    dependents: new Map(),
    categories: new Map(),
    lastScan: new Date(),
    cacheValid: true,
  };

  describe('TypeScript project recommendations', () => {
    it('should recommend typecheck hook for TypeScript projects', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: true,
        hasESLint: false,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: true,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      expect(result.essential).toHaveLength(2); // typecheck + auto-checkpoint
      expect(result.essential.some((r) => r.component.metadata.id === 'typecheck-changed')).toBe(
        true
      );
      expect(result.essential.some((r) => r.component.metadata.id === 'create-checkpoint')).toBe(
        true
      );

      const typecheckRec = result.essential.find(
        (r) => r.component.metadata.id === 'typecheck-changed'
      );
      expect(typecheckRec?.reasons).toContain('TypeScript detected - type checking recommended');
      expect(typecheckRec?.dependencies).toContain('validation-lib');
    });

    it('should auto-include dependencies', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: true,
        hasESLint: false,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: false,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      // Check that validation-lib is included as a dependency
      const validationLib = result.recommended.find(
        (r) => r.component.metadata.id === 'validation-lib'
      );
      expect(validationLib).toBeDefined();
      expect(validationLib?.reasons).toContain('Required dependency for recommended components');
    });
  });

  describe('ESLint project recommendations', () => {
    it('should recommend eslint hook for ESLint projects', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: false,
        hasESLint: true,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: false,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      expect(result.essential.some((r) => r.component.metadata.id === 'lint-changed')).toBe(true);

      const eslintRec = result.essential.find((r) => r.component.metadata.id === 'lint-changed');
      expect(eslintRec?.reasons).toContain(
        'ESLint configuration found - linting automation recommended'
      );
    });
  });

  describe('Testing framework recommendations', () => {
    it('should recommend test runner for Jest projects', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: false,
        hasESLint: false,
        hasJest: true,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: false,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      expect(result.essential.some((r) => r.component.metadata.id === 'test-changed')).toBe(true);

      const testRec = result.essential.find((r) => r.component.metadata.id === 'test-changed');
      expect(testRec?.reasons).toContain('Jest detected - automated test running recommended');
    });

    it('should recommend test runner for Vitest projects', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: false,
        hasESLint: false,
        hasVitest: true,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: false,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      const testRec = result.essential.find((r) => r.component.metadata.id === 'test-changed');
      expect(testRec?.reasons).toContain('Vitest detected - automated test running recommended');
    });
  });

  describe('Git repository recommendations', () => {
    it('should highly recommend auto-checkpoint for git repos', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: false,
        hasESLint: false,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: true,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      expect(result.essential.some((r) => r.component.metadata.id === 'create-checkpoint')).toBe(
        true
      );

      const checkpointRec = result.essential.find(
        (r) => r.component.metadata.id === 'create-checkpoint'
      );
      expect(checkpointRec?.reasons).toContain(
        'Git repository - automatic checkpointing highly recommended'
      );
    });
  });

  describe('Optional recommendations', () => {
    it('should include optional development tools', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: false,
        hasESLint: false,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: false,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      expect(result.optional.some((r) => r.component.metadata.category === 'development')).toBe(
        true
      );
      expect(result.optional.some((r) => r.component.metadata.category === 'ai-assistant')).toBe(
        true
      );
    });

    it('should exclude optional when requested', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: false,
        hasESLint: false,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: false,
      };

      const result = await recommendComponents(projectInfo, mockRegistry, {
        includeOptional: false,
      });

      expect(result.optional).toHaveLength(0);
    });
  });

  describe('Category filtering', () => {
    it('should exclude specified categories', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: true,
        hasESLint: true,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: true,
      };

      const result = await recommendComponents(projectInfo, mockRegistry, {
        excludeCategories: ['ai-assistant', 'development'],
      });

      expect(result.optional.some((r) => r.component.metadata.category === 'ai-assistant')).toBe(
        false
      );
      expect(result.optional.some((r) => r.component.metadata.category === 'development')).toBe(
        false
      );
    });
  });

  describe('Formatting recommendations', () => {
    it('should format recommendations as human-readable text', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: true,
        hasESLint: true,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: true,
      };

      const result = await recommendComponents(projectInfo, mockRegistry);
      const formatted = formatRecommendationSummary(result);

      expect(formatted).toContain('Essential Components:');
      expect(formatted).toContain('TypeScript Type Checker');
      expect(formatted).toContain('ESLint Validator');
      expect(formatted).toContain('Create Checkpoint');
      expect(formatted).toContain('Dependencies:');
    });

    it('should handle empty recommendations gracefully', () => {
      const emptyResult: RecommendationResult = {
        essential: [],
        recommended: [],
        optional: [],
        totalScore: 0,
      };

      const formatted = formatRecommendationSummary(emptyResult);
      expect(formatted).toBe('');
    });
  });

  describe('Framework-specific recommendations', () => {
    it('should recommend based on detected frameworks', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: true,
        hasESLint: false,
        packageManager: 'npm',
        projectPath: '/test/project',
        isGitRepository: false,
        frameworks: ['React', 'Next'],
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      // Should still get TypeScript recommendations
      expect(result.essential.some((r) => r.component.metadata.id === 'typecheck-changed')).toBe(
        true
      );
    });
  });


  describe('Combined project recommendations', () => {
    it('should handle projects with multiple tools', async () => {
      const projectInfo: ProjectInfo = {
        hasTypeScript: true,
        hasESLint: true,
        hasPrettier: true,
        hasJest: true,
        packageManager: 'pnpm',
        projectPath: '/test/project',
        isGitRepository: true,
        frameworks: ['React', 'Vite'],
      };

      const result = await recommendComponents(projectInfo, mockRegistry);

      // Should recommend all relevant hooks
      expect(result.essential.some((r) => r.component.metadata.id === 'typecheck-changed')).toBe(
        true
      );
      expect(result.essential.some((r) => r.component.metadata.id === 'lint-changed')).toBe(true);
      expect(result.essential.some((r) => r.component.metadata.id === 'test-changed')).toBe(true);
      expect(result.essential.some((r) => r.component.metadata.id === 'create-checkpoint')).toBe(
        true
      );

      // Should have a high total score
      expect(result.totalScore).toBeGreaterThan(400);
    });
  });
});
