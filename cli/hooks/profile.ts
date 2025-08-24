/**
 * Hook profiling functionality
 * Provides performance measurement and analysis for Claude Code hooks
 */

import { performance } from 'node:perf_hooks';
import { HookRunner } from './runner.js';
import { HOOK_REGISTRY } from './registry.js';

interface ProfileOptions {
  iterations?: string;
}

interface ProfileResult {
  hookName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  errors: string[];
}

/**
 * Profile hook performance with multiple iterations
 */
export async function profileHooks(hookName?: string, options: ProfileOptions = {}): Promise<void> {
  const iterations = parseInt(options.iterations ?? '1', 10);
  
  if (isNaN(iterations) || iterations < 1) {
    console.error('Error: Iterations must be a positive number');
    process.exit(1);
  }

  // If no hook specified, show available hooks
  if (hookName === undefined || hookName === '') {
    console.log('Available hooks to profile:');
    for (const [id, HookClass] of Object.entries(HOOK_REGISTRY)) {
      const description = HookClass.metadata?.description ?? `${id} hook`;
      const padding = ' '.repeat(Math.max(0, 30 - id.length));
      console.log(`  ${id}${padding}- ${description}`);
    }
    console.log('\nUsage: claudekit-hooks profile <hook-name> [--iterations <n>]');
    return;
  }

  // Validate hook exists
  if (!HOOK_REGISTRY[hookName]) {
    console.error(`Error: Hook '${hookName}' not found`);
    console.log('\nAvailable hooks:');
    for (const id of Object.keys(HOOK_REGISTRY)) {
      console.log(`  ${id}`);
    }
    process.exit(1);
  }

  console.log(`\n=== Profiling Hook: ${hookName} ===`);
  console.log(`Iterations: ${iterations}`);
  console.log('');

  const runner = new HookRunner();
  const results: ProfileResult = {
    hookName,
    iterations,
    totalTime: 0,
    averageTime: 0,
    minTime: Infinity,
    maxTime: 0,
    successRate: 0,
    errors: []
  };

  let successCount = 0;
  const executionTimes: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    try {
      const exitCode = await runner.run(hookName);
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      executionTimes.push(executionTime);
      results.totalTime += executionTime;
      results.minTime = Math.min(results.minTime, executionTime);
      results.maxTime = Math.max(results.maxTime, executionTime);
      
      if (exitCode === 0) {
        successCount++;
        console.log(`  Run ${i + 1}: ✓ ${executionTime.toFixed(2)}ms`);
      } else {
        console.log(`  Run ${i + 1}: ✗ ${executionTime.toFixed(2)}ms (exit code: ${exitCode})`);
        results.errors.push(`Run ${i + 1}: exit code ${exitCode}`);
      }
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      executionTimes.push(executionTime);
      results.totalTime += executionTime;
      results.minTime = Math.min(results.minTime, executionTime);
      results.maxTime = Math.max(results.maxTime, executionTime);
      
      console.log(`  Run ${i + 1}: ✗ ${executionTime.toFixed(2)}ms (error)`);
      results.errors.push(`Run ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Calculate final statistics
  results.averageTime = results.totalTime / iterations;
  results.successRate = (successCount / iterations) * 100;
  
  // Reset min time if no executions
  if (results.minTime === Infinity) {
    results.minTime = 0;
  }

  // Display summary
  console.log('\n=== Profile Summary ===');
  console.log(`Hook: ${results.hookName}`);
  console.log(`Iterations: ${results.iterations}`);
  console.log(`Success Rate: ${results.successRate.toFixed(1)}% (${successCount}/${iterations})`);
  console.log(`Total Time: ${results.totalTime.toFixed(2)}ms`);
  console.log(`Average Time: ${results.averageTime.toFixed(2)}ms`);
  console.log(`Min Time: ${results.minTime.toFixed(2)}ms`);
  console.log(`Max Time: ${results.maxTime.toFixed(2)}ms`);
  
  if (executionTimes.length > 1) {
    const variance = executionTimes.reduce((sum, time) => sum + Math.pow(time - results.averageTime, 2), 0) / executionTimes.length;
    const stdDev = Math.sqrt(variance);
    console.log(`Std Deviation: ${stdDev.toFixed(2)}ms`);
  }

  if (results.errors.length > 0) {
    console.log('\n=== Errors ===');
    results.errors.forEach(error => console.log(`  ${error}`));
  }

  console.log('');
}