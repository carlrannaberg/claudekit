---
description: Break down a validated specification into actionable implementation tasks
category: validation
allowed-tools: Read, Task, Write, TodoWrite, Bash(mkdir:*), Bash(cat:*), Bash(grep:*), Bash(echo:*), Bash(basename:*), Bash(date:*), Bash(claudekit:status stm), Bash(stm:*)
argument-hint: "<path-to-spec-file>"
---

# Decompose Specification into Tasks

Decompose the specification at: $ARGUMENTS

## Process Overview

This command takes a validated specification and breaks it down into:
1. Clear, actionable tasks with dependencies
2. Implementation phases and milestones
3. Testing and validation requirements
4. Documentation needs

!claudekit status stm

## ⚠️ CRITICAL: Content Preservation Requirements

**THIS IS THE MOST IMPORTANT PART**: When creating STM tasks, you MUST copy ALL content from the task breakdown into the STM tasks. Do NOT summarize or reference the spec - include the ACTUAL CODE and details.

## Pre-Flight Checklist

Before creating any STM tasks, confirm your understanding:
- [ ] I will NOT write summaries like "Create X as specified in spec"
- [ ] I will COPY all code blocks from the task breakdown into STM --details
- [ ] I will USE heredocs or temp files for multi-line content
- [ ] I will INCLUDE complete implementations, not references
- [ ] Each STM task will be self-contained with ALL details from the breakdown

**If you find yourself typing phrases like "as specified", "from spec", or "see specification" - STOP and copy the actual content instead!**

## Instructions for Claude:

0. **Task Management System**:
   - Check the STM_STATUS output above
   - If status is "Available but not initialized", run: `stm init`
   - If status is "Available and initialized", use STM for task management
   - If status is "Not installed", fall back to TodoWrite

1. **Read and Validate Specification**:
   - Read the specified spec file
   - Verify it's a valid specification (has expected sections)
   - Extract implementation phases and technical details

2. **Analyze Specification Components**:
   - Identify major features and components
   - Extract technical requirements
   - Note dependencies between components
   - Identify testing requirements
   - Document success criteria

3. **Create Task Breakdown**:
   
   Break down the specification into concrete, actionable tasks.
   
   Key principles:
   - Each task should have a single, clear objective
   - **PRESERVE ALL CONTENT**: Copy implementation details, code blocks, and examples verbatim from the spec
   - Define clear acceptance criteria with specific test scenarios
   - Include tests as part of each task
   - Document dependencies between tasks
     * Write meaningful tests that can fail to reveal real issues
     * Follow project principle: "When tests fail, fix the code, not the test"
   - Create foundation tasks first, then build features on top
   - Each task should be self-contained with all necessary details
   
   **CRITICAL REQUIREMENT**: When creating tasks, you MUST preserve:
   - Complete code examples (including full functions, not just snippets)
   - All technical requirements and specifications
   - Detailed implementation steps
   - Configuration examples
   - Error handling requirements
   - All acceptance criteria and test scenarios
   
   Think of each task as a complete mini-specification that contains everything needed to implement it without referring back to the original spec.
   
   ## 📋 THE TWO-STEP PROCESS YOU MUST FOLLOW:
   
   **Step 1**: Create the task breakdown DOCUMENT with all details
   **Step 2**: Copy those SAME details into STM tasks
   
   The task breakdown document is NOT just for reference - it's the SOURCE for your STM task content!
   
   Task structure:
   - Foundation tasks: Core infrastructure (database, frameworks, testing setup)
   - Feature tasks: Complete vertical slices including all layers
   - Testing tasks: Unit, integration, and E2E tests
   - Documentation tasks: API docs, user guides, code comments

4. **Generate Task Document**:

   Create a comprehensive task breakdown document:
   
   ```markdown
   # Task Breakdown: [Specification Name]
   Generated: [Date]
   Source: [spec-file]
   
   ## Overview
   [Brief summary of what's being built]
   
   ## Phase 1: Foundation
   
   ### Task 1.1: [Task Title]
   **Description**: One-line summary of what needs to be done
   **Size**: Small/Medium/Large
   **Priority**: High/Medium/Low
   **Dependencies**: None
   **Can run parallel with**: Task 1.2, 1.3
   
   **Technical Requirements**:
   - [All technical details from spec]
   - [Specific library versions]
   - [Code examples from spec]
   
   **Implementation Steps**:
   1. [Detailed step from spec]
   2. [Another step with specifics]
   3. [Continue with all steps]
   
   **Acceptance Criteria**:
   - [ ] [Specific criteria from spec]
   - [ ] Tests written and passing
   - [ ] [Additional criteria]
   
   ## Phase 2: Core Features
   [Continue pattern...]
   ```
   
   Example task breakdown:
   ```markdown
   ### Task 2.3: Implement file system operations with backup support
   **Description**: Build filesystem.ts module with Unix-focused operations and backup support
   **Size**: Large
   **Priority**: High
   **Dependencies**: Task 1.1 (TypeScript setup), Task 1.2 (Project structure)
   **Can run parallel with**: Task 2.4 (Config module)
   
   **Source**: specs/feat-modernize-setup-installer.md
   
   **Technical Requirements**:
   - Path validation: Basic checks for reasonable paths
   - Permission checks: Verify write permissions before operations
   - Backup creation: Simple backup before overwriting files
   - Error handling: Graceful failure with helpful messages
   - Unix path handling: Use path.join, os.homedir(), standard Unix permissions
   
   **Functions to implement**:
   - validateProjectPath(input: string): boolean - Basic path validation
   - ensureDirectoryExists(path: string): Promise<void>
   - copyFileWithBackup(source: string, target: string, backup: boolean): Promise<void>
   - setExecutablePermission(filePath: string): Promise<void> - chmod 755
   - needsUpdate(source: string, target: string): Promise<boolean> - SHA-256 comparison
   - getFileHash(filePath: string): Promise<string> - SHA-256 hash generation
   
   **Implementation example from spec**:
   ```typescript
   async function needsUpdate(source: string, target: string): Promise<boolean> {
     if (!await fs.pathExists(target)) return true;
     
     const sourceHash = await getFileHash(source);
     const targetHash = await getFileHash(target);
     
     return sourceHash !== targetHash;
   }
   ```
   
   **Acceptance Criteria**:
   - [ ] All file operations handle Unix paths correctly
   - [ ] SHA-256 based idempotency checking implemented
   - [ ] Backup functionality creates timestamped backups
   - [ ] Executable permissions set correctly for hooks (755)
   - [ ] Path validation prevents directory traversal
   - [ ] Tests: All operations work on macOS/Linux with proper error handling
   ```
   
5. **Create Task Management Entries**:
   
   ## 🚨 STOP AND READ: Common Mistake vs Correct Approach
   
   ❌ **WRONG - What NOT to do**:
   ```bash
   stm add "[P1.3] Implement common hook utilities" \
     --description "Create shared utilities module for all hooks" \
     --details "Create cli/hooks/utils.ts with readStdin() with 1-second timeout, findProjectRoot() using git rev-parse, detectPackageManager() checking lock files" \
     --validation "readStdin with timeout. Project root discovery. Package manager detection."
   ```
   
   ✅ **CORRECT - What you MUST do**:
   ```bash
   # For each task in the breakdown, find the corresponding section and COPY ALL its content
   # Use temporary files for large content to preserve formatting
   
   cat > /tmp/task-details.txt << 'EOF'
   Create cli/hooks/utils.ts with the following implementations:
   
   ```typescript
   import { exec } from 'child_process';
   import { promisify } from 'util';
   import * as fs from 'fs-extra';
   import * as path from 'path';
   
   const execAsync = promisify(exec);
   
   // Standard input reader
   export async function readStdin(): Promise<string> {
     return new Promise((resolve) => {
       let data = '';
       process.stdin.on('data', chunk => data += chunk);
       process.stdin.on('end', () => resolve(data));
       setTimeout(() => resolve(''), 1000); // Timeout fallback
     });
   }
   
   // Project root discovery
   export async function findProjectRoot(startDir: string = process.cwd()): Promise<string> {
     try {
       const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: startDir });
       return stdout.trim();
     } catch {
       return process.cwd();
     }
   }
   
   // [Include ALL other functions from the task breakdown...]
   ```
   
   Technical Requirements:
   - Standard input reader with timeout
   - Project root discovery using git
   - Package manager detection (npm/yarn/pnpm)
   - Command execution wrapper
   - Error formatting helper
   - Tool availability checker
   EOF
   
   stm add "[P1.3] Implement common hook utilities" \
     --description "Create shared utilities module for all hooks with stdin reader, project root discovery, package manager detection, command execution wrapper, error formatting, and tool availability checking" \
     --details "$(cat /tmp/task-details.txt)" \
     --validation "readStdin with 1-second timeout. Project root discovery via git. Package manager detection for npm/yarn/pnpm. Command execution with timeout and output capture. Error formatting follows BLOCKED: pattern. Tool availability checker works." \
     --tags "phase1,infrastructure,utilities"
   
   rm /tmp/task-details.txt
   ```
   
   **Remember**: The task breakdown document you created has ALL the implementation details. Your job is to COPY those details into STM, not summarize them!
   
   ```bash
   # Example: Creating a task with complete specification details
   
   # Method 1: Using heredocs for multi-line content
   stm add "Implement auto-checkpoint hook logic" \
     --description "Build the complete auto-checkpoint functionality with git integration to create timestamped git stashes on Stop events" \
     --details "$(cat <<'EOF'
   Technical Requirements:
   - Check if current directory is git repository using git status
   - Detect uncommitted changes using git status --porcelain
   - Create timestamped stash with configurable prefix from config
   - Apply stash to restore working directory after creation
   - Handle exit codes properly (0 for success, 1 for errors)
   
   Implementation from specification:
   ```typescript
   const hookName = process.argv[2];
   if (hookName !== 'auto-checkpoint') {
     console.error(`Unknown hook: ${hookName}`);
     process.exit(1);
   }
   
   const hookConfig = config.hooks?.['auto-checkpoint'] || {};
   const prefix = hookConfig.prefix || 'claude';
   
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
     
     if (!stdout.trim()) {
       console.log('No changes to checkpoint');
       process.exit(0);
     }
     
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
       
       spawn('git', ['stash', 'apply'], {
         stdio: 'ignore'
       }).on('close', () => {
         console.log(`✅ Checkpoint created: ${message}`);
         process.exit(0);
       });
     });
   });
   ```
   
   Key implementation notes:
   - Use child_process.spawn for git commands
   - Capture stdout to check for changes
   - Generate ISO timestamp and sanitize for git message
   - Chain git stash push and apply operations
   EOF
   )" \
     --validation "$(cat <<'EOF'
   - [ ] Correctly identifies git repositories
   - [ ] Detects uncommitted changes using git status --porcelain
   - [ ] Creates checkpoint with format: ${prefix}-checkpoint-${timestamp}
   - [ ] Restores working directory after stash
   - [ ] Exits with code 0 on success, 1 on error
   - [ ] Respects configured prefix from .claudekit/config.json
   - [ ] Handles missing config file gracefully
   
   Test scenarios:
   1. Run in non-git directory - should exit 0
   2. Run with no changes - should exit 0
   3. Run with changes - should create checkpoint
   4. Run with custom config - should use custom prefix
   EOF
   )" \
     --tags "phase2,core,high-priority,large" \
     --status pending \
     --deps "35,36"
   
   # Method 2: Using temporary files for very large content
   cat > /tmp/stm-details.txt << 'EOF'
   [Full technical requirements and implementation details from spec...]
   EOF
   
   cat > /tmp/stm-validation.txt << 'EOF'
   [Complete acceptance criteria and test scenarios...]
   EOF
   
   stm add "Task title" \
     --description "Brief what and why" \
     --details "$(cat /tmp/stm-details.txt)" \
     --validation "$(cat /tmp/stm-validation.txt)" \
     --tags "appropriate,tags" \
     --status pending
   
   rm /tmp/stm-details.txt /tmp/stm-validation.txt
   ```
   
   **Important STM field usage**:
   - `--description`: Brief what & why (1-2 sentences max)
   - `--details`: Complete technical implementation including:
     - All technical requirements from spec
     - Full code examples with proper formatting (COPY from breakdown, don't summarize!)
     - Implementation steps and notes
     - Architecture decisions
     - **MUST be self-contained** - someone should be able to implement the task without seeing the original spec
   - `--validation`: Complete acceptance criteria including:
     - All test scenarios
     - Success/failure conditions
     - Edge cases to verify
   
   ## Content Size Guidelines
   
   - **Small tasks (< 20 lines)**: Can use heredocs directly in command
   - **Medium tasks (20-200 lines)**: Use temporary files to preserve formatting
   - **Large tasks (> 200 lines)**: Always use temporary files
   - **Tasks with code blocks**: MUST use heredocs or files (never inline)
   
   Example for medium/large content:
   ```bash
   # Extract the full implementation from your task breakdown
   cat > /tmp/stm-task-details.txt << 'EOF'
   [PASTE THE ENTIRE "Technical Requirements" and "Implementation" sections from the task breakdown]
   [Include ALL code blocks with proper formatting]
   [Include ALL technical notes and comments]
   EOF
   
   cat > /tmp/stm-task-validation.txt << 'EOF'
   [PASTE THE ENTIRE "Acceptance Criteria" section]
   [Include ALL test scenarios]
   EOF
   
   stm add "[Task Title]" \
     --description "[One line summary]" \
     --details "$(cat /tmp/stm-task-details.txt)" \
     --validation "$(cat /tmp/stm-task-validation.txt)" \
     --tags "appropriate,tags" \
     --deps "1,2,3"
   
   rm /tmp/stm-task-*.txt
   ```
   
   If STM is not available, use TodoWrite:
   ```javascript
   [
     {
       id: "1",
       content: "Phase 1: Set up TypeScript project structure",
       status: "pending",
       priority: "high"
     },
     {
       id: "2",
       content: "Phase 1: Configure build system with esbuild",
       status: "pending",
       priority: "high"
     },
     // ... additional tasks
   ]
   ```

6. **Save Task Breakdown**:
   - Save the detailed task breakdown document to `specs/[spec-name]-tasks.md`
   - Create tasks in STM or TodoWrite for immediate tracking
   - Generate a summary report showing:
     - Total number of tasks
     - Breakdown by phase
     - Parallel execution opportunities
     - Task management system used (STM or TodoWrite)

## Output Format

### Task Breakdown Document
The generated markdown file includes:
- Executive summary
- Phase-by-phase task breakdown
- Dependency graph
- Risk assessment
- Execution strategy

### Task Management Integration
Tasks are immediately available in STM (if installed) or TodoWrite for:
- Progress tracking
- Status updates
- Blocking issue identification
- Parallel work coordination
- Dependency tracking (STM only)
- Persistent storage across sessions (STM only)

### Summary Report
Displays:
- Total tasks created
- Tasks per phase
- Critical path identification
- Recommended execution order

## Usage Examples

```bash
# Decompose a feature specification
/spec:decompose specs/feat-user-authentication.md

# Decompose a system enhancement spec
/spec:decompose specs/feat-api-rate-limiting.md
```

## Success Criteria

The decomposition is complete when:
- ✅ Task breakdown document is saved to specs directory
- ✅ All tasks are created in STM (if available) or TodoWrite for tracking
- ✅ **Tasks preserve ALL implementation details from the spec including:**
  - Complete code blocks and examples (not summarized)
  - Full technical requirements and specifications
  - Detailed step-by-step implementation instructions
  - All configuration examples
  - Complete acceptance criteria with test scenarios
- ✅ Foundation tasks are identified and prioritized
- ✅ Dependencies between tasks are clearly documented
- ✅ All tasks include testing requirements
- ✅ Parallel execution opportunities are identified
- ✅ **STM tasks use all three fields properly:**
  - `--description`: Brief what & why (1-2 sentences)
  - `--details`: Complete technical implementation from spec (ACTUAL CODE, not references)
  - `--validation`: Full acceptance criteria and test scenarios
- ✅ **Quality check passed**: Running `stm show [any-task-id]` displays full code implementations
- ✅ **No summary phrases**: Tasks don't contain "as specified", "from spec", or similar references

## Post-Creation Validation

After creating STM tasks, perform these checks:

1. **Sample Task Review**:
   ```bash
   # Pick a random task and check it has full implementation
   stm show [task-id] | grep -E "(as specified|from spec|see specification)"
   # Should return NO matches - if it does, the task is incomplete
   ```

2. **Content Length Check**:
   ```bash
   # Implementation tasks should have substantial details
   stm list --format json | jq '.[] | select(.details | length < 500) | {id, title}'
   # Review any tasks with very short details - they likely need more content
   ```

3. **Code Block Verification**:
   ```bash
   # Check that tasks contain actual code blocks
   stm grep "```" | wc -l
   # Should show many matches for tasks with code implementations
   ```

## Integration with Other Commands

- **Prerequisites**: Run `/spec:validate` first to ensure spec quality
- **Next step**: Use `/spec:execute` to implement the decomposed tasks
- **Progress tracking**: 
  - With STM: `stm list --pretty` or `stm list --status pending`
  - With TodoWrite: Monitor task completion in session
- **Quality checks**: Run `/validate-and-fix` after implementation

## Best Practices

1. **Task Granularity**: Keep tasks focused on single objectives
2. **Dependencies**: Clearly identify blocking vs parallel work
3. **Testing**: Include test tasks for each component
4. **Documentation**: Add documentation tasks alongside implementation
5. **Phases**: Group related tasks into logical phases