// cli/hooks/profile.ts
import * as fs from 'node:fs/promises';
import { runHook } from './runner.js';

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

function truncateMiddle(str: string, maxLength: number = 40): string {
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
  const startTime = Date.now();
  const result = await runHook(hookName);
  const duration = Date.now() - startTime;
  
  // Measure output size
  const output = result.stdout ?? '';
  const characters = output.length;
  const tokens = estimateTokens(output);
  
  return { time: duration, characters, tokens };
}

function estimateTokens(text: string): number {
  // Simple estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
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
  console.log('─'.repeat(84));
  console.log('Command                                     Time      Characters   Tokens');
  console.log('─'.repeat(84));
  
  // Display each result
  for (const result of results) {
    const command = truncateMiddle(result.hookName, 40);
    const time = `${result.time}ms`;
    const chars = result.characters.toLocaleString();
    const tokens = result.tokens.toLocaleString();
    
    console.log(`${command.padEnd(44)} ${time.padEnd(10)} ${chars.padEnd(12)} ${tokens}`);
  }
  
  console.log('─'.repeat(84));
  
  // Display warnings
  const slowHooks = results.filter(r => r.time > 5000);
  const nearLimitHooks = results.filter(r => r.characters > 9000 && r.characters <= 10000);
  const overLimitHooks = results.filter(r => r.characters > 10000);
  
  if (slowHooks.length > 0 || nearLimitHooks.length > 0 || overLimitHooks.length > 0) {
    console.log('\n⚠ Performance Issues:');
    
    if (slowHooks.length > 0) {
      console.log('  Slow commands (>5s):');
      for (const hook of slowHooks) {
        console.log(`    ${truncateMiddle(hook.hookName, 40)} (${(hook.time / 1000).toFixed(1)}s)`);
      }
    }
    
    if (nearLimitHooks.length > 0) {
      console.log('  \n  Near UserPromptSubmit limit (>9k chars):');
      for (const hook of nearLimitHooks) {
        console.log(`    ${truncateMiddle(hook.hookName, 40)} (${hook.characters.toLocaleString()} chars - at risk of truncation)`);
      }
    }
    
    if (overLimitHooks.length > 0) {
      console.log('  \n  Exceeds UserPromptSubmit limit (>10k chars):');
      for (const hook of overLimitHooks) {
        console.log(`    ${truncateMiddle(hook.hookName, 40)} (${hook.characters.toLocaleString()} chars - WILL BE TRUNCATED)`);
      }
    }
  }
}