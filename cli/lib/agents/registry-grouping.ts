// cli/lib/agents/registry-grouping.ts
// Agent grouping system that works with the component registry

import type { ComponentRegistry } from '../components.js';

// Agent component interface that works with registry
export interface AgentComponent {
  id: string;
  name: string;
  description: string;
  universal: boolean | string | undefined;
  bundle: string[] | undefined;
  displayName: string | undefined;
  category: string | undefined;
}

export interface AgentGroup {
  id: string;
  title: string;
  agents: AgentComponent[];
}

export interface RadioGroup {
  id: string;
  title: string;
  type: 'radio';
  options: {
    id: string;
    label: string;
    agents: string[];
  }[];
}

// Define radio groups for mutually exclusive selections
export const AGENT_RADIO_GROUPS: RadioGroup[] = [
  {
    id: 'test-framework',
    title: 'Test Framework',
    type: 'radio',
    options: [
      { id: 'jest', label: 'Jest', agents: ['jest-expert'] },
      { id: 'vitest', label: 'Vitest', agents: ['vitest-expert'] },
      { id: 'both-test', label: 'Both', agents: ['jest-expert', 'vitest-expert'] },
      { id: 'none-test', label: 'None', agents: [] },
    ],
  },
  {
    id: 'database',
    title: 'Database',
    type: 'radio',
    options: [
      { id: 'postgres', label: 'PostgreSQL', agents: ['database-expert', 'postgres-expert'] },
      { id: 'mongodb', label: 'MongoDB', agents: ['database-expert', 'mongodb-expert'] },
      { id: 'both-db', label: 'Both', agents: ['database-expert', 'postgres-expert', 'mongodb-expert'] },
      { id: 'none-db', label: 'None', agents: [] },
    ],
  },
  {
    id: 'build-tool',
    title: 'Build Tool',
    type: 'radio',
    options: [
      { id: 'vite', label: 'Vite', agents: ['vite-expert'] },
      { id: 'webpack', label: 'Webpack', agents: ['webpack-expert'] },
      { id: 'both-build', label: 'Both', agents: ['vite-expert', 'webpack-expert'] },
      { id: 'none-build', label: 'None', agents: [] },
    ],
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
    universal: metadata['universal'] as boolean | string | undefined,
    bundle: metadata['bundle'] as string[] | undefined,
    displayName: metadata['displayName'] as string | undefined,
    category: metadata['category'] as string | undefined,
  };
}

/**
 * Group agents from the registry based on their metadata
 */
export function groupAgents(registry: ComponentRegistry): {
  universal: AgentComponent[];
  technology: AgentComponent[];
  radioGroups: RadioGroup[];
  optional: AgentComponent[];
} {
  const agentComponents = Array.from(registry.components.values())
    .filter((c) => c.type === 'agent')
    .map(toAgentComponent);

  // Group by universal flag in metadata
  const universal = agentComponents.filter((a) => {
    return a.universal === true || String(a.universal) === 'true';
  });
  
  // Technology stack agents (non-universal, not in radio groups)
  const radioGroupAgents = new Set(
    AGENT_RADIO_GROUPS.flatMap(g => g.options.flatMap(o => o.agents))
  );
  
  const technology = agentComponents.filter((a) => {
    if (a.universal === true || String(a.universal) === 'true') {
      return false;
    }
    if (radioGroupAgents.has(a.id)) {
      return false;
    }
    // Use category field if available, otherwise fall back to keyword matching
    if (a.category === 'technology') {
      return true;
    }
    // Fallback for agents without category field (backward compatibility)
    return ['typescript', 'react', 'nodejs', 'nextjs', 'docker', 'github-actions'].some(
      tech => a.id.includes(tech)
    );
  });

  // Optional agents (not universal, not technology, not in radio groups)
  const optional = agentComponents.filter((a) => {
    if (a.universal === true || String(a.universal) === 'true') {
      return false;
    }
    if (radioGroupAgents.has(a.id)) {
      return false;
    }
    if (technology.includes(a)) {
      return false;
    }
    // Use category field if available, otherwise fall back to keyword matching
    if (a.category === 'optional') {
      return true;
    }
    // Fallback for agents without category field (backward compatibility)
    return ['playwright', 'css', 'accessibility', 'devops'].some(
      keyword => a.id.includes(keyword)
    );
  });

  return {
    universal,
    technology,
    radioGroups: AGENT_RADIO_GROUPS,
    optional,
  };
}

/**
 * Calculate selected agents including bundles
 */
export function calculateSelectedAgentsFromRegistry(
  registry: ComponentRegistry,
  universalIds: string[],
  technologyIds: string[],
  radioSelections: Map<string, string>,
  optionalIds: string[]
): string[] {
  const selectedAgents = new Set<string>();
  const agentComponents = Array.from(registry.components.values())
    .filter((c) => c.type === 'agent')
    .map(toAgentComponent);

  // Add universal agents
  if (Array.isArray(universalIds) && universalIds.length > 0) {
    universalIds.forEach(id => selectedAgents.add(id));
  }

  // Add technology agents and their bundles
  if (Array.isArray(technologyIds) && technologyIds.length > 0) {
    technologyIds.forEach(id => {
      selectedAgents.add(id);
      const agent = agentComponents.find(a => a.id === id);
      if (agent && agent.bundle && Array.isArray(agent.bundle)) {
        agent.bundle.forEach((bundledId: string) => selectedAgents.add(bundledId));
      }
    });
  }

  // Add radio group selections
  if (radioSelections instanceof Map && radioSelections.size > 0) {
    radioSelections.forEach((selection, groupId) => {
      const group = AGENT_RADIO_GROUPS.find(g => g.id === groupId);
      const option = group?.options.find(o => o.id === selection);
      if (option) {
        option.agents.forEach(id => selectedAgents.add(id));
      }
    });
  }

  // Add optional agents
  if (Array.isArray(optionalIds) && optionalIds.length > 0) {
    optionalIds.forEach(id => selectedAgents.add(id));
  }

  return Array.from(selectedAgents);
}

/**
 * Get display name for an agent
 */
export function getAgentDisplayName(agent: AgentComponent): string {
  // Use displayName from metadata if available
  if (agent.displayName !== undefined && agent.displayName !== '') {
    return agent.displayName;
  }
  
  // Use name from metadata
  if (agent.name !== undefined && agent.name !== '') {
    return agent.name;
  }
  
  // Fallback to formatting the ID
  return agent.id
    .replace(/-expert$/, '')
    .split('-')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}