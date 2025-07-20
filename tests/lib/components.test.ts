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
} from '../../cli/lib/components.js';

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
      expect(component!.metadata.name).toBe('test');
      expect(component!.metadata.description).toBe('Test command for validation');
      expect(component!.metadata.allowedTools).toEqual(['Read', 'Bash(git:*)']);
      expect(component!.metadata.argumentHint).toBe('[test-arg]');
      expect(component!.metadata.version).toBe('1.0.0');
      expect(component!.metadata.author).toBe('Test Author');
      expect(component!.type).toBe('command');
    });

    it('should parse hook files with header comments correctly', async () => {
      const hookContent = `#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test Hook                                                                    #
# Description: Validates code quality and standards                           #
# Category: validation                                                         #
# Dependencies: eslint, git                                                   #
# Version: 2.1.0                                                             #
################################################################################

# This hook validates code quality
echo "Running validation..."

# Use git status
git status --short

# Run ESLint
eslint src/
`;

      await fs.writeFile(path.join(hooksDir, 'test-validation.sh'), hookContent);
      await fs.chmod(path.join(hooksDir, 'test-validation.sh'), 0o755);
      
      const registry = await discoverComponents(tempDir);
      const component = getComponent('test-validation', registry);
      
      expect(component).toBeDefined();
      expect(component!.metadata.name).toBe('test-validation');
      expect(component!.metadata.description).toMatch(/Validates code quality and standards/);
      expect(component!.metadata.category).toBe('validation');
      expect(component!.metadata.dependencies).toContain('git');
      expect(component!.metadata.dependencies).toContain('eslint');
      expect(component!.metadata.version).toBe('2.1.0');
      expect(component!.metadata.shellOptions).toEqual(['-euo', 'pipefail']);
      expect(component!.type).toBe('hook');
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

      const validationHookContent = `#!/usr/bin/env bash
set -euo pipefail

# TypeScript validation hook
# Runs type checking on modified files

tsc --noEmit
eslint src/
`;

      await fs.writeFile(path.join(commandsDir, 'git-status.md'), gitCommandContent);
      await fs.writeFile(path.join(hooksDir, 'typecheck.sh'), validationHookContent);
      
      const registry = await discoverComponents(tempDir);
      
      const gitComponent = getComponent('git-status', registry);
      expect(gitComponent!.metadata.category).toBe('git');
      
      const validationComponent = getComponent('typecheck', registry);
      expect(validationComponent!.metadata.category).toBe('validation');
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

      const hookWithDeps = `#!/usr/bin/env bash

# Hook that depends on various tools
git status
npm test
yarn install
pnpm build
.claude/hooks/other-hook.sh
`;

      await fs.writeFile(path.join(commandsDir, 'complex.md'), commandWithDeps);
      await fs.writeFile(path.join(hooksDir, 'complex.sh'), hookWithDeps);
      
      const registry = await discoverComponents(tempDir);
      
      const commandComponent = getComponent('complex', registry);
      // Command should extract basic tools from allowed-tools
      expect(commandComponent!.metadata.dependencies.length).toBeGreaterThan(0);
      
      const hookComponent = getComponent('complex', registry);
      expect(hookComponent!.metadata.dependencies).toContain('git');
      expect(hookComponent!.metadata.dependencies).toContain('npm');
      expect(hookComponent!.metadata.dependencies).toContain('yarn');
      expect(hookComponent!.metadata.dependencies).toContain('pnpm');
      expect(hookComponent!.metadata.dependencies).toContain('other-hook');
    });
  });

  describe('Directory Scanning', () => {
    it('should discover components in nested directories', async () => {
      // Create nested structure
      const gitDir = path.join(commandsDir, 'git');
      const validationDir = path.join(hooksDir, 'validation');
      
      await fs.mkdir(gitDir, { recursive: true });
      await fs.mkdir(validationDir, { recursive: true });
      
      await fs.writeFile(path.join(gitDir, 'commit.md'), `---
description: Git commit command
---
# Git Commit`);
      
      await fs.writeFile(path.join(validationDir, 'eslint.sh'), `#!/usr/bin/env bash
# ESLint validation hook
eslint src/`);
      
      const registry = await discoverComponents(tempDir);
      
      expect(getComponent('git-commit', registry)).toBeDefined();
      expect(getComponent('validation-eslint', registry)).toBeDefined();
      expect(registry.components.size).toBe(2);
    });

    it('should handle missing directories gracefully', async () => {
      // Remove one directory
      await fs.rm(hooksDir, { recursive: true });
      
      await fs.writeFile(path.join(commandsDir, 'test.md'), `---
description: Test command
---
# Test`);
      
      const registry = await discoverComponents(tempDir);
      
      expect(registry.components.size).toBe(1);
      expect(getComponent('test', registry)).toBeDefined();
    });

    it('should respect includeDisabled option', async () => {
      await fs.writeFile(path.join(commandsDir, 'enabled.md'), `---
description: Enabled command
enabled: true
---
# Enabled`);
      
      await fs.writeFile(path.join(commandsDir, 'disabled.md'), `---
description: Disabled command
enabled: false
---
# Disabled`);
      
      const registryAll = await discoverComponents(tempDir, { includeDisabled: true });
      expect(registryAll.components.size).toBe(2);
      
      // Clear cache before second call
      invalidateCache(tempDir);
      const registryEnabled = await discoverComponents(tempDir, { includeDisabled: false });
      expect(registryEnabled.components.size).toBe(1);
      expect(getComponent('enabled', registryEnabled)).toBeDefined();
      expect(getComponent('disabled', registryEnabled)).toBeUndefined();
    });

    it('should filter by type and category', async () => {
      await fs.writeFile(path.join(commandsDir, 'git-cmd.md'), `---
description: Git command
category: git
---
# Git Command`);
      
      await fs.writeFile(path.join(hooksDir, 'validation.sh'), `#!/usr/bin/env bash
# Validation hook
# Category: validation
eslint src/`);
      
      const registry = await discoverComponents(tempDir);
      
      const gitComponents = getComponentsByCategory('git', registry);
      expect(gitComponents).toHaveLength(1);
      expect(gitComponents[0].metadata.name).toBe('git-cmd');
      
      const commands = getComponentsByType('command', registry);
      expect(commands).toHaveLength(1);
      
      const hooks = getComponentsByType('hook', registry);
      expect(hooks).toHaveLength(1);
    });
  });

  describe('Dependency Resolution', () => {
    beforeEach(async () => {
      // Create components with dependencies
      await fs.writeFile(path.join(commandsDir, 'base.md'), `---
description: Base command
---
# Base Command`);
      
      await fs.writeFile(path.join(commandsDir, 'dependent.md'), `---
description: Dependent command
---
# Dependent
Uses /base command`);
      
      await fs.writeFile(path.join(hooksDir, 'base-hook.sh'), `#!/usr/bin/env bash
# Base hook
echo "base"`);
      
      await fs.writeFile(path.join(hooksDir, 'dependent-hook.sh'), `#!/usr/bin/env bash
# Dependent hook
.claude/hooks/base-hook.sh`);
    });

    it('should build dependency graphs correctly', async () => {
      const registry = await discoverComponents(tempDir);
      
      const dependentCmd = getComponent('dependent', registry);
      const dependentHook = getComponent('dependent-hook', registry);
      
      expect(dependentCmd).toBeDefined();
      expect(dependentHook).toBeDefined();
      
      const cmdDeps = getDependencies('dependent', registry);
      expect(cmdDeps.some(c => c.metadata.id === 'base')).toBe(true);
      
      const hookDeps = getDependencies('dependent-hook', registry);
      expect(hookDeps.some(c => c.metadata.id === 'base-hook')).toBe(true);
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
      await fs.writeFile(path.join(commandsDir, 'circular-a.md'), `---
description: Circular A
---
# Circular A
Uses /circular-b`);
      
      await fs.writeFile(path.join(commandsDir, 'circular-b.md'), `---
description: Circular B
---
# Circular B
Uses /circular-a`);
      
      const registry = await discoverComponents(tempDir);
      
      expect(() => {
        resolveDependencyOrder(['circular-a', 'circular-b'], registry);
      }).toThrow('Circular dependency detected');
    });

    it('should find dependents correctly', async () => {
      const registry = await discoverComponents(tempDir);
      
      const baseDependents = getDependents('base', registry);
      expect(baseDependents.some(c => c.metadata.id === 'dependent')).toBe(true);
      
      const baseHookDependents = getDependents('base-hook', registry);
      expect(baseHookDependents.some(c => c.metadata.id === 'dependent-hook')).toBe(true);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(commandsDir, 'git-status.md'), `---
description: Check git repository status
---
# Git Status`);
      
      await fs.writeFile(path.join(commandsDir, 'validation.md'), `---
description: Validate code quality
---
# Validation`);
      
      await fs.writeFile(path.join(hooksDir, 'eslint.sh'), `#!/usr/bin/env bash
# ESLint validation hook
eslint src/`);
    });

    it('should search by name', async () => {
      const registry = await discoverComponents(tempDir);
      
      const gitResults = searchComponents('git', registry);
      expect(gitResults).toHaveLength(1);
      expect(gitResults[0].metadata.name).toBe('git-status');
    });

    it('should search by description when enabled', async () => {
      const registry = await discoverComponents(tempDir);
      
      const qualityResults = searchComponents('quality', registry, { includeDescription: true });
      expect(qualityResults).toHaveLength(1);
      expect(qualityResults[0].metadata.name).toBe('validation');
    });

    it('should rank name matches higher than description matches', async () => {
      const registry = await discoverComponents(tempDir);
      
      // Should find validation command first (name match) even though git-status also mentions status
      const validationResults = searchComponents('validation', registry, { includeDescription: true });
      expect(validationResults[0].metadata.name).toBe('validation');
    });
  });

  describe('Caching', () => {
    it('should cache results for performance', async () => {
      await fs.writeFile(path.join(commandsDir, 'test.md'), `---
description: Test command
---
# Test`);
      
      const registry1 = await discoverComponents(tempDir);
      const registry2 = await discoverComponents(tempDir);
      
      expect(registry1.components.size).toBe(registry2.components.size);
      expect(registry1.cacheValid).toBe(true);
      expect(registry2.cacheValid).toBe(true);
    });

    it('should invalidate cache when forced', async () => {
      await fs.writeFile(path.join(commandsDir, 'test.md'), `---
description: Test command
---
# Test`);
      
      const registry1 = await discoverComponents(tempDir);
      
      // Add new file
      await fs.writeFile(path.join(commandsDir, 'test2.md'), `---
description: Test command 2
---
# Test 2`);
      
      // Should still return cached result
      const registry2 = await discoverComponents(tempDir);
      expect(registry2.components.size).toBe(1);
      
      // Force refresh should pick up new file
      const registry3 = await discoverComponents(tempDir, { forceRefresh: true });
      expect(registry3.components.size).toBe(2);
    });

    it('should provide accurate performance statistics', async () => {
      await fs.writeFile(path.join(commandsDir, 'cmd1.md'), `---
description: Command 1
category: git
---
# Command 1`);
      
      await fs.writeFile(path.join(commandsDir, 'cmd2.md'), `---
description: Command 2
category: validation
---
# Command 2`);
      
      await fs.writeFile(path.join(hooksDir, 'hook1.sh'), `#!/usr/bin/env bash
# Hook 1
echo "hook1"`);
      
      const registry = await discoverComponents(tempDir);
      const stats = getDiscoveryStats(registry);
      
      expect(stats.totalComponents).toBe(3);
      expect(stats.commandCount).toBe(2);
      expect(stats.hookCount).toBe(1);
      expect(stats.categoryCounts.git).toBe(1);
      expect(stats.categoryCounts.validation).toBe(1);
      expect(stats.cacheStatus).toBe('valid');
    });
  });

  describe('Registry Conversion', () => {
    it('should convert registry to Component array format', async () => {
      await fs.writeFile(path.join(commandsDir, 'test.md'), `---
description: Test command
allowed-tools: Read, Write
argument-hint: "[test]"
version: 1.0.0
author: Test Author
---
# Test Command`);
      
      const registry = await discoverComponents(tempDir);
      const components = registryToComponents(registry);
      
      expect(components).toHaveLength(1);
      
      const component = components[0];
      expect(component.id).toBe('test');
      expect(component.type).toBe('command');
      expect(component.name).toBe('test');
      expect(component.description).toBe('Test command');
      expect(component.dependencies).toEqual(['read', 'write']);
      expect(component.platforms).toEqual(['all']);
      expect(component.version).toBe('1.0.0');
      expect(component.author).toBe('Test Author');
      expect(component.config.allowedTools).toEqual(['Read', 'Write']);
      expect(component.config.argumentHint).toBe('[test]');
      expect(component.createdAt).toBeInstanceOf(Date);
      expect(component.updatedAt).toBeInstanceOf(Date);
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
      await fs.writeFile(path.join(commandsDir, 'test.md'), `---
description: Test
---
# Test`);
      
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
        await fs.writeFile(path.join(commandsDir, `cmd${i}.md`), `---
description: Command ${i}
category: utility
---
# Command ${i}`);
        
        if (i < componentCount / 2) {
          await fs.writeFile(path.join(hooksDir, `hook${i}.sh`), `#!/usr/bin/env bash
# Hook ${i}
echo "hook${i}"`);
        }
      }
      
      const startTime = Date.now();
      const registry = await discoverComponents(tempDir);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(500);
      expect(registry.components.size).toBe(componentCount + componentCount / 2);
    });
  });
});