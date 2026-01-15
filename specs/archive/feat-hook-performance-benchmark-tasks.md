# Task Breakdown: Hook Performance Profile Command
Generated: 2025-08-24
Source: specs/feat-hook-performance-benchmark.md

## Overview
Implementation of a performance profiling command for claudekit-hooks that measures and reports hook execution times, output character counts, and output token counts. This helps developers identify slow hooks and high-output hooks that impact Claude Code development experience and UserPromptSubmit character limits.

## Phase 1: Foundation and Core Implementation

### Task 1.1: Add profile command to CLI interface
**Description**: Add the profile command structure to the hooks CLI with options for iterations
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Add command definition to `cli/hooks-cli.ts`
- Support optional hook name parameter
- Support --iterations option with default value of '1'
- Connect to profileHooks action handler

**Implementation Steps**:
1. Open `cli/hooks-cli.ts`
2. Add the profile command definition after existing commands
3. Ensure proper TypeScript typing for options

**Code to implement**:
```typescript
program
  .command('profile [hook]')
  .description('Profile hook performance (time and output)')
  .option('-i, --iterations <n>', 'Number of iterations', '1')
  .action(async (hook, options) => {
    await profileHooks(hook, options);
  });
```

**Acceptance Criteria**:
- [ ] Command appears in `claudekit-hooks --help`
- [ ] Command accepts optional hook name
- [ ] --iterations option accepts numeric value
- [ ] Default iterations is 1 when not specified

### Task 1.2: Implement core profile execution module
**Description**: Create the main profile.ts module with complete profiling logic
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: None

**Technical Requirements**:
- Create `cli/hooks/profile.ts` with ~130 lines of code
- Implement profileHooks main function
- Hook discovery from settings.json
- Measurement functions for time, characters, and tokens
- Results display with table formatting
- Warning detection for performance issues

**Complete implementation code**:
```typescript
// cli/hooks/profile.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { runHook } from './runner';

export async function profileHooks(hookName?: string, options = { iterations: 1 }) {
  // 1. Get hooks to profile
  let hooks: string[];
  
  if (hookName) {
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
  const results = [];
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
      const profiles = [];
      for (let i = 0; i < options.iterations; i++) {
        const profile = await measureHook(hook);
        if (profile !== null) profiles.push(profile);
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
  if (str.length <= maxLength) return str;
  
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return str.substr(0, frontChars) + ellipsis + str.substr(str.length - backChars);
}

async function measureHook(hookName: string) {
  const startTime = Date.now();
  const result = await runHook(hookName);
  const duration = Date.now() - startTime;
  
  // Measure output size
  const output = result.stdout || '';
  const characters = output.length;
  const tokens = estimateTokens(output);
  
  return { time: duration, characters, tokens };
}

function estimateTokens(text: string): number {
  // Simple estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function extractConfiguredHooks(settings: any): string[] {
  const commands = new Set<string>();
  
  // Extract full commands from all event types (PostToolUse, Stop, etc.)
  for (const eventType in settings.hooks || {}) {
    const eventConfigs = settings.hooks[eventType] || [];
    for (const config of eventConfigs) {
      for (const hook of config.hooks || []) {
        if (hook.command) {
          // Store the full command as configured
          commands.add(hook.command);
        }
      }
    }
  }
  
  return Array.from(commands);
}

async function loadSettings(filePath: string) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function displayResults(results: any[]) {
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
```

**Acceptance Criteria**:
- [ ] profileHooks function handles both specific hook and all hooks
- [ ] Hook discovery reads from .claude/settings.json correctly
- [ ] Measurement captures time, characters, and tokens
- [ ] Multiple iterations calculate averages properly
- [ ] Results display in formatted table
- [ ] Warnings show for slow hooks (>5s)
- [ ] Warnings show for near-limit hooks (>9k chars)
- [ ] Warnings show for over-limit hooks (>10k chars)

### Task 1.3: Wire up profile command imports and exports
**Description**: Connect the profile module to the CLI and ensure proper exports
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1, Task 1.2
**Can run parallel with**: Task 2.1

**Technical Requirements**:
- Import profileHooks in hooks-cli.ts
- Export profileHooks from profile.ts
- Ensure TypeScript compilation works

**Implementation Steps**:
1. Add import statement to `cli/hooks-cli.ts`
2. Ensure profile.ts exports the profileHooks function
3. Verify no TypeScript errors

**Code changes**:
```typescript
// In cli/hooks-cli.ts, add at top with other imports:
import { profileHooks } from './hooks/profile';

// In cli/hooks/profile.ts, ensure export:
export async function profileHooks(hookName?: string, options = { iterations: 1 }) {
  // ... implementation
}
```

**Acceptance Criteria**:
- [ ] No TypeScript compilation errors
- [ ] Command properly calls profileHooks function
- [ ] Module imports resolve correctly

## Phase 2: Testing and Documentation

### Task 2.1: Create comprehensive unit tests
**Description**: Write unit tests for the profile command functionality
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.2
**Can run parallel with**: Task 2.2

**Technical Requirements**:
- Create tests/unit/profile.test.ts
- Test single and multiple iterations
- Test hook selection logic
- Test metrics collection
- Test warning thresholds
- Test error handling

**Test implementation**:
```typescript
// tests/unit/profile.test.ts
import { describe, test, expect, jest } from '@jest/globals';
import { profileHooks, measureHook, extractConfiguredHooks, truncateMiddle, estimateTokens } from '../../cli/hooks/profile';

describe('Profile Command', () => {
  // Verify profile executes hooks
  test('runs single iteration by default', async () => {
    const mockRunHook = jest.fn().mockResolvedValue({
      stdout: 'test output',
      stderr: '',
      exitCode: 0
    });
    
    jest.spyOn(global, 'runHook').mockImplementation(mockRunHook);
    
    await profileHooks('test-hook');
    
    expect(mockRunHook).toHaveBeenCalledTimes(1);
    expect(mockRunHook).toHaveBeenCalledWith('test-hook');
  });
  
  test('runs multiple iterations when specified', async () => {
    const mockRunHook = jest.fn().mockResolvedValue({
      stdout: 'test output',
      stderr: '',
      exitCode: 0
    });
    
    jest.spyOn(global, 'runHook').mockImplementation(mockRunHook);
    
    await profileHooks('test-hook', { iterations: 3 });
    
    expect(mockRunHook).toHaveBeenCalledTimes(3);
  });
  
  // Verify hook selection
  test('profiles all hooks when no name provided', async () => {
    const mockSettings = {
      hooks: {
        PostToolUse: [{
          hooks: [
            { command: 'claudekit-hooks run lint-changed' },
            { command: 'claudekit-hooks run typecheck-changed' }
          ]
        }]
      }
    };
    
    jest.spyOn(global, 'loadSettings').mockResolvedValue(mockSettings);
    
    const hooks = await extractConfiguredHooks(mockSettings);
    
    expect(hooks).toContain('claudekit-hooks run lint-changed');
    expect(hooks).toContain('claudekit-hooks run typecheck-changed');
    expect(hooks.length).toBe(2);
  });
  
  test('profiles specific hook when name provided', async () => {
    const mockRunHook = jest.fn().mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0
    });
    
    jest.spyOn(global, 'runHook').mockImplementation(mockRunHook);
    
    await profileHooks('specific-hook');
    
    expect(mockRunHook).toHaveBeenCalledWith('specific-hook');
  });
  
  // Verify metrics collection
  test('measures execution time', async () => {
    const result = await measureHook('test-hook');
    
    expect(result).toHaveProperty('time');
    expect(typeof result.time).toBe('number');
    expect(result.time).toBeGreaterThanOrEqual(0);
  });
  
  test('measures output characters', async () => {
    const mockRunHook = jest.fn().mockResolvedValue({
      stdout: 'test output with 25 chars',
      stderr: '',
      exitCode: 0
    });
    
    jest.spyOn(global, 'runHook').mockImplementation(mockRunHook);
    
    const result = await measureHook('test-hook');
    
    expect(result.characters).toBe(25);
  });
  
  test('estimates output tokens', async () => {
    expect(estimateTokens('1234')).toBe(1); // 4 chars = 1 token
    expect(estimateTokens('12345')).toBe(2); // 5 chars = 2 tokens (rounded up)
    expect(estimateTokens('12345678')).toBe(2); // 8 chars = 2 tokens
    expect(estimateTokens('123456789')).toBe(3); // 9 chars = 3 tokens (rounded up)
  });
  
  test('warns when output exceeds 9000 characters', () => {
    const results = [{
      hookName: 'test-hook',
      time: 1000,
      characters: 9500,
      tokens: 2375
    }];
    
    // This would be tested by checking console output
    // Implementation would need spy on console.log
    const consoleSpy = jest.spyOn(console, 'log');
    displayResults(results);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Near UserPromptSubmit limit')
    );
  });
  
  test('warns when output exceeds 10000 characters', () => {
    const results = [{
      hookName: 'test-hook',
      time: 1000,
      characters: 15000,
      tokens: 3750
    }];
    
    const consoleSpy = jest.spyOn(console, 'log');
    displayResults(results);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Exceeds UserPromptSubmit limit')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WILL BE TRUNCATED')
    );
  });
  
  // Verify failed hooks are skipped
  test('handles hook failures gracefully', async () => {
    const mockRunHook = jest.fn()
      .mockRejectedValueOnce(new Error('Hook failed'))
      .mockResolvedValueOnce({
        stdout: 'success',
        stderr: '',
        exitCode: 0
      });
    
    jest.spyOn(global, 'runHook').mockImplementation(mockRunHook);
    
    // Should continue to next hook after failure
    await profileHooks();
    
    expect(mockRunHook).toHaveBeenCalledTimes(2);
  });
  
  // Test truncateMiddle utility
  test('truncateMiddle handles various string lengths', () => {
    expect(truncateMiddle('short', 40)).toBe('short');
    expect(truncateMiddle('a'.repeat(50), 40)).toMatch(/^a+\.\.\.a+$/);
    expect(truncateMiddle('a'.repeat(50), 40).length).toBe(40);
  });
});
```

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] Tests cover single and multiple iterations
- [ ] Tests verify hook selection logic
- [ ] Tests validate metrics collection
- [ ] Tests confirm warning thresholds work
- [ ] Tests ensure graceful error handling

### Task 2.2: Update hooks documentation
**Description**: Add performance profiling section to the hooks documentation
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 1.2
**Can run parallel with**: Task 2.1

**Technical Requirements**:
- Update docs/reference/hooks.md
- Add Performance Profiling section
- Document usage examples
- Explain character limits and truncation
- Provide optimization guidance

**Documentation content to add**:
```markdown
## Performance Profiling

The `claudekit-hooks profile` command helps you identify performance bottlenecks and output issues in your hooks.

### Usage

```bash
# Profile all configured hooks
claudekit-hooks profile

# Profile a specific hook
claudekit-hooks profile typecheck-changed

# Run multiple iterations for averaging
claudekit-hooks profile --iterations 5
```

### Understanding the Output

The profile command measures three key metrics:

1. **Time**: Execution duration in milliseconds
2. **Characters**: Total output character count
3. **Tokens**: Estimated token count (approximately 1 token per 4 characters)

### Character Limits and Truncation

UserPromptSubmit hooks have a 10,000 character limit. Output exceeding this limit will be truncated, potentially losing important information.

**Recommendations:**
- Keep hook output under 9,000 characters for safety
- Use self-limiting patterns (like codebase-map's implementation)
- Consider summarizing verbose output
- Use exit codes instead of detailed output when possible

### Performance Optimization Tips

**For Slow Hooks (>5s):**
- Cache results when possible
- Process only changed files
- Run expensive operations asynchronously
- Consider moving to background processes

**For High-Output Hooks:**
- Summarize output instead of full dumps
- Use structured formats (JSON) over verbose text
- Implement pagination or limits
- Return only essential information

### Example Output

```
Hook Performance Profile
────────────────────────────────────────────────────────────────────
Command                                     Time      Characters   Tokens
────────────────────────────────────────────────────────────────────
claudekit-hooks run typecheck-changed      8234ms    9,360        2,340
npm run lint:fix -- $FILE_PATH             567ms     1,800        450
────────────────────────────────────────────────────────────────────

⚠ Performance Issues:
  Slow commands (>5s):
    claudekit-hooks run typecheck-changed (8.2s)
  
  Near UserPromptSubmit limit (>9k chars):
    claudekit-hooks run typecheck-changed (9,360 chars - at risk of truncation)
```
```

**Acceptance Criteria**:
- [ ] Documentation includes usage examples
- [ ] Character limits clearly explained
- [ ] Optimization guidance provided
- [ ] Example output shown
- [ ] Integration with existing docs seamless

## Phase 3: Build and Integration

### Task 3.1: Compile and test the implementation
**Description**: Build the TypeScript code and verify everything works end-to-end
**Size**: Small
**Priority**: High
**Dependencies**: All previous tasks
**Can run parallel with**: None

**Technical Requirements**:
- Run npm run build
- Test the command manually
- Verify no TypeScript errors
- Ensure command appears in help

**Implementation Steps**:
1. Run `npm run build` to compile TypeScript
2. Test `claudekit-hooks profile --help`
3. Test `claudekit-hooks profile` with actual hooks
4. Test `claudekit-hooks profile typecheck-changed`
5. Verify output format matches specification

**Acceptance Criteria**:
- [ ] Build completes without errors
- [ ] Command works with real hooks
- [ ] Output format matches specification
- [ ] Warnings display correctly
- [ ] Help text is accurate

## Summary

**Total Tasks**: 6
**Phase 1 (Foundation)**: 3 tasks
**Phase 2 (Testing/Docs)**: 2 tasks  
**Phase 3 (Integration)**: 1 task

**Parallel Execution Opportunities**:
- Task 1.1 and 1.2 can start in parallel
- Task 2.1 and 2.2 can run in parallel after Phase 1

**Critical Path**:
1. Task 1.1 → Task 1.2 → Task 1.3
2. Task 2.1 (testing) 
3. Task 3.1 (final build and test)

**Recommended Execution Order**:
1. Start with Task 1.1 (CLI command structure)
2. Implement Task 1.2 (core profile module) 
3. Complete Task 1.3 (wiring)
4. Run Tasks 2.1 and 2.2 in parallel
5. Finish with Task 3.1 (build and integration test)