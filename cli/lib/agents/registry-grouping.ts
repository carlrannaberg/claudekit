// cli/lib/agents/registry-grouping.ts
// Agent grouping system that works with the component registry

import type { ComponentRegistry } from '../components.js';

// Agent component interface that works with registry
export interface AgentComponent {
  id: string;
  name: string;
  description: string;
  category: string | undefined;
  bundle: string[] | undefined;
  displayName: string | undefined;
}

export interface AgentCategoryGroup {
  category: string;
  title: string;
  description: string;
  agents: AgentComponent[];
  preSelected?: boolean;
}

// Define the agent categories with their display information
export const AGENT_CATEGORIES = [
  {
    category: 'general',
    title: 'General Purpose',
    description: 'General development assistants and tools',
    preSelected: true,
  },
  {
    category: 'framework',
    title: 'Frameworks & Core',
    description: 'Core frameworks and language support',
    preSelected: false,
  },
  {
    category: 'testing',
    title: 'Testing',
    description: 'Testing frameworks and tools',
    preSelected: false,
  },
  {
    category: 'linting',
    title: 'Linting & Formatting',
    description: 'Code linting, formatting, and style enforcement',
    preSelected: false,
  },
  {
    category: 'database',
    title: 'Database',
    description: 'Database systems and ORMs',
    preSelected: false,
  },
  {
    category: 'build',
    title: 'Build Tools',
    description: 'Build and bundling tools',
    preSelected: false,
  },
  {
    category: 'frontend',
    title: 'Frontend',
    description: 'Frontend development tools',
    preSelected: false,
  },
  {
    category: 'devops',
    title: 'DevOps',
    description: 'Infrastructure and deployment tools',
    preSelected: false,
  },
  {
    category: 'tools',
    title: 'Development Tools',
    description: 'Additional development and analysis tools',
    preSelected: false,
  },
];

/**
 * Convert registry component to agent component with metadata
 */
function toAgentComponent(component: unknown): AgentComponent {
  // Cast to any to access nested properties, then validate
  const comp = component as {
    metadata: {
      id: string;
      name: string;
      description: string;
      [key: string]: unknown;
    };
  };
  const metadata = comp.metadata;

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    category: metadata['agentCategory'] as string | undefined,
    bundle: metadata['bundle'] as string[] | undefined,
    displayName: metadata['displayName'] as string | undefined,
  };
}

/**
 * Get display name for an agent, handling bundles
 */
export function getAgentDisplayName(agent: AgentComponent): string {
  let displayName = agent.displayName ?? agent.name;

  // If this agent bundles other agents, indicate how many
  if (agent.bundle !== undefined && agent.bundle.length > 0) {
    displayName += ` (${agent.bundle.length + 1} agents)`;
  }

  return displayName;
}

/**
 * Group agents from the registry based on their category
 */
export function groupAgentsByCategory(registry: ComponentRegistry): AgentCategoryGroup[] {
  const agentComponents = Array.from(registry.components.values())
    .filter((c) => c.type === 'agent')
    .map(toAgentComponent);

  // Build a set of all bundled agent IDs (agents that are included in bundles)
  const bundledAgentIds = new Set<string>();
  agentComponents.forEach((agent) => {
    if (agent.bundle && Array.isArray(agent.bundle)) {
      agent.bundle.forEach((bundledId: string) => bundledAgentIds.add(bundledId));
    }
  });

  // Filter out bundled agents from the main list
  const visibleAgents = agentComponents.filter((agent) => !bundledAgentIds.has(agent.id));

  // Group agents by category
  const groups: AgentCategoryGroup[] = [];

  for (const categoryDef of AGENT_CATEGORIES) {
    const categoryAgents = visibleAgents.filter((agent) => agent.category === categoryDef.category);

    if (categoryAgents.length > 0) {
      groups.push({
        ...categoryDef,
        agents: categoryAgents.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }

  // Add a group for uncategorized agents (for debugging/migration)
  const uncategorized = visibleAgents.filter(
    (agent) => agent.category === undefined || agent.category === ''
  );
  if (uncategorized.length > 0) {
    groups.push({
      category: 'uncategorized',
      title: 'Other Agents',
      description: 'Agents without categories',
      agents: uncategorized,
      preSelected: false,
    });
  }

  return groups;
}

/**
 * Calculate final list of agents to install based on selections
 */
export function calculateSelectedAgents(
  registry: ComponentRegistry,
  selectedAgentIds: string[]
): string[] {
  const finalAgents = new Set<string>(selectedAgentIds);

  // Get all agent components
  const agentComponents = Array.from(registry.components.values())
    .filter((c) => c.type === 'agent')
    .map(toAgentComponent);

  // Add bundled agents for any selected agents that have bundles
  selectedAgentIds.forEach((agentId) => {
    const agent = agentComponents.find((a) => a.id === agentId);
    if (agent && agent.bundle && Array.isArray(agent.bundle)) {
      agent.bundle.forEach((bundledId) => finalAgents.add(bundledId));
    }
  });

  return Array.from(finalAgents);
}
