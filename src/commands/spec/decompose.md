---
description: Decompose validated specification into persistent TaskMaster tasks
allowed-tools: Read, Task, Bash(task-master:*, npm install -g task-master-ai, mkdir -p, cat >, grep, echo, basename, date)
argument-hint: "<path-to-spec-file>"
---

# Decompose Specification into TaskMaster Tasks

Decompose the specification at: $ARGUMENTS

## Prerequisites Check

This command requires TaskMaster AI for persistent task storage. Guide the user through installation if needed.

### Step 1: Check TaskMaster AI Installation

First, check if TaskMaster AI is installed: !`command -v task-master || echo "NOT_FOUND"`

If TaskMaster is not found, offer to install it for the user with the correct package: `npm install -g task-master-ai`

### Step 2: Check Project Initialization

If TaskMaster AI is installed, check if it's initialized: !`test -f .taskmaster/config.json && echo "INITIALIZED" || echo "NOT_INITIALIZED"`

If not initialized, offer to perform safe initialization inline (see Safe Initialization section below)

## Instructions for Claude:

1. **Prerequisites Check with Guided Installation**:
   - Check the prerequisites output above
   - If TaskMaster shows "NOT_FOUND", inform the user and offer to install it
   - If user agrees, run: `npm install -g task-master-ai`
   
   - If initialization shows "NOT_INITIALIZED", inform the user and offer to initialize
   - If user agrees, perform safe initialization inline (see Safe Initialization section)

2. **Spec Validation**:
   - Read the specified spec file
   - Verify it's a valid specification (has expected sections)
   - Extract implementation phases and technical details

3. **Decompose the Specification**:
   
   Use the Task tool to analyze the specification and create TaskMaster commands that capture all implementation details.
   
   Key principles:
   - Include only what's explicitly stated in the spec
   - Copy implementation details verbatim into each task
   - Include tests as part of acceptance criteria following testing philosophy:
     * Document test purpose (why each test exists and what it validates)
     * Write meaningful tests that can fail to reveal real issues
     * Follow project principle: "When tests fail, fix the code, not the test"
   - Create foundation tasks first, then build features on top
   - Each task should be self-contained with all necessary details
   
   Task structure:
   - Foundation tasks: Core infrastructure (database, frameworks, testing setup)
   - Feature tasks: Complete vertical slices including all layers
   
   Generate executable task-master commands using manual task creation syntax.

4. **Task Creation Syntax**:

   Use task-master's manual task creation flags:
   
   ```bash
   task-master add-task \
     --title="Brief task title" \
     --description="One-line summary of what needs to be done" \
     --details="SOURCE: [spec-file]
     
     [Full implementation details from spec]
     
     Technical Requirements:
     - [All technical details from spec]
     - [Specific library versions]
     - [Code examples from spec]
     
     Implementation Steps:
     1. [Detailed step from spec]
     2. [Another step with specifics]
     3. [Continue with all steps]
     
     Acceptance Criteria:
     - [ ] [Specific criteria from spec]
     - [ ] Tests written and passing
     - [ ] [Additional criteria]" \
     --priority=high \
     --dependencies="1,2,3"
   ```
   
   Example task creation:
   ```bash
   task-master add-task \
     --title="Implement file system operations with backup support" \
     --description="Build filesystem.ts module with Unix-focused operations and backup support" \
     --details="SOURCE: specs/feat-modernize-setup-installer.md
     
     Implement the filesystem.ts module with Unix-focused operations and backup support.
     
     Key implementation requirements:
     - Path validation: Basic checks for reasonable paths
     - Permission checks: Verify write permissions before operations
     - Backup creation: Simple backup before overwriting files
     - Error handling: Graceful failure with helpful messages
     - Unix path handling: Use path.join, os.homedir(), standard Unix permissions
     
     Functions to implement:
     - validateProjectPath(input: string): boolean - Basic path validation
     - ensureDirectoryExists(path: string): Promise<void>
     - copyFileWithBackup(source: string, target: string, backup: boolean): Promise<void>
     - setExecutablePermission(filePath: string): Promise<void> - chmod 755
     - needsUpdate(source: string, target: string): Promise<boolean> - SHA-256 comparison
     - getFileHash(filePath: string): Promise<string> - SHA-256 hash generation
     
     Idempotency implementation from spec:
     async function needsUpdate(source: string, target: string): Promise<boolean> {
       if (!await fs.pathExists(target)) return true;
       
       const sourceHash = await getFileHash(source);
       const targetHash = await getFileHash(target);
       
       return sourceHash !== targetHash;
     }
     
     Acceptance Criteria:
     - [ ] All file operations handle Unix paths correctly
     - [ ] SHA-256 based idempotency checking implemented
     - [ ] Backup functionality creates timestamped backups
     - [ ] Executable permissions set correctly for hooks (755)
     - [ ] Path validation prevents directory traversal
     - [ ] Tests: All operations work on macOS/Linux with proper error handling" \
     --priority=high \
     --dependencies="3"
   ```
   
   Notes:
   - TaskMaster automatically assigns task IDs
   - Dependencies reference these auto-generated IDs
   - Include all implementation details from the spec in the --details field

5. **Execute Task Creation**:
   - Run each generated task-master command
   - Capture the returned task IDs
   - Create dependency chains for vertical tasks
   - Verify tasks are created in `.taskmaster/tasks/tasks.json`

6. **Final Report**:
   - List all created tasks with their IDs
   - Show the task dependency structure
   - Provide next steps for using `/spec:execute`

## Error Handling

**If TaskMaster AI is not found:**
```
████ TaskMaster AI Not Found ████

The /spec:decompose command requires TaskMaster AI for persistent task storage.

To install TaskMaster AI, run:
  npm install -g task-master-ai

Then run /spec:decompose again.

Installation command ready to execute.
```


**If TaskMaster is not initialized:**
```
████ TaskMaster Project Setup Required ████

TaskMaster needs to be initialized in this project.

Would you like me to initialize TaskMaster for this project?
This will create:
  - .taskmaster/config.json (configured for Claude Code provider)
  - .taskmaster/state.json (task state management)
  - .taskmaster/templates/ (PRD templates)

I'll use a safe initialization that won't overwrite existing files.
```

## Usage Examples

```bash
# Decompose a feature specification
/spec:decompose specs/feat-user-authentication.md

# Decompose a system enhancement spec
/spec:decompose specs/feat-api-rate-limiting.md
```

## Success Criteria

The decomposition is complete when:
- ✅ TaskMaster AI is installed and safely initialized
- ✅ All tasks are created in TaskMaster with proper dependencies
- ✅ Tasks preserve all implementation details from the spec
- ✅ Horizontal foundation tasks are created first
- ✅ Vertical feature tasks depend on appropriate foundation tasks
- ✅ All tasks include integrated testing requirements
- ✅ Task creation is verified in `.taskmaster/tasks/tasks.json`

## Notes

- This command creates persistent tasks that survive Claude Code sessions
- Tasks are designed to work with the enhanced `/spec:execute` command
- Only validated specs should be decomposed (run `/spec:validate` first)
- TaskMaster handles ID assignment - don't specify manual IDs
- Dependencies are created based on logical task relationships

## Safe Initialization

When user agrees to initialize TaskMaster, execute these commands:

```bash
# Create directory structure
mkdir -p .taskmaster/{tasks,docs,templates,reports}

# Create empty complexity report to avoid TaskMaster errors
echo '{}' > .taskmaster/reports/task-complexity-report.json

# Create state.json
CURRENT_DATE=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
cat > .taskmaster/state.json << EOF
{
  "currentTag": "master",
  "lastSwitched": "$CURRENT_DATE",
  "tags": {
    "master": {
      "name": "master",
      "description": "Default tag for project tasks",
      "created": "$CURRENT_DATE"
    }
  }
}
EOF

# Create config.json with Claude Code provider
PROJECT_NAME=$(basename "$PWD")
cat > .taskmaster/config.json << EOF
{
  "models": {
    "main": {
      "provider": "claude-code",
      "modelId": "sonnet",
      "maxTokens": 64000,
      "temperature": 0.2
    },
    "research": {
      "provider": "claude-code",
      "modelId": "opus",
      "maxTokens": 32000,
      "temperature": 0.1
    },
    "fallback": {
      "provider": "claude-code",
      "modelId": "sonnet",
      "maxTokens": 64000,
      "temperature": 0.2
    }
  },
  "claudeCode": {
    "maxTurns": 5,
    "appendSystemPrompt": "Focus on maintainable, well-tested code following project conventions",
    "permissionMode": "default"
  },
  "global": {
    "logLevel": "info",
    "debug": false,
    "defaultSubtasks": 5,
    "defaultPriority": "medium",
    "projectName": "$PROJECT_NAME",
    "defaultTag": "master",
    "responseLanguage": "English"
  }
}
EOF

# Update .gitignore if needed
if ! grep -q "# TaskMaster" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# TaskMaster" >> .gitignore
    echo ".taskmaster/tasks/" >> .gitignore
    echo ".taskmaster/reports/" >> .gitignore
    echo ".taskmaster/docs/" >> .gitignore
    echo ".taskmaster/state.json" >> .gitignore
fi
```