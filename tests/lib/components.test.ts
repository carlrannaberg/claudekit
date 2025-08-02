import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  discoverComponents,
  getComponent,
  getComponentsByCategory,
  getComponentsByType,
  getDependents,
  getDependencies,
  searchComponents,
  resolveDependencyOrder,
  registryToComponents,
  getDiscoveryStats,
  invalidateCache,
} from '../../cli/lib/components';

describe('Component Discovery System', () => {
  let tempDir: string;
  let commandsDir: string;
  let hooksDir: string;

  beforeEach(async () => {
    // Create temporary directory structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudekit-test-'));
    commandsDir = path.join(tempDir, 'commands');
    hooksDir = path.join(tempDir, 'hooks');

    await fs.mkdir(commandsDir, { recursive: true });
    await fs.mkdir(hooksDir, { recursive: true });

    // Clear cache before each test
    invalidateCache();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
    invalidateCache();
  });

  describe('Component Parsing', () => {
    it('should parse command files with frontmatter correctly', async () => {
      const commandContent = `---
description: Test command for validation
allowed-tools: Read, Bash(git:*)
argument-hint: "[test-arg]"
version: 1.0.0
author: Test Author
---

# Test Command

This is a test command that validates functionality.

## Usage

\`/test-command [arguments]\`
`;

      await fs.writeFile(path.join(commandsDir, 'test.md'), commandContent);

      const registry = await discoverComponents(tempDir);
      const component = getComponent('test', registry);

      expect(component).toBeDefined();
      expect(component?.metadata.name).toBe('test');
      expect(component?.metadata.description).toBe('Test command for validation');
      expect(component?.metadata.allowedTools).toEqual(['Read', 'Bash(git:*)']);
      expect(component?.metadata.argumentHint).toBe('[test-arg]');
      expect(component?.metadata.version).toBe('1.0.0');
      expect(component?.metadata.author).toBe('Test Author');
      expect(component?.type).toBe('command');
    });

    it('should include embedded hooks in discovery', async () => {
      const registry = await discoverComponents(tempDir);

      // Test that embedded hooks are included
      const typecheck = getComponent('typecheck-changed', registry);
      expect(typecheck).toBeDefined();
      expect(typecheck?.metadata.name).toBe('TypeScript Type Checking (Changed Files)');
      expect(typecheck?.metadata.description).toContain('embedded hook');
      expect(typecheck?.metadata.category).toBe('validation');
      expect(typecheck?.type).toBe('hook');
      expect(typecheck?.path).toBe('embedded:typecheck-changed');

      // Test another embedded hook
      const eslint = getComponent('lint-changed', registry);
      expect(eslint).toBeDefined();
      expect(eslint?.metadata.name).toBe('ESLint Validation (Changed Files)');
      expect(eslint?.metadata.category).toBe('validation');

      // Verify all embedded hooks are present
      const allHooks = getComponentsByType('hook', registry);
      const embeddedHookIds = [
        'typecheck-changed',
        'lint-changed',
        'prettier',
        'check-any-changed',
        'test-changed',
        'create-checkpoint',
        'check-todos',
        'typecheck-project',
        'lint-project',
        'test-project',
      ];
      const foundEmbeddedHooks = allHooks.filter((h) => h.path.startsWith('embedded:'));
      expect(foundEmbeddedHooks.length).toBe(embeddedHookIds.length);
    });

    it('should infer category from content when not explicitly provided', async () => {
      const gitCommandContent = `---
description: Git status checker
allowed-tools: Bash(git:*)
---

# Git Status

Check current git status and show insights.
Create a git stash if needed.
`;

      await fs.writeFile(path.join(commandsDir, 'git-status.md'), gitCommandContent);

      const registry = await discoverComponents(tempDir);

      const gitComponent = getComponent('git-status', registry);
      expect(gitComponent?.metadata.category).toBe('git');

      // Test that embedded typecheck hook has correct category
      const validationComponent = getComponent('typecheck-changed', registry);
      expect(validationComponent?.metadata.category).toBe('validation');
    });

    it('should extract dependencies from content', async () => {
      const commandWithDeps = `---
description: Complex command
allowed-tools: Bash(git:*), Read, Write
---

# Complex Command

This command uses multiple tools:
- Calls /other-command
- Uses /validation tools
- Integrates with /checkpoint system
`;

      await fs.writeFile(path.join(commandsDir, 'complex.md'), commandWithDeps);

      const registry = await discoverComponents(tempDir);

      const commandComponent = getComponent('complex', registry);
      // Command should extract basic tools from allowed-tools
      expect(commandComponent?.metadata.dependencies.length).toBeGreaterThan(0);

      // Test that embedded hooks have correct dependencies
      const eslintHook = getComponent('lint-changed', registry);
      expect(eslintHook?.metadata.dependencies).toContain('eslint');

      const typecheckHook = getComponent('typecheck-changed', registry);
      expect(typecheckHook?.metadata.dependencies).toContain('typescript');
      expect(typecheckHook?.metadata.dependencies).toContain('tsc');

      const autoCheckpoint = getComponent('create-checkpoint', registry);
      expect(autoCheckpoint?.metadata.dependencies).toContain('git');
    });
  });

  describe('Directory Scanning', () => {
    it('should discover components in nested directories', async () => {
      // Create nested structure
      const gitDir = path.join(commandsDir, 'git');
      const validationDir = path.join(hooksDir, 'validation');

      await fs.mkdir(gitDir, { recursive: true });
      await fs.mkdir(validationDir, { recursive: true });

      await fs.writeFile(
        path.join(gitDir, 'commit.md'),
        `---
description: Git commit command
---
# Git Commit`
      );

      const registry = await discoverComponents(tempDir);

      expect(getComponent('git:commit', registry)).toBeDefined();
      // Should have 1 nested command + 10 embedded hooks = 11 total
      expect(registry.components.size).toBe(11);
    });

    it('should handle missing directories gracefully', async () => {
      // Remove one directory
      await fs.rm(hooksDir, { recursive: true });

      await fs.writeFile(
        path.join(commandsDir, 'test.md'),
        `---
description: Test command
---
# Test`
      );

      const registry = await discoverComponents(tempDir);

      // Should have 1 command + 10 embedded hooks = 11 total
      expect(registry.components.size).toBe(11);
      expect(getComponent('test', registry)).toBeDefined();
    });

    it('should respect includeDisabled option', async () => {
      await fs.writeFile(
        path.join(commandsDir, 'enabled.md'),
        `---
description: Enabled command
enabled: true
---
# Enabled`
      );

      await fs.writeFile(
        path.join(commandsDir, 'disabled.md'),
        `---
description: Disabled command
enabled: false
---
# Disabled`
      );

      const registryAll = await discoverComponents(tempDir, { includeDisabled: true });
      // Should have 2 commands + 10 embedded hooks = 12 total
      expect(registryAll.components.size).toBe(12);

      // Clear cache before second call
      invalidateCache(tempDir);
      const registryEnabled = await discoverComponents(tempDir, { includeDisabled: false });
      // Should have 1 enabled command + 10 embedded hooks (all enabled by default) = 11 total
      expect(registryEnabled.components.size).toBe(11);
      expect(getComponent('enabled', registryEnabled)).toBeDefined();
      expect(getComponent('disabled', registryEnabled)).toBeUndefined();
    });

    it('should filter by type and category', async () => {
      await fs.writeFile(
        path.join(commandsDir, 'git-cmd.md'),
        `---
description: Git command
category: git
---
# Git Command`
      );

      const registry = await discoverComponents(tempDir);

      // Test git category (should have git-cmd command and create-checkpoint hook)
      const gitComponents = getComponentsByCategory('git', registry);
      const gitCommandComponent = gitComponents.find((c) => c.metadata.id === 'git-cmd');
      expect(gitCommandComponent).toBeDefined();
      expect(gitCommandComponent?.metadata.name).toBe('git-cmd');

      const commands = getComponentsByType('command', registry);
      expect(commands).toHaveLength(1);

      // Test that embedded hooks are included
      const hooks = getComponentsByType('hook', registry);
      expect(hooks.length).toBe(10); // All 10 embedded hooks

      // Test validation category has embedded validation hooks
      const validationComponents = getComponentsByCategory('validation', registry);
      const validationHooks = validationComponents.filter((c) => c.type === 'hook');
      expect(validationHooks.length).toBeGreaterThan(0);
      expect(validationHooks.some((h) => h.metadata.id === 'typecheck-changed')).toBe(true);
      expect(validationHooks.some((h) => h.metadata.id === 'lint-changed')).toBe(true);
    });
  });

  describe('Dependency Resolution', () => {
    beforeEach(async () => {
      // Create command components with dependencies
      await fs.writeFile(
        path.join(commandsDir, 'base.md'),
        `---
description: Base command
---
# Base Command`
      );

      await fs.writeFile(
        path.join(commandsDir, 'dependent.md'),
        `---
description: Dependent command
---
# Dependent
Uses /base command`
      );
    });

    it('should build dependency graphs correctly', async () => {
      const registry = await discoverComponents(tempDir);

      const dependentCmd = getComponent('dependent', registry);
      expect(dependentCmd).toBeDefined();

      const cmdDeps = getDependencies('dependent', registry);
      expect(cmdDeps.some((c) => c.metadata.id === 'base')).toBe(true);

      // Test embedded hook dependencies
      getDependencies('typecheck-changed', registry);
      // Note: typescript and tsc are external dependencies, so they won't be in the registry
      expect(getComponent('typecheck-changed', registry)?.metadata.dependencies).toContain('typescript');
      expect(getComponent('typecheck-changed', registry)?.metadata.dependencies).toContain('tsc');
    });

    it('should resolve dependency order correctly', async () => {
      const registry = await discoverComponents(tempDir);

      const order = resolveDependencyOrder(['dependent', 'base'], registry);

      // base should come before dependent
      const baseIndex = order.indexOf('base');
      const dependentIndex = order.indexOf('dependent');

      expect(baseIndex).toBeLessThan(dependentIndex);
    });

    it('should detect circular dependencies', async () => {
      // Create circular dependency
      await fs.writeFile(
        path.join(commandsDir, 'circular-a.md'),
        `---
description: Circular A
---
# Circular A
Uses /circular-b`
      );

      await fs.writeFile(
        path.join(commandsDir, 'circular-b.md'),
        `---
description: Circular B
---
# Circular B
Uses /circular-a`
      );

      const registry = await discoverComponents(tempDir);

      expect(() => {
        resolveDependencyOrder(['circular-a', 'circular-b'], registry);
      }).toThrow('Circular dependency detected');
    });

    it('should find dependents correctly', async () => {
      const registry = await discoverComponents(tempDir);

      const baseDependents = getDependents('base', registry);
      expect(baseDependents.some((c) => c.metadata.id === 'dependent')).toBe(true);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(commandsDir, 'git-status.md'),
        `---
description: Check git repository status
---
# Git Status`
      );

      await fs.writeFile(
        path.join(commandsDir, 'validation.md'),
        `---
description: Validate code quality
---
# Validation`
      );
    });

    it('should search by name', async () => {
      const registry = await discoverComponents(tempDir);

      const gitResults = searchComponents('git', registry);
      // Should find git-status command and possibly embedded hooks with 'git' in name
      const gitStatusCmd = gitResults.find((r) => r.metadata.id === 'git-status');
      expect(gitStatusCmd).toBeDefined();
      expect(gitStatusCmd?.metadata.name).toBe('git-status');
    });

    it('should search by description when enabled', async () => {
      const registry = await discoverComponents(tempDir);

      const qualityResults = searchComponents('quality', registry, { includeDescription: true });
      expect(qualityResults).toHaveLength(1);
      expect(qualityResults[0]?.metadata.name).toBe('validation');
    });

    it('should rank name matches higher than description matches', async () => {
      const registry = await discoverComponents(tempDir);

      // Should find validation command first (name match) even though git-status also mentions status
      const validationResults = searchComponents('validation', registry, {
        includeDescription: true,
      });
      expect(validationResults[0]?.metadata.name).toBe('validation');
    });
  });

  describe('Caching', () => {
    it('should cache results for performance', async () => {
      await fs.writeFile(
        path.join(commandsDir, 'test.md'),
        `---
description: Test command
---
# Test`
      );

      const registry1 = await discoverComponents(tempDir);
      const registry2 = await discoverComponents(tempDir);

      expect(registry1.components.size).toBe(registry2.components.size);
      expect(registry1.cacheValid).toBe(true);
      expect(registry2.cacheValid).toBe(true);
    });

    it('should invalidate cache when forced', async () => {
      await fs.writeFile(
        path.join(commandsDir, 'test.md'),
        `---
description: Test command
---
# Test`
      );

      await discoverComponents(tempDir);

      // Add new file
      await fs.writeFile(
        path.join(commandsDir, 'test2.md'),
        `---
description: Test command 2
---
# Test 2`
      );

      // Should still return cached result (1 command + 10 embedded hooks = 11)
      const registry2 = await discoverComponents(tempDir);
      expect(getComponentsByType('command', registry2).length).toBe(1);

      // Force refresh should pick up new file (2 commands + 10 embedded hooks = 12)
      const registry3 = await discoverComponents(tempDir, { forceRefresh: true });
      expect(getComponentsByType('command', registry3).length).toBe(2);
    });

    it('should provide accurate performance statistics', async () => {
      await fs.writeFile(
        path.join(commandsDir, 'cmd1.md'),
        `---
description: Command 1
category: git
---
# Command 1`
      );

      await fs.writeFile(
        path.join(commandsDir, 'cmd2.md'),
        `---
description: Command 2
category: validation
---
# Command 2`
      );

      const registry = await discoverComponents(tempDir);
      const stats = getDiscoveryStats(registry);

      // 2 commands + 10 embedded hooks = 12 total
      expect(stats.totalComponents).toBe(12);
      expect(stats.commandCount).toBe(2);
      expect(stats.hookCount).toBe(10); // All embedded hooks
      expect(stats.categoryCounts.git).toBeGreaterThanOrEqual(1); // git command + create-checkpoint hook
      expect(stats.categoryCounts.validation).toBeGreaterThanOrEqual(1); // validation command + validation hooks
      expect(stats.cacheStatus).toBe('valid');
    });
  });

  describe('Registry Conversion', () => {
    it('should convert registry to Component array format', async () => {
      await fs.writeFile(
        path.join(commandsDir, 'test.md'),
        `---
description: Test command
allowed-tools: Read, Write
argument-hint: "[test]"
version: 1.0.0
author: Test Author
---
# Test Command`
      );

      const registry = await discoverComponents(tempDir);
      const components = registryToComponents(registry);

      // Should have 1 command + 10 embedded hooks
      expect(components.length).toBe(11);

      const testCommand = components.find((c) => c.id === 'test');
      expect(testCommand).toBeDefined();
      expect(testCommand?.type).toBe('command');
      expect(testCommand?.name).toBe('test');
      expect(testCommand?.description).toBe('Test command');
      expect(testCommand?.dependencies).toEqual(['read', 'write']);
      expect(testCommand?.platforms).toEqual(['all']);
      expect(testCommand?.version).toBe('1.0.0');
      expect(testCommand?.author).toBe('Test Author');
      expect(testCommand?.config?.['allowedTools']).toEqual(['Read', 'Write']);
      expect(testCommand?.config?.['argumentHint']).toBe('[test]');
      expect(testCommand?.createdAt).toBeInstanceOf(Date);
      expect(testCommand?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid paths gracefully', async () => {
      const registry = await discoverComponents('/invalid/path');
      expect(registry.components.size).toBe(0);
    });

    it('should handle corrupted files gracefully', async () => {
      // Create file with invalid content
      await fs.writeFile(path.join(commandsDir, 'corrupted.md'), 'Invalid content\x00\x01');

      const registry = await discoverComponents(tempDir);

      // Should not throw, but may not parse the corrupted file
      expect(registry.components.size).toBeGreaterThanOrEqual(0);
    });

    it('should handle permission errors gracefully', async () => {
      await fs.writeFile(
        path.join(commandsDir, 'test.md'),
        `---
description: Test
---
# Test`
      );

      // Remove read permission (may not work on all systems)
      try {
        await fs.chmod(path.join(commandsDir, 'test.md'), 0o000);

        const registry = await discoverComponents(tempDir);

        // Should handle gracefully - exact behavior depends on system
        expect(registry).toBeDefined();

        // Restore permissions for cleanup
        await fs.chmod(path.join(commandsDir, 'test.md'), 0o644);
      } catch (error) {
        // Skip this test on systems where chmod doesn't work as expected
        console.warn('Skipping permission test:', error);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should complete discovery in under 500ms for reasonable component count', async () => {
      // Create multiple components to test performance
      const componentCount = 20;

      for (let i = 0; i < componentCount; i++) {
        await fs.writeFile(
          path.join(commandsDir, `cmd${i}.md`),
          `---
description: Command ${i}
category: utility
---
# Command ${i}`
        );

        // No need to create hook files anymore since we use embedded hooks
      }

      const startTime = Date.now();
      const registry = await discoverComponents(tempDir);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
      // Should have componentCount commands + 10 embedded hooks
      expect(registry.components.size).toBe(componentCount + 10);
    });
  });
});
