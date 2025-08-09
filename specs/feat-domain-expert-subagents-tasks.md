# Task Breakdown: Domain Expert Subagents Library
Generated: 2025-08-08
Source: specs/feat-domain-expert-subagents.md
Version: 2.0.0

## Overview
Implementation of a comprehensive library of subagents for Claude Code, distributed through claudekit. The MVP focuses on creating the infrastructure and a single TypeScript expert agent as proof of concept.

**Total Implementation Time**: 3 days
**MVP Scope**: Infrastructure + TypeScript Expert Agent

## Phase 1: Infrastructure Setup (Day 1)

### Task 1.1: Create Agent Directory Structure
**Description**: Set up the source directory structure for the subagents library
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Create `src/agents/` base directory
- Create subdirectories for domain organization
- Follow the structure from spec lines 68-85

**Directory Structure to Create**:
```
src/
├── agents/                    # Subagents library
│   ├── typescript/           # TypeScript subagents
│   │   └── expert.md        # Broad TypeScript expert (to be created in Phase 2)
│   ├── react/               # React subagents (future)
│   ├── testing/             # Testing subagents (future)
│   ├── database/            # Database subagents (future)
│   └── README.md            # Documentation for agent structure
```

**Implementation Steps**:
1. Create `src/agents/` directory
2. Create subdirectories: `typescript/`, `react/`, `testing/`, `database/`
3. Add README.md explaining the structure

**Acceptance Criteria**:
- [ ] Directory structure matches specification
- [ ] README.md documents the organization pattern
- [ ] Directories are properly committed to git

### Task 1.2: Extend Setup Command Types
**Description**: Add TypeScript types and interfaces for agent management in setup.ts
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.3

**Technical Requirements**:
```typescript
// Add to cli/commands/setup.ts

interface Agent {
  id: string;
  name: string;
  description: string;
  path: string;
}

interface SetupOptions {
  all?: boolean;
  skipAgents?: boolean;
}

// Agent definitions (MVP: just TypeScript)
private agents: Agent[] = [
  {
    id: 'typescript-expert',
    name: 'TypeScript Expert',
    description: 'TypeScript/JavaScript guidance',
    path: 'typescript/expert.md'
  }
];
```

**Implementation Steps**:
1. Add Agent interface definition
2. Add SetupOptions interface
3. Define agents array with TypeScript expert entry
4. Import necessary dependencies (fs-extra, path, inquirer)

**Acceptance Criteria**:
- [ ] TypeScript compiles without errors
- [ ] Agent interface matches specification
- [ ] TypeScript expert is defined in agents array

### Task 1.3: Implement Feature Selection Menu
**Description**: Add subagents to the interactive setup feature selection
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.2
**Can run parallel with**: None

**Complete Implementation from Specification**:
```typescript
// In cli/commands/setup.ts

private async promptFeatures() {
  // Show feature selection menu
  const response = await prompt({
    type: 'checkbox',
    message: 'Select features to install:',
    choices: [
      { name: 'Slash Commands', value: 'commands', checked: true },
      { name: 'Hooks', value: 'hooks', checked: true },
      { name: 'Subagents', value: 'agents', checked: true }
    ]
  });
  return response;
}

async run(options: { all?: boolean, skipAgents?: boolean }) {
  if (options.all) {
    // Install everything
    await this.installAll();
    return;
  }

  // Interactive setup
  const features = await this.promptFeatures();
  
  if (features.includes('commands')) {
    await this.installCommands();
  }
  
  if (features.includes('hooks')) {
    await this.installHooks();
  }
  
  if (features.includes('agents') && !options.skipAgents) {
    await this.installAgents();
  }
}
```

**Implementation Steps**:
1. Modify promptFeatures() to include Subagents choice
2. Update run() method to handle agents feature
3. Add skipAgents option handling
4. Ensure proper async/await flow

**Acceptance Criteria**:
- [ ] Subagents appears in feature selection menu
- [ ] Selection is checked by default
- [ ] --skip-agents flag prevents agent installation
- [ ] Integration with existing commands and hooks works

### Task 1.4: Implement Agent Installation Logic
**Description**: Create the core logic for copying agent files during setup
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.3
**Can run parallel with**: None

**Complete Implementation from Specification**:
```typescript
// In cli/commands/setup.ts

private async installAgents() {
  // Prompt for agent selection
  const selectedAgents = await this.promptAgentSelection();
  
  console.log('\n🤖 Installing subagents...');
  
  const agentsDir = path.join('.claude', 'agents');
  await fs.ensureDir(agentsDir);
  
  for (const agent of selectedAgents) {
    const sourcePath = path.join(__dirname, '../../src/agents', agent.path);
    const destPath = path.join(agentsDir, `${agent.id}.md`);
    
    await fs.copyFile(sourcePath, destPath);
    console.log(`  ✅ ${agent.id}`);
  }
}

private async promptAgentSelection() {
  const response = await prompt({
    type: 'checkbox',
    message: 'Select subagents to install:',
    choices: this.agents.map(agent => ({
      name: `${agent.name} - ${agent.description}`,
      value: agent,
      checked: true
    }))
  });
  return response;
}
```

**Technical Requirements**:
- Use fs-extra for file operations
- Ensure `.claude/agents/` directory exists
- Copy from `src/agents/` to `.claude/agents/`
- Display progress with emoji indicators

**Implementation Steps**:
1. Create installAgents() method
2. Create promptAgentSelection() method
3. Implement directory creation logic
4. Implement file copying with proper paths
5. Add console output for progress

**Acceptance Criteria**:
- [ ] Agent selection prompt shows TypeScript expert
- [ ] Files are copied to correct location
- [ ] Progress is displayed with emojis
- [ ] Error handling for missing source files
- [ ] Directory is created if it doesn't exist

### Task 1.5: Add Command-Line Flags
**Description**: Add CLI flags for non-interactive agent installation
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 1.4
**Can run parallel with**: Task 1.6

**Technical Requirements**:
- Add `--all` flag to install everything
- Add `--skip-agents` flag to skip agent installation
- Update help text

**Implementation**:
```typescript
// In cli/claudekit.ts or setup command definition

program
  .command('setup')
  .description('Set up claudekit in your project')
  .option('--all', 'Install all features without prompting')
  .option('--skip-agents', 'Skip subagent installation')
  .action(async (options) => {
    const setup = new SetupCommand();
    await setup.run(options);
  });
```

**Acceptance Criteria**:
- [ ] --all flag installs agents without prompting
- [ ] --skip-agents flag skips agent installation
- [ ] Flags are documented in help text

### Task 1.6: Update installAll Method
**Description**: Ensure installAll() includes agent installation
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.4
**Can run parallel with**: Task 1.5

**Implementation**:
```typescript
private async installAll() {
  console.log('Installing all claudekit features...\n');
  
  await this.installCommands();
  await this.installHooks();
  
  // Select all agents automatically
  const allAgents = this.agents;
  console.log('\n🤖 Installing subagents...');
  
  const agentsDir = path.join('.claude', 'agents');
  await fs.ensureDir(agentsDir);
  
  for (const agent of allAgents) {
    const sourcePath = path.join(__dirname, '../../src/agents', agent.path);
    const destPath = path.join(agentsDir, `${agent.id}.md`);
    
    await fs.copyFile(sourcePath, destPath);
    console.log(`  ✅ ${agent.id}`);
  }
  
  this.showCompletionMessage();
}
```

**Acceptance Criteria**:
- [ ] installAll() includes agents
- [ ] All agents are installed without prompting
- [ ] Completion message shows agent count

## Phase 2: TypeScript Agent Creation (Day 2)

### Task 2.1: Create TypeScript Expert Agent File
**Description**: Implement the complete TypeScript expert subagent following Claude Code format
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1 (directory structure)
**Can run parallel with**: None

**Complete Agent Implementation**:
```markdown
# src/agents/typescript/expert.md
---
name: typescript-expert
description: Expert in TypeScript and JavaScript - type system, build configuration, module resolution, debugging, and best practices
tools: Read, Grep, Glob, Edit, MultiEdit, Write, Bash
---

# TypeScript Expert

You are a TypeScript and JavaScript expert with deep knowledge of the language, type system, build tools, and ecosystem.

## Core Expertise

### TypeScript Type System
- Generic types and constraints
- Conditional types and type inference
- Union and intersection types
- Type guards and narrowing
- Declaration merging
- Module augmentation
- Utility types (Partial, Required, Pick, Omit, etc.)

### Build and Configuration
- tsconfig.json optimization
- Module resolution strategies
- Compilation targets and lib configuration
- Path mapping and aliases
- Build tool integration (esbuild, webpack, vite)
- Source maps and debugging

### JavaScript Fundamentals
- ES2015+ features and syntax
- Async/await and promises
- Prototypes and classes
- Closures and scope
- Event loop and concurrency

### Common Issues and Solutions
- Type errors and how to fix them
- Module resolution problems
- Build performance optimization
- Declaration file creation
- Third-party library typing
- Migration from JavaScript to TypeScript

## Approach

1. **Diagnosis First**: Always understand the root cause before proposing solutions
2. **Type Safety**: Prefer type-safe solutions while maintaining developer experience
3. **Performance Aware**: Consider both runtime and compile-time performance
4. **Best Practices**: Follow TypeScript and JavaScript community standards
5. **Educational**: Explain concepts while solving problems

## Key Commands and Tools

### Diagnostic Commands
- `tsc --noEmit` - Type check without emitting files
- `tsc --listFiles` - Show all files included in compilation
- `tsc --traceResolution` - Debug module resolution
- `tsc --extendedDiagnostics` - Performance metrics
- `npx typescript --version` - Check TypeScript version

### Common Patterns

#### Strict Type Checking
Always recommend enabling strict mode for new projects:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

#### Module Resolution
For Node.js projects with modern resolution:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Best Practices

### Type Definitions
- Prefer interfaces over type aliases for object shapes
- Use const assertions for literal types
- Leverage type inference where possible
- Document complex types with JSDoc comments

### Error Handling
- Use discriminated unions for error states
- Implement proper error boundaries
- Type catch clauses when possible

### Performance
- Use incremental compilation for large projects
- Configure include/exclude properly
- Consider project references for monorepos
- Optimize type instantiation depth

## Common Tasks

When asked about TypeScript issues, I will:
1. Analyze the error messages and code context
2. Identify the root cause of the issue
3. Provide multiple solution approaches when applicable
4. Explain the trade-offs of each approach
5. Recommend the most appropriate solution
6. Include code examples and explanations

I can help with:
- Debugging type errors
- Optimizing build configuration
- Migrating JavaScript to TypeScript
- Setting up new TypeScript projects
- Integrating with build tools
- Writing declaration files
- Understanding advanced type features
```

**Implementation Steps**:
1. Create file at `src/agents/typescript/expert.md`
2. Add YAML frontmatter with required fields
3. Include comprehensive system prompt
4. Cover all expertise areas from specification
5. Include diagnostic commands and patterns

**Acceptance Criteria**:
- [ ] File has valid YAML frontmatter
- [ ] name field is "typescript-expert"
- [ ] description field is comprehensive
- [ ] tools field lists appropriate tools
- [ ] System prompt covers TypeScript expertise
- [ ] Includes practical commands and patterns
- [ ] Follows subagent authoring principles

### Task 2.2: Create Agent Documentation
**Description**: Create README for the agents directory explaining structure and usage
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.3

**Documentation Content**:
```markdown
# Claudekit Subagents Library

This directory contains specialized subagents for Claude Code that provide deep expertise in specific technical domains.

## Structure

Subagents are organized by domain:
- `typescript/` - TypeScript and JavaScript experts
- `react/` - React and frontend framework experts (future)
- `testing/` - Testing framework experts (future)
- `database/` - Database and data layer experts (future)

## Format

Each subagent is a markdown file with YAML frontmatter following Claude Code's native format:

\```yaml
---
name: agent-identifier
description: Brief description of expertise
tools: Comma-separated list of allowed tools
---
\```

## Current Agents

### TypeScript Expert (`typescript/expert.md`)
- Comprehensive TypeScript and JavaScript expertise
- Type system mastery
- Build configuration optimization
- Module resolution debugging
- Migration guidance

## Usage

Agents are automatically copied to `.claude/agents/` during `claudekit setup`.

Claude Code will automatically delegate to these agents based on task context.

## Contributing

To add a new subagent:
1. Create a new `.md` file in the appropriate domain folder
2. Follow the format requirements above
3. Add the agent to `cli/commands/setup.ts` agents array
4. Test the agent with real scenarios
5. Submit a pull request

## Best Practices

1. **Focused Expertise**: Each agent should have a clear domain
2. **Comprehensive Prompts**: Include all relevant expertise areas
3. **Practical Examples**: Provide real commands and patterns
4. **Tool Restrictions**: Only request necessary tools
5. **Educational Approach**: Explain while solving
```

**Acceptance Criteria**:
- [ ] README explains directory structure
- [ ] Documents agent format requirements
- [ ] Lists current agents
- [ ] Includes contribution guidelines
- [ ] Provides best practices

### Task 2.3: Validate Agent Format
**Description**: Create validation tests for the TypeScript agent
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.2

**Test Implementation**:
```typescript
// tests/unit/test-subagents.sh

#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/../test-framework.sh"

test_suite_start "Subagent Format Validation"

# Test: TypeScript agent exists
test_start "TypeScript agent file exists"
if [[ -f "src/agents/typescript/expert.md" ]]; then
  test_pass
else
  test_fail "TypeScript expert agent not found"
fi

# Test: Valid YAML frontmatter
test_start "TypeScript agent has valid frontmatter"
AGENT_FILE="src/agents/typescript/expert.md"
if [[ -f "$AGENT_FILE" ]]; then
  # Extract frontmatter
  FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$AGENT_FILE")
  
  # Check required fields
  if echo "$FRONTMATTER" | grep -q "^name:" && \
     echo "$FRONTMATTER" | grep -q "^description:" && \
     echo "$FRONTMATTER" | grep -q "^tools:"; then
    test_pass
  else
    test_fail "Missing required frontmatter fields"
  fi
else
  test_skip "Agent file not found"
fi

# Test: Agent name format
test_start "Agent name follows convention"
if grep -q "^name: typescript-expert$" "$AGENT_FILE"; then
  test_pass
else
  test_fail "Agent name should be 'typescript-expert'"
fi

# Test: System prompt length
test_start "System prompt is comprehensive"
# Count lines after frontmatter
PROMPT_LINES=$(sed '1,/^---$/d' "$AGENT_FILE" | sed '1,/^---$/d' | wc -l)
if [[ $PROMPT_LINES -gt 50 ]]; then
  test_pass
else
  test_fail "System prompt too short (${PROMPT_LINES} lines, need >50)"
fi

test_suite_end
```

**Acceptance Criteria**:
- [ ] Test validates agent file exists
- [ ] Test checks YAML frontmatter format
- [ ] Test verifies required fields
- [ ] Test ensures prompt is comprehensive
- [ ] All tests pass

## Phase 3: Testing & Documentation (Day 3)

### Task 3.1: Integration Testing with Setup Command
**Description**: Test the complete setup flow with agent installation
**Size**: Large
**Priority**: High
**Dependencies**: All Phase 1 and Phase 2 tasks
**Can run parallel with**: Task 3.2

**Test Scenarios**:
```bash
#!/usr/bin/env bash
# tests/integration/test-setup-agents.sh

set -euo pipefail
source "$(dirname "$0")/../test-framework.sh"

test_suite_start "Setup Command Agent Integration"

# Setup test environment
TEST_DIR="/tmp/claudekit-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Test: Interactive setup includes agents
test_start "Interactive setup shows agent option"
# Simulate selection of all features
echo -e "commands\nhooks\nagents\n" | claudekit setup 2>&1 | tee setup.log

if grep -q "Installing subagents" setup.log && \
   grep -q "typescript-expert" setup.log; then
  test_pass
else
  test_fail "Agents not included in setup"
fi

# Test: Agent file is copied correctly
test_start "TypeScript agent installed to .claude/agents/"
if [[ -f ".claude/agents/typescript-expert.md" ]]; then
  # Verify content matches source
  if grep -q "name: typescript-expert" ".claude/agents/typescript-expert.md"; then
    test_pass
  else
    test_fail "Agent file corrupted during copy"
  fi
else
  test_fail "Agent file not found after installation"
fi

# Test: --all flag installs agents
test_start "Setup --all installs agents"
rm -rf .claude
claudekit setup --all 2>&1 | tee setup-all.log

if [[ -f ".claude/agents/typescript-expert.md" ]]; then
  test_pass
else
  test_fail "--all flag did not install agents"
fi

# Test: --skip-agents flag works
test_start "Setup --skip-agents excludes agents"
rm -rf .claude
claudekit setup --skip-agents 2>&1 | tee setup-skip.log

if [[ ! -d ".claude/agents" ]]; then
  test_pass
else
  test_fail "--skip-agents flag did not work"
fi

# Cleanup
cd /
rm -rf "$TEST_DIR"

test_suite_end
```

**Implementation Steps**:
1. Create integration test file
2. Test interactive setup flow
3. Test --all flag behavior
4. Test --skip-agents flag
5. Verify file copying works correctly
6. Check for proper error handling

**Acceptance Criteria**:
- [ ] Interactive setup includes agents
- [ ] Files are copied to correct location
- [ ] --all flag works correctly
- [ ] --skip-agents flag works correctly
- [ ] Content is preserved during copy
- [ ] All integration tests pass

### Task 3.2: Update Main README
**Description**: Add subagents information to the main claudekit README
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 2.1
**Can run parallel with**: Task 3.1

**README Addition**:
```markdown
## Subagents

Claudekit includes a library of specialized subagents that enhance Claude Code with domain expertise:

### Available Agents

- **TypeScript Expert**: Comprehensive TypeScript/JavaScript guidance
  - Type system debugging
  - Build configuration
  - Module resolution
  - Best practices

### Installation

Subagents are installed during initial setup:

\```bash
# Interactive setup (select Subagents when prompted)
claudekit setup

# Install everything including agents
claudekit setup --all

# Skip agents if not needed
claudekit setup --skip-agents
\```

### Usage

Once installed, Claude Code automatically delegates to appropriate subagents based on your task. For example:

- "Fix this TypeScript error" → Delegates to typescript-expert
- "Optimize my build" → Delegates to typescript-expert
- "Help with React hooks" → Uses general assistance (React agent coming soon)

### Custom Agents

Create your own agents by adding markdown files to `.claude/agents/`:

\```markdown
---
name: my-expert
description: My domain expertise
tools: Read, Grep, Edit
---

# System prompt here
\```

See `src/agents/` for examples.
```

**Acceptance Criteria**:
- [ ] README mentions subagents feature
- [ ] Installation instructions included
- [ ] Usage examples provided
- [ ] Links to agent directory

### Task 3.3: Create CHANGELOG Entry
**Description**: Document the new subagents feature in CHANGELOG
**Size**: Small
**Priority**: Low
**Dependencies**: All tasks
**Can run parallel with**: Task 3.4

**CHANGELOG Entry**:
```markdown
## [Unreleased]

### Added
- Subagents library with TypeScript expert agent
- Agent installation in `claudekit setup` command
- `.claude/agents/` directory for custom agents
- `--skip-agents` flag for setup command

### Changed
- Setup command now includes three features: commands, hooks, and agents
- Interactive setup menu expanded with agent selection
```

**Acceptance Criteria**:
- [ ] CHANGELOG documents new feature
- [ ] Changes are under "Unreleased" section
- [ ] Follows existing CHANGELOG format

### Task 3.4: Build and Package Verification
**Description**: Ensure the TypeScript builds correctly with agent changes
**Size**: Medium
**Priority**: High
**Dependencies**: All implementation tasks
**Can run parallel with**: Task 3.3

**Verification Steps**:
```bash
# Build the project
npm run build

# Verify build output includes setup changes
ls -la dist/cli/commands/setup.js

# Test that the built version works
node dist/cli/claudekit.js setup --help | grep "skip-agents"

# Run the test suite
npm test

# Verify agent file is included in package
npm pack --dry-run | grep "src/agents/typescript/expert.md"
```

**Acceptance Criteria**:
- [ ] TypeScript compiles without errors
- [ ] Built files include agent functionality
- [ ] CLI help shows new flags
- [ ] All tests pass
- [ ] Agent files included in package

### Task 3.5: Manual Testing Checklist
**Description**: Perform end-to-end manual testing of the feature
**Size**: Medium
**Priority**: High
**Dependencies**: Task 3.4
**Can run parallel with**: None

**Manual Test Checklist**:
1. **Fresh Installation**:
   - [ ] Run `claudekit setup` in new project
   - [ ] Verify Subagents appears in menu
   - [ ] Select only Subagents, verify only agents installed
   - [ ] Check `.claude/agents/typescript-expert.md` exists

2. **All Features Installation**:
   - [ ] Run `claudekit setup --all`
   - [ ] Verify agents installed without prompting
   - [ ] Check completion message shows agent count

3. **Skip Agents**:
   - [ ] Run `claudekit setup --skip-agents`
   - [ ] Verify agents menu doesn't appear
   - [ ] Verify no `.claude/agents/` directory created

4. **Claude Code Integration**:
   - [ ] Open project in Claude Code
   - [ ] Ask TypeScript-specific question
   - [ ] Verify delegation occurs (if supported)

5. **Update Scenario**:
   - [ ] Modify `.claude/agents/typescript-expert.md`
   - [ ] Run `claudekit setup` again
   - [ ] Verify handling of existing files

**Acceptance Criteria**:
- [ ] All manual test scenarios pass
- [ ] No unexpected errors occur
- [ ] User experience is smooth
- [ ] Feature works as specified

## Summary

### Phase Distribution
- **Phase 1 (Infrastructure)**: 6 tasks
- **Phase 2 (TypeScript Agent)**: 3 tasks  
- **Phase 3 (Testing & Docs)**: 5 tasks
- **Total**: 14 tasks

### Complexity Breakdown
- Small: 4 tasks
- Medium: 6 tasks
- Large: 4 tasks

### Parallel Execution Opportunities
- Phase 1: Tasks 1.1 and 1.2 can run in parallel
- Phase 2: Tasks 2.2 and 2.3 can run in parallel
- Phase 3: Tasks 3.1 and 3.2 can run in parallel

### Critical Path
1. Task 1.1 (Directory Structure) 
2. Task 1.2 (Types)
3. Task 1.3 (Feature Menu)
4. Task 1.4 (Installation Logic)
5. Task 2.1 (TypeScript Agent)
6. Task 3.4 (Build Verification)
7. Task 3.5 (Manual Testing)

### Risk Areas
- **Integration Risk**: Setup command modifications could affect existing functionality
  - Mitigation: Comprehensive integration testing (Task 3.1)
- **Format Risk**: Agent format must match Claude Code expectations exactly
  - Mitigation: Format validation tests (Task 2.3)
- **User Experience Risk**: Setup flow changes could confuse users
  - Mitigation: Clear prompts and documentation (Task 3.2)

### Success Metrics
- All 14 tasks completed
- TypeScript agent successfully installed via setup
- All tests (unit and integration) passing
- Manual testing checklist fully verified
- Documentation updated