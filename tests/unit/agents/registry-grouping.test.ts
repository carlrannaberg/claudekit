import { describe, it, expect, beforeAll } from 'vitest';
import {
  groupAgentsByCategory,
  calculateSelectedAgents,
  getAgentDisplayName,
  type AgentComponent,
  type AgentCategoryGroup,
} from '../../../cli/lib/agents/registry-grouping.js';
import { discoverComponents } from '../../../cli/lib/components.js';
import { findComponentsDirectory } from '../../../cli/lib/paths.js';
import type { ComponentRegistry } from '../../../cli/lib/components.js';

describe('Agent Grouping', () => {
  let registry: ComponentRegistry;

  beforeAll(async () => {
    const sourceDir = await findComponentsDirectory();
    registry = await discoverComponents(sourceDir);
  });

  describe('Category-based grouping', () => {
    it('should group agents by their categories', async () => {
      const groups = groupAgentsByCategory(registry);

      // Should have various category groups
      expect(groups).toBeDefined();
      expect(groups.length).toBeGreaterThan(0);

      const categoryNames = groups.map((g: AgentCategoryGroup) => g.category);

      // Check for expected categories
      expect(categoryNames).toContain('general');
      expect(categoryNames).toContain('framework');
      expect(categoryNames).toContain('testing');
      expect(categoryNames).toContain('database');
      expect(categoryNames).toContain('build');
    });

    it('should include all testing agents in testing category', async () => {
      const groups = groupAgentsByCategory(registry);
      const testGroup = groups.find((g: AgentCategoryGroup) => g.category === 'testing');

      expect(testGroup).toBeDefined();
      if (testGroup) {
        const agentIds = testGroup.agents.map((a: AgentComponent) => a.id);
        console.log('Testing agents found:', agentIds);

        // Testing category should contain all test frameworks
        expect(agentIds).toContain('jest-testing-expert');
        expect(agentIds).toContain('vitest-testing-expert');
        expect(agentIds).toContain('testing-expert');

        // Should now include Playwright in testing category
        expect(agentIds).toContain('e2e-playwright-expert');
      }
    });

    it('should have build tools in build category', async () => {
      const groups = groupAgentsByCategory(registry);
      const buildGroup = groups.find((g: AgentCategoryGroup) => g.category === 'build');

      expect(buildGroup).toBeDefined();
      if (buildGroup) {
        const agentIds = buildGroup.agents.map((a: AgentComponent) => a.id);
        expect(agentIds).toContain('build-tools-vite-expert');
        expect(agentIds).toContain('build-tools-webpack-expert');
      }
    });

    it('should have database agents in database category', async () => {
      const groups = groupAgentsByCategory(registry);
      const dbGroup = groups.find((g: AgentCategoryGroup) => g.category === 'database');

      expect(dbGroup).toBeDefined();
      if (dbGroup) {
        const agentIds = dbGroup.agents.map((a: AgentComponent) => a.id);
        expect(agentIds).toContain('database-mongodb-expert');
        expect(agentIds).toContain('database-postgres-expert');
        expect(agentIds).toContain('database-expert');
      }
    });

    it('should mark general category as pre-selected', async () => {
      const groups = groupAgentsByCategory(registry);
      const generalGroup = groups.find((g: AgentCategoryGroup) => g.category === 'general');

      expect(generalGroup).toBeDefined();
      expect(generalGroup?.preSelected).toBe(true);

      // Other categories should not be pre-selected by default
      const frameworkGroup = groups.find((g: AgentCategoryGroup) => g.category === 'framework');
      expect(frameworkGroup?.preSelected).toBe(false);
    });
  });

  describe('Bundle handling', () => {
    it.skip('should not show bundled agents in main lists', async () => {
      const groups = groupAgentsByCategory(registry);

      // Flatten all visible agents
      const allVisibleAgents = groups.flatMap((g: AgentCategoryGroup) =>
        g.agents.map((a: AgentComponent) => a.id)
      );

      // TypeScript bundles type-expert and build-expert - they should not appear in main list
      expect(allVisibleAgents).not.toContain('typescript-type-expert');
      expect(allVisibleAgents).not.toContain('typescript-build-expert');

      // React bundles performance-expert - it should not appear in main list
      expect(allVisibleAgents).not.toContain('react-performance-expert');

      // But the parent agents should be visible
      expect(allVisibleAgents).toContain('typescript-expert');
      expect(allVisibleAgents).toContain('react-expert');
    });

    it.skip('should include bundled agents when parent is selected', async () => {
      const selectedIds = ['typescript-expert'];
      const finalAgents = calculateSelectedAgents(registry, selectedIds);

      // Should include the parent and bundled agents
      expect(finalAgents).toContain('typescript-expert');
      expect(finalAgents).toContain('typescript-type-expert');
      expect(finalAgents).toContain('typescript-build-expert');
    });
  });

  describe('Display names', () => {
    it('should show bundle count in display name', () => {
      const agent: AgentComponent = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test',
        category: 'testing',
        bundle: ['bundled-1', 'bundled-2'],
        displayName: undefined,
      };

      const displayName = getAgentDisplayName(agent);
      expect(displayName).toBe('Test Agent (3 agents)');
    });

    it('should use displayName when available', () => {
      const agent: AgentComponent = {
        id: 'test-agent',
        name: 'test-agent',
        description: 'Test',
        category: 'testing',
        bundle: undefined,
        displayName: 'Custom Display Name',
      };

      const displayName = getAgentDisplayName(agent);
      expect(displayName).toBe('Custom Display Name');
    });
  });
});
