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

// Define prefixes for dynamic radio group generation
const RADIO_GROUP_PREFIXES = [
  { prefix: 'testing-', title: 'Test Framework', id: 'test-framework' },
  { prefix: 'database-', title: 'Database', id: 'database' },
  { prefix: 'build-tools-', title: 'Build Tool', id: 'build-tool' },
];

/**
 * Dynamically generate radio groups based on agent prefixes
 */
function generateRadioGroups(agentComponents: AgentComponent[]): RadioGroup[] {
  return RADIO_GROUP_PREFIXES.map(groupDef => {
    // Find all agents matching this prefix
    const prefixAgents = agentComponents.filter(a => a.id.startsWith(groupDef.prefix));
    
    // Skip if no agents found for this prefix
    if (prefixAgents.length === 0) {
      return null;
    }
    
    // Create options from found agents
    const options: RadioGroup['options'] = [];
    
    // Find base expert (e.g., "database-expert" for database group)
    const baseExpertId = `${groupDef.prefix.slice(0, -1)}-expert`;
    const baseExpert = prefixAgents.find(a => a.id === baseExpertId);
    
    // Find specific experts (e.g., "database-postgres-expert", "database-mongodb-expert")
    const specificAgents = prefixAgents.filter(a => a.id !== baseExpertId);
    
    // Create individual options for each specific agent
    specificAgents.forEach(agent => {
      // Use displayName from metadata if available, otherwise extract from ID
      let label: string;
      if (agent.displayName !== undefined && agent.displayName !== '') {
        label = agent.displayName;
      } else if (agent.name !== undefined && agent.name !== '') {
        label = agent.name;
      } else {
        // Fallback: extract label from agent ID (e.g., "testing-jest-expert" -> "Jest")
        const labelPart = agent.id.replace(groupDef.prefix, '').replace('-expert', '');
        label = labelPart.charAt(0).toUpperCase() + labelPart.slice(1);
      }
      
      // Build agents list based on group type
      let agents: string[] = [];
      if (groupDef.prefix === 'database-' && baseExpert) {
        // For database, include base expert + specific expert
        agents = [baseExpert.id, agent.id];
      } else {
        // For others, just the specific expert
        agents = [agent.id];
      }
      
      options.push({
        id: agent.id,
        label,
        agents,
      });
    });
    
    // Add "Both/All" option if there are multiple specific agents
    if (specificAgents.length > 1) {
      const allAgents = prefixAgents.map(a => a.id);
      const label = specificAgents.length === 2 ? 'Both' : 'All';
      options.push({
        id: `all-${groupDef.id}`,
        label,
        agents: allAgents,
      });
    }
    
    // Always add "None" option
    options.push({
      id: `none-${groupDef.id}`,
      label: 'None',
      agents: [],
    });
    
    return {
      id: groupDef.id,
      title: groupDef.title,
      type: 'radio' as const,
      options,
    };
  }).filter((group): group is RadioGroup => group !== null);
}

// This will be populated dynamically when groupAgents is called
export const AGENT_RADIO_GROUPS: RadioGroup[] = [];

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
    category: metadata['agentGroup'] as string | undefined,
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

  // Build a set of all bundled agent IDs (agents that are included in bundles)
  const bundledAgentIds = new Set<string>();
  agentComponents.forEach(agent => {
    if (agent.bundle && Array.isArray(agent.bundle)) {
      agent.bundle.forEach((bundledId: string) => bundledAgentIds.add(bundledId));
    }
  });

  // Generate radio groups dynamically based on agent prefixes
  const radioGroups = generateRadioGroups(agentComponents);
  
  // Update the exported constant for backward compatibility
  AGENT_RADIO_GROUPS.length = 0;
  AGENT_RADIO_GROUPS.push(...radioGroups);

  // Group by universal flag in metadata
  const universal = agentComponents.filter((a) => {
    return a.universal === true || String(a.universal) === 'true';
  });
  
  // Technology stack agents (non-universal, not in radio groups, not bundled)
  const radioGroupAgents = new Set(
    radioGroups.flatMap(g => g.options.flatMap(o => o.agents))
  );
  
  const technology = agentComponents.filter((a) => {
    if (a.universal === true || String(a.universal) === 'true') {
      return false;
    }
    if (radioGroupAgents.has(a.id)) {
      return false;
    }
    // Exclude agents that are bundled by another agent
    if (bundledAgentIds.has(a.id)) {
      return false;
    }
    // Use category field if available, otherwise fall back to keyword matching
    if (a.category !== undefined && a.category !== null) {
      return a.category === 'technology';
    }
    // Fallback for agents without category field (backward compatibility)
    return ['typescript', 'react', 'nodejs', 'nextjs'].some(
      tech => a.id.includes(tech)
    );
  });

  // Optional agents (not universal, not technology, not in radio groups, not bundled)
  const optional = agentComponents.filter((a) => {
    if (a.universal === true || String(a.universal) === 'true') {
      return false;
    }
    if (radioGroupAgents.has(a.id)) {
      return false;
    }
    // Exclude agents that are bundled by another agent
    if (bundledAgentIds.has(a.id)) {
      return false;
    }
    if (technology.includes(a)) {
      return false;
    }
    // Use category field if available
    if (a.category !== undefined && a.category !== null) {
      return a.category === 'optional';
    }
    // No fallback - agents without proper category metadata won't appear
    return false;
  });

  return {
    universal,
    technology,
    radioGroups,
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
  let displayName: string;
  
  // Use displayName from metadata if available
  if (agent.displayName !== undefined && agent.displayName !== '') {
    displayName = agent.displayName;
  } else if (agent.name !== undefined && agent.name !== '') {
    // Use name from metadata
    displayName = agent.name;
  } else {
    // Fallback to ID
    displayName = agent.id;
  }
  
  // If this agent has a bundle, append the count
  if (agent.bundle && Array.isArray(agent.bundle) && agent.bundle.length > 0) {
    const totalAgents = agent.bundle.length + 1; // +1 for the parent agent itself
    displayName += ` (${totalAgents} agents)`;
  }
  
  return displayName;
}