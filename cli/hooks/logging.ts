import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

interface HookExecution {
  hookName: string;
  timestamp: string;
  executionTime: number;
  exitCode: number;
  payload?: unknown;
  result?: unknown;
}

interface HookStats {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
  lastExecution: string;
  recentExecutions: Array<{
    timestamp: string;
    executionTime: number;
    exitCode: number;
  }>;
}

const LOG_DIR = path.join(os.homedir(), '.claudekit', 'logs');
const EXECUTIONS_LOG = path.join(LOG_DIR, 'hook-executions.jsonl');
const STATS_FILE = path.join(LOG_DIR, 'hook-stats.json');

export async function appendHookExecution(execution: HookExecution): Promise<void> {
  try {
    // Debug logging
    if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
      console.error('[DEBUG] Logging hook execution:', {
        hookName: execution.hookName,
        timestamp: execution.timestamp,
        logDir: LOG_DIR,
        executionsLog: EXECUTIONS_LOG,
      });
    }

    // Ensure log directory exists
    await fs.ensureDir(LOG_DIR);

    // Append to JSONL log file
    const logEntry = `${JSON.stringify(execution)}\n`;
    await fs.appendFile(EXECUTIONS_LOG, logEntry);

    // Update stats
    await updateHookStats(execution);

    if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
      console.error('[DEBUG] Hook execution logged successfully');
    }
  } catch (error) {
    // Log errors when debug is enabled
    if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
      console.error('[DEBUG] Failed to log hook execution:', error);
    }
  }
}

async function updateHookStats(execution: HookExecution): Promise<void> {
  let stats: Record<string, HookStats> = {};

  try {
    // Load existing stats
    if (await fs.pathExists(STATS_FILE)) {
      stats = await fs.readJson(STATS_FILE);
    }
  } catch {
    // Start fresh if file is corrupted
    stats = {};
  }

  // Initialize hook stats if not exists
  if (!stats[execution.hookName]) {
    stats[execution.hookName] = {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      avgExecutionTime: 0,
      lastExecution: execution.timestamp,
      recentExecutions: [],
    };
  }

  const hookStats = stats[execution.hookName];

  // This should never happen given the initialization above, but satisfy TypeScript
  if (!hookStats) {
    return;
  }

  // Update counts
  hookStats.totalExecutions++;
  if (execution.exitCode === 0) {
    hookStats.successCount++;
  } else {
    hookStats.failureCount++;
  }

  // Update average execution time
  hookStats.avgExecutionTime =
    (hookStats.avgExecutionTime * (hookStats.totalExecutions - 1) + execution.executionTime) /
    hookStats.totalExecutions;

  // Update last execution
  hookStats.lastExecution = execution.timestamp;

  // Add to recent executions (keep last 10)
  hookStats.recentExecutions.push({
    timestamp: execution.timestamp,
    executionTime: execution.executionTime,
    exitCode: execution.exitCode,
  });
  if (hookStats.recentExecutions.length > 10) {
    hookStats.recentExecutions.shift();
  }

  // Save updated stats
  await fs.writeJson(STATS_FILE, stats, { spaces: 2 });
}

export async function getHookStats(): Promise<Record<string, HookStats>> {
  try {
    if (await fs.pathExists(STATS_FILE)) {
      return await fs.readJson(STATS_FILE);
    }
  } catch {
    // Return empty stats if file doesn't exist or is corrupted
  }
  return {};
}

export async function printHookReport(): Promise<void> {
  const stats = await getHookStats();

  console.log('\n=== Hook Execution Report ===\n');

  if (Object.keys(stats).length === 0) {
    console.log('No hook executions recorded yet.');
    return;
  }

  for (const [hookName, hookStats] of Object.entries(stats)) {
    console.log(`Hook: ${hookName}`);
    console.log(`  Total Executions: ${hookStats.totalExecutions}`);
    console.log(
      `  Success Rate: ${Math.round((hookStats.successCount / hookStats.totalExecutions) * 100)}%`
    );
    console.log(`  Average Time: ${Math.round(hookStats.avgExecutionTime)}ms`);
    console.log(`  Last Run: ${new Date(hookStats.lastExecution).toLocaleString()}`);

    if (hookStats.recentExecutions.length > 0) {
      console.log('  Recent Executions:');
      for (const exec of hookStats.recentExecutions.slice(-3)) {
        const status = exec.exitCode === 0 ? '✓' : '✗';
        console.log(
          `    ${status} ${new Date(exec.timestamp).toLocaleString()} (${exec.executionTime}ms)`
        );
      }
    }
    console.log();
  }
}

export async function getRecentExecutions(limit: number = 50): Promise<HookExecution[]> {
  try {
    if (!(await fs.pathExists(EXECUTIONS_LOG))) {
      return [];
    }

    const content = await fs.readFile(EXECUTIONS_LOG, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as HookExecution[];
  } catch {
    return [];
  }
}
