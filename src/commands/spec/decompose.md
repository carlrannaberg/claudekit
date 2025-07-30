---
description: Break down a validated specification into actionable implementation tasks
category: validation
allowed-tools: Read, Task, Write, TodoWrite, Bash(mkdir -p, cat >, grep, echo, basename, date, command, stm:*)
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

!which stm &> /dev/null && test -d .simple-task-master && echo "STM_STATUS: Available and initialized" || (which stm &> /dev/null && echo "STM_STATUS: Available but not initialized" || echo "STM_STATUS: Not installed")

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
   
   If STM is available, create STM tasks with FULL specification details:
   
   **CRITICAL**: Preserve ALL implementation details, code blocks, and technical requirements from the specification. Use heredocs or temporary files to capture multi-line content.
   
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
     - Full code examples with proper formatting
     - Implementation steps and notes
     - Architecture decisions
   - `--validation`: Complete acceptance criteria including:
     - All test scenarios
     - Success/failure conditions
     - Edge cases to verify
   
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
     - Estimated complexity
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
  - `--details`: Complete technical implementation from spec
  - `--validation`: Full acceptance criteria and test scenarios

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