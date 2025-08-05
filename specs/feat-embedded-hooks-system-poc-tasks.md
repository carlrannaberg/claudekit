# Task Breakdown: Embedded Hooks System - POC
Generated: 2025-07-30
Source: specs/feat-embedded-hooks-system-poc.md

## Overview
Implementation of a minimal proof-of-concept for TypeScript-based hooks in claudekit, demonstrating the core concept of a separate binary with configuration support and Claude Code integration. The POC focuses on a single hook (auto-checkpoint) to validate the architecture before full implementation.

## Phase 1: Foundation & Project Structure

### Task 1.1: Create new TypeScript CLI file structure
**Description**: Set up the new hooks-poc.ts file and binary wrapper in the existing claudekit project
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Create `cli/hooks-poc.ts` with proper shebang
- Create `bin/claudekit-hooks-poc` binary wrapper
- Set executable permissions on both files
- TypeScript target: es2022, module: esnext

**Implementation Steps**:
1. Create `cli/hooks-poc.ts` with `#!/usr/bin/env node` shebang
2. Create `bin/claudekit-hooks-poc` wrapper that imports the compiled dist file
3. Ensure both files have executable permissions (chmod +x)

**Acceptance Criteria**:
- [ ] cli/hooks-poc.ts file exists with proper shebang
- [ ] bin/claudekit-hooks-poc wrapper exists and imports '../dist/hooks-poc.js'
- [ ] Both files have executable permissions
- [ ] Files follow existing claudekit conventions

### Task 1.2: Update package.json for new binary
**Description**: Modify the existing package.json to include the new hooks binary and build script
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1

**Technical Requirements**:
- Add new binary entry for claudekit-hooks
- Add build script for the POC
- Maintain existing claudekit binary and scripts

**Implementation from specification**:
```json
{
  "bin": {
    "claudekit": "./bin/claudekit",
    "claudekit-hooks": "./bin/claudekit-hooks-poc"
  },
  "scripts": {
    "build:hooks-poc": "tsc cli/hooks-poc.ts --outDir dist --module esnext --target es2022"
  }
}
```

**Acceptance Criteria**:
- [ ] package.json includes both binaries in "bin" section
- [ ] build:hooks-poc script added to scripts section
- [ ] TypeScript compilation configured with correct options
- [ ] Existing package.json structure preserved

### Task 1.3: Create configuration directory and sample config
**Description**: Set up .claudekit directory with sample configuration for the POC
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 1.1, Task 1.2

**Technical Requirements**:
- Create `.claudekit/` directory in project root
- Create sample `config.json` with auto-checkpoint configuration
- Document configuration structure

**Implementation from specification**:
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

**Directory structure**:
```
claudekit/
├── .claudekit/              # NEW: Hook configuration
│   └── config.json          # NEW: POC config file
```

**Acceptance Criteria**:
- [ ] .claudekit directory exists in project root
- [ ] config.json file contains valid JSON with auto-checkpoint settings
- [ ] Configuration includes prefix and maxCheckpoints fields
- [ ] File is properly formatted and valid JSON

## Phase 2: Core Implementation

### Task 2.1: Implement hooks-poc.ts with TypeScript interfaces
**Description**: Create the main TypeScript file with config interface and basic structure
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: None

**Technical Requirements**:
- Define Config interface for type safety
- Import required Node.js modules (fs, child_process, path)
- Set up main async function structure
- Handle command-line arguments

**Implementation from specification**:
```typescript
// cli/hooks-poc.ts
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

// Simple config interface
interface Config {
  hooks?: {
    'auto-checkpoint'?: {
      prefix?: string;
      maxCheckpoints?: number;
    };
  };
}

// Main execution
async function main() {
  const hookName = process.argv[2];
  
  if (hookName !== 'auto-checkpoint') {
    console.error(`Unknown hook: ${hookName}`);
    process.exit(1);
  }
  
  // Implementation continues in next tasks...
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Acceptance Criteria**:
- [ ] TypeScript interfaces properly defined
- [ ] Main function with async/await pattern
- [ ] Command-line argument parsing for hook name
- [ ] Error handling for unknown hooks with exit code 1
- [ ] Fatal error catching with appropriate message

### Task 2.2: Implement stdin reading functionality
**Description**: Add the readStdin function to handle Claude Code JSON payload input
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.3

**Technical Requirements**:
- Asynchronous stdin reading
- Timeout fallback of 1 second
- Return empty string on timeout
- Handle data chunks properly

**Implementation from specification**:
```typescript
// Read stdin payload
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
- [ ] Function returns Promise<string>
- [ ] Accumulates data chunks correctly
- [ ] Resolves on stdin end event
- [ ] Has 1-second timeout fallback
- [ ] Returns empty string on timeout

### Task 2.3: Implement configuration loading logic
**Description**: Add configuration file loading with error handling in the main function
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.2

**Technical Requirements**:
- Load config from `.claudekit/config.json` in current directory
- Handle missing config file gracefully
- Parse JSON with error handling
- Extract hook-specific configuration with defaults

**Implementation from specification**:
```typescript
// Load config if exists
let config: Config = {};
const configPath = path.join(process.cwd(), '.claudekit/config.json');
if (existsSync(configPath)) {
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error('Invalid config file');
  }
}

// Get hook config
const hookConfig = config.hooks?.['auto-checkpoint'] || {};
const prefix = hookConfig.prefix || 'claude';
const maxCheckpoints = hookConfig.maxCheckpoints || 10;
```

**Acceptance Criteria**:
- [ ] Checks for config file in current working directory only
- [ ] Handles missing file without errors
- [ ] Catches and reports JSON parse errors
- [ ] Extracts auto-checkpoint configuration
- [ ] Uses default values: prefix='claude', maxCheckpoints=10
- [ ] No project root traversal (POC limitation)

### Task 2.4: Implement auto-checkpoint hook logic
**Description**: Build the complete auto-checkpoint functionality with git integration
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.1, Task 2.3
**Can run parallel with**: None

**Technical Requirements**:
- Check if current directory is git repository
- Detect uncommitted changes using git status --porcelain
- Create timestamped stash with configurable prefix
- Apply stash to restore working directory
- Handle exit codes properly

**Implementation from specification**:
```typescript
// Check if git repo
const gitStatus = spawn('git', ['status', '--porcelain'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
gitStatus.stdout.on('data', (data) => stdout += data);

gitStatus.on('close', (code) => {
  if (code !== 0) {
    console.log('Not a git repository, skipping checkpoint');
    process.exit(0);
  }
  
  // Check if there are changes
  if (!stdout.trim()) {
    console.log('No changes to checkpoint');
    process.exit(0);
  }
  
  // Create checkpoint
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const message = `${prefix}-checkpoint-${timestamp}`;
  
  const stash = spawn('git', ['stash', 'push', '-m', message], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  stash.on('close', (stashCode) => {
    if (stashCode !== 0) {
      console.error('Failed to create checkpoint');
      process.exit(1);
    }
    
    // Apply stash to restore working directory
    spawn('git', ['stash', 'apply'], {
      stdio: 'ignore'
    }).on('close', () => {
      console.log(`✅ Checkpoint created: ${message}`);
      process.exit(0);
    });
  });
});
```

**Key implementation notes**:
- Use child_process.spawn for git commands
- Capture stdout to check for changes
- Generate ISO timestamp and sanitize for git message
- Chain git stash push and apply operations
- Exit code 0 for success/skip, 1 for errors

**Acceptance Criteria**:
- [ ] Correctly identifies git repositories
- [ ] Detects uncommitted changes using git status --porcelain
- [ ] Creates checkpoint with format: ${prefix}-checkpoint-${timestamp}
- [ ] Timestamp uses ISO format with colons/dots replaced by hyphens
- [ ] Restores working directory after stash
- [ ] Exits with code 0 on success or skip scenarios
- [ ] Exits with code 1 on git command failures
- [ ] Respects configured prefix from config file

## Phase 3: Build and Integration

### Task 3.1: Build the TypeScript POC
**Description**: Compile the TypeScript code and verify the build output
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 2.4
**Can run parallel with**: Task 3.2

**Technical Requirements**:
- Run the build:hooks-poc script
- Verify dist/hooks-poc.js is created
- Ensure proper module format (ESNext)
- Check compilation has no errors

**Build command**:
```bash
npm run build:hooks-poc
```

**Expected output structure**:
```
dist/
├── cli.js           # Existing compiled CLI
├── index.js         # Existing exports
└── hooks-poc.js     # NEW: Compiled POC
```

**Acceptance Criteria**:
- [ ] build:hooks-poc script runs without errors
- [ ] dist/hooks-poc.js file is created
- [ ] Compiled code uses ESNext module format
- [ ] No TypeScript compilation errors
- [ ] Binary wrapper can import the compiled file

### Task 3.2: Create Claude Code settings.json integration
**Description**: Set up Claude Code hook configuration to use the new binary
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 3.1

**Technical Requirements**:
- Create valid Claude Code hooks configuration
- Use Stop event with universal matcher
- Reference the claudekit-hooks binary correctly

**Implementation from specification**:
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

**File location**: `.claude/settings.json` (in test projects)

**Acceptance Criteria**:
- [ ] Valid Claude Code hooks configuration format
- [ ] Stop event configured with "*" matcher
- [ ] Command references "claudekit-hooks auto-checkpoint"
- [ ] JSON is properly formatted and valid
- [ ] Follows Claude Code hooks specification

### Task 3.3: Create manual test script
**Description**: Build a comprehensive test script to validate all POC functionality
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 3.1
**Can run parallel with**: None

**Technical Requirements**:
- Test script should be fully automated
- Cover all POC success criteria
- Create test git repository
- Test multiple scenarios

**Implementation from specification**:
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

**Test scenarios**:
1. Auto-checkpoint with uncommitted changes
2. No checkpoint when no changes exist
3. Custom configuration with different prefix
4. Non-git directory handling
5. Invalid config file handling

**Acceptance Criteria**:
- [ ] Test script creates isolated test environment
- [ ] Tests all success criteria scenarios
- [ ] Verifies exit codes are correct
- [ ] Checks output messages match expected
- [ ] Tests configuration loading and defaults
- [ ] Cleanup after test completion

## Phase 4: Documentation and Validation

### Task 4.1: Verify POC success criteria
**Description**: Validate that all POC goals have been met and document results
**Size**: Small
**Priority**: High
**Dependencies**: All previous tasks
**Can run parallel with**: Task 4.2

**POC Success Criteria to verify**:
1. ✅ Can execute as separate binary
2. ✅ Can read Claude Code JSON from stdin  
3. ✅ Can load and respect configuration
4. ✅ Returns proper exit codes (0, 2)
5. ✅ Works with Claude Code hooks

**Validation steps**:
1. Run `claudekit-hooks auto-checkpoint` directly
2. Test with echo '{}' | claudekit-hooks auto-checkpoint
3. Verify config changes behavior
4. Check exit codes in different scenarios
5. Test integration with Claude Code

**Acceptance Criteria**:
- [ ] All 5 success criteria validated
- [ ] Document any deviations or issues
- [ ] Confirm POC demonstrates core concept
- [ ] Ready for full implementation decision

### Task 4.2: Document POC limitations and next steps
**Description**: Create documentation of POC limitations and roadmap for full implementation
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 4.1
**Can run parallel with**: None

**Documentation requirements**:
- List all POC limitations clearly
- Document architectural decisions made
- Outline path to full implementation
- Estimate time for complete version

**POC Limitations from spec**:
- Single hook only (auto-checkpoint)
- No proper error handling
- No logging system
- Minimal configuration
- No tests
- Hardcoded logic
- Only checks current directory for config (no traversal)

**Next steps if POC successful**:
1. Refactor to proper architecture (BaseHook class, HookRunner, Registry)
2. Add production features (error handling, logging, build pipeline, tests)
3. Performance optimization (command caching, incremental checking)

**Acceptance Criteria**:
- [ ] Clear documentation of all limitations
- [ ] Architectural roadmap defined
- [ ] Time estimates provided (POC: 1-2 hours, Full: 1-2 weeks)
- [ ] Decision criteria for proceeding documented

## Summary

**Total Tasks**: 11
**Phase Breakdown**:
- Phase 1 (Foundation): 3 tasks
- Phase 2 (Core Implementation): 4 tasks  
- Phase 3 (Build & Integration): 3 tasks
- Phase 4 (Documentation): 2 tasks

**Execution Strategy**:
1. Start with Phase 1 tasks in parallel (1.1, 1.2, 1.3)
2. Phase 2 tasks build on Phase 1, with some parallelization possible
3. Phase 3 requires Phase 2 completion but allows parallel build/integration
4. Phase 4 validates the entire POC

**Critical Path**:
Task 1.1 → Task 2.1 → Task 2.4 → Task 3.1 → Task 4.1

**Parallel Opportunities**:
- Tasks 1.1, 1.2, 1.3 can run simultaneously
- Tasks 2.2 and 2.3 can run in parallel after 2.1
- Tasks 3.1 and 3.2 can run in parallel

**Risk Factors**:
- TypeScript compilation issues with module formats
- Git command behavior variations across environments
- Claude Code hook integration compatibility