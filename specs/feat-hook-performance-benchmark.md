# Feature Specification: Hook Performance Benchmark Command

**Title**: Hook Performance Benchmark Command for claudekit-hooks  
**Status**: Draft  
**Authors**: Claude, 2024-08-23  
**Overview**: Add a performance measurement command to claudekit-hooks that measures and reports hook execution times, helping developers identify slow hooks that impact the Claude Code development experience.

## Background/Problem Statement

Hooks in claudekit execute various commands internally (linting, type checking, testing, etc.) which can vary significantly in execution time. When hooks are slow, they degrade the Claude Code development experience by adding latency to common operations like file edits. Currently, there's no user-facing command to:

1. Measure hook execution performance systematically
2. Identify which hooks are slow and need optimization

Developers need visibility into hook performance to optimize their development workflows and ensure responsive Claude Code interactions.

## Goals

- Provide a `claudekit-hooks benchmark` command to measure hook execution times
- Surface slow-running hooks to developers
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
  .command('benchmark [pattern]')
  .description('Measure hook execution performance')
  .option('-i, --iterations <n>', 'Number of test iterations', '3')
  .action(async (pattern, options) => {
    await benchmarkHooks(pattern, options);
  });
```

#### 2. Benchmark Execution Flow

```typescript
async function benchmarkHooks(pattern?: string, options = { iterations: 3 }) {
  // 1. Discover hooks using HOOK_REGISTRY
  const hooks = discoverHooks(pattern);
  
  // 2. Execute benchmark iterations
  const results = [];
  for (const hook of hooks) {
    const timings = [];
    for (let i = 0; i < options.iterations; i++) {
      const time = await measureHook(hook);
      if (time !== null) timings.push(time);
    }
    
    if (timings.length > 0) {
      results.push({
        hookName: hook,
        timings,
        mean: average(timings),
        min: Math.min(...timings),
        max: Math.max(...timings)
      });
    }
  }
  
  // 3. Display simple table
  displayTable(results);
}
```

#### 3. Hook Discovery

Use existing `HOOK_REGISTRY` from `cli/hooks/registry.ts`:
- Return all hooks if no pattern provided
- Support simple glob patterns (e.g., `*-changed`, `lint-*`)
- Filter hooks based on pattern matching

#### 4. Error Handling

- Skip hooks that fail or error during benchmark
- Exclude failed iterations from timing statistics
- Continue benchmarking remaining hooks if one fails
- Display which hooks failed but don't include in results

#### 5. Output Format

Simple table output only:

```
Hook Performance Results
──────────────────────────────────────────────────────────
Hook                          Runs    Mean      Min       Max
──────────────────────────────────────────────────────────
typecheck-changed             3       1234ms    1100ms    1400ms
lint-changed                  3       567ms     500ms     650ms
test-changed                  3       2340ms    2200ms    2500ms
──────────────────────────────────────────────────────────

⚠ Slow hooks detected (>1s):
  - typecheck-changed: 1234ms
  - test-changed: 2340ms
```

### Code Structure and File Organization

```
cli/
├── hooks-cli.ts              # Add benchmark command
└── hooks/
    └── benchmark.ts          # Simple benchmark implementation (~150 lines)
```

### API Changes

No breaking API changes. Additions only:

**New CLI Commands:**
- `claudekit-hooks benchmark` - Run all hooks benchmark
- `claudekit-hooks benchmark <pattern>` - Benchmark specific hooks

## User Experience

### Basic Usage

```bash
# Benchmark all hooks
$ claudekit-hooks benchmark

# Benchmark specific hooks
$ claudekit-hooks benchmark lint-changed

# Benchmark with pattern
$ claudekit-hooks benchmark "*-changed"

# Custom iterations
$ claudekit-hooks benchmark --iterations 5
```

## Testing Strategy

### Minimal Test Coverage

```typescript
// tests/unit/benchmark.test.ts
describe('Benchmark Command', () => {
  // Verify benchmark executes hooks
  test('runs specified iterations');
  
  // Verify pattern matching works
  test('filters hooks by pattern');
  
  // Verify failed hooks are skipped
  test('handles hook failures gracefully');
});
```

## Performance Considerations

- **Zero overhead**: Benchmark command is separate from normal hook execution
- **Opt-in**: Only runs when explicitly invoked
- **Timeout protection**: Use existing hook timeout mechanisms

## Security Considerations

- No user input is passed directly to shell commands
- Hooks are pre-defined and validated
- No network operations involved

## Documentation

Update `docs/reference/hooks.md`:
- Add "Performance Benchmarking" section with usage examples
- Document interpretation of results

## Implementation Phase

### Single Phase Implementation

**Objective**: Basic benchmark command with timing measurement

**Deliverables**:
- `benchmark` command in hooks CLI
- Run hooks N times and measure execution
- Basic table output with min/mean/max times
- Support for hook pattern filtering

**Implementation Steps**:
1. Add command to `cli/hooks-cli.ts`
2. Create `cli/hooks/benchmark.ts` with ~150 lines of code
3. Add minimal unit tests
4. Update documentation

**Estimated LOC**: ~150-200 lines total

## Open Questions

1. **Default iterations**: Should default be 3 or 5 iterations? (Proposed: 3)

2. **Hook filtering**: Use glob patterns to match existing CLI patterns? (Proposed: Yes)

## References

- [claudekit hooks system documentation](../docs/reference/hooks.md)
- [Commander.js documentation](https://github.com/tj/commander.js/)
- Existing implementation files:
  - `cli/hooks/runner.ts` - Hook execution with timing
  - `cli/hooks-cli.ts` - CLI command structure
  - `cli/hooks/registry.ts` - Hook registry for discovery