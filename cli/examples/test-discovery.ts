#!/usr/bin/env node

/**
 * Test script to verify component discovery works with real claudekit components
 */

import {
  discoverComponents,
  getDiscoveryStats,
  getComponentsByCategory,
  searchComponents,
} from '../lib/components.js';
import type { ComponentCategory } from '../types/config.js';
import * as path from 'path';

async function testDiscovery(): Promise<void> {
  console.log('🔍 Testing Component Discovery System\n');

  // Test with the main claudekit src directory
  const srcDir = path.join(process.cwd(), '../../src');

  try {
    console.log(`📁 Scanning directory: ${srcDir}`);
    const startTime = Date.now();

    const registry = await discoverComponents(srcDir);
    const duration = Date.now() - startTime;

    console.log(`⏱️  Discovery completed in ${duration}ms\n`);

    // Get statistics
    const stats = getDiscoveryStats(registry);
    console.log('📊 Discovery Statistics:');
    console.log(`   Total components: ${stats.totalComponents}`);
    console.log(`   Commands: ${stats.commandCount}`);
    console.log(`   Hooks: ${stats.hookCount}`);
    console.log(`   Dependencies: ${stats.dependencyCount}`);
    console.log(`   Cache status: ${stats.cacheStatus}\n`);

    // Show category breakdown
    console.log('🏷️  Components by Category:');
    for (const [category, count] of Object.entries(stats.categoryCounts)) {
      if (count > 0) {
        console.log(`   ${category}: ${count}`);

        // Show first few components in each category
        const components = getComponentsByCategory(category as ComponentCategory, registry);
        components.slice(0, 3).forEach((comp) => {
          console.log(`     - ${comp.metadata.name} (${comp.type})`);
        });
        if (components.length > 3) {
          console.log(`     ... and ${components.length - 3} more`);
        }
      }
    }

    // Test search functionality
    console.log('\n🔎 Search Tests:');

    const gitComponents = searchComponents('git', registry, { includeDescription: true });
    console.log(`   "git" search: ${gitComponents.length} results`);
    gitComponents.slice(0, 3).forEach((comp) => {
      console.log(`     - ${comp.metadata.name}: ${comp.metadata.description.substring(0, 60)}...`);
    });

    const validationComponents = searchComponents('validation', registry, {
      includeDescription: true,
    });
    console.log(`   "validation" search: ${validationComponents.length} results`);
    validationComponents.slice(0, 3).forEach((comp) => {
      console.log(`     - ${comp.metadata.name}: ${comp.metadata.description.substring(0, 60)}...`);
    });

    // Show some example components
    console.log('\n📄 Sample Components:');
    Array.from(registry.components.values())
      .slice(0, 5)
      .forEach((comp) => {
        console.log(`   ${comp.metadata.name} (${comp.type})`);
        console.log(`     Category: ${comp.metadata.category}`);
        console.log(`     Dependencies: [${comp.metadata.dependencies.join(', ')}]`);
        console.log(`     Description: ${comp.metadata.description.substring(0, 80)}...`);
        console.log('');
      });

    console.log('✅ Component discovery test completed successfully!');
  } catch (error) {
    console.error('❌ Component discovery test failed:', error);
    process.exit(1);
  }
}

testDiscovery();
