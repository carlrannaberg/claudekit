#!/usr/bin/env tsx
/**
 * Dependency Resolution Demo
 *
 * Demonstrates how the component dependency resolution system works,
 * including automatic dependency inclusion, circular dependency detection,
 * and installation order calculation.
 */

import {
  discoverComponents,
  resolveDependencyOrder,
  resolveAllDependencies,
  getMissingDependencies,
  getTransitiveDependencies,
  wouldCreateCircularDependency,
} from '../lib/components.js';
import { Logger } from '../utils/logger.js';

const logger = Logger.create('dependency-demo');

async function demonstrateDependencyResolution() {
  logger.info('=== Component Dependency Resolution Demo ===\n');

  // Discover components in the actual claudekit source
  const sourceDir = `${process.cwd()}/../../src`;
  logger.info(`Discovering components in: ${sourceDir}`);

  const registry = await discoverComponents(sourceDir);
  logger.info(`Found ${registry.components.size} components\n`);

  // Example 1: Basic dependency resolution
  logger.info('Example 1: Basic Dependency Resolution');
  logger.info('---------------------------------------');

  const basicComponents = ['typecheck', 'eslint'];
  logger.info(`Selected components: ${basicComponents.join(', ')}`);

  const basicOrder = resolveDependencyOrder(basicComponents, registry);
  logger.info(`Installation order: ${basicOrder.join(' -> ')}\n`);

  // Example 2: Auto-include dependencies
  logger.info('Example 2: Auto-Include Dependencies');
  logger.info('------------------------------------');

  const componentsWithDeps = ['typecheck'];
  logger.info(`Selected: ${componentsWithDeps.join(', ')}`);

  const allDeps = resolveAllDependencies(componentsWithDeps, registry);
  logger.info(`With dependencies: ${allDeps.join(', ')}`);

  const missing = getMissingDependencies(componentsWithDeps, registry);
  if (missing.length > 0) {
    logger.warn(`Auto-included: ${missing.join(', ')}\n`);
  }

  // Example 3: Transitive dependencies
  logger.info('Example 3: Transitive Dependencies');
  logger.info('----------------------------------');

  const component = 'spec-decompose';
  logger.info(`Component: ${component}`);

  const transitiveDeps = getTransitiveDependencies(component, registry);
  if (transitiveDeps.length > 0) {
    logger.info('Dependency tree:');
    transitiveDeps.forEach((dep, index) => {
      logger.info(`  ${index + 1}. ${dep.metadata.id} (${dep.metadata.category})`);
    });
  } else {
    logger.info('No transitive dependencies found');
  }
  logger.info('');

  // Example 4: Circular dependency check
  logger.info('Example 4: Circular Dependency Detection');
  logger.info('----------------------------------------');

  // Check some potential circular dependencies
  const checks = [
    ['git-push', 'git-status'],
    ['spec-validate', 'spec-decompose'],
  ];

  for (const [from, to] of checks) {
    // Ensure parameters are strings (they come from array destructuring)
    const fromId = from ?? '';
    const toId = to ?? '';
    const wouldCircular = wouldCreateCircularDependency(fromId, toId, registry);
    logger.info(`${fromId} -> ${toId}: ${wouldCircular ? '❌ Would create cycle' : '✅ Safe'}`);
  }
  logger.info('');

  // Example 5: Complex dependency chain
  logger.info('Example 5: Complex Dependency Chain');
  logger.info('-----------------------------------');

  const complexComponents = ['spec-execute', 'git-push', 'typecheck'];
  logger.info(`Selected: ${complexComponents.join(', ')}`);

  const complexResolved = resolveAllDependencies(complexComponents, registry, {
    includeOptional: false,
    maxDepth: 5,
  });

  logger.info(`Total components after resolution: ${complexResolved.length}`);
  logger.info(`Installation order: ${complexResolved.join(' -> ')}\n`);

  // Show dependency statistics
  logger.info('Dependency Statistics');
  logger.info('--------------------');

  let totalDeps = 0;
  let maxDeps = 0;
  let maxDepsComponent = '';

  for (const [id, component] of registry.components) {
    const deps = component.metadata.dependencies.length;
    totalDeps += deps;
    if (deps > maxDeps) {
      maxDeps = deps;
      maxDepsComponent = id;
    }
  }

  logger.info(
    `Average dependencies per component: ${(totalDeps / registry.components.size).toFixed(2)}`
  );
  logger.info(`Component with most dependencies: ${maxDepsComponent} (${maxDeps} deps)`);

  // Check for any circular dependencies in the graph
  if (registry.dependencyGraph?.cycles && registry.dependencyGraph.cycles.length > 0) {
    logger.warn('\nCircular dependencies detected:');
    registry.dependencyGraph.cycles.forEach((cycle) => {
      logger.warn(`  ${cycle.join(' -> ')}`);
    });
  } else {
    logger.success('\nNo circular dependencies detected in the component graph!');
  }
}

// Run the demo
demonstrateDependencyResolution().catch((error) => {
  logger.error(`Demo failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
