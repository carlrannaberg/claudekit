// cli/lib/agents/registry.ts
interface DomainEntry {
  broad: string | null;
  specialized: string[];
}

type AgentRegistryType = Record<string, DomainEntry>;

export const AGENT_REGISTRY: AgentRegistryType = {
  typescript: {
    broad: 'typescript-expert',
    specialized: ['typescript-type-expert', 'typescript-build-expert'],
  },
  react: {
    broad: 'react-expert',
    specialized: ['react-performance-expert'],
  },
  nodejs: {
    broad: 'nodejs-expert',
    specialized: [],
  },
  testing: {
    broad: 'testing-expert',
    specialized: ['jest-expert', 'vitest-expert', 'playwright-expert'],
  },
  database: {
    broad: 'database-expert',
    specialized: ['postgres-expert', 'mongodb-expert'],
  },
  git: {
    broad: 'git-expert',
    specialized: [],
  },
  'code-quality': {
    broad: 'code-quality-expert',
    specialized: [],
  },
  devops: {
    broad: 'devops-expert',
    specialized: [],
  },
  infrastructure: {
    broad: null,
    specialized: ['docker-expert', 'github-actions-expert'],
  },
  frontend: {
    broad: null,
    specialized: ['css-styling-expert', 'accessibility-expert'],
  },
  'build-tools': {
    broad: null,
    specialized: ['webpack-expert', 'vite-expert'],
  },
  framework: {
    broad: null,
    specialized: ['nextjs-expert'],
  },
};

// Helper function to get all agents
export function getAllAgents(): string[] {
  const agents: string[] = [];
  for (const domain of Object.values(AGENT_REGISTRY)) {
    if (domain.broad !== null) {
      agents.push(domain.broad);
    }
    agents.push(...domain.specialized);
  }
  return agents;
}

// Get broad domain experts only
export function getBroadExperts(): string[] {
  return Object.values(AGENT_REGISTRY)
    .map((d) => d.broad)
    .filter((broad): broad is string => broad !== null);
}

// Get specialized experts only
export function getSpecializedExperts(): string[] {
  return Object.values(AGENT_REGISTRY).flatMap((d) => d.specialized);
}

// Get agents by domain
export function getAgentsByDomain(domain: string): { broad?: string; specialized: string[] } {
  const domainEntry = AGENT_REGISTRY[domain];
  if (domainEntry === undefined) {
    return { specialized: [] };
  }

  const result: { broad?: string; specialized: string[] } = {
    specialized: domainEntry.specialized,
  };

  if (domainEntry.broad !== null) {
    result.broad = domainEntry.broad;
  }

  return result;
}
