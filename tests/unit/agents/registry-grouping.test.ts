import { describe, it, expect, beforeAll } from 'vitest';
import { groupAgents, type AgentComponent, type RadioGroup } from '../../../cli/lib/agents/registry-grouping.js';
import { discoverComponents } from '../../../cli/lib/components.js';
import { findComponentsDirectory } from '../../../cli/lib/paths.js';
import type { ComponentRegistry } from '../../../cli/lib/components.js';

describe('Agent Grouping', () => {
  let registry: ComponentRegistry;
  
  beforeAll(async () => {
    const sourceDir = await findComponentsDirectory();
    registry = await discoverComponents(sourceDir);
  });

  describe('Dynamic Radio Groups', () => {
    it('should create radio groups based on prefixes', async () => {
      const groups = groupAgents(registry);
      
      // Should have radio groups for testing, database, and build-tools
      expect(groups.radioGroups).toBeDefined();
      expect(groups.radioGroups.length).toBeGreaterThan(0);
      
      const radioGroupIds = groups.radioGroups.map((g: RadioGroup) => g.id);
      expect(radioGroupIds).toContain('test-framework');
      expect(radioGroupIds).toContain('database');
      expect(radioGroupIds).toContain('build-tool');
    });

    it('should include all testing agents in test-framework group', async () => {
      const groups = groupAgents(registry);
      const testGroup = groups.radioGroups.find((g: RadioGroup) => g.id === 'test-framework');
      
      expect(testGroup).toBeDefined();
      if (testGroup) {
        const allAgents = testGroup.options.flatMap((o) => o.agents);
        // Test framework group should contain unit test frameworks
        expect(allAgents).toContain('testing-jest-expert');
        expect(allAgents).toContain('testing-vitest-expert');
        
        // Verify Playwright is NOT in test-framework group (it's E2E, not unit testing)
        const playwrightInGroup = allAgents.some((id: string) => id.includes('playwright'));
        expect(playwrightInGroup).toBe(false);
      }
    });

    it('should not have build tools in optional section', async () => {
      const groups = groupAgents(registry);
      
      const buildToolsInOptional = groups.optional.filter((a: AgentComponent) => 
        a.id.includes('vite') || a.id.includes('webpack')
      );
      
      expect(buildToolsInOptional).toHaveLength(0);
    });

    it('should not have database agents in optional section', async () => {
      const groups = groupAgents(registry);
      
      const dbInOptional = groups.optional.filter((a: AgentComponent) => 
        a.id.startsWith('database-')
      );
      
      expect(dbInOptional).toHaveLength(0);
    });

    it('should not have test framework agents in optional section', async () => {
      const groups = groupAgents(registry);
      
      const testInOptional = groups.optional.filter((a: AgentComponent) => 
        a.id.startsWith('testing-') && 
        (a.id.includes('jest') || a.id.includes('vitest'))
      );
      
      expect(testInOptional).toHaveLength(0);
    });
  });

  describe('Agent Categories', () => {
    it('should have universal agents', async () => {
      const groups = groupAgents(registry);
      
      expect(groups.universal.length).toBeGreaterThan(0);
      
      // Oracle and git-expert should be universal
      const universalIds = groups.universal.map((a: AgentComponent) => a.id);
      expect(universalIds).toContain('oracle');
      expect(universalIds).toContain('git-expert');
    });

    it('should have technology agents', async () => {
      const groups = groupAgents(registry);
      
      expect(groups.technology.length).toBeGreaterThan(0);
      
      // TypeScript, React, Node.js experts should be in technology
      const techIds = groups.technology.map((a: AgentComponent) => a.id);
      expect(techIds).toContain('typescript-expert');
      expect(techIds).toContain('react-expert');
      expect(techIds).toContain('nodejs-expert');
    });

    it('should have optional agents', async () => {
      const groups = groupAgents(registry);
      
      expect(groups.optional.length).toBeGreaterThan(0);
      
      // CSS, accessibility, Docker should be optional
      const optionalIds = groups.optional.map((a: AgentComponent) => a.id);
      const hasCSS = optionalIds.some((id: string) => id.includes('css'));
      const hasAccessibility = optionalIds.some((id: string) => id.includes('accessibility'));
      const hasDocker = optionalIds.some((id: string) => id.includes('docker'));
      
      expect(hasCSS || hasAccessibility || hasDocker).toBe(true);
    });
  });

  describe('No Duplicates', () => {
    it('should not have any agent in multiple categories', async () => {
      const groups = groupAgents(registry);
      
      const allIds = new Set<string>();
      const duplicates: string[] = [];
      
      // Collect all IDs and check for duplicates
      const categories = [
        groups.universal,
        groups.technology,
        groups.optional,
      ];
      
      categories.forEach(category => {
        category.forEach((agent: AgentComponent) => {
          if (allIds.has(agent.id)) {
            duplicates.push(agent.id);
          }
          allIds.add(agent.id);
        });
      });
      
      // Radio group agents shouldn't be in other categories
      groups.radioGroups.forEach((group: RadioGroup) => {
        group.options.forEach((option) => {
          option.agents.forEach((agentId: string) => {
            categories.forEach(category => {
              const inCategory = category.some((a: AgentComponent) => a.id === agentId);
              if (inCategory) {
                duplicates.push(agentId);
              }
            });
          });
        });
      });
      
      expect(duplicates).toHaveLength(0);
    });
  });
});