// cli/hooks/profile.ts
import * as fs from 'node:fs/promises';
import { runHook } from './runner.js';
import { PERFORMANCE_THRESHOLDS, CLAUDE_CODE_LIMITS } from './constants.js';

interface ProfileOptions {
  iterations: number;
}

interface Settings {
  hooks?: Record<string, Array<{
    hooks?: Array<{
      command?: string;
    }>;
  }>>;
}

interface ProfileResult {
  hookName: string;
  time: number;
  characters: number;
  tokens: number;
  runs?: number;
}

interface MeasureResult {
  time: number;
  characters: number;
  tokens: number;
}

export async function profileHooks(hookName?: string, options: ProfileOptions = { iterations: 1 }): Promise<void> {
  // 1. Get hooks to profile
  let hooks: string[];
  
  if (hookName !== undefined && hookName !== '') {
    // Profile specific hook (even if not configured)
    hooks = [hookName];
  } else {
    // Profile only hooks that are actually configured in .claude/settings.json
    const settings = await loadSettings('.claude/settings.json');
    hooks = extractConfiguredHooks(settings);
    
    if (hooks.length === 0) {
      console.log('No hooks configured in .claude/settings.json');
      return;
    }
  }
  
  // 2. Execute profiling
  const results: ProfileResult[] = [];
  for (const hook of hooks) {
    if (options.iterations === 1) {
      // Single run (default)
      const profile = await measureHook(hook);
      if (profile !== null) {
        results.push({ 
          hookName: hook, 
          time: profile.time,
          characters: profile.characters,
          tokens: profile.tokens 
        });
      }
    } else {
      // Multiple runs (average)
      const profiles: MeasureResult[] = [];
      for (let i = 0; i < options.iterations; i++) {
        const profile = await measureHook(hook);
        if (profile !== null) {
          profiles.push(profile);
        }
      }
      if (profiles.length > 0) {
        results.push({
          hookName: hook,
          time: average(profiles.map(p => p.time)),
          characters: average(profiles.map(p => p.characters)),
          tokens: average(profiles.map(p => p.tokens)),
          runs: profiles.length
        });
      }
    }
  }
  
  // 3. Display results
  displayResults(results);
}

function truncateMiddle(str: string, maxLength: number = PERFORMANCE_THRESHOLDS.TRUNCATE_LENGTH): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return str.substr(0, frontChars) + ellipsis + str.substr(str.length - backChars);
}

async function measureHook(hookName: string): Promise<MeasureResult | null> {
  try {
    const startTime = Date.now();
    const result = await runHook(hookName);
    const duration = Date.now() - startTime;
    
    // Measure output size
    const output = result.stdout ?? '';
    const characters = output.length;
    const tokens = estimateTokens(output);
    
    return { time: duration, characters, tokens };
  } catch (error) {
    console.error(`Failed to profile hook "${hookName}":`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

function estimateTokens(text: string): number {
  // Simple estimation based on typical tokenization patterns
  return Math.ceil(text.length / PERFORMANCE_THRESHOLDS.TOKENS_PER_CHAR);
}

function extractConfiguredHooks(settings: Settings): string[] {
  const commands = new Set<string>();
  
  // Extract hook names from all event types (PostToolUse, Stop, etc.)
  const hooks = settings.hooks;
  if (hooks !== undefined) {
    for (const eventType in hooks) {
      const eventConfigs = hooks[eventType];
      if (eventConfigs !== undefined) {
        for (const config of eventConfigs) {
          const configHooks = config.hooks;
          if (configHooks !== undefined) {
            for (const hook of configHooks) {
              if (hook.command !== undefined) {
                // Extract just the hook name from commands like "claudekit-hooks run hook-name"
                const match = hook.command.match(/claudekit-hooks\s+run\s+(.+)/);
                if (match !== null && match[1] !== undefined && match[1] !== '') {
                  commands.add(match[1].trim());
                } else {
                  // If it doesn't match the pattern, use the full command
                  commands.add(hook.command);
                }
              }
            }
          }
        }
      }
    }
  }
  
  return Array.from(commands);
}

async function loadSettings(filePath: string): Promise<Settings> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Settings;
  } catch {
    return {};
  }
}

function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function displayResults(results: ProfileResult[]): void {
  if (results.length === 0) {
    console.log('No hooks were successfully profiled');
    return;
  }
  
  // Display table header
  console.log('Hook Performance Profile');
  console.log('─'.repeat(PERFORMANCE_THRESHOLDS.TABLE_WIDTH));
  console.log('Command                                     Time      Characters   Tokens');
  console.log('─'.repeat(PERFORMANCE_THRESHOLDS.TABLE_WIDTH));
  
  // Display each result
  for (const result of results) {
    const command = truncateMiddle(result.hookName);
    const time = `${Math.round(result.time)}ms`;
    const chars = Math.round(result.characters).toString();
    const tokens = Math.round(result.tokens).toString();
    
    console.log(`${command.padEnd(44)} ${time.padEnd(10)} ${chars.padEnd(12)} ${tokens}`);
  }
  
  console.log('─'.repeat(PERFORMANCE_THRESHOLDS.TABLE_WIDTH));
  
  // Display warnings based on performance thresholds
  const slowHooks = results.filter(r => r.time > PERFORMANCE_THRESHOLDS.SLOW_EXECUTION_MS);
  const nearLimitHooks = results.filter(r => 
    r.characters > CLAUDE_CODE_LIMITS.SAFE_OUTPUT_CHARS && 
    r.characters <= CLAUDE_CODE_LIMITS.MAX_OUTPUT_CHARS
  );
  const overLimitHooks = results.filter(r => r.characters > CLAUDE_CODE_LIMITS.MAX_OUTPUT_CHARS);
  
  if (slowHooks.length > 0 || nearLimitHooks.length > 0 || overLimitHooks.length > 0) {
    console.log('\n⚠ Performance Issues:');
    
    if (slowHooks.length > 0) {
      console.log(`  Slow commands (>${PERFORMANCE_THRESHOLDS.SLOW_EXECUTION_MS / 1000}s):`);
      for (const hook of slowHooks) {
        console.log(`    ${truncateMiddle(hook.hookName)} (${(hook.time / 1000).toFixed(1)}s)`);
      }
    }
    
    if (nearLimitHooks.length > 0) {
      console.log(`  \n  Near UserPromptSubmit limit (>${CLAUDE_CODE_LIMITS.SAFE_OUTPUT_CHARS / 1000}k chars):`);
      for (const hook of nearLimitHooks) {
        console.log(`    ${truncateMiddle(hook.hookName)} (${hook.characters} chars - at risk of truncation)`);
      }
    }
    
    if (overLimitHooks.length > 0) {
      console.log(`  \n  Exceeds UserPromptSubmit limit (>${CLAUDE_CODE_LIMITS.MAX_OUTPUT_CHARS / 1000}k chars):`);
      for (const hook of overLimitHooks) {
        console.log(`    ${truncateMiddle(hook.hookName)} (${hook.characters} chars - WILL BE TRUNCATED)`);
      }
    }
  }
}