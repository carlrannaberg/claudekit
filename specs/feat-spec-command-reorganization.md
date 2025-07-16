# Spec Command Reorganization and Enhancement

**Status**: Draft
**Authors**: Claude, 2025-01-13

## Overview

This specification details the reorganization of the spec command suite to follow a consistent namespace pattern and the addition of a new command: `/spec:decompose` for task decomposition with TaskMaster integration, and enhancement of `/spec:execute` for flexible task execution. The complete suite will consist of four commands: `/spec:create`, `/spec:validate`, `/spec:decompose`, and `/spec:execute`.

## Background/Problem Statement

The current spec command suite (`/spec:create`, `/spec:validate`, `/spec:execute`) provides a complete specification-driven development workflow. However:

1. The original `/spec` command needs to be renamed to `/spec:create` for consistency
2. There's no way to decompose specifications into persistent, manageable tasks outside of a Claude Code session
3. The current `/spec:execute` implementation only uses ephemeral TodoWrite tasks
4. Integration with task management tools like TaskMaster would enable better project management

## Goals

- Rename `/spec` to `/spec:create` for namespace consistency
- Create `/spec:decompose` command that integrates with TaskMaster for persistent task storage
- Enhance `/spec:execute` to detect and use TaskMaster when available
- Maintain backward compatibility during transition
- Preserve all existing functionality while adding new capabilities

## Non-Goals

- Not creating our own task persistence layer (use TaskMaster)
- Not supporting other task management systems initially (only TaskMaster)
- Not changing the spec document format or validation logic
- Not modifying how `/spec:create` generates specifications
- Not adding features beyond what's specified
- Not providing a fallback for `/spec:decompose` - it requires TaskMaster by design

## Technical Dependencies

- **Claude Code**: Slash command system and tools
- **TaskMaster CLI**: For persistent task management (required for decompose)
  - Installation: `npm install -g task-master`
  - Project init: `task-master init` (creates project structure)
  - Storage format: `.taskmaster/tasks/tasks.json`
  - Config file: `.taskmaster/config.json`
  - Commands: `task-master add-task`, `task-master list`, `task-master init`
- **Existing claudekit infrastructure**: Command templates, settings.json

### TaskMaster Project Structure
After initialization, TaskMaster creates:
```
.taskmaster/
├── config.json          # Project configuration
└── tasks/
    └── tasks.json       # Task storage (persists between sessions)
```

## Detailed Design

### 1. Command Renaming Strategy

The `/spec` command will be renamed to `/spec:create` through a phased approach:

```bash
# Phase 1: Create new command file
cp .claude/commands/spec.md .claude/commands/spec/create.md

# Phase 2: Update references
# Update all documentation and setup scripts
```

### 2. `/spec:decompose` Command Implementation

#### Command Structure

```yaml
---
description: Decompose validated specification into persistent TaskMaster tasks
allowed-tools: Read, Task, Bash(task-master:*, npm install)
---
```

The command markdown file contains instructions for Claude, not shell code. According to Claude Code documentation, slash commands are "reusable prompts or instructions for Claude" stored as Markdown files:

#### Implementation Details

1. **Prerequisites Check with Guided Installation**:

   The command markdown will instruct Claude to:

   ```markdown
   ## Instructions for Claude:

   1. First, check if TaskMaster is installed:
      - Use Bash to run: command -v task-master
      - If not found, inform the user and offer to install it
      - If user agrees, run: npm install -g task-master

   2. Then, check if TaskMaster is initialized in the project:
      - Use Bash to check if .taskmaster/config.json exists
      - If not found, inform the user and offer to initialize
      - If user agrees, run: task-master init

   3. Once both prerequisites are met, proceed with decomposition:
      - Read the specified spec file
      - Use the Task tool to analyze and decompose it
      - Generate and execute task-master add-task commands
   ```

   Example interaction flow:
   ```
   User: /spec:decompose specs/feat-oauth.md

   Claude: I need to check if TaskMaster is installed first.
   [Runs: command -v task-master]

   Claude: TaskMaster is not installed. This tool is required for
   persistent task storage. Would you like me to install it?

   User: Yes

   Claude: Installing TaskMaster globally...
   [Runs: npm install -g task-master]
   ✓ Successfully installed

   Now I need to initialize TaskMaster in this project.
   [Checks: .taskmaster/config.json]

   Claude: TaskMaster needs to be initialized. This will create
   configuration files for task storage. Shall I proceed?

   User: Yes

   Claude: Initializing TaskMaster...
   [Runs: task-master init]
   ✓ Created .taskmaster/ directory structure

   Now I'll decompose your specification into tasks...
   ```

2. **Spec Validation**:
   - Read the specified spec file
   - Verify it's a valid specification (has expected sections)
   - Extract implementation phases and technical details

3. **AI-Assisted Decomposition**:

   The command markdown will include instructions for Claude to use the Task tool:

   ```markdown
   ## Decomposition Instructions:

   Use the Task tool to analyze the specification and generate TaskMaster commands.

   The Task tool prompt should include:

   CRITICAL DECOMPOSITION RULES:
   1. NO FEATURE CREEP: Only include what's explicitly in the spec
   2. PRESERVE ALL SPEC DETAIL: Copy implementation details verbatim
   3. TEST INTEGRATION: Include tests in acceptance criteria, not as separate tasks
   4. SMART DEPENDENCIES: Create horizontal foundation tasks first, then vertical features

   TASK STRUCTURE:
   - Horizontal Tasks: Database setup, Backend framework, Frontend setup
   - Vertical Tasks: Complete features with DB + API + Frontend + Tests

   OUTPUT FORMAT:
   Generate exact task-master CLI commands that can be executed directly.
   Each task should include ALL details from the spec, not references to it.
   ```

4. **Task Generation Pattern**:
   ```bash
   # Foundation task example (TaskMaster auto-assigns IDs)
   task-master add-task "Setup: Database Infrastructure" \
     --details="SOURCE: specs/feat-oauth-authentication.md

     Initialize PostgreSQL with uuid-ossp extension

     IMPLEMENTATION:
     [Copy exact setup code from spec]

     ACCEPTANCE CRITERIA:
     - [ ] Database connection configured
     - [ ] Migration system working with tests
     - [ ] UUID extension enabled
     - [ ] Connection pool tests passing" \
     --priority=high

   # Note: Store returned task ID for dependency references
   # TaskMaster returns: "Task created with ID: 1"

   # Vertical feature task example (depends on foundation tasks)
   task-master add-task "User Authentication: Complete OAuth2 Flow" \
     --details="SOURCE: specs/feat-oauth-authentication.md

     [Copy ALL implementation details from spec sections]

     ACCEPTANCE CRITERIA:
     - [ ] OAuth2 endpoints implemented and tested
     - [ ] User model with exact fields from spec
     - [ ] Integration tests covering full auth flow
     - [ ] Error responses match spec format exactly" \
     --priority=high \
     --dependencies="1,2,3"

   # Dependencies reference the auto-generated IDs from foundation tasks
   ```

### 3. `/spec:execute` Command Enhancement

#### Current vs Enhanced Behavior

```javascript
// Current: Only uses TodoWrite
const tasks = parseSpecIntoTasks(spec);
await TodoWrite(tasks);

// Enhanced: Detects TaskMaster
const hasTaskMaster = await checkTaskMasterInstalled();
if (hasTaskMaster) {
    const tasks = await TaskMaster.getTasks();
    await executeWithTaskMaster(tasks);
} else {
    // Fallback to current TodoWrite approach
    const tasks = parseSpecIntoTasks(spec);
    await TodoWrite(tasks);
}
```

#### TaskMaster Integration

When TaskMaster is available:
1. Read tasks from `.taskmaster/tasks/tasks.json`
2. Filter tasks related to the specification
3. Execute tasks respecting dependencies
4. Update task status in TaskMaster after completion

### 4. File Organization

```
.claude/commands/
├── spec/
│   ├── create.md      # Renamed from spec.md
│   ├── validate.md    # Existing - analyzes spec completeness
│   ├── decompose.md   # New - creates TaskMaster tasks
│   └── execute.md     # Enhanced - flexible execution
```

## User Experience

### Complete Workflow

The spec command suite provides a complete specification-driven development workflow:

```
/spec:create → /spec:validate → /spec:decompose → /spec:execute
```

### Command Usage Flow

1. **Create a specification**:
   ```bash
   /spec:create add OAuth2 authentication with Google and GitHub
   # Creates: specs/feat-oauth2-authentication.md
   ```

2. **Validate the specification**:
   ```bash
   /spec:validate specs/feat-oauth2-authentication.md
   # Output: Readiness assessment, gaps, recommendations
   ```

3. **Decompose into tasks** (requires TaskMaster):
   ```bash
   /spec:decompose specs/feat-oauth2-authentication.md
   # Creates persistent tasks in .taskmaster/tasks/tasks.json
   ```

4. **Execute the implementation**:
   ```bash
   /spec:execute specs/feat-oauth2-authentication.md
   # Uses TaskMaster tasks if available, otherwise TodoWrite
   ```

### Command Interactions

- **validate → decompose**: Only validated specs should be decomposed
- **decompose → execute**: Execute can use decomposed TaskMaster tasks
- **validate → execute**: Execute can work directly without decompose (using TodoWrite)

### Error Messages and Guided Installation

**For `/spec:decompose` without TaskMaster**:
```
████ TaskMaster CLI Not Found ████

The /spec:decompose command requires TaskMaster for persistent task storage.

To install TaskMaster, I'll run:
  npm install -g task-master

Then run /spec:decompose again.

Installation command ready to execute.
```

Claude Code will then offer to run the installation command automatically.

**For `/spec:decompose` in uninitialized project**:
```
████ TaskMaster Project Setup Required ████

TaskMaster needs to be initialized in this project.

To initialize, I'll run:
  task-master init

This will create:
  - .taskmaster/config.json
  - .taskmaster/tasks/tasks.json

Initialization command ready to execute.
```

Claude Code will then offer to run the initialization command.

**For `/spec:execute` without TaskMaster** (informational):
```
Info: TaskMaster not found - using session-based TodoWrite for task management.
To enable persistent tasks, install TaskMaster: npm install -g task-master
```

### Project Configuration

When TaskMaster is initialized, consider adding to `.gitignore`:
```
# TaskMaster local tasks (project-specific decision)
.taskmaster/tasks/tasks.json

# Or ignore entire TaskMaster directory
# .taskmaster/
```

## Testing Strategy

Since slash commands are interactive prompts for Claude (not automated scripts), testing requires manual verification:

### Manual Testing Scenarios

#### Command Validation Tests
- **Command Structure**: Verify markdown files have correct YAML frontmatter
- **Dynamic Content**: Test `$ARGUMENTS` substitution works correctly
- **Tool Restrictions**: Ensure `allowed-tools` are properly enforced

#### TaskMaster Integration Tests
- **Missing CLI**: Test behavior when `task-master` command not found
- **Installation Flow**: Verify guided installation with `npm install -g task-master`
- **Project Init**: Test `task-master init` in uninitialized project
- **Task Creation**: Verify tasks are created in `.taskmaster/tasks/tasks.json`

#### Workflow Integration Tests
- **Spec Validation**: Test `/spec:validate` identifies implementation-ready specs
- **Decomposition**: Verify `/spec:decompose` creates horizontal then vertical tasks
- **Execution**: Test `/spec:execute` with both TaskMaster and TodoWrite modes
- **Task Fidelity**: Ensure decomposed tasks preserve all spec details

#### Error Scenario Tests
- **Invalid Spec Files**: Test behavior with malformed specifications
- **Permission Issues**: Test npm/task-master installation failures
- **Dependency Conflicts**: Test when TaskMaster versions conflict

### Testing Documentation
Create manual test procedures documenting:
1. Expected Claude responses for each scenario
2. Screenshots of successful workflows
3. Common error patterns and solutions
4. Performance characteristics (time to decompose large specs)

## Performance Considerations

- Task decomposition is CPU-bound (AI analysis) - single operation
- TaskMaster file I/O is minimal (JSON read/write)
- No performance regression for existing commands
- Parallel task execution when possible

## Security Considerations

- Validate spec file paths (no path traversal)
- Sanitize task content before passing to task-master CLI
- Don't expose sensitive information in task details
- Maintain existing allowed-tools restrictions

## Documentation

### Files to Update
1. `README.md` - Update command list
2. `AGENT.md` - Update slash commands section
3. `docs/spec-documentation.md` - Add decompose details
4. `docs/commands-documentation.md` - Update command reference
5. `setup.sh` - Update setup notifications

### New Documentation
- Add TaskMaster integration guide
  - Installation and project initialization
  - `.gitignore` recommendations
  - Task management workflow
- Document task decomposition best practices
- Add examples of horizontal vs vertical tasks
- Interactive installation flow documentation

## Implementation Phases

### Phase 1: Command Renaming (MVP)
- [ ] Create `/spec:create` from existing `/spec`
- [ ] Update all documentation references
- [ ] Test backward compatibility
- [ ] Update setup.sh

### Phase 2: Decompose Command
- [ ] Create `/spec:decompose` command
- [ ] Implement TaskMaster detection
- [ ] Add AI decomposition logic with strict rules
- [ ] Test task creation and dependencies

### Phase 3: Execute Enhancement
- [ ] Add TaskMaster detection to execute
- [ ] Implement dual-mode execution
- [ ] Update progress tracking
- [ ] Test both execution paths

## Open Questions

1. Should we keep the old `/spec` command temporarily with a deprecation notice?

## Resolved Questions (from TaskMaster Documentation)

### Task ID Management Strategy
**Resolution**: TaskMaster automatically assigns sequential numeric IDs (1, 2, 3...) when tasks are created. The CLI uses `task-master parse-prd` or AI-assisted generation rather than manual ID assignment. Our `/spec:decompose` should:
- Let TaskMaster handle ID assignment automatically
- Not specify `--id` parameters in `task-master add-task` commands
- Use task dependencies by referencing the auto-generated IDs

### Partial Task Handling Strategy
**Resolution**: TaskMaster supports task updates and reorganization:
- `task-master update` can modify existing tasks
- Tasks can be moved and reordered without losing completed work
- Dependencies are automatically updated when tasks change
- Our `/spec:decompose` should check if tasks exist and offer to update vs. recreate

### Rollback Strategy
**Resolution**: TaskMaster doesn't have explicit rollback but supports:
- Task reorganization with preserved completed work
- Moving conflicting tasks to new positions
- Interactive task management through AI
- Our implementation should focus on non-destructive operations and user confirmation before major changes

## References

- Current spec commands: `.claude/commands/spec/`
- Spec documentation: `docs/spec-documentation.md`
- TaskMaster storage format: `.taskmaster/tasks/tasks.json`
- Autoagent bootstrap pattern: Similar decomposition approach
- Git commits: Recent reorganization of commands into namespaces
- Claude Code slash commands documentation: https://docs.anthropic.com/en/docs/claude-code/slash-commands