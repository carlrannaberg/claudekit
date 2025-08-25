// cli/hooks/profile.ts
import * as fs from 'node:fs/promises';
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
    
    // Prepare test payload for hooks that need input
    let testPayload: Record<string, unknown> = {};
    
    // For hooks that need a file path (PostToolUse hooks)
    if (hookName.includes('changed') || hookName === 'file-guard' || 
        hookName === 'check-any' || hookName === 'check-comment-replacement' ||
        hookName === 'check-unused-parameters' || hookName === 'codebase-map-update') {
      // Use the profile.ts file itself as a test file
      testPayload = {
        tool_input: {
          file_path: 'cli/hooks/profile.ts'
        }
      };
    }
    // For Stop hooks - they need different input
    else if (hookName === 'check-todos' || hookName === 'self-review' ||
             hookName === 'typecheck-project' || hookName === 'lint-project' ||
             hookName === 'test-project' || hookName === 'create-checkpoint') {
      // Stop hooks often need a transcript path or just basic event info
      testPayload = {
        hook_event_name: 'Stop',
        transcript_path: '~/.claude/transcripts/test.jsonl' // Fake path for testing
      };
    }
    // For UserPromptSubmit hooks
    else if (hookName === 'codebase-map' || hookName === 'thinking-level') {
      testPayload = {
        hook_event_name: 'UserPromptSubmit',
        session_id: `test-session-${Date.now()}`, // Unique session ID
        user_message: 'test message'
      };
    }
    
    // Execute hook using the actual CLI command with piped input
    const { execSync } = await import('node:child_process');
    let output = '';
    try {
      const payloadJson = JSON.stringify(testPayload);
      // Capture both stdout and stderr (hooks output to stderr)
      output = execSync(`echo '${payloadJson}' | claudekit-hooks run ${hookName} 2>&1`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
        stdio: 'pipe'
      });
    } catch (execError: unknown) {
      // Even if command exits with non-zero, we may still have output
      if (execError !== null && typeof execError === 'object' && 'stdout' in execError) {
        output = String(execError.stdout);
      } else if (execError !== null && typeof execError === 'object' && 'output' in execError) {
        // Some errors have output array
        const outputArray = execError.output as unknown[];
        if (Array.isArray(outputArray)) {
          output = outputArray.filter(o => o !== null && o !== undefined).join('');
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Measure output size
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
  
  // ANSI color codes
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const RESET = '\x1b[0m';
  
  // Identify UserPromptSubmit hooks (these have character limits)
  // Based on hook metadata, only these hooks use UserPromptSubmit event
  const userPromptSubmitHooks = ['codebase-map', 'thinking-level'];
  
  // Display table header
  console.log('Hook Performance Profile');
  console.log('─'.repeat(PERFORMANCE_THRESHOLDS.TABLE_WIDTH));
  console.log('Command                                     Time      Characters   Tokens');
  console.log('─'.repeat(PERFORMANCE_THRESHOLDS.TABLE_WIDTH));
  
  // Display each result
  for (const result of results) {
    const command = truncateMiddle(result.hookName);
    const timeMs = Math.round(result.time);
    const charsNum = Math.round(result.characters);
    const time = `${timeMs}ms`;
    const chars = charsNum.toString();
    const tokens = Math.round(result.tokens).toString();
    
    // Determine if line should be colored
    let lineColor = '';
    let resetColor = '';
    
    // Check time threshold
    if (timeMs > PERFORMANCE_THRESHOLDS.SLOW_EXECUTION_MS) {
      lineColor = RED;
      resetColor = RESET;
    }
    
    // Check character limits (only for UserPromptSubmit hooks)
    if (userPromptSubmitHooks.includes(result.hookName)) {
      if (charsNum > CLAUDE_CODE_LIMITS.MAX_OUTPUT_CHARS) {
        lineColor = RED;
        resetColor = RESET;
      } else if (charsNum > CLAUDE_CODE_LIMITS.SAFE_OUTPUT_CHARS && !lineColor) {
        lineColor = YELLOW;
        resetColor = RESET;
      }
    }
    
    // Print the entire line with color if needed
    const line = `${command.padEnd(44)} ${time.padEnd(10)} ${chars.padEnd(12)} ${tokens}`;
    console.log(`${lineColor}${line}${resetColor}`);
  }
  
  console.log('─'.repeat(PERFORMANCE_THRESHOLDS.TABLE_WIDTH));
  
  // Display warnings based on performance thresholds
  const slowHooks = results.filter(r => r.time > PERFORMANCE_THRESHOLDS.SLOW_EXECUTION_MS);
  // Only check UserPromptSubmit limits for hooks that are UserPromptSubmit hooks
  // Based on hook metadata, only these hooks use UserPromptSubmit event
  const userPromptSubmitHooksList = ['codebase-map', 'thinking-level'];
  const nearLimitHooks = results.filter(r => 
    userPromptSubmitHooksList.includes(r.hookName) &&
    r.characters > CLAUDE_CODE_LIMITS.SAFE_OUTPUT_CHARS && 
    r.characters <= CLAUDE_CODE_LIMITS.MAX_OUTPUT_CHARS
  );
  const overLimitHooks = results.filter(r => 
    userPromptSubmitHooksList.includes(r.hookName) &&
    r.characters > CLAUDE_CODE_LIMITS.MAX_OUTPUT_CHARS
  );
  
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