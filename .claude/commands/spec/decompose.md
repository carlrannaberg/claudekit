---
description: Decompose validated specification into persistent TaskMaster tasks
allowed-tools: Read, Task, Bash(task-master:*, npm install -g task-master-ai, mkdir -p, cat >, grep, echo, basename, date)
---

# Decompose Specification into TaskMaster Tasks

Decompose the specification at: $ARGUMENTS

## Prerequisites Check

This command requires TaskMaster AI for persistent task storage. Guide the user through installation if needed.

### Step 1: Check TaskMaster AI Installation

First, check if TaskMaster AI is installed:

```bash
command -v task-master
```

If TaskMaster is not found, offer to install it for the user with the correct package: `npm install -g task-master-ai`

### Step 2: Check Project Initialization

If TaskMaster AI is installed, check if it's initialized in this project:

```bash
test -f .taskmaster/config.json
```

If not initialized, offer to run our safe initialization script: `./scripts/task-master-init.sh`

## Instructions for Claude:

1. **Prerequisites Check with Guided Installation**:
   - Use Bash to run: `command -v task-master`
   - If not found, inform the user and offer to install it
   - If user agrees, run: `npm install -g task-master-ai`
   
   - Use Bash to check if `.taskmaster/config.json` exists
   - If not found, inform the user and offer to initialize
   - If user agrees, perform safe initialization inline (see Safe Initialization section)

2. **Spec Validation**:
   - Read the specified spec file
   - Verify it's a valid specification (has expected sections)
   - Extract implementation phases and technical details

3. **AI-Assisted Decomposition**:
   
   Use the Task tool to analyze the specification and generate TaskMaster commands.
   
   **CRITICAL DECOMPOSITION RULES:**
   
   1. **NO FEATURE CREEP**: Only include what's explicitly in the spec
   2. **PRESERVE ALL SPEC DETAIL**: Copy implementation details verbatim into tasks
   3. **TEST INTEGRATION**: Include tests in acceptance criteria, not as separate tasks
   4. **SMART DEPENDENCIES**: Create horizontal foundation tasks first, then vertical features
   
   **TASK STRUCTURE:**
   - **Horizontal Tasks**: Database setup, Backend framework, Frontend setup, Testing infrastructure
   - **Vertical Tasks**: Complete features with DB + API + Frontend + Tests
   
   **OUTPUT FORMAT:**
   Generate exact task-master CLI commands that can be executed directly.
   Each task should include ALL details from the spec, not references to it.

4. **Task Generation Pattern**:

   For each task, use this pattern:
   
   ```bash
   # Foundation task example (TaskMaster auto-assigns IDs)
   task-master add-task "Setup: [Component] Infrastructure" \
     --details="SOURCE: [spec-file]
     
     [Copy exact implementation details from spec]
     
     ACCEPTANCE CRITERIA:
     - [ ] [Specific criteria from spec]
     - [ ] Tests written and passing
     - [ ] [Additional criteria]" \
     --priority=high
   ```
   
   **Important Notes:**
   - Let TaskMaster handle ID assignment automatically
   - Store returned task IDs for dependency references
   - Dependencies reference the auto-generated IDs: `--dependencies="1,2,3"`

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
  - .taskmaster/config.json (configured for Claude CLI)
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

# Create state.json
cat > .taskmaster/state.json << 'EOF'
{
  "currentTag": "master",
  "lastSwitched": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "tags": {
    "master": {
      "name": "master",
      "description": "Default tag for project tasks",
      "created": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
    }
  }
}
EOF

# Create config.json
cat > .taskmaster/config.json << 'EOF'
{
  "models": {
    "main": {
      "provider": "anthropic",
      "modelId": "claude-3-7-sonnet-20250219",
      "maxTokens": 120000,
      "temperature": 0.2
    },
    "research": {
      "provider": "perplexity",
      "modelId": "sonar-pro",
      "maxTokens": 8700,
      "temperature": 0.1
    },
    "fallback": {
      "provider": "anthropic",
      "modelId": "claude-3-7-sonnet-20250219",
      "maxTokens": 120000,
      "temperature": 0.2
    }
  },
  "global": {
    "logLevel": "info",
    "debug": false,
    "defaultSubtasks": 5,
    "defaultPriority": "medium",
    "projectName": "$(basename "$PWD")",
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