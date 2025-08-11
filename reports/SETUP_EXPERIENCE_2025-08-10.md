# Claudekit Interactive Setup Experience

## Overview
The claudekit setup wizard provides a three-step interactive installation process that allows users to customize their Claude Code environment with commands, hooks, and AI assistant subagents.

## Setup Flow

### Step 1: Choose Command Groups

Users can select from organized groups of slash commands:

#### Available Groups:

**🔀 Git Workflow** (Recommended ✓)
- Commands: `/checkpoint:create`, `/checkpoint:restore`, `/checkpoint:list`, `/git:commit`, `/git:status`, `/git:push`
- Purpose: Streamline git operations with intelligent checkpointing and commit assistance

**✅ Validation & Quality** (Recommended ✓)
- Commands: `/validate-and-fix`
- Purpose: Comprehensive code quality validation and automatic fixes

**🤖 AI Assistant Configuration**
- Commands: `/agent:init`, `/agent:migration`, `/agent:cli`, `/create-command`, `/config:bash-timeout`
- Purpose: Configure and customize Claude Code behavior and create custom commands

**📋 Specification Management**
- Commands: `/spec:create`, `/spec:validate`, `/spec:decompose`, `/spec:execute`
- Purpose: Spec-driven development workflow with TaskMaster integration

### Step 2: Choose Hook Groups

Users can select automated validation hooks that trigger on specific events:

#### Available Groups:

**📝 File Validation (PostToolUse)** (Recommended ✓)
- Hooks: `lint-changed`, `typecheck-changed`, `check-any-changed`, `test-changed`
- Trigger: After file modifications
- Purpose: Immediate validation of changed files

**✅ Completion Validation (Stop)** (Recommended ✓)
- Hooks: `typecheck-project`, `lint-project`, `test-project`, `check-todos`
- Trigger: When Claude Code stops
- Purpose: Ensure project quality and task completion

**💾 Safety Checkpoint (Stop)**
- Hooks: `create-checkpoint`
- Trigger: When Claude Code stops
- Purpose: Automatic git stash checkpoints for safety

Users can also select "Custom Hook Selection" to individually choose from all available hooks.

### Step 3: Choose Subagents (AI Assistants)

All 23 domain expert subagents are selected by default, organized by domain:

#### Domain Organization:

**TypeScript Domain**
- `typescript-expert` - Broad TypeScript expertise
- `typescript-type-expert` - Advanced type system specialist
- `typescript-build-expert` - Build and compilation specialist

**React Domain**
- `react-expert` - Broad React expertise
- `react-performance-expert` - Performance optimization specialist

**Testing Domain**
- `testing-expert` - Broad testing expertise
- `jest-expert` - Jest framework specialist
- `vitest-expert` - Vitest framework specialist
- `playwright-expert` - E2E testing specialist

**Database Domain**
- `database-expert` - Broad database expertise
- `postgres-expert` - PostgreSQL specialist
- `mongodb-expert` - MongoDB specialist

**Infrastructure Domain**
- `docker-expert` - Docker containerization specialist
- `github-actions-expert` - CI/CD workflow specialist

**Build Tools Domain**
- `webpack-expert` - Webpack configuration specialist
- `vite-expert` - Vite build tool specialist

**Frontend Domain**
- `css-styling-expert` - CSS and styling specialist
- `accessibility-expert` - Web accessibility specialist

**Other Domains**
- `nodejs-expert` - Node.js runtime specialist
- `git-expert` - Version control specialist
- `code-quality-expert` - Code quality and best practices
- `devops-expert` - DevOps and deployment specialist
- `nextjs-expert` - Next.js framework specialist

## User Experience Features

### Interactive Selection
- **Space bar**: Toggle individual items
- **'a' key**: Select/deselect all items in a group
- **Arrow keys**: Navigate between options
- **Enter**: Confirm selection and proceed

### Smart Defaults
- Recommended groups are pre-selected
- All subagents default to selected (users can deselect as needed)
- Project analysis determines applicable hooks

### Visual Feedback
- Clear grouping with emojis and descriptions
- Indented command/hook lists for clarity
- Color-coded output (dim for descriptions, accent for commands)
- Progress indicators for each step

## Installation Summary

After selections, users see a comprehensive summary:

```
Installation Summary
────────────────────────────────────────
• Command Groups: 2 selected (Git Workflow, Validation)
• Hook Groups: 2 selected (File Validation, Completion Validation)
• Subagents: 23 selected (all domain experts)

Total components to install: ~40+ items
```

## Non-Interactive Options

For CI/CD or automated setups, claudekit supports flags:

```bash
# Install everything with defaults
claudekit setup --yes

# Install specific components
claudekit setup --commands git-workflow,validation --hooks file-validation

# Install to user directory only
claudekit setup --user

# Dry run to preview changes
claudekit setup --dry-run
```

## Benefits of Grouped Installation

### For Commands
- **Logical grouping**: Related commands installed together
- **Workflow-based**: Groups align with common development workflows
- **Easy discovery**: Users understand what each group provides

### For Hooks
- **Event-based grouping**: Hooks grouped by trigger event
- **Performance conscious**: Users can choose validation timing
- **Clear purpose**: Each group has a specific quality goal

### For Subagents
- **Domain expertise**: Agents organized by technology domain
- **Hierarchical structure**: Broad experts with specialized sub-experts
- **Complete coverage**: All major development areas covered

## Customization After Setup

Users can further customize after initial setup:

1. **Add individual components**: `claudekit add [component]`
2. **Remove components**: `claudekit remove [component]`
3. **Edit settings**: Modify `.claude/settings.json`
4. **Create custom commands**: `/create-command`
5. **Configure agents**: Update AGENT.md with `/agent:init`

## Typical Installation Profiles

### Minimal Setup
- Git Workflow commands only
- No hooks
- No subagents
- For: Users wanting basic git integration

### Recommended Setup (Default)
- Git Workflow + Validation commands
- File and Completion validation hooks
- All subagents
- For: Most development projects

### Quality-Focused Setup
- All command groups
- All validation hooks
- All subagents
- For: Teams prioritizing code quality

### CI/CD Setup
- Validation commands
- Project validation hooks
- No subagents (agents are interactive)
- For: Automated environments

## Summary

The interactive setup experience provides a user-friendly way to configure claudekit with:
- **3 clear steps** for progressive configuration
- **Grouped components** for logical selection
- **Smart defaults** based on best practices
- **Full customization** while maintaining simplicity
- **23 domain expert subagents** for comprehensive AI assistance

This design ensures users can quickly set up a powerful development environment tailored to their specific needs.