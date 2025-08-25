# Hook Performance Profiling Guide

## Problem Statement

Hooks in claudekit execute various commands internally (linting, type checking, testing, etc.) which can vary significantly in both execution time and output size. When hooks are slow or produce excessive output, they degrade the Claude Code development experience by:

- **Adding latency** to common operations like file edits
- **Consuming valuable context window space** with verbose output
- **Exceeding the 10,000 character limit** for UserPromptSubmit hooks (causing truncation)

This guide shows you how to use the `claudekit-hooks profile` command to:
1. Measure hook execution performance systematically
2. Identify which hooks are slow and need optimization
3. Identify which hooks produce excessive output that consumes context window
4. Detect hooks that risk exceeding the 10,000 character UserPromptSubmit limit

## Quick Start

```bash
# Profile all hooks in your project
claudekit-hooks profile

# Profile a specific hook
claudekit-hooks profile typecheck-changed

# Run multiple iterations for accurate averages
claudekit-hooks profile --iterations 5
```

## Understanding the Output

The profiling command produces a table showing three critical metrics:

```
Hook Performance Profile
────────────────────────────────────────────────────────────────────────────────────
Command                                     Time      Characters   Tokens
────────────────────────────────────────────────────────────────────────────────────
file-guard                                   80ms       228          57
typecheck-changed                            2661ms     65           17
lint-changed                                 2022ms     68           17
check-todos                                  87ms       313          79
test-project                                 14109ms    23956        5989
codebase-map                                 1500ms     8763         2191
────────────────────────────────────────────────────────────────────────────────────
```

### Visual Indicators

The profiler uses color coding to highlight performance issues:

- **Red text**: Critical issues requiring immediate attention
  - Execution time > 5 seconds (any hook)
  - UserPromptSubmit hooks > 10,000 characters (will be truncated)
- **Yellow text**: Warning level (UserPromptSubmit hooks only)
  - Character count between 9,000-10,000 (approaching truncation limit)
  - Only applies to `codebase-map` and `thinking-level` hooks

### Metric Breakdown

#### Time (Execution Duration)
- **Unit**: Milliseconds (ms)
- **Impact**: Direct latency added to operations
- **Thresholds**:
  - ✅ Good: < 2000ms for file change hooks
  - ⚠️ Warning: 2000-5000ms
  - 🔴 Critical: > 5000ms (shown in red)

#### Characters (Output Size)
- **Unit**: Character count
- **Impact**: Context window consumption and potential truncation
- **Thresholds for UserPromptSubmit hooks**:
  - ✅ Good: < 9,000 characters
  - ⚠️ Warning: 9,000-10,000 characters (shown in yellow)
  - 🔴 Critical: > 10,000 characters (shown in red, WILL BE TRUNCATED)
- **Note**: Only UserPromptSubmit hooks (codebase-map, thinking-level) have character limits

#### Tokens (Estimated)
- **Calculation**: Characters ÷ 4 (approximate)
- **Impact**: Claude API token consumption
- **Use**: Estimate context window usage

## Identifying Performance Issues

### Slow Hooks (>5s)

**Problem**: Hooks taking more than 5 seconds create noticeable delays in your workflow.

**How to identify**:
```bash
claudekit-hooks profile
# Look for hooks shown in red or listed under "Performance Issues"
```

**Common culprits**:
- `test-project`: Running entire test suites
- `lint-project`: Analyzing entire codebase
- `typecheck-project`: Full TypeScript compilation

**Solutions**:
1. Switch to `-changed` variants that only process modified files
2. Implement caching for expensive operations
3. Use incremental builds where available
4. Reduce scope with configuration

### Excessive Output Hooks

**Problem**: Hooks producing thousands of characters consume valuable context window.

**How to identify**:
```bash
claudekit-hooks profile
# Check the "Characters" column for high values
```

**Risk levels**:
- **Low risk** (< 5,000 chars): Acceptable for most hooks
- **Medium risk** (5,000-9,000 chars): Monitor for UserPromptSubmit hooks
- **High risk** (> 9,000 chars): Will be truncated if UserPromptSubmit
- **Critical** (> 10,000 chars): WILL BE TRUNCATED

**Solutions**:
1. Summarize output instead of full dumps
2. Use structured formats (JSON, tables)
3. Implement output limiting
4. Return only actionable information

## Hook Categories and Limits

### PostToolUse Hooks
These run after file modifications (Edit, Write, MultiEdit):
- **Examples**: typecheck-changed, lint-changed, test-changed
- **Character limit**: None (but should minimize for context preservation)
- **Time target**: < 2000ms

### Stop Hooks
These run when Claude Code stops or conversation ends:
- **Examples**: check-todos, self-review, test-project
- **Character limit**: None (but should minimize for context preservation)
- **Time target**: < 5000ms

### UserPromptSubmit Hooks
These inject context into user prompts:
- **Examples**: codebase-map, thinking-level
- **Character limit**: 10,000 (HARD LIMIT - truncated beyond this)
- **Time target**: < 2000ms
- **Critical**: Keep under 9,000 characters for safety

## Optimization Strategies

### For Slow Hooks

#### 1. Use Incremental Processing
```bash
# Instead of full project validation
lint-project  # Slow: checks entire codebase

# Use targeted validation
lint-changed  # Fast: only checks modified files
```

#### 2. Implement Caching
```typescript
// Example: Cache TypeScript build info
const cacheFile = '.tscache';
if (fs.existsSync(cacheFile)) {
  // Use cached results if files haven't changed
}
```

#### 3. Configure Tool Options
```json
// .claudekit/config.json
{
  "hooks": {
    "test-project": {
      "command": "npm test -- --bail --maxWorkers=2"
    }
  }
}
```

### For High-Output Hooks

#### 1. Implement Output Limiting
```typescript
// Pattern used in codebase-map hook
const MAX_OUTPUT = 9000; // Stay under 10k limit
if (output.length > MAX_OUTPUT) {
  output = output.substring(0, MAX_OUTPUT - 50) + '\n[Truncated]';
}
```

#### 2. Use Summaries Instead of Full Output
```typescript
// Instead of dumping all test results
return fullTestOutput; // Bad: could be thousands of lines

// Return summary
return {
  passed: 45,
  failed: 2,
  failures: ['test-auth.spec.ts', 'test-api.spec.ts']
}; // Good: concise, actionable
```

#### 3. Filter Irrelevant Information
```typescript
// Only show errors and warnings, not success messages
const errors = results.filter(r => r.level === 'error');
return errors.length > 0 ? formatErrors(errors) : 'All checks passed';
```

## Practical Examples

### Example 1: Diagnosing Slow Development Experience

**Symptom**: "Claude Code feels sluggish when editing TypeScript files"

**Investigation**:
```bash
claudekit-hooks profile typecheck-changed lint-changed
```

**Result**:
```
typecheck-changed    5821ms    1250    313
lint-changed         3200ms     850    213
```

**Solution**: Both hooks are slow. Configure incremental TypeScript checking and parallel ESLint.

### Example 2: Context Window Exhaustion

**Symptom**: "Claude seems to forget context quickly"

**Investigation**:
```bash
claudekit-hooks profile
```

**Result**:
```
codebase-map    1500ms    9500    2375  # Near limit!
test-project    8000ms   15000    3750  # Excessive output
```

**Solution**: 
- Configure codebase-map to exclude large directories
- Limit test-project output to failures only

### Example 3: Truncated Hook Output

**Symptom**: "Codebase map seems incomplete"

**Investigation**:
```bash
claudekit-hooks profile codebase-map
```

**Result**:
```
codebase-map    1600ms    12000    3000  # OVER LIMIT - will truncate!
```

**Solution**: Configure exclusions in `.claudekit/config.json`:
```json
{
  "hooks": {
    "codebase-map": {
      "exclude": ["node_modules", "dist", "coverage", "**/*.test.ts"]
    }
  }
}
```

## Testing Hook Improvements

After optimizing hooks, verify improvements:

```bash
# Before optimization
claudekit-hooks profile slow-hook
# slow-hook    8500ms    5000    1250

# After optimization
claudekit-hooks profile slow-hook  
# slow-hook    1200ms    500     125

# Test with multiple iterations for consistency
claudekit-hooks profile slow-hook --iterations 5
```

## Best Practices

### 1. Regular Profiling
Run profiling periodically, especially after:
- Adding new hooks
- Updating tool configurations
- Project growth

### 2. Set Performance Budgets
Establish targets for your team:
- No PostToolUse hook > 2000ms
- No Stop hook > 5000ms
- No UserPromptSubmit hook > 9000 characters

### 3. Monitor Trends
Track performance over time:
```bash
# Save baseline
claudekit-hooks profile > baseline.txt

# Compare after changes
claudekit-hooks profile > current.txt
diff baseline.txt current.txt
```

### 4. Prioritize User Experience
Focus optimization on hooks that:
- Run frequently (PostToolUse hooks on common file types)
- Block user actions (PreToolUse hooks)
- Provide critical feedback (validation hooks)

## Troubleshooting

### "My hook shows 0 characters but I know it produces output"

If a hook shows 0 characters during profiling, it typically means one of:

1. **Designed to be silent**: `codebase-map-update` always runs silently in the background
2. **No issues found**: The hook ran successfully but found no problems to report
3. **Hook not applicable**: The hook's conditions weren't met in the test scenario

This is normal behavior - many hooks only produce output when they detect issues

### "Profiling takes too long"

Profile specific hooks instead of all:
```bash
# Instead of profiling everything
claudekit-hooks profile

# Profile only what you need
claudekit-hooks profile typecheck-changed lint-changed
```

### "Results vary between runs"

Use multiple iterations for more stable results:
```bash
claudekit-hooks profile --iterations 5
```

This averages results across runs, smoothing out variance from:
- System load
- Cache states
- Network latency (for hooks that fetch dependencies)

## Summary

The `claudekit-hooks profile` command is essential for maintaining a responsive Claude Code development experience. Regular profiling helps you:

1. **Identify performance bottlenecks** before they impact productivity
2. **Prevent context window exhaustion** from verbose hooks
3. **Avoid truncation** of critical UserPromptSubmit hook output
4. **Optimize the right hooks** based on actual measurements

Remember: Fast, concise hooks lead to a better development experience. Profile regularly, optimize systematically, and keep your hooks lean and efficient.