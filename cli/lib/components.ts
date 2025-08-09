import { promises as fs } from 'fs';
import path from 'path';
import { pathExists, getFileStats } from './filesystem.js';
import type {
  Component,
  ComponentType,
  ComponentCategory,
  ProjectInfo,
  Platform,
} from '../types/config.js';

/**
 * Component Discovery System
 *
 * Scans and catalogs commands and hooks with metadata parsing,
 * dependency resolution, and caching for performance.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

interface ComponentMetadata {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  dependencies: string[];
  platforms: Platform[];
  allowedTools?: string[];
  argumentHint?: string;
  version?: string;
  author?: string;
  enabled?: boolean;
  shellOptions?: string[];
  timeout?: number;
  retries?: number;
  requiredBy?: string[]; // Components that require this one
  optional?: boolean; // Whether this is an optional dependency
}

interface ComponentFile {
  path: string;
  type: ComponentType;
  metadata: ComponentMetadata;
  hash: string;
  lastModified: Date;
}

export interface ComponentRegistry {
  components: Map<string, ComponentFile>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
  categories: Map<ComponentCategory, Set<string>>;
  lastScan: Date;
  cacheValid: boolean;
  dependencyGraph?: DependencyGraph;
}

interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>; // from -> to
  reverseEdges: Map<string, Set<string>>; // to -> from
  cycles: string[][]; // List of detected cycles
}

interface DependencyNode {
  id: string;
  component?: ComponentFile;
  external: boolean; // True if this is an external dependency
  depth: number; // Depth in dependency tree
  visited: boolean; // For traversal algorithms
}

interface ScanOptions {
  includeDisabled?: boolean;
  forceRefresh?: boolean;
  filterByCategory?: ComponentCategory[];
  filterByType?: ComponentType[];
}

// ============================================================================
// Embedded Hook Definitions
// ============================================================================

/**
 * Embedded hook component definitions
 * These hooks are built into the claudekit-hooks command
 */
const EMBEDDED_HOOK_COMPONENTS: ComponentFile[] = [
  {
    path: 'embedded:typecheck-changed',
    type: 'hook',
    metadata: {
      id: 'typecheck-changed',
      name: 'TypeScript Type Checking (Changed Files)',
      description: 'Run TypeScript type checking on file changes (embedded hook)',
      category: 'validation',
      dependencies: ['typescript', 'tsc'],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-typecheck',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:lint-changed',
    type: 'hook',
    metadata: {
      id: 'lint-changed',
      name: 'ESLint Validation (Changed Files)',
      description: 'Run ESLint validation on JavaScript/TypeScript files (embedded hook)',
      category: 'validation',
      dependencies: ['eslint'],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-eslint',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:prettier',
    type: 'hook',
    metadata: {
      id: 'prettier',
      name: 'Prettier Formatting',
      description: 'Format code with Prettier on file changes (embedded hook)',
      category: 'validation',
      dependencies: ['prettier'],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-prettier',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:check-any-changed',
    type: 'hook',
    metadata: {
      id: 'check-any-changed',
      name: 'TypeScript Any Detector',
      description: 'Detect forbidden any types in TypeScript files (embedded hook)',
      category: 'validation',
      dependencies: [],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-no-any',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:test-changed',
    type: 'hook',
    metadata: {
      id: 'test-changed',
      name: 'Run Related Tests',
      description: 'Automatically run tests related to changed files (embedded hook)',
      category: 'testing',
      dependencies: [],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-run-related-tests',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:create-checkpoint',
    type: 'hook',
    metadata: {
      id: 'create-checkpoint',
      name: 'Create Checkpoint',
      description: 'Automatically create git checkpoints on Claude Code stop (embedded hook)',
      category: 'git',
      dependencies: ['git'],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-auto-checkpoint',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:check-todos',
    type: 'hook',
    metadata: {
      id: 'check-todos',
      name: 'Check Todo Completion',
      description: 'Ensure all in-progress todos are completed or updated (embedded hook)',
      category: 'project-management',
      dependencies: [],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-validate-todo-completion',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:typecheck-project',
    type: 'hook',
    metadata: {
      id: 'typecheck-project',
      name: 'TypeScript Project Validation',
      description: 'Run TypeScript validation on entire project (embedded hook)',
      category: 'validation',
      dependencies: ['typescript', 'tsc'],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-typecheck-project',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:lint-project',
    type: 'hook',
    metadata: {
      id: 'lint-project',
      name: 'ESLint Project Validation',
      description: 'Run ESLint validation on entire project (embedded hook)',
      category: 'validation',
      dependencies: ['eslint'],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-lint-project',
    lastModified: new Date('2024-01-01'),
  },
  {
    path: 'embedded:test-project',
    type: 'hook',
    metadata: {
      id: 'test-project',
      name: 'Test Project Suite',
      description: 'Run full test suite for entire project (embedded hook)',
      category: 'testing',
      dependencies: [],
      platforms: ['all'],
      enabled: true,
    },
    hash: 'embedded-test-project',
    lastModified: new Date('2024-01-01'),
  },
];

// ============================================================================
// Dependency Definitions
// ============================================================================

/**
 * Static dependency definitions for components
 * Maps component IDs to their required dependencies
 */
const COMPONENT_DEPENDENCIES: Record<string, string[]> = {
  // Commands that depend on other commands
  'spec:decompose': ['spec:validate'],
  'spec:execute': ['spec:validate'],
  'git:push': ['git:status'],
  'checkpoint:restore': ['checkpoint:list'],
};

/**
 * Optional dependencies that enhance functionality but aren't required
 */
const OPTIONAL_DEPENDENCIES: Record<string, string[]> = {
  typecheck: ['typescript'],
  eslint: ['eslint'],
  prettier: ['prettier'],
  'git-status': ['git'],
  'auto-checkpoint': ['git'],
};

/**
 * System/external dependencies that can't be auto-installed
 */
const EXTERNAL_DEPENDENCIES = new Set([
  'git',
  'npm',
  'yarn',
  'pnpm',
  'bun',
  'node',
  'typescript',
  'tsc',
  'eslint',
  'prettier',
  'jq',
  'gh',
  'ripgrep',
  'rg',
]);

// ============================================================================
// Component Discovery Cache
// ============================================================================

const componentCache = new Map<string, ComponentRegistry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached registry for a directory or create new one
 */
function getOrCreateRegistry(baseDir: string): ComponentRegistry {
  const existing = componentCache.get(baseDir);
  const now = new Date();

  if (
    existing &&
    existing.cacheValid &&
    now.getTime() - existing.lastScan.getTime() < CACHE_DURATION
  ) {
    return existing;
  }

  const registry: ComponentRegistry = {
    components: new Map(),
    dependencies: new Map(),
    dependents: new Map(),
    categories: new Map(),
    lastScan: now,
    cacheValid: false,
  };

  componentCache.set(baseDir, registry);
  return registry;
}

/**
 * Invalidate cache for a directory
 */
export function invalidateCache(baseDir?: string): void {
  if (baseDir !== undefined && baseDir !== '') {
    componentCache.delete(baseDir);
  } else {
    componentCache.clear();
  }
}

// ============================================================================
// Metadata Parsing
// ============================================================================

/**
 * Parse YAML frontmatter from markdown command files
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return {};
  }

  const frontmatter = frontmatterMatch[1];
  const parsed: Record<string, unknown> = {};

  // Simple YAML parser for key-value pairs
  const lines = frontmatter?.split('\n') || [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    // Remove quotes if present
    const cleanValue = value.replace(/^["']|["']$/g, '');
    parsed[key] = cleanValue;
  }

  return parsed;
}

/**
 * Parse shell script header comments (legacy function, kept for backward compatibility)
 */
function parseShellHeader(content: string): Record<string, unknown> {
  const lines = content.split('\n').slice(0, 50); // Check first 50 lines
  const metadata: Record<string, unknown> = {};

  let inHeaderBlock = false;
  let description = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect header block start
    if (trimmed.includes('##########') || trimmed.includes('====')) {
      inHeaderBlock = true;
      continue;
    }

    // Exit header block
    if (inHeaderBlock && !trimmed.startsWith('#') && trimmed.length > 0) {
      break;
    }

    if (!inHeaderBlock || !trimmed.startsWith('#')) {
      continue;
    }

    // Remove comment prefix
    const lineContent = trimmed.replace(/^#+\s*/, '').trim();
    if (!lineContent) {
      continue;
    }

    // Extract title if it looks like one
    if (lineContent.endsWith('Hook') || lineContent.endsWith('Script')) {
      metadata['name'] = lineContent.replace(/\s+(Hook|Script)\s*$/, '');
      continue;
    }

    // Look for field patterns
    if (lineContent.includes(':')) {
      const colonIndex = lineContent.indexOf(':');
      const field = lineContent.substring(0, colonIndex).trim().toLowerCase();
      const value = lineContent.substring(colonIndex + 1).trim();

      if (
        ['description', 'category', 'dependencies', 'platforms', 'version', 'author'].includes(
          field
        )
      ) {
        metadata[field] = value.replace(/#+\s*$/, '').trim();
        continue;
      }
    }

    // Accumulate description (exclude padding symbols)
    if (
      metadata['description'] === undefined &&
      !lineContent.includes(':') &&
      !lineContent.match(/^#+$/)
    ) {
      const cleanContent = lineContent.replace(/#+\s*$/, '').trim();
      if (cleanContent !== '') {
        description += (description ? ' ' : '') + cleanContent;
      }
    }
  }

  if (metadata['description'] === undefined && description !== '') {
    metadata['description'] = description.trim();
  }

  // Parse shell options from set line
  const setMatch = content.match(/set\s+(.+)/);
  if (setMatch !== null && setMatch[1] !== undefined) {
    metadata['shellOptions'] = setMatch[1].split(/\s+/);
  }

  return metadata;
}

/**
 * Extract dependencies from file content
 */
function extractDependencies(content: string, type: ComponentType, componentId?: string): string[] {
  const dependencies = new Set<string>();

  if (type === 'command') {
    // Extract from allowed-tools in frontmatter
    const toolsMatch = content.match(/allowed-tools:\s*(.+)/);
    if (toolsMatch) {
      const tools = toolsMatch[1]?.split(',').map((t) => t.trim()) || [];
      tools.forEach((tool) => {
        // Extract basic tool names (Read, Write, etc.)
        const match = tool.match(/(\w+)(?:\([^)]*\))?/);
        if (match) {
          const toolName = match[1]?.toLowerCase();
          // Only add non-standard tools as dependencies
          if (
            toolName !== undefined &&
            toolName !== '' &&
            !['read', 'write', 'edit', 'multiedit', 'bash'].includes(toolName)
          ) {
            dependencies.add(toolName);
          } else if (toolName === 'read' || toolName === 'write') {
            dependencies.add(toolName);
          }
        }
      });
    }

    // Extract from command references (be more selective)
    const commandRefs = content.match(/(?:^|\s)\/([a-zA-Z][a-zA-Z0-9-]+)(?:\s|$)/gm);
    if (commandRefs) {
      commandRefs.forEach((ref) => {
        const cmd = ref.trim().slice(1); // Remove leading slash
        // Skip common non-command references
        if (
          cmd !== 'claudekit' &&
          cmd !== 'etc' &&
          cmd !== 'usr' &&
          cmd !== 'var' &&
          cmd !== 'Users' &&
          cmd !== 'home' &&
          cmd.length > 2
        ) {
          dependencies.add(cmd);
        }
      });
    }
  } else {
    // Extract from hook content
    // Look for command calls
    const bashCommands = content.match(/\b(git|npm|yarn|pnpm|node|eslint|tsc|jq)\b/g);
    if (bashCommands) {
      bashCommands.forEach((cmd) => {
        // Skip self-reference
        if (
          componentId !== null &&
          componentId !== undefined &&
          componentId !== '' &&
          cmd === componentId
        ) {
          return;
        }
        dependencies.add(cmd);
      });
    }

    // Look for other hook references
    const hookRefs = content.match(/\.claude\/hooks\/([^.\s]+)/g);
    if (hookRefs) {
      hookRefs.forEach((ref) => {
        const hookName = ref.split('/').pop();
        if (hookName !== undefined && hookName !== '' && hookName !== componentId) {
          dependencies.add(hookName);
        }
      });
    }
  }

  return Array.from(dependencies);
}

/**
 * Determine component category from content and path
 */
function inferCategory(
  filePath: string,
  content: string,
  metadata: Record<string, unknown>
): ComponentCategory {
  // Use explicit category if provided
  if (metadata['category'] !== undefined) {
    const normalizedCategory = String(metadata['category'])
      .toLowerCase()
      .replace(/[-_\s]/g, '-');
    const validCategories: ComponentCategory[] = [
      'git',
      'validation',
      'development',
      'testing',
      'ai-assistant',
      'workflow',
      'project-management',
      'debugging',
      'utility',
    ];

    const match = validCategories.find(
      (cat) => cat === normalizedCategory || cat.includes(normalizedCategory)
    );
    if (match) {
      return match;
    }
  }

  // Infer from path
  const pathSegments = filePath.toLowerCase().split('/');

  if (pathSegments.includes('git')) {
    return 'git';
  }
  if (pathSegments.includes('spec') || pathSegments.includes('validate')) {
    return 'validation';
  }
  if (pathSegments.includes('checkpoint')) {
    return 'git';
  }
  if (pathSegments.includes('agent')) {
    return 'ai-assistant';
  }
  if (pathSegments.includes('dev') || pathSegments.includes('cleanup')) {
    return 'development';
  }

  // Infer from content
  const contentLower = content.toLowerCase();

  if (
    contentLower.includes('git') &&
    (contentLower.includes('stash') || contentLower.includes('commit'))
  ) {
    return 'git';
  }
  if (
    contentLower.includes('eslint') ||
    contentLower.includes('typecheck') ||
    contentLower.includes('validate')
  ) {
    return 'validation';
  }
  if (contentLower.includes('test') && contentLower.includes('run')) {
    return 'testing';
  }
  if (contentLower.includes('claude') || contentLower.includes('agent')) {
    return 'ai-assistant';
  }
  if (contentLower.includes('todo') || contentLower.includes('task')) {
    return 'project-management';
  }
  if (contentLower.includes('debug') || contentLower.includes('log')) {
    return 'debugging';
  }

  return 'utility';
}

/**
 * Create component ID from file path
 */
function createComponentId(filePath: string, type: ComponentType): string {
  const fileName = path.basename(filePath, '.md');
  const parentDir = path.basename(path.dirname(filePath));

  if (parentDir === 'commands' || parentDir === 'agents') {
    return fileName;
  }

  // For nested components (e.g., commands/git/status.md or agents/typescript/expert.md)
  if (type === 'agent') {
    return `${parentDir}-${fileName}`;
  }
  
  return `${parentDir}:${fileName}`;
}

/**
 * Parse component file and extract metadata
 */
async function parseComponentFile(
  filePath: string,
  type: ComponentType
): Promise<ComponentFile | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await getFileStats(filePath);

    if (!stats) {
      return null;
    }

    // Parse metadata based on file type
    const rawMetadata = type === 'command' ? parseFrontmatter(content) : parseShellHeader(content);

    // Create component ID first so we can use it for dependency extraction
    const id = createComponentId(filePath, type);

    // Extract dependencies (excluding self-references)
    const dependencies = extractDependencies(content, type, id);
    const metadata: ComponentMetadata = {
      id,
      name: (rawMetadata['name'] as string) || path.basename(filePath, '.md'),
      description: (rawMetadata['description'] as string) || 'No description available',
      category: inferCategory(filePath, content, rawMetadata),
      dependencies,
      platforms:
        rawMetadata['platforms'] !== undefined && rawMetadata['platforms'] !== null
          ? (rawMetadata['platforms'] as string)
              .split(',')
              .map((p: string) => p.trim())
              .filter((p): p is Platform =>
                ['darwin', 'linux', 'win32', 'all'].includes(p as Platform)
              )
          : (['all'] as Platform[]),
      enabled:
        rawMetadata['enabled'] === undefined
          ? true
          : rawMetadata['enabled'] !== 'false' && rawMetadata['enabled'] !== false,
      ...(rawMetadata['allowed-tools'] !== undefined &&
        rawMetadata['allowed-tools'] !== null && {
          allowedTools: (rawMetadata['allowed-tools'] as string)
            .split(',')
            .map((t: string) => t.trim()),
        }),
      ...(rawMetadata['argument-hint'] !== undefined &&
        rawMetadata['argument-hint'] !== null && {
          argumentHint: rawMetadata['argument-hint'] as string,
        }),
      ...(rawMetadata['version'] !== undefined &&
        rawMetadata['version'] !== null && { version: rawMetadata['version'] as string }),
      ...(rawMetadata['author'] !== undefined &&
        rawMetadata['author'] !== null && { author: rawMetadata['author'] as string }),
      ...(rawMetadata['shellOptions'] !== undefined &&
        rawMetadata['shellOptions'] !== null && {
          shellOptions:
            typeof rawMetadata['shellOptions'] === 'string'
              ? (rawMetadata['shellOptions'] as string).split(',').map((opt: string) => opt.trim())
              : (rawMetadata['shellOptions'] as string[]),
        }),
      ...(rawMetadata['timeout'] !== undefined &&
        rawMetadata['timeout'] !== null && {
          timeout: parseInt(rawMetadata['timeout'] as string, 10),
        }),
      ...(rawMetadata['retries'] !== undefined &&
        rawMetadata['retries'] !== null && {
          retries: parseInt(rawMetadata['retries'] as string, 10),
        }),
    };

    // Calculate content hash for change detection
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      path: filePath,
      type,
      metadata,
      hash,
      lastModified: stats.mtime,
    };
  } catch (error) {
    console.warn(`Failed to parse component file ${filePath}:`, error);
    return null;
  }
}

// ============================================================================
// Directory Scanning
// ============================================================================

/**
 * Recursively scan directory for component files
 */
async function scanDirectory(dirPath: string, type: ComponentType): Promise<ComponentFile[]> {
  const components: ComponentFile[] = [];

  if (!(await pathExists(dirPath))) {
    return components;
  }

  // Only scan for command and agent files since hooks are embedded
  if (type !== 'command' && type !== 'agent') {
    return [];
  }
  const extension = '.md';

  async function scanRecursive(currentPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await scanRecursive(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          const component = await parseComponentFile(fullPath, type);
          if (component) {
            components.push(component);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${currentPath}:`, error);
    }
  }

  await scanRecursive(dirPath);
  return components;
}

// ============================================================================
// Dependency Resolution
// ============================================================================

/**
 * Build dependency graphs from components
 */
function buildDependencyGraphs(components: ComponentFile[]): {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
} {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  // Initialize maps
  for (const component of components) {
    dependencies.set(component.metadata.id, new Set());
    dependents.set(component.metadata.id, new Set());
  }

  // Build dependency relationships
  for (const component of components) {
    const componentId = component.metadata.id;
    const componentDeps = dependencies.get(componentId);
    if (!componentDeps) {
      continue;
    }

    for (const dep of component.metadata.dependencies) {
      // Check if dependency exists in our component set
      const depComponent = components.find(
        (c) =>
          c.metadata.id === dep ||
          c.metadata.name.toLowerCase() === dep.toLowerCase() ||
          c.metadata.name.toLowerCase().replace(/\.sh$/, '') === dep.toLowerCase()
      );

      if (depComponent) {
        componentDeps.add(depComponent.metadata.id);
        const depComponentDependents = dependents.get(depComponent.metadata.id);
        if (depComponentDependents) {
          depComponentDependents.add(componentId);
        }
      } else {
        // External dependency
        componentDeps.add(dep);
      }
    }
  }

  return { dependencies, dependents };
}

/**
 * Build a complete dependency graph for the registry
 */
function buildDependencyGraph(registry: ComponentRegistry): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const edges = new Map<string, Set<string>>();
  const reverseEdges = new Map<string, Set<string>>();
  const cycles: string[][] = [];

  // Initialize nodes for all components
  for (const [id, component] of registry.components) {
    nodes.set(id, {
      id,
      component,
      external: false,
      depth: 0,
      visited: false,
    });
    edges.set(id, new Set());
    reverseEdges.set(id, new Set());
  }

  // Add edges based on dependencies
  for (const [id, component] of registry.components) {
    const deps = new Set<string>();

    // Add static dependencies
    const staticDeps = COMPONENT_DEPENDENCIES[id] || [];
    staticDeps.forEach((dep) => deps.add(dep));

    // Add detected dependencies
    component.metadata.dependencies.forEach((dep) => deps.add(dep));

    // Process each dependency
    for (const dep of deps) {
      // Check if dependency exists in registry
      if (!registry.components.has(dep)) {
        // Create external node if needed
        if (!nodes.has(dep)) {
          nodes.set(dep, {
            id: dep,
            external: EXTERNAL_DEPENDENCIES.has(dep),
            depth: 0,
            visited: false,
          });
          edges.set(dep, new Set());
          reverseEdges.set(dep, new Set());
        }
      }

      // Add edge (skip self-references)
      if (dep !== id) {
        const idEdges = edges.get(id);
        const depReverseEdges = reverseEdges.get(dep);
        if (idEdges && depReverseEdges) {
          idEdges.add(dep);
          depReverseEdges.add(id);
        }
      }
    }
  }

  // Detect cycles using DFS
  const detectCycles = (): string[][] => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    function dfs(node: string): boolean {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = edges.get(node) || new Set();
      for (const neighbor of neighbors) {
        // Skip self-references
        if (neighbor === node) {
          continue;
        }

        if (dfs(neighbor)) {
          // Continue searching for more cycles
        }
      }

      recursionStack.delete(node);
      path.pop();
      return false;
    }

    for (const node of nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  };

  const cycleResults = detectCycles();
  cycles.push(...cycleResults);

  // Calculate depth for each node
  const calculateDepths = (): Map<string, number> => {
    const depths = new Map<string, number>();

    function getDepth(node: string, visiting = new Set<string>()): number {
      if (depths.has(node)) {
        const depth = depths.get(node);
        return depth ?? 0;
      }
      if (visiting.has(node)) {
        return 0;
      } // Cycle, return 0

      visiting.add(node);

      const deps = edges.get(node) || new Set();
      let maxDepth = 0;

      for (const dep of deps) {
        maxDepth = Math.max(maxDepth, getDepth(dep, visiting) + 1);
      }

      visiting.delete(node);
      depths.set(node, maxDepth);

      const nodeData = nodes.get(node);
      if (nodeData) {
        nodeData.depth = maxDepth;
      }

      return maxDepth;
    }

    for (const node of nodes.keys()) {
      getDepth(node);
    }

    return depths;
  };

  calculateDepths();

  return { nodes, edges, reverseEdges, cycles };
}

/**
 * Resolve all dependencies for a set of components
 * Returns components in installation order with all dependencies included
 */
export function resolveAllDependencies(
  componentIds: string[],
  registry: ComponentRegistry,
  options: { includeOptional?: boolean; maxDepth?: number } = {}
): string[] {
  const { includeOptional = false, maxDepth = 10 } = options;

  // Build or use cached dependency graph
  if (!registry.dependencyGraph) {
    registry.dependencyGraph = buildDependencyGraph(registry);
  }

  // const graph = registry.dependencyGraph; // Unused
  const required = new Set<string>(componentIds);
  const resolved = new Set<string>();
  const visiting = new Set<string>();

  // Recursively add all dependencies
  function addDependencies(id: string, depth = 0): void {
    if (depth > maxDepth) {
      console.warn(`Max dependency depth reached for ${id}`);
      return;
    }

    if (resolved.has(id) || visiting.has(id)) {
      return;
    }

    visiting.add(id);

    // Add static dependencies (skip external dependencies for recursion)
    const staticDeps = COMPONENT_DEPENDENCIES[id] || [];
    for (const dep of staticDeps) {
      if (!resolved.has(dep) && !EXTERNAL_DEPENDENCIES.has(dep)) {
        addDependencies(dep, depth + 1);
      }
    }

    // Add optional dependencies if requested
    if (includeOptional) {
      const optionalDeps = OPTIONAL_DEPENDENCIES[id] || [];
      for (const dep of optionalDeps) {
        if (!EXTERNAL_DEPENDENCIES.has(dep) && !resolved.has(dep)) {
          addDependencies(dep, depth + 1);
        }
      }
    }

    // Add detected dependencies from component metadata
    const component = registry.components.get(id);
    if (component) {
      for (const dep of component.metadata.dependencies) {
        if (!EXTERNAL_DEPENDENCIES.has(dep) && !resolved.has(dep)) {
          addDependencies(dep, depth + 1);
        }
      }
    }

    visiting.delete(id);
    resolved.add(id);
    required.add(id);
  }

  // Add all dependencies
  for (const id of componentIds) {
    addDependencies(id);
  }

  // Sort by installation order (topological sort)
  return resolveDependencyOrder(Array.from(required), registry);
}

/**
 * Resolve component dependencies in topological order
 * Handles circular dependencies gracefully
 */
export function resolveDependencyOrder(
  componentIds: string[],
  registry: ComponentRegistry
): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];
  const cycles = new Set<string>();

  function visit(id: string, path: string[] = []): void {
    if (visited.has(id)) {
      return;
    }

    if (visiting.has(id)) {
      // Circular dependency detected
      const cycleStart = path.indexOf(id);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart);
        console.warn(`Circular dependency detected: ${cycle.join(' -> ')} -> ${id}`);
        cycles.add(id);
      }
      return;
    }

    visiting.add(id);
    path.push(id);

    // Get all dependencies (static + detected)
    const allDeps = new Set<string>();

    // Add static dependencies
    const staticDeps = COMPONENT_DEPENDENCIES[id] || [];
    staticDeps.forEach((dep) => allDeps.add(dep));

    // Add component dependencies
    const component = registry.components.get(id);
    if (component) {
      component.metadata.dependencies.forEach((dep) => allDeps.add(dep));
    }

    // Visit dependencies first (skip external dependencies)
    for (const dep of allDeps) {
      if (componentIds.includes(dep) && !cycles.has(dep) && !EXTERNAL_DEPENDENCIES.has(dep)) {
        visit(dep, [...path]);
      }
    }

    path.pop();
    visiting.delete(id);
    visited.add(id);

    // Only add if not part of a cycle or if it's the root of a cycle
    if (!cycles.has(id) || !Array.from(allDeps).some((dep) => cycles.has(dep))) {
      result.push(id);
    }
  }

  // Visit all components
  for (const id of componentIds) {
    visit(id);
  }

  // Throw error if circular dependencies were detected
  if (cycles.size > 0) {
    const cycleList = Array.from(cycles);
    throw new Error(`Circular dependency detected involving: ${cycleList.join(', ')}`);
  }

  return result;
}

// ============================================================================
// Main Discovery API
// ============================================================================

/**
 * Discover all components in specified directories
 */
export async function discoverComponents(
  baseDir: string,
  options: ScanOptions = {}
): Promise<ComponentRegistry> {
  const startTime = Date.now();

  // Don't validate path - just handle non-existent directories
  if (!(await pathExists(baseDir))) {
    // Return empty registry for non-existent directories
    const registry: ComponentRegistry = {
      components: new Map(),
      dependencies: new Map(),
      dependents: new Map(),
      categories: new Map(),
      lastScan: new Date(),
      cacheValid: true,
    };
    return registry;
  }

  // Get or create registry
  const registry = getOrCreateRegistry(baseDir);

  // Return cached if valid and not forcing refresh
  if (registry.cacheValid === true && options.forceRefresh !== true) {
    return registry;
  }

  // Clear existing data
  registry.components.clear();
  registry.dependencies.clear();
  registry.dependents.clear();
  registry.categories.clear();

  const commandsDir = path.join(baseDir, 'commands');
  const agentsDir = path.join(baseDir, 'agents');

  // Scan for command and agent components
  const commandFiles = await scanDirectory(commandsDir, 'command');
  const agentFiles = await scanDirectory(agentsDir, 'agent');

  // Use predefined embedded hooks, but scan for actual agent files
  const allComponents = [...commandFiles, ...agentFiles, ...EMBEDDED_HOOK_COMPONENTS];

  // Filter components based on options
  let filteredComponents = allComponents;

  if (options.includeDisabled === false) {
    filteredComponents = filteredComponents.filter((c) => c.metadata.enabled === true);
  }

  if (options.filterByType !== undefined && options.filterByType.length > 0) {
    filteredComponents = filteredComponents.filter(
      (c) => options.filterByType?.includes(c.type) ?? false
    );
  }

  if (options.filterByCategory !== undefined && options.filterByCategory.length > 0) {
    filteredComponents = filteredComponents.filter(
      (c) => options.filterByCategory?.includes(c.metadata.category) ?? false
    );
  }

  // Populate registry
  for (const component of filteredComponents) {
    registry.components.set(component.metadata.id, component);

    // Group by category
    const categorySet = registry.categories.get(component.metadata.category) || new Set();
    categorySet.add(component.metadata.id);
    registry.categories.set(component.metadata.category, categorySet);
  }

  // Build dependency graphs
  const { dependencies, dependents } = buildDependencyGraphs(filteredComponents);
  registry.dependencies = dependencies;
  registry.dependents = dependents;

  // Mark cache as valid
  registry.cacheValid = true;
  registry.lastScan = new Date();

  const duration = Date.now() - startTime;
  console.debug(
    `Component discovery completed in ${duration}ms. Found ${filteredComponents.length} components.`
  );

  return registry;
}

/**
 * Get component by ID
 */
export function getComponent(id: string, registry: ComponentRegistry): ComponentFile | undefined {
  return registry.components.get(id);
}

/**
 * Get components by category
 */
export function getComponentsByCategory(
  category: ComponentCategory,
  registry: ComponentRegistry
): ComponentFile[] {
  const componentIds = registry.categories.get(category) || new Set();
  return Array.from(componentIds)
    .map((id) => registry.components.get(id))
    .filter((comp): comp is ComponentFile => comp !== undefined);
}

/**
 * Get components by type
 */
export function getComponentsByType(
  type: ComponentType,
  registry: ComponentRegistry
): ComponentFile[] {
  return Array.from(registry.components.values()).filter((c) => c.type === type);
}

/**
 * Find components that depend on a given component
 */
export function getDependents(componentId: string, registry: ComponentRegistry): ComponentFile[] {
  const dependentIds = registry.dependents.get(componentId) || new Set();
  return Array.from(dependentIds)
    .map((id) => registry.components.get(id))
    .filter((comp): comp is ComponentFile => comp !== undefined);
}

/**
 * Find components that a given component depends on
 */
export function getDependencies(componentId: string, registry: ComponentRegistry): ComponentFile[] {
  const allDeps = new Set<string>();

  // Add static dependencies
  const staticDeps = COMPONENT_DEPENDENCIES[componentId] || [];
  staticDeps.forEach((dep) => allDeps.add(dep));

  // Add component metadata dependencies
  const component = registry.components.get(componentId);
  if (component) {
    component.metadata.dependencies.forEach((dep) => allDeps.add(dep));
  }

  // Return only components that exist in registry
  return Array.from(allDeps)
    .map((id) => registry.components.get(id))
    .filter((comp): comp is ComponentFile => comp !== undefined);
}

/**
 * Get transitive dependencies for a component
 */
export function getTransitiveDependencies(
  componentId: string,
  registry: ComponentRegistry,
  maxDepth = 10
): ComponentFile[] {
  const visited = new Set<string>();
  const dependencies: ComponentFile[] = [];

  function collectDeps(id: string, depth = 0): void {
    if (depth > maxDepth || visited.has(id)) {
      return;
    }
    visited.add(id);

    const deps = getDependencies(id, registry);
    for (const dep of deps) {
      if (!visited.has(dep.metadata.id)) {
        dependencies.push(dep);
        collectDeps(dep.metadata.id, depth + 1);
      }
    }
  }

  collectDeps(componentId);
  return dependencies;
}

/**
 * Check if adding a dependency would create a circular dependency
 */
export function wouldCreateCircularDependency(
  componentId: string,
  newDependencyId: string,
  registry: ComponentRegistry
): boolean {
  // Self-reference always creates a cycle
  if (componentId === newDependencyId) {
    return true;
  }

  // Check if newDependencyId already depends on componentId
  const visited = new Set<string>();

  function hasDependency(fromId: string, toId: string): boolean {
    if (fromId === toId) {
      return true;
    }
    if (visited.has(fromId)) {
      return false;
    }

    visited.add(fromId);

    const deps = getDependencies(fromId, registry);
    for (const dep of deps) {
      if (hasDependency(dep.metadata.id, toId)) {
        return true;
      }
    }

    return false;
  }

  return hasDependency(newDependencyId, componentId);
}

/**
 * Get missing dependencies for a set of components
 */
export function getMissingDependencies(
  componentIds: string[],
  registry: ComponentRegistry
): string[] {
  const selected = new Set(componentIds);
  const missing = new Set<string>();

  for (const id of componentIds) {
    // Check static dependencies
    const staticDeps = COMPONENT_DEPENDENCIES[id] || [];
    for (const dep of staticDeps) {
      if (!selected.has(dep) && !EXTERNAL_DEPENDENCIES.has(dep)) {
        missing.add(dep);
      }
    }

    // Check component dependencies
    const component = registry.components.get(id);
    if (component) {
      for (const dep of component.metadata.dependencies) {
        if (!selected.has(dep) && !EXTERNAL_DEPENDENCIES.has(dep)) {
          missing.add(dep);
        }
      }
    }
  }

  return Array.from(missing);
}

/**
 * Search components by name or description
 */
export function searchComponents(
  query: string,
  registry: ComponentRegistry,
  options: { fuzzy?: boolean; includeDescription?: boolean } = {}
): ComponentFile[] {
  const normalizedQuery = query.toLowerCase();
  const results: ComponentFile[] = [];

  for (const component of registry.components.values()) {
    const nameMatch = component.metadata.name.toLowerCase().includes(normalizedQuery);
    const descMatch =
      options.includeDescription === true &&
      component.metadata.description.toLowerCase().includes(normalizedQuery);

    if (nameMatch === true || descMatch === true) {
      results.push(component);
    }
  }

  // Sort by relevance (name matches first, then by length)
  return results.sort((a, b) => {
    const aNameMatch = a.metadata.name.toLowerCase().includes(normalizedQuery);
    const bNameMatch = b.metadata.name.toLowerCase().includes(normalizedQuery);

    if (aNameMatch && !bNameMatch) {
      return -1;
    }
    if (!aNameMatch && bNameMatch) {
      return 1;
    }

    return a.metadata.name.length - b.metadata.name.length;
  });
}

/**
 * Convert registry to a format compatible with the Component type
 */
export function registryToComponents(registry: ComponentRegistry): Component[] {
  return Array.from(registry.components.values()).map((componentFile) => ({
    id: componentFile.metadata.id,
    type: componentFile.type,
    name: componentFile.metadata.name,
    description: componentFile.metadata.description,
    path: componentFile.path,
    dependencies: componentFile.metadata.dependencies,
    platforms: componentFile.metadata.platforms as Platform[],
    category: componentFile.metadata.category,
    version: componentFile.metadata.version,
    author: componentFile.metadata.author,
    enabled: componentFile.metadata.enabled ?? true,
    config: {
      allowedTools: componentFile.metadata.allowedTools,
      argumentHint: componentFile.metadata.argumentHint,
      shellOptions: componentFile.metadata.shellOptions,
      timeout: componentFile.metadata.timeout,
      retries: componentFile.metadata.retries,
    },
    createdAt: componentFile.lastModified,
    updatedAt: componentFile.lastModified,
  }));
}

/**
 * Get performance statistics for the discovery system
 */
export function getDiscoveryStats(registry: ComponentRegistry): {
  totalComponents: number;
  commandCount: number;
  hookCount: number;
  categoryCounts: Record<ComponentCategory, number>;
  dependencyCount: number;
  lastScanDuration: number;
  cacheStatus: 'valid' | 'invalid' | 'expired';
} {
  const now = new Date();
  const cacheAge = now.getTime() - registry.lastScan.getTime();

  let cacheStatus: 'valid' | 'invalid' | 'expired' = 'invalid';
  if (registry.cacheValid) {
    cacheStatus = cacheAge < CACHE_DURATION ? 'valid' : 'expired';
  }

  const categoryCounts: Partial<Record<ComponentCategory, number>> = {};
  for (const [category, componentIds] of registry.categories) {
    categoryCounts[category] = componentIds.size;
  }

  return {
    totalComponents: registry.components.size,
    commandCount: getComponentsByType('command', registry).length,
    hookCount: getComponentsByType('hook', registry).length,
    categoryCounts: categoryCounts as Record<ComponentCategory, number>,
    dependencyCount: Array.from(registry.dependencies.values()).reduce(
      (sum, deps) => sum + deps.size,
      0
    ),
    lastScanDuration: cacheAge,
    cacheStatus,
  };
}

// ============================================================================
// Component Recommendation Engine
// ============================================================================

/**
 * Recommendation weight scores for different factors
 */
const RECOMMENDATION_WEIGHTS = {
  directMatch: 100, // Direct tool/framework match
  categoryMatch: 50, // Category relevance
  dependencyMatch: 30, // Has required dependencies
  commonPattern: 20, // Common project patterns
  optional: 10, // Nice-to-have components
};

/**
 * Component recommendation with reasoning
 */
export interface ComponentRecommendation {
  component: ComponentFile;
  score: number;
  reasons: string[];
  dependencies: string[];
  isRequired: boolean;
}

/**
 * Recommendation result with grouped components
 */
export interface RecommendationResult {
  essential: ComponentRecommendation[];
  recommended: ComponentRecommendation[];
  optional: ComponentRecommendation[];
  totalScore: number;
}

/**
 * Analyze project and recommend components
 *
 * @param projectInfo - Detected project information
 * @param registry - Component registry
 * @param options - Recommendation options
 * @returns Grouped component recommendations
 */
export async function recommendComponents(
  projectInfo: ProjectInfo,
  registry: ComponentRegistry,
  options: {
    includeOptional?: boolean;
    excludeCategories?: ComponentCategory[];
    maxRecommendations?: number;
  } = {}
): Promise<RecommendationResult> {
  const { includeOptional = true, excludeCategories = [], maxRecommendations = 20 } = options;

  const recommendations = new Map<string, ComponentRecommendation>();
  const processedDependencies = new Set<string>();

  // Analyze each component for relevance
  for (const [id, component] of registry.components) {
    // Skip excluded categories
    if (excludeCategories.includes(component.metadata.category)) {
      continue;
    }

    const score = calculateRecommendationScore(component, projectInfo);
    const reasons = generateRecommendationReasons(component, projectInfo);

    if (score > 0) {
      // Resolve dependencies for this component
      const dependencies = resolveComponentDependencies(id, registry, processedDependencies);

      recommendations.set(id, {
        component,
        score,
        reasons,
        dependencies,
        isRequired: score >= RECOMMENDATION_WEIGHTS.directMatch,
      });
    }
  }

  // Sort by score and categorize
  const sortedRecommendations = Array.from(recommendations.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRecommendations);

  // Categorize recommendations
  const essential: ComponentRecommendation[] = [];
  const recommended: ComponentRecommendation[] = [];
  const optional: ComponentRecommendation[] = [];

  for (const rec of sortedRecommendations) {
    if (rec.score >= RECOMMENDATION_WEIGHTS.directMatch) {
      essential.push(rec);
    } else if (rec.score >= RECOMMENDATION_WEIGHTS.categoryMatch) {
      recommended.push(rec);
    } else if (includeOptional) {
      optional.push(rec);
    }
  }

  // Auto-include dependencies for essential components
  const allDependencies = new Set<string>();
  for (const rec of essential) {
    rec.dependencies.forEach((dep) => allDependencies.add(dep));
  }

  // Add dependency components if not already included
  for (const depId of allDependencies) {
    if (!recommendations.has(depId)) {
      const depComponent = registry.components.get(depId);
      if (depComponent && !excludeCategories.includes(depComponent.metadata.category)) {
        recommended.push({
          component: depComponent,
          score: RECOMMENDATION_WEIGHTS.dependencyMatch,
          reasons: ['Required dependency for recommended components'],
          dependencies: [],
          isRequired: true,
        });
      }
    }
  }

  const totalScore = [...essential, ...recommended, ...optional].reduce(
    (sum, rec) => sum + rec.score,
    0
  );

  return {
    essential,
    recommended,
    optional,
    totalScore,
  };
}

/**
 * Calculate recommendation score for a component
 */
function calculateRecommendationScore(component: ComponentFile, projectInfo: ProjectInfo): number {
  let score = 0;

  // TypeScript project checks
  if (projectInfo.hasTypeScript) {
    if (
      component.metadata.id === 'typecheck-changed' ||
      component.metadata.name.toLowerCase().includes('typescript')
    ) {
      score += RECOMMENDATION_WEIGHTS.directMatch;
    }
    if (component.metadata.category === 'validation') {
      score += RECOMMENDATION_WEIGHTS.categoryMatch / 2;
    }
  }

  // ESLint project checks
  if (projectInfo.hasESLint) {
    if (
      component.metadata.id === 'lint-changed' ||
      component.metadata.name.toLowerCase().includes('eslint')
    ) {
      score += RECOMMENDATION_WEIGHTS.directMatch;
    }
  }

  // Prettier checks
  if (projectInfo.hasPrettier === true) {
    if (
      component.metadata.id === 'prettier' ||
      component.metadata.name.toLowerCase().includes('prettier')
    ) {
      score += RECOMMENDATION_WEIGHTS.directMatch;
    }
  }

  // Testing framework checks
  if (projectInfo.hasJest === true || projectInfo.hasVitest === true) {
    if (component.metadata.id === 'test-changed' || component.metadata.category === 'testing') {
      score += RECOMMENDATION_WEIGHTS.directMatch;
    }
  }

  // Git repository checks
  if (projectInfo.isGitRepository === true) {
    if (component.metadata.category === 'git') {
      score += RECOMMENDATION_WEIGHTS.categoryMatch;
    }
    // Auto-checkpoint is highly recommended for git projects
    if (component.metadata.id === 'create-checkpoint') {
      score += RECOMMENDATION_WEIGHTS.directMatch;
    }
  }

  // Framework-specific recommendations
  if (projectInfo.frameworks !== undefined && projectInfo.frameworks.length > 0) {
    for (const framework of projectInfo.frameworks) {
      const frameworkLower = framework.toLowerCase();
      const componentNameLower = component.metadata.name.toLowerCase();
      const componentDescLower = component.metadata.description.toLowerCase();

      if (
        componentNameLower.includes(frameworkLower) ||
        componentDescLower.includes(frameworkLower)
      ) {
        score += RECOMMENDATION_WEIGHTS.categoryMatch;
      }
    }
  }

  // Common patterns
  // All projects benefit from validation hooks
  if (component.metadata.category === 'validation' && !component.metadata.id.includes('lib')) {
    score += RECOMMENDATION_WEIGHTS.commonPattern;
  }

  // All projects benefit from development tools
  if (component.metadata.category === 'development') {
    score += RECOMMENDATION_WEIGHTS.optional;
  }

  // Project management tools are optional but useful
  if (component.metadata.category === 'project-management') {
    score += RECOMMENDATION_WEIGHTS.optional;
  }

  // AI assistant tools are optional but useful
  if (component.metadata.category === 'ai-assistant') {
    score += RECOMMENDATION_WEIGHTS.optional;
  }

  return score;
}

/**
 * Generate human-readable reasons for recommendation
 */
function generateRecommendationReasons(
  component: ComponentFile,
  projectInfo: ProjectInfo
): string[] {
  const reasons: string[] = [];

  // TypeScript reasons
  if (
    projectInfo.hasTypeScript &&
    (component.metadata.id === 'typecheck-changed' ||
      component.metadata.name.toLowerCase().includes('typescript'))
  ) {
    reasons.push('TypeScript detected - type checking recommended');
  }

  // ESLint reasons
  if (
    projectInfo.hasESLint &&
    (component.metadata.id === 'lint-changed' ||
      component.metadata.name.toLowerCase().includes('eslint'))
  ) {
    reasons.push('ESLint configuration found - linting automation recommended');
  }

  // Prettier reasons
  if (
    projectInfo.hasPrettier === true &&
    (component.metadata.id === 'prettier' ||
      component.metadata.name.toLowerCase().includes('prettier'))
  ) {
    reasons.push('Prettier configuration found - formatting automation recommended');
  }

  // Testing reasons
  if (
    (projectInfo.hasJest === true || projectInfo.hasVitest === true) &&
    (component.metadata.id === 'test-changed' || component.metadata.category === 'testing')
  ) {
    const framework = projectInfo.hasJest === true ? 'Jest' : 'Vitest';
    reasons.push(`${framework} detected - automated test running recommended`);
  }

  // Git reasons
  if (projectInfo.isGitRepository === true && component.metadata.category === 'git') {
    if (component.metadata.id === 'create-checkpoint') {
      reasons.push('Git repository - automatic checkpointing highly recommended');
    } else {
      reasons.push('Git repository - version control tools recommended');
    }
  }

  // Framework-specific reasons
  if (projectInfo.frameworks !== undefined && projectInfo.frameworks.length > 0) {
    for (const framework of projectInfo.frameworks) {
      const frameworkLower = framework.toLowerCase();
      const componentNameLower = component.metadata.name.toLowerCase();
      const componentDescLower = component.metadata.description.toLowerCase();

      if (
        componentNameLower.includes(frameworkLower) ||
        componentDescLower.includes(frameworkLower)
      ) {
        reasons.push(`${framework} project - framework-specific tools recommended`);
      }
    }
  }

  // Generic reasons
  if (reasons.length === 0) {
    if (component.metadata.category === 'validation') {
      reasons.push('Code quality validation tools');
    } else if (component.metadata.category === 'development') {
      reasons.push('Development workflow enhancement');
    } else if (component.metadata.category === 'project-management') {
      reasons.push('Project organization and tracking');
    } else if (component.metadata.category === 'ai-assistant') {
      reasons.push('AI-powered development assistance');
    } else {
      reasons.push('General development utility');
    }
  }

  return reasons;
}

/**
 * Resolve dependencies for a component, avoiding duplicates
 */
function resolveComponentDependencies(
  componentId: string,
  registry: ComponentRegistry,
  processedDependencies: Set<string>
): string[] {
  const dependencies: string[] = [];

  // Get all dependencies (including transitive)
  const allDeps = resolveAllDependencies([componentId], registry);

  for (const depId of allDeps) {
    if (depId !== componentId && !processedDependencies.has(depId)) {
      dependencies.push(depId);
      processedDependencies.add(depId);
    }
  }

  return dependencies;
}

/**
 * Get recommendation summary as human-readable text
 */
export function formatRecommendationSummary(result: RecommendationResult): string {
  const lines: string[] = [];

  if (result.essential.length > 0) {
    lines.push('Essential Components:');
    for (const rec of result.essential) {
      lines.push(`  • ${rec.component.metadata.name} - ${rec.reasons.join('; ')}`);
      if (rec.dependencies.length > 0) {
        lines.push(`    Dependencies: ${rec.dependencies.join(', ')}`);
      }
    }
    lines.push('');
  }

  if (result.recommended.length > 0) {
    lines.push('Recommended Components:');
    for (const rec of result.recommended) {
      lines.push(`  • ${rec.component.metadata.name} - ${rec.reasons.join('; ')}`);
    }
    lines.push('');
  }

  if (result.optional.length > 0) {
    lines.push('Optional Components:');
    for (const rec of result.optional) {
      lines.push(`  • ${rec.component.metadata.name} - ${rec.reasons.join('; ')}`);
    }
  }

  return lines.join('\n');
}
