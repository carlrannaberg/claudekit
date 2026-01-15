# Feature Specification: Hook Performance Profile Command

**Title**: Hook Performance Profile Command for claudekit-hooks  
**Status**: Draft  
**Authors**: Claude, 2024-08-23  
**Overview**: Add a performance profiling command to claudekit-hooks that measures and reports hook execution times, output character counts, and output token counts, helping developers identify slow hooks and high-output hooks that impact the Claude Code development experience, UserPromptSubmit character limits, and context window usage.

## Background/Problem Statement

Hooks in claudekit execute various commands internally (linting, type checking, testing, etc.) which can vary significantly in both execution time and output size. When hooks are slow or produce excessive output, they degrade the Claude Code development experience by:
- Adding latency to common operations like file edits
- Consuming valuable context window space with verbose output
- Exceeding the 10,000 character limit for UserPromptSubmit hooks (causing truncation)

Currently, there's no user-facing command to:

1. Measure hook execution performance systematically
2. Identify which hooks are slow and need optimization
3. Identify which hooks produce excessive output that consumes context window
4. Detect hooks that risk exceeding the 10,000 character UserPromptSubmit limit

Developers need visibility into these performance dimensions to optimize their development workflows, stay within character limits, and preserve context window space.

## Goals

- Provide a `claudekit-hooks profile` command to measure hook performance
- Surface slow-running hooks to developers
- Identify hooks with excessive output that consume context window
- Detect hooks approaching or exceeding the 10,000 character UserPromptSubmit limit
- Provide actionable insights for optimization opportunities

## Non-Goals

- Real-time performance monitoring during normal operations
- Modifying the core hook execution engine
- Adding performance overhead to regular hook runs
- Historical comparison or baseline tracking
- CI integration features
- Statistical analysis beyond basic mean/min/max
- Command-level performance breakdown
- Memory usage or resource consumption profiling

## Technical Dependencies

- **Node.js**: >=18.0.0 (existing requirement)
- **Commander.js**: Already used for CLI commands
- No new external dependencies required

## Detailed Design

### Architecture Changes

The feature leverages the existing performance measurement infrastructure without modifying core hook execution:

```
┌─────────────────┐
│  CLI Interface  │
│ benchmark cmd   │
└────────┬────────┘
         │
┌────────▼────────┐
│  HookRunner     │ (existing - already measures timing)
│  - run()        │
└────────┬────────┘
         │
┌────────▼────────┐
│ Benchmark       │ (new - minimal implementation)
│ - measure       │
│ - display       │
└─────────────────┘
```

### Implementation Approach

#### 1. CLI Command Structure

Add to `cli/hooks-cli.ts`:

```typescript
program
  .command('profile [hook]')
  .description('Profile hook performance (time and output)')
  .option('-i, --iterations <n>', 'Number of iterations', '1')
  .action(async (hook, options) => {
    await profileHooks(hook, options);
  });
```

#### 2. Profile Execution Flow

```typescript
async function profileHooks(hookName?: string, options = { iterations: 1 }) {
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
```

#### 3. Hook Discovery

- When no hook name provided: Parse `.claude/settings.json` to find configured hooks
- When specific hook name provided: Profile that hook (even if not configured)
- Falls back to HOOK_REGISTRY for validating hook existence
- No pattern matching or glob support (keep it simple)

#### 4. Error Handling

- Skip hooks that fail or error during benchmark
- Exclude failed iterations from timing statistics
- Continue benchmarking remaining hooks if one fails
- Display which hooks failed but don't include in results

#### 5. Output Format

Simple table output with all metrics:

**Single iteration (default):**
```
Hook Performance Profile
────────────────────────────────────────────────────────────────────────────────────
Command                                     Time      Characters   Tokens
────────────────────────────────────────────────────────────────────────────────────
claudekit-hooks run typecheck-changed      8234ms    9,360        2,340
npm run lint:fix -- $FILE_PATH             567ms     1,800        450
custom-validator --strict --con...json     12340ms   50,000       12,500
claudekit-hooks run codebase-map           1234ms    8,500        2,125
────────────────────────────────────────────────────────────────────────────────────

⚠ Performance Issues:
  Slow commands (>5s):
    claudekit-hooks run typecheck-changed (8.2s)
    custom-validator --strict --con...json (12.3s)
  
  Near UserPromptSubmit limit (>9k chars):
    claudekit-hooks run typecheck-changed (9,360 chars - at risk of truncation)
  
  Exceeds UserPromptSubmit limit (>10k chars):
    custom-validator --strict --con...json (50,000 chars - WILL BE TRUNCATED)
```

**Multiple iterations:**
```
Hook Performance Profile (3 runs averaged)
────────────────────────────────────────────────────────────────────────────────────
Command                                     Time      Characters   Tokens
────────────────────────────────────────────────────────────────────────────────────
claudekit-hooks run typecheck-changed      8245ms    9,361        2,341
npm run lint:fix -- $FILE_PATH             573ms     1,802        451
custom-validator --strict --con...json     12341ms   50,008       12,502
claudekit-hooks run codebase-map           1235ms    8,502        2,126
────────────────────────────────────────────────────────────────────────────────────

⚠ Performance Issues:
  Slow commands (>5s):
    claudekit-hooks run typecheck-changed (8.2s)
    custom-validator --strict --con...json (12.3s)
  
  Near UserPromptSubmit limit (>9k chars):
    claudekit-hooks run typecheck-changed (9,361 chars - at risk of truncation)
  
  Exceeds UserPromptSubmit limit (>10k chars):
    custom-validator --strict --con...json (50,008 chars - WILL BE TRUNCATED)
```

### Code Structure and File Organization

```
cli/
├── hooks-cli.ts              # Add profile command
└── hooks/
    └── profile.ts            # Simple profile implementation (~120 lines)
```

### API Changes

No breaking API changes. Additions only:

**New CLI Commands:**
- `claudekit-hooks profile` - Profile all hooks
- `claudekit-hooks profile <hook>` - Profile specific hook (exact name)

## User Experience

### Basic Usage

```bash
# Profile all configured hooks (from .claude/settings.json)
$ claudekit-hooks profile

# Profile specific hook (even if not configured)
$ claudekit-hooks profile lint-changed
$ claudekit-hooks profile typecheck-changed

# Multiple iterations (optional)
$ claudekit-hooks profile --iterations 3
$ claudekit-hooks profile lint-changed --iterations 5
```

**Note**: By default, `profile` only measures hooks that are actually configured in `.claude/settings.json`. This gives you a realistic view of what's impacting your workflow. When you specify a hook name, it will profile that hook even if it's not configured.

## Testing Strategy

### Minimal Test Coverage

```typescript
// tests/unit/profile.test.ts
describe('Profile Command', () => {
  // Verify profile executes hooks
  test('runs single iteration by default');
  test('runs multiple iterations when specified');
  
  // Verify hook selection
  test('profiles all hooks when no name provided');
  test('profiles specific hook when name provided');
  
  // Verify metrics collection
  test('measures execution time');
  test('measures output characters');
  test('estimates output tokens');
  test('warns when output exceeds 9000 characters');
  test('warns when output exceeds 10000 characters');
  
  // Verify failed hooks are skipped
  test('handles hook failures gracefully');
});
```

## Performance Considerations

- **Zero overhead**: Profile command is separate from normal hook execution
- **Opt-in**: Only runs when explicitly invoked
- **Timeout protection**: Use existing hook timeout mechanisms
- **Token estimation**: Simple character-based estimation (4 chars ≈ 1 token)

## Security Considerations

- No user input is passed directly to shell commands
- Hooks are pre-defined and validated
- No network operations involved

## Documentation

Update `docs/reference/hooks.md`:
- Add "Performance Profiling" section with usage examples
- Document interpretation of results for time, character, and token metrics
- Explain UserPromptSubmit 10,000 character limit and truncation risks
- Provide guidance on optimizing high-output hooks to stay under 9,000 characters
- Recommend using self-limiting patterns like codebase-map's implementation

## Implementation Phase

### Single Phase Implementation

**Objective**: Hook profile command with time, character, and token measurement

**Deliverables**:
- `profile` command in hooks CLI
- Measure execution time, output characters, and output tokens
- Table output with all three metrics
- Support for specific hook or all hooks
- Warnings for slow hooks, high-character output (>9k), and excessive output (>10k)
- Clear indication of UserPromptSubmit truncation risks

**Implementation Steps**:
1. Add command to `cli/hooks-cli.ts`
2. Create `cli/hooks/profile.ts` with ~130 lines of code
3. Add minimal unit tests including character limit warnings
4. Update documentation with character limit guidance

**Estimated LOC**: ~130 lines total

## Open Questions

1. **Default iterations**: Should default be 1 or 3 iterations? (Resolved: 1 for simplicity)

## References

- [claudekit hooks system documentation](../docs/reference/hooks.md)
- [Commander.js documentation](https://github.com/tj/commander.js/)
- Existing implementation files:
  - `cli/hooks/runner.ts` - Hook execution with timing
  - `cli/hooks-cli.ts` - CLI command structure
  - `cli/hooks/registry.ts` - Hook registry for discovery