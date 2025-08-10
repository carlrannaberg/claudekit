# Agent Registry Design - Current Issues and Better Approach

## Current Problem

We created a separate agent selection system (`cli/lib/agents/selection.ts`) with hardcoded agent lists, but this duplicates what the component registry already does. This creates several issues:

1. **Duplication**: Agents are defined in markdown files AND hardcoded in selection.ts
2. **Maintenance burden**: Adding new agents requires updating multiple places
3. **Inconsistency**: Registry discovers agents dynamically, selection.ts has static list
4. **Lost metadata**: Registry has rich metadata from frontmatter, we're ignoring it

## Why This Happened

We wanted to provide:
- Better grouping (universal vs technology-specific)
- Hierarchical bundling (TypeScript includes sub-experts)
- Smart defaults (pre-selected universal agents)
- Radio groups for competing tools

But we implemented it wrong by creating a parallel system instead of enhancing the existing one.

## Better Approach

### Option 1: Enhance Component Metadata (RECOMMENDED)

Add grouping metadata to agent markdown files:

```yaml
---
name: typescript-expert
description: TypeScript language expert
type: agent
category: language
bundle: [typescript-type-expert, typescript-build-expert]
universal: false
default: false
---
```

```yaml
---
name: git-expert  
description: Git version control expert
type: agent
category: tools
universal: true
default: true
---
```

Then use the registry to dynamically group agents:

```typescript
function groupAgents(registry: ComponentRegistry) {
  const agents = Array.from(registry.components.values())
    .filter(c => c.type === 'agent');
  
  return {
    universal: agents.filter(a => a.metadata.universal),
    technology: agents.filter(a => !a.metadata.universal),
    bundles: agents.filter(a => a.metadata.bundle?.length > 0)
  };
}
```

### Option 2: Configuration File for Grouping

Create a separate configuration that references discovered agents:

```typescript
// cli/lib/agents/grouping.ts
export const AGENT_GROUPING = {
  universal: ['git-expert', 'code-quality-expert', 'oracle'],
  bundles: {
    'typescript-expert': ['typescript-type-expert', 'typescript-build-expert'],
    'react-expert': ['react-performance-expert']
  },
  radioGroups: [
    {
      name: 'Test Framework',
      options: [
        { id: 'jest', agents: ['jest-expert'] },
        { id: 'vitest', agents: ['vitest-expert'] }
      ]
    }
  ]
};
```

Then apply this grouping to registry-discovered agents.

### Option 3: Keep Current Approach but Use Registry

Keep the selection.ts structure but populate it from the registry:

```typescript
async function buildAgentSelection(registry: ComponentRegistry) {
  const agents = Array.from(registry.components.values())
    .filter(c => c.type === 'agent');
  
  // Build UNIVERSAL_AGENTS from agents with certain patterns
  const universal = agents.filter(a => 
    ['git', 'code-quality', 'oracle', 'devops'].some(
      keyword => a.metadata.id.includes(keyword)
    )
  );
  
  // Build TECHNOLOGY_STACK from remaining agents
  // Apply bundling rules based on naming patterns
  
  return { universal, technology, groups };
}
```

## Recommendation

**Use Option 1**: Enhance the agent markdown files with metadata for grouping. This:
- Keeps single source of truth (markdown files)
- Uses existing discovery mechanism
- Allows dynamic updates without code changes
- Maintains consistency with how commands/hooks work

## Implementation Steps

1. Add metadata fields to agent markdown files
2. Update component discovery to parse new fields
3. Create grouping function that uses registry
4. Update setup.ts to use grouped agents from registry
5. Remove hardcoded selection.ts

## Benefits

- Single source of truth for agents
- Dynamic discovery still works
- New agents automatically appear in right groups
- Consistent with rest of claudekit architecture
- No duplicate maintenance