# Improvements for /spec:decompose Command

Generated: 2025-07-31

## Problem Analysis

The `/spec:decompose` command already has excellent instructions for preserving full implementation details when creating STM tasks, but these instructions are sometimes not followed correctly by AI assistants. The key issues are:

1. **Instructions are buried** - The critical requirement to preserve ALL content is mentioned multiple times but could be more prominent
2. **Example complexity** - The heredoc examples are good but complex, which might lead to shortcuts
3. **Enforcement** - There's no validation that the created tasks actually contain the full content

## Suggested Improvements

### 1. Add Pre-Flight Check

Add a section before task creation that explicitly checks understanding:

```markdown
## Pre-Flight Checklist for Claude

Before creating any STM tasks, confirm understanding:
- [ ] I will NOT summarize or condense any code blocks
- [ ] I will include COMPLETE implementations from the spec
- [ ] I will use heredocs or temp files for multi-line content
- [ ] I will preserve ALL technical details, not just references

**WARNING**: If you find yourself writing "as specified in the spec" or "from specification" without the actual code, STOP and include the full content.
```

### 2. Add Validation Step

Add a validation section after task creation:

```markdown
## Post-Creation Validation

After creating STM tasks, verify:
1. Run `stm show [task-id]` for a sample task
2. Check that the --details field contains:
   - Complete code blocks (not summaries)
   - All function implementations
   - Full configuration examples
3. If any task contains phrases like "as per spec" or "see specification", it's incomplete
```

### 3. Simplify the Examples

Add a simpler example that shows the common mistake vs correct approach:

```markdown
## Common Mistakes vs Correct Approach

❌ **WRONG - Summarizing**:
```bash
stm add "Implement readStdin function" \
  --description "Add stdin reading with timeout" \
  --details "Create readStdin() function as specified in the spec with 1-second timeout" \
  --validation "Function returns Promise<string> and has timeout"
```

✅ **CORRECT - Full Implementation**:
```bash
stm add "Implement readStdin function" \
  --description "Add stdin reading with timeout" \
  --details "$(cat <<'EOF'
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(''), 1000); // Timeout fallback
  });
}

Key implementation notes:
- Returns Promise<string>
- Accumulates data chunks from stdin
- 1-second timeout fallback
- Returns empty string on timeout
EOF
)" \
  --validation "$(cat <<'EOF'
- [ ] Function returns Promise<string>
- [ ] Accumulates data chunks correctly
- [ ] Resolves on stdin end event
- [ ] Has 1-second timeout fallback
- [ ] Returns empty string on timeout
EOF
)"
```
```

### 4. Add Content Size Guidance

Add explicit guidance about when to use different methods:

```markdown
## Content Size Guidelines

- **Small content (< 10 lines)**: Can use inline with proper escaping
- **Medium content (10-100 lines)**: Use heredocs as shown
- **Large content (> 100 lines)**: Use temporary files
- **With code blocks**: ALWAYS use heredocs or files to preserve formatting

Remember: It's better to have too much detail than too little!
```

### 5. Add a Warning Banner

Add a prominent warning at the top of the task creation section:

```markdown
## ⚠️ CRITICAL: Preserve ALL Content

When creating STM tasks, you MUST include:
- 🔹 COMPLETE code implementations (not "implement X as in spec")
- 🔹 FULL technical requirements (not "requirements from spec")
- 🔹 ALL configuration examples (not "use config from spec")
- 🔹 ENTIRE acceptance criteria (not "criteria as specified")

If you're summarizing or referencing the spec instead of copying content, you're doing it wrong!
```

### 6. Add Task Quality Check Command

Consider adding a companion command or section:

```markdown
## Verify Task Quality

After decomposition, run these checks:
```bash
# Check if any task is missing implementation details
stm list --format json | jq '.[] | select(.details | length < 200) | .title'

# Look for summary phrases that indicate missing content
stm grep "as specified|from spec|see specification|as per"
```

If these return results, the decomposition likely omitted critical details.
```

### 7. Enhanced Success Criteria

Make the success criteria more explicit about content preservation:

```markdown
## Success Criteria

The decomposition is complete when:
- ✅ Task breakdown document is saved to specs directory
- ✅ All tasks are created in STM with:
  - **--description**: Brief what & why (1-2 sentences) ✓
  - **--details**: Contains actual code, not references ✓
    - Includes complete function bodies
    - Has full configuration examples
    - Contains all technical specifications
    - Minimum 100+ characters for implementation tasks
  - **--validation**: Lists all test scenarios ✓
- ✅ Running `stm show [any-task-id]` shows complete implementation
- ✅ No task contains phrases like "as in spec" or "from specification"
```

## Implementation Example

Here's how the improved command would ensure proper task creation:

1. **Pre-check**: Assistant confirms understanding of full content preservation
2. **Creation**: Uses heredocs/files for all multi-line content
3. **Validation**: Checks a sample task to ensure it contains actual code
4. **Quality check**: Searches for summary phrases that indicate missing content

## Summary

The `/spec:decompose` command already has good instructions, but they need to be:
1. More prominent and repeated
2. Validated with checks
3. Illustrated with clear wrong vs right examples
4. Enforced through quality checks

These improvements would help ensure that task decomposition preserves all the valuable implementation details from the specifications.