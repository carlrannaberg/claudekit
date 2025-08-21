# Simple Task Master (STM) Integration

claudekit now supports [Simple Task Master (STM)](https://github.com/carlrannaberg/simple-task-master) as an optional task management system for specification commands. When STM is installed, it provides persistent task storage with dependency tracking, replacing the session-based TodoWrite tool.

## Installation

STM is optional. Install it globally to enable enhanced task management:

```bash
npm install -g simple-task-master
```

## How It Works

### Automatic Detection
The spec commands (`/spec:decompose` and `/spec:execute`) automatically detect if STM is installed:
- If STM is available: Uses persistent task storage with full metadata
- If STM is not available: Falls back to TodoWrite for session-based tracking

### Task Structure with STM

When using STM, tasks are created with rich metadata:

```bash
stm add "Implement user authentication module" \
  --description "Build complete auth system with JWT tokens" \
  --details "Technical requirements:
    - Use bcrypt for password hashing
    - Implement JWT with 24h expiry
    - Support refresh tokens
    - Add rate limiting to login endpoint
    Implementation reference: specs/auth.md#technical-details" \
  --validation "- All auth endpoints return proper status codes
    - Passwords are hashed with bcrypt
    - JWT tokens expire after 24 hours
    - Login endpoint rate limits after 5 attempts
    - All tests pass" \
  --tags "auth,security,phase1" \
  --status pending \
  --deps "task-123,task-456"
```

### Benefits Over TodoWrite

1. **Persistence**: Tasks survive between Claude Code sessions
2. **Rich Metadata**: 
   - `details`: Full technical requirements from specifications
   - `validation`: Acceptance criteria for task completion
3. **Dependencies**: Native support for task dependencies
4. **Search**: `stm grep` to find tasks by content
5. **Export**: JSON/YAML export for integration with other tools

## Command Integration

### /spec:decompose

When STM is available:
- Creates STM tasks with full specification details
- Preserves technical requirements in `--details`
- Adds acceptance criteria to `--validation`
- Tags tasks by phase, priority, and component
- Tracks dependencies between tasks

### /spec:execute

When STM is available:
- Loads pending tasks from STM database
- Passes full task details to implementation agents
- Updates task status as work progresses
- Monitors progress with `stm list --status in-progress`

## Workflow Example

```bash
# 1. Install STM (one-time)
npm install -g simple-task-master

# 2. Initialize STM in your project
cd your-project
stm init

# 3. Decompose a specification
/spec:decompose specs/feat-authentication.md
# Creates 15 STM tasks with dependencies

# 4. View the task breakdown
stm list --pretty

# 5. Execute the specification
/spec:execute specs/feat-authentication.md
# Agents read STM tasks and implement them

# 6. Monitor progress
stm list --status in-progress --pretty

# 7. View completed work
stm list --status done --pretty
```

## Task Management Commands

```bash
# View all tasks
stm list --pretty

# Filter by status
stm list --status pending
stm list --status in-progress
stm list --status done

# Search tasks
stm grep "authentication"
stm grep "database"

# Show task details
stm show <task-id>

# Update task status
stm update <task-id> --status in-progress
stm update <task-id> --status done

# Export tasks
stm export -f json > tasks.json
stm export -f yaml > tasks.yaml
```

## Fallback Behavior

If STM is not installed, the spec commands automatically fall back to TodoWrite:
- Tasks are created in the current session only
- Basic task information is tracked
- No persistence between sessions
- No dependency tracking

The commands work seamlessly in both modes, detecting STM availability at runtime.

## Best Practices

1. **Initialize STM per project**: Run `stm init` in each project root
2. **Use meaningful tags**: Tag by phase, component, and priority
3. **Document dependencies**: Link related tasks with `--deps`
4. **Keep tasks updated**: Update status as work progresses
5. **Export for reports**: Use `stm export` to generate status reports

## Troubleshooting

### STM not detected
- Ensure STM is installed globally: `npm list -g simple-task-master`
- Check PATH includes npm global bin directory
- Verify with: `which stm` or `stm --version`

### Tasks not persisting
- Ensure you've run `stm init` in the project directory
- Check for `.simple-task-master` directory in project root
- Verify write permissions in project directory

### Task details truncated
- STM supports multi-line content in `--details` and `--validation`
- Use quotes to preserve formatting
- Check task with `stm show <id>` to see full content