# Task Breakdown: Embedded Hooks System - POC
Generated: 2025-07-30
Source: specs/feat-embedded-hooks-system-poc.md

## Overview
Minimal implementation of TypeScript-based hooks system for claudekit, validating the concept of a separate binary with configuration support. This POC focuses on implementing a single hook (auto-checkpoint) to prove the architecture works with Claude Code.

## Phase 1: Foundation Setup

### Task 1.1: Create TypeScript hooks POC file structure
**Description**: Set up the basic TypeScript file structure for the hooks POC binary
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None

**Technical Requirements**:
- Create `cli/hooks-poc.ts` file with proper shebang
- Add TypeScript imports for fs, child_process, and path
- Define Config interface for hook configuration
- Set up basic TypeScript compilation

**Implementation Steps**:
1. Create `cli/hooks-poc.ts` with `#!/usr/bin/env node` shebang
2. Add imports: `readFileSync, existsSync` from 'fs', `spawn` from 'child_process', `path`
3. Define Config interface with hooks property containing auto-checkpoint settings
4. Create empty main() function with async structure

**Acceptance Criteria**:
- [ ] File `cli/hooks-poc.ts` exists with proper shebang
- [ ] TypeScript compiles without errors
- [ ] Config interface matches specification structure
- [ ] Basic module structure is in place

### Task 1.2: Update package.json for hooks binary
**Description**: Configure package.json to include the new claudekit-hooks-poc binary
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.3

**Technical Requirements**:
- Add `claudekit-hooks-poc` to bin section
- Add build script for TypeScript compilation
- Configure module and target for ES2022

**Implementation Steps**:
1. Add to bin section: `"claudekit-hooks": "./bin/claudekit-hooks-poc"`
2. Add build script: `"build:hooks-poc": "tsc cli/hooks-poc.ts --outDir dist --module esnext --target es2022"`
3. Ensure existing claudekit binary remains unchanged

**Acceptance Criteria**:
- [ ] package.json includes new binary entry
- [ ] Build script compiles TypeScript correctly
- [ ] Existing claudekit functionality unaffected
- [ ] npm link makes binary available globally

### Task 1.3: Create binary wrapper script
**Description**: Create shell wrapper for the TypeScript hooks binary
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Create `bin/claudekit-hooks-poc` file
- Set up proper node execution with ES module import
- Make file executable

**Implementation Steps**:
1. Create `bin/claudekit-hooks-poc` file
2. Add shebang: `#!/usr/bin/env node`
3. Add import statement: `import('../dist/hooks-poc.js');`
4. Set executable permissions: `chmod +x bin/claudekit-hooks-poc`

**Acceptance Criteria**:
- [ ] Binary wrapper exists in bin directory
- [ ] File has executable permissions
- [ ] Imports compiled JavaScript correctly
- [ ] Can be executed from command line

## Phase 2: Core Implementation

### Task 2.1: Implement stdin reader for Claude Code payload
**Description**: Create async function to read JSON payload from stdin with timeout
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.2

**Technical Requirements**:
- Async function that returns Promise<string>
- Handle data chunks from stdin
- Implement 1-second timeout fallback
- Return empty string on timeout

**Implementation example from spec**:
```typescript
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(''), 1000); // Timeout fallback
  });
}
```

**Acceptance Criteria**:
- [ ] Function reads full stdin input
- [ ] Handles data chunks correctly
- [ ] Times out after 1 second if no input
- [ ] Returns empty string on timeout
- [ ] Works with Claude Code hook payloads

### Task 2.2: Implement configuration loading
**Description**: Load and parse .claudekit/config.json from current directory
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.1

**Technical Requirements**:
- Check for config file in `.claudekit/config.json`
- Parse JSON safely with error handling
- Use default empty config if file missing or invalid
- Only check current directory (no traversal)

**Implementation Steps**:
1. Build config path: `path.join(process.cwd(), '.claudekit/config.json')`
2. Check if file exists with `existsSync`
3. Read and parse JSON in try-catch block
4. Log error and use empty config on parse failure

**Acceptance Criteria**:
- [ ] Loads config from current directory only
- [ ] Handles missing config file gracefully
- [ ] Handles invalid JSON without crashing
- [ ] Returns empty config object as fallback
- [ ] Respects hook-specific configuration

### Task 2.3: Implement auto-checkpoint hook logic
**Description**: Build the complete auto-checkpoint functionality with git integration
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2
**Can run parallel with**: None

**Technical Requirements**:
- Check if current directory is git repository
- Detect uncommitted changes using `git status --porcelain`
- Create timestamped stash with configurable prefix
- Apply stash to restore working directory
- Handle exit codes properly (0 for success, 1 for errors)

**Implementation Steps**:
1. Parse command line to get hook name from `process.argv[2]`
2. Exit with error if hook name isn't "auto-checkpoint"
3. Load configuration and extract hook settings
4. Run `git status --porcelain` to check for changes
5. Create stash with timestamp: `${prefix}-checkpoint-${timestamp}`
6. Apply stash to restore working directory
7. Log success message and exit with code 0

**Acceptance Criteria**:
- [ ] Correctly identifies git repositories
- [ ] Detects uncommitted changes accurately
- [ ] Creates checkpoint with proper naming
- [ ] Restores working directory after stash
- [ ] Exits with code 0 on success, 1 on error
- [ ] Respects configured prefix and maxCheckpoints

## Phase 3: Integration and Testing

### Task 3.1: Create example configuration file
**Description**: Create sample .claudekit/config.json for testing
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 2.3
**Can run parallel with**: Task 3.2

**Technical Requirements**:
- JSON structure matching Config interface
- Example auto-checkpoint configuration
- Default values for prefix and maxCheckpoints

**Implementation example from spec**:
```json
{
  "hooks": {
    "auto-checkpoint": {
      "prefix": "claude",
      "maxCheckpoints": 10
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Valid JSON file in .claudekit directory
- [ ] Contains auto-checkpoint configuration
- [ ] Uses sensible default values
- [ ] Can be parsed by hooks binary

### Task 3.2: Create manual test script
**Description**: Build bash script to validate POC functionality
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 2.3
**Can run parallel with**: Task 3.1

**Technical Requirements**:
- Test script that creates git repo with changes
- Tests checkpoint creation with changes
- Tests no-op when no changes
- Tests configuration loading
- Validates exit codes

**Implementation from spec**:
```bash
#!/bin/bash
# test-poc.sh

# Setup: Create a git repo with changes
git init test-repo
cd test-repo
echo "test content" > file.txt
git add .
git commit -m "initial"
echo "changed" >> file.txt

# Test 1: Auto-checkpoint with changes
claudekit-hooks auto-checkpoint
# Should create a checkpoint

# Test 2: No changes
git stash drop
claudekit-hooks auto-checkpoint  
# Should say "No changes to checkpoint"

# Test 3: With config
mkdir .claudekit
echo '{"hooks": {"auto-checkpoint": {"prefix": "test", "maxCheckpoints": 5}}}' > .claudekit/config.json
echo "another change" >> file.txt
claudekit-hooks auto-checkpoint
# Should create checkpoint with "test" prefix
```

**Acceptance Criteria**:
- [ ] Script creates isolated test environment
- [ ] Tests all three scenarios from spec
- [ ] Validates checkpoint creation
- [ ] Confirms configuration is respected
- [ ] Cleans up test artifacts

### Task 3.3: Configure Claude Code integration
**Description**: Create Claude Code settings.json for hook integration
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: None

**Technical Requirements**:
- Create .claude/settings.json example
- Configure Stop hook with auto-checkpoint
- Use proper matcher syntax ("*")
- Reference claudekit-hooks binary

**Implementation example from spec**:
```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [{"type": "command", "command": "claudekit-hooks auto-checkpoint"}]
      }
    ]
  }
}
```

**Acceptance Criteria**:
- [ ] Valid Claude Code settings structure
- [ ] Hook triggers on Stop event
- [ ] Uses correct binary name
- [ ] Matcher accepts all events
- [ ] Can be used in real Claude Code session

## Phase 4: Build and Validation

### Task 4.1: Compile TypeScript and test binary execution
**Description**: Build the TypeScript code and verify binary works
**Size**: Small
**Priority**: High
**Dependencies**: All Phase 1-3 tasks
**Can run parallel with**: None

**Technical Requirements**:
- Run build:hooks-poc script
- Verify dist/hooks-poc.js is created
- Test binary execution directly
- Ensure proper error handling

**Implementation Steps**:
1. Run `npm run build:hooks-poc`
2. Check that `dist/hooks-poc.js` exists
3. Test direct execution: `./bin/claudekit-hooks-poc auto-checkpoint`
4. Verify error message for unknown hooks
5. Test with no git repository

**Acceptance Criteria**:
- [ ] TypeScript compiles without errors
- [ ] Binary executes without Node errors
- [ ] Proper error for unknown hooks
- [ ] Graceful handling of non-git directories
- [ ] Exit codes match specification

### Task 4.2: Validate POC success criteria
**Description**: Confirm all POC goals are met
**Size**: Small
**Priority**: High
**Dependencies**: Task 4.1
**Can run parallel with**: None

**POC Success Criteria from spec**:
1. Can execute as separate binary
2. Can read Claude Code JSON from stdin
3. Can load and respect configuration
4. Returns proper exit codes (0, 2)
5. Works with Claude Code hooks

**Validation Steps**:
1. Test binary execution: `claudekit-hooks auto-checkpoint`
2. Test stdin reading: `echo '{}' | claudekit-hooks auto-checkpoint`
3. Test config loading with different settings
4. Verify exit code 0 on success, 1 on error
5. Test integration with Claude Code Stop hook

**Acceptance Criteria**:
- [ ] All 5 POC criteria validated
- [ ] Document any limitations found
- [ ] Confirm readiness for full implementation
- [ ] Create summary of lessons learned

## Summary

**Total Tasks**: 11
**Phase Breakdown**:
- Phase 1 (Foundation): 3 tasks
- Phase 2 (Core Implementation): 3 tasks
- Phase 3 (Integration): 3 tasks
- Phase 4 (Build and Validation): 2 tasks

**Estimated Complexity**: 1-2 hours total (as specified in POC)

**Parallel Execution Opportunities**:
- Task 1.2 and 1.3 can run in parallel after 1.1
- Task 2.1 and 2.2 can run in parallel
- Task 3.1 and 3.2 can run in parallel

**Critical Path**:
1.1 → 1.2/1.3 → 2.1/2.2 → 2.3 → 3.3 → 4.1 → 4.2

**Risk Areas**:
- Git command execution and exit code handling
- Stdin timeout behavior with Claude Code
- Configuration file parsing errors
- Binary compilation and module loading

This POC implementation focuses on proving the concept works before investing in the full architecture with multiple hooks, proper error handling, and production features.