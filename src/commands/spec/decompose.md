---
description: Break down a validated specification into actionable implementation tasks
allowed-tools: Read, Task, Write, TodoWrite, Bash(mkdir -p, cat >, grep, echo, basename, date)
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

## Instructions for Claude:

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
   - Include implementation details from the spec
   - Define clear acceptance criteria
   - Include tests as part of each task
   - Document dependencies between tasks
     * Write meaningful tests that can fail to reveal real issues
     * Follow project principle: "When tests fail, fix the code, not the test"
   - Create foundation tasks first, then build features on top
   - Each task should be self-contained with all necessary details
   
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
   
5. **Create TodoWrite Tasks**:
   
   Convert the task breakdown into TodoWrite tasks for session tracking:
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
   - Create TodoWrite tasks for immediate tracking
   - Generate a summary report showing:
     - Total number of tasks
     - Breakdown by phase
     - Estimated complexity
     - Parallel execution opportunities

## Output Format

### Task Breakdown Document
The generated markdown file includes:
- Executive summary
- Phase-by-phase task breakdown
- Dependency graph
- Risk assessment
- Execution strategy

### TodoWrite Integration
All tasks are immediately available in TodoWrite for:
- Progress tracking
- Status updates
- Blocking issue identification
- Parallel work coordination

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
- ✅ All tasks are created in TodoWrite for tracking
- ✅ Tasks preserve all implementation details from the spec
- ✅ Foundation tasks are identified and prioritized
- ✅ Dependencies between tasks are clearly documented
- ✅ All tasks include testing requirements
- ✅ Parallel execution opportunities are identified

## Integration with Other Commands

- **Prerequisites**: Run `/spec:validate` first to ensure spec quality
- **Next step**: Use `/spec:execute` to implement the decomposed tasks
- **Progress tracking**: Monitor task completion with TodoWrite
- **Quality checks**: Run `/validate-and-fix` after implementation

## Best Practices

1. **Task Granularity**: Keep tasks focused on single objectives
2. **Dependencies**: Clearly identify blocking vs parallel work
3. **Testing**: Include test tasks for each component
4. **Documentation**: Add documentation tasks alongside implementation
5. **Phases**: Group related tasks into logical phases