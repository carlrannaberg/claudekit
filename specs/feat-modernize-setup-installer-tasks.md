# Task Breakdown: Modernize Setup Installer
Generated: 2025-07-19
Source: specs/feat-modernize-setup-installer.md

## Overview
Replace the current monolithic bash setup.sh script with a modern TypeScript CLI installer that provides interactive wizard flows, non-interactive CI/CD support, and selective component installation for macOS and Linux.

**Note**: The original specification mentioned 41 tasks, but after careful decomposition, 31 actionable tasks were identified as the optimal breakdown. Some originally envisioned tasks were consolidated to avoid redundancy and improve project clarity.

## Phase 1: Foundation

### Task 1.1: Initialize TypeScript CLI project structure
**Description**: Set up the TypeScript project with proper configuration and dependencies
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None

**Technical Requirements**:
- Node.js >=20.0.0 for stable ESM support
- TypeScript ^5.8.0 with strict mode
- ESM package configuration
- Proper project structure under packages/cli/

**Implementation Steps**:
1. Create packages/cli directory structure
2. Initialize package.json with type: "module"
3. Configure tsconfig.json with strict mode and ESM output
4. Set up build scripts using esbuild
5. Configure vitest for testing
6. Add prettier for code formatting

**Acceptance Criteria**:
- [ ] TypeScript project compiles successfully
- [ ] ESM imports/exports work correctly
- [ ] Build produces dist/ output
- [ ] Tests can be run with vitest
- [ ] Linting and formatting configured

### Task 1.2: Install and configure core dependencies
**Description**: Install required npm packages and configure them properly
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.3

**Technical Requirements**:
- @inquirer/prompts: ^7.6.0
- commander: ^14.0.0
- ora: ^8.2.0
- picocolors: ^1.1.0
- fs-extra: ^11.3.0
- Dev dependencies: @types/node, @types/fs-extra, vitest, prettier

**Implementation Steps**:
1. Install production dependencies
2. Install development dependencies
3. Configure TypeScript types
4. Set up import aliases if needed
5. Verify all dependencies resolve correctly

**Acceptance Criteria**:
- [ ] All dependencies installed with exact versions
- [ ] No peer dependency warnings
- [ ] TypeScript recognizes all types
- [ ] Import statements work correctly

### Task 1.3: Create CLI entry point with commander
**Description**: Build the main CLI entry point with subcommand structure
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Main entry point at src/index.ts
- Commander subcommands: setup, add, remove, update, list
- Proper version and help handling
- Export for programmatic use

**Implementation Steps**:
1. Create src/index.ts with commander setup
2. Define all subcommands with descriptions
3. Add global options (--verbose, --quiet, --dry-run)
4. Create bin/claudekit wrapper script
5. Configure package.json bin field

**Acceptance Criteria**:
- [ ] CLI responds to --help and --version
- [ ] All subcommands are registered
- [ ] Global options are available
- [ ] Can be run via npx

### Task 1.4: Implement type definitions and interfaces
**Description**: Define all TypeScript types and interfaces for the system
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.5

**Technical Requirements**:
- Component interface with all properties
- ProjectInfo interface for detection
- Installation interfaces
- Configuration types
- Result types for operations

**Implementation Example from spec**:
```typescript
interface Component {
  id: string;
  type: 'command' | 'hook';
  name: string;
  description: string;
  path: string;
  dependencies: string[];
  platforms: Platform[];
  category: string;
}

interface ProjectInfo {
  hasTypeScript: boolean;
  hasESLint: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | null;
  projectPath: string;
}

interface Installation {
  components: Component[];
  target: InstallTarget;
  backup: boolean;
  dryRun: boolean;
  projectInfo?: ProjectInfo;
}
```

**Acceptance Criteria**:
- [ ] All interfaces defined in src/types/index.ts
- [ ] Types are exported properly
- [ ] No any types used
- [ ] Proper enum definitions

### Task 1.5: Set up testing infrastructure
**Description**: Configure vitest with proper mocking and test utilities
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.4

**Technical Requirements**:
- Vitest configuration
- Mock setup for fs-extra
- Mock setup for @inquirer/prompts
- Test utilities and helpers
- Coverage configuration

**Implementation Steps**:
1. Create vitest.config.ts
2. Set up test directory structure
3. Create mock implementations
4. Configure coverage thresholds
5. Add test scripts to package.json

**Acceptance Criteria**:
- [ ] Tests run successfully
- [ ] Mocks work correctly
- [ ] Coverage reports generated
- [ ] Test commands in package.json

## Phase 2: Core File Operations

### Task 2.1: Implement filesystem module with Unix focus
**Description**: Build filesystem.ts module with Unix-focused operations and backup support
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.4
**Can run parallel with**: Task 2.2

**Technical Requirements**:
- Path validation: Basic checks for reasonable paths
- Permission checks: Verify write permissions before operations
- Backup creation: Simple backup before overwriting files
- Error handling: Graceful failure with helpful messages
- Unix path handling: Use path.join, os.homedir(), standard Unix permissions

**Functions to implement**:
- validateProjectPath(input: string): boolean
- ensureDirectoryExists(path: string): Promise<void>
- copyFileWithBackup(source: string, target: string, backup: boolean): Promise<void>
- setExecutablePermission(filePath: string): Promise<void> - chmod 755
- needsUpdate(source: string, target: string): Promise<boolean> - SHA-256 comparison
- getFileHash(filePath: string): Promise<string>

**Implementation example from spec**:
```typescript
async function needsUpdate(source: string, target: string): Promise<boolean> {
  if (!await fs.pathExists(target)) return true;
  
  const sourceHash = await getFileHash(source);
  const targetHash = await getFileHash(target);
  
  return sourceHash !== targetHash;
}

async function getFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

**Acceptance Criteria**:
- [ ] All file operations handle Unix paths correctly
- [ ] SHA-256 based idempotency checking implemented
- [ ] Backup functionality creates timestamped backups
- [ ] Executable permissions set correctly for hooks (755)
- [ ] Path validation prevents directory traversal
- [ ] Comprehensive unit tests with mocked fs

### Task 2.2: Build configuration management module
**Description**: Create config.ts for managing Claude settings with complex hook structures
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.4
**Can run parallel with**: Task 2.1

**Technical Requirements**:
- Read existing settings.json files
- Merge settings with proper deduplication
- Handle complex hook matcher format
- Convert relative to absolute paths
- Pretty print JSON output

**Implementation example from spec**:
```typescript
interface HookConfig {
  matcher: string;
  hooks: Array<{ type: string; command: string }>;
}

interface ClaudeSettings {
  hooks: Record<string, HookConfig[]>;
  [key: string]: unknown;
}

async function mergeSettings(claudeSettings: ClaudeSettings, existingSettings: ClaudeSettings): Promise<ClaudeSettings> {
  const result = { ...existingSettings };
  
  // Handle complex hook structure with matchers
  for (const [event, claudeHooks] of Object.entries(claudeSettings.hooks || {})) {
    const existingHooks = existingSettings.hooks?.[event] || [];
    
    // Merge hooks while preserving matcher structure
    const allHooks = [...existingHooks, ...claudeHooks];
    
    // Deduplicate based on command path
    const uniqueHooks = allHooks.filter((hook, index) => {
      return !allHooks.slice(0, index).some(h => 
        h.matcher === hook.matcher && 
        JSON.stringify(h.hooks) === JSON.stringify(hook.hooks)
      );
    });
    
    result.hooks = { ...result.hooks, [event]: uniqueHooks };
  }
  
  return result;
}
```

**Acceptance Criteria**:
- [ ] Settings merge preserves existing configurations
- [ ] Complex hook matchers handled correctly
- [ ] Paths converted to absolute
- [ ] No duplicate hooks after merge
- [ ] JSON formatted with 2-space indent
- [ ] Unit tests cover merge scenarios

### Task 2.3: Create component discovery system
**Description**: Build component scanning and metadata management
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.4, Task 2.1
**Can run parallel with**: Task 2.4

**Technical Requirements**:
- Scan src/commands and src/hooks directories
- Parse component metadata from files
- Build dependency graph
- Cache component information
- Support component filtering

**Implementation Steps**:
1. Create components.ts module
2. Implement directory scanning
3. Parse metadata from file headers
4. Build component registry
5. Implement dependency resolution
6. Add caching layer

**Acceptance Criteria**:
- [ ] All components discovered correctly
- [ ] Metadata parsed accurately
- [ ] Dependencies tracked properly
- [ ] Performance < 500ms for discovery
- [ ] Tests verify component loading

### Task 2.4: Implement validation module
**Description**: Create validation logic for paths, components, and prerequisites
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.4
**Can run parallel with**: Task 2.3

**Technical Requirements**:
- Path validation with safety checks
- Component name validation
- Prerequisite checking (TypeScript, ESLint)
- Input sanitization
- Clear error messages

**Implementation example from spec**:
```typescript
function validateProjectPath(input: string): boolean {
  const resolved = path.resolve(input);
  
  // Basic safety checks
  if (!resolved || resolved.length < 3) return false;
  if (resolved.includes('..')) return false;
  
  // Ensure it's a valid directory
  return fs.pathExistsSync(resolved);
}

function sanitizeComponentList(components: string[]): string[] {
  return components
    .filter(c => typeof c === 'string')
    .filter(c => /^[a-z0-9:-]+$/.test(c))
    .filter(c => availableComponents.has(c))
    .slice(0, 50); // Reasonable limit
}
```

**Acceptance Criteria**:
- [ ] Path validation prevents malicious inputs
- [ ] Component validation enforces naming rules
- [ ] Prerequisites checked before installation
- [ ] Clear error messages for validation failures
- [ ] Unit tests cover edge cases

## Phase 3: Core Installation Logic

### Task 3.1: Build project detection system
**Description**: Implement automatic project type detection for smart defaults
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1, Task 2.4
**Can run parallel with**: Task 3.2

**Technical Requirements**:
- Detect TypeScript projects (tsconfig.json)
- Detect ESLint configuration
- Identify package manager
- Resolve project paths correctly
- Return structured ProjectInfo

**Implementation example from spec**:
```typescript
async function detectProjectContext(projectPath: string): Promise<ProjectInfo> {
  const resolvedPath = resolveProjectPath(projectPath);
  
  return {
    hasTypeScript: await fs.pathExists(path.join(resolvedPath, 'tsconfig.json')),
    hasESLint: await hasEslintConfig(resolvedPath),
    packageManager: await detectPackageManager(resolvedPath),
    projectPath: resolvedPath
  };
}

async function hasEslintConfig(projectPath: string): Promise<boolean> {
  const configFiles = ['.eslintrc.json', '.eslintrc.js', '.eslintrc.yaml', 'eslint.config.js'];
  for (const file of configFiles) {
    if (await fs.pathExists(path.join(projectPath, file))) {
      return true;
    }
  }
  return false;
}
```

**Acceptance Criteria**:
- [ ] TypeScript projects detected correctly
- [ ] ESLint configurations found
- [ ] Package manager identified
- [ ] Path resolution handles ~/
- [ ] Tests cover various project types

### Task 3.2: Create installer core module
**Description**: Build the main installation orchestration logic
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2, Task 2.3
**Can run parallel with**: Task 3.1

**Technical Requirements**:
- Orchestrate full installation flow
- Handle both interactive and non-interactive modes
- Implement rollback on failure
- Progress tracking
- Dry-run support

**Implementation Steps**:
1. Create installer.ts module
2. Implement installation planning
3. Add transaction support for rollback
4. Implement progress callbacks
5. Add dry-run mode
6. Handle errors gracefully

**Acceptance Criteria**:
- [ ] Full installation flow works end-to-end
- [ ] Rollback cleans up on failure
- [ ] Progress reported correctly
- [ ] Dry-run shows what would happen
- [ ] Integration tests verify flow

### Task 3.3: Implement dependency resolution
**Description**: Build automatic dependency inclusion system
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: Task 3.4

**Technical Requirements**:
- Define component dependencies
- Auto-include validation-lib.sh when needed
- Resolve transitive dependencies
- Handle circular dependencies
- Maintain installation order

**Implementation example from spec**:
```typescript
const DEPENDENCIES = {
  'typecheck.sh': ['validation-lib.sh'],
  'eslint.sh': ['validation-lib.sh']
};

function resolveDependencies(selectedComponents: Component[]): Component[] {
  const resolved = new Set(selectedComponents.map(c => c.name));
  
  selectedComponents.forEach(component => {
    const deps = DEPENDENCIES[component.name];
    if (deps) {
      deps.forEach(dep => resolved.add(dep));
    }
  });
  
  return Array.from(resolved).map(name => findComponent(name));
}
```

**Acceptance Criteria**:
- [ ] Dependencies auto-included
- [ ] No duplicate components
- [ ] Correct installation order
- [ ] Tests verify resolution

### Task 3.4: Build recommendation engine
**Description**: Create smart component recommendation based on project type
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 3.1
**Can run parallel with**: Task 3.3

**Technical Requirements**:
- Recommend based on detected project type
- Include sensible defaults
- Explain recommendations
- Allow override
- Learn from user choices (future)

**Implementation example from spec**:
```typescript
function recommendComponents(projectInfo: ProjectInfo): Component[] {
  const recommended = [];
  
  if (projectInfo.hasTypeScript) {
    recommended.push('typecheck.sh');
    recommended.push('validation-lib.sh'); // Auto-include dependency
  }
  
  if (projectInfo.hasESLint) {
    recommended.push('eslint.sh');
    recommended.push('validation-lib.sh'); // Auto-include dependency
  }
  
  return recommended;
}
```

**Acceptance Criteria**:
- [ ] TypeScript projects get typecheck hook
- [ ] ESLint projects get eslint hook
- [ ] Dependencies included automatically
- [ ] Recommendations are sensible

## Phase 4: Interactive User Experience

### Task 4.1: Implement setup command with prompts
**Description**: Build the interactive setup wizard using @inquirer/prompts
**Size**: Large
**Priority**: High
**Dependencies**: Task 3.2, Task 3.4
**Can run parallel with**: Task 4.2

**Technical Requirements**:
- Welcome message and overview
- Installation type selection
- Component checkbox selection
- Project path input with validation
- Options configuration
- Confirmation before install

**Implementation Steps**:
1. Create commands/setup.ts
2. Implement wizard flow
3. Add input validation
4. Handle user cancellation
5. Show installation summary
6. Execute installation

**Acceptance Criteria**:
- [ ] Smooth wizard flow
- [ ] All prompts work correctly
- [ ] Validation prevents errors
- [ ] Cancellation handled gracefully
- [ ] Clear success/failure messages

### Task 4.2: Add non-interactive mode flags
**Description**: Implement all CLI flags for CI/CD automation
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.3, Task 3.2
**Can run parallel with**: Task 4.1

**Technical Requirements**:
- --yes flag for automatic confirmation
- --commands flag for component selection
- --hooks flag for hook selection
- --project flag for target directory
- --commands-only flag
- --dry-run flag

**Implementation Steps**:
1. Add flag definitions to commander
2. Parse component lists from flags
3. Skip prompts when flags provided
4. Validate flag inputs
5. Execute installation

**Acceptance Criteria**:
- [ ] All flags work as documented
- [ ] No prompts in non-interactive mode
- [ ] Flag validation prevents errors
- [ ] CI/CD usage documented
- [ ] Integration tests verify flags

### Task 4.3: Implement progress indicators
**Description**: Add ora spinners and progress feedback
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 1.2
**Can run parallel with**: Task 4.4

**Technical Requirements**:
- Component discovery spinner
- Installation progress
- Per-file copy status
- Success/failure indicators
- Respect --quiet flag

**Implementation Steps**:
1. Create progress utility module
2. Add spinners to long operations
3. Show file operation progress
4. Handle --quiet mode
5. Clear indicators on completion

**Acceptance Criteria**:
- [ ] Spinners show during operations
- [ ] Progress clear and informative
- [ ] --quiet suppresses output
- [ ] No console artifacts left
- [ ] Errors shown clearly

### Task 4.4: Add colorful output with picocolors
**Description**: Enhance CLI output with lightweight terminal colors
**Size**: Small
**Priority**: Low
**Dependencies**: Task 1.2
**Can run parallel with**: Task 4.3

**Technical Requirements**:
- Success messages in green
- Errors in red
- Warnings in yellow
- Info in cyan
- Respect NO_COLOR env var

**Implementation Steps**:
1. Create color utility module
2. Apply colors to all messages
3. Handle NO_COLOR environment
4. Ensure readability
5. Test on different terminals

**Acceptance Criteria**:
- [ ] Colors enhance readability
- [ ] NO_COLOR respected
- [ ] Works on macOS/Linux terminals
- [ ] Fallback for non-TTY
- [ ] Consistent color scheme

## Phase 5: Component Management Commands

### Task 5.1: Implement list command
**Description**: Create command to list available and installed components
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 2.3
**Can run parallel with**: Task 5.2, 5.3, 5.4

**Technical Requirements**:
- List all available components
- Show installed components
- Display component metadata
- Support filtering
- Format output nicely

**Implementation Steps**:
1. Create commands/list.ts
2. Add --available and --installed flags
3. Implement component filtering
4. Format output in tables
5. Add --json output option

**Acceptance Criteria**:
- [ ] Lists components correctly
- [ ] Shows installation status
- [ ] Filtering works
- [ ] Output well formatted
- [ ] JSON output for scripts

### Task 5.2: Implement add command
**Description**: Create command to add individual components
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 3.2
**Can run parallel with**: Task 5.1, 5.3, 5.4

**Technical Requirements**:
- Add specific components by name
- Support component type prefix
- Handle dependencies
- Update settings.json
- Show what was added

**Implementation Steps**:
1. Create commands/add.ts
2. Parse component arguments
3. Validate components exist
4. Resolve dependencies
5. Execute installation
6. Update configuration

**Acceptance Criteria**:
- [ ] Components added correctly
- [ ] Dependencies included
- [ ] Settings updated properly
- [ ] Clear success messages
- [ ] Error handling works

### Task 5.3: Implement remove command
**Description**: Create command to remove installed components
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 2.1, Task 2.2
**Can run parallel with**: Task 5.1, 5.2, 5.4

**Technical Requirements**:
- Remove component files
- Update settings.json
- Handle dependencies
- Confirm before removal
- Support --force flag

**Implementation Steps**:
1. Create commands/remove.ts
2. Find installed components
3. Check dependencies
4. Confirm removal
5. Delete files
6. Update settings

**Acceptance Criteria**:
- [ ] Components removed cleanly
- [ ] Settings updated correctly
- [ ] Dependencies handled
- [ ] Confirmation prevents accidents
- [ ] --force skips confirmation

### Task 5.4: Implement update command
**Description**: Create command to update existing components
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 2.1, Task 3.2
**Can run parallel with**: Task 5.1, 5.2, 5.3

**Technical Requirements**:
- Check for updates using SHA-256
- Update only changed files
- Preserve local modifications
- Show what was updated
- Support --all flag

**Implementation Steps**:
1. Create commands/update.ts
2. Compare file hashes
3. Identify changed files
4. Create backups
5. Update files
6. Report changes

**Acceptance Criteria**:
- [ ] Only updates changed files
- [ ] Backups created
- [ ] Local changes preserved
- [ ] Clear update report
- [ ] --all updates everything

## Phase 6: Testing

### Task 6.1: Write unit tests for core modules
**Description**: Comprehensive unit tests for all core functionality
**Size**: Large
**Priority**: High
**Dependencies**: All Phase 1-3 tasks
**Can run parallel with**: Task 6.2, 6.3

**Technical Requirements**:
- Test filesystem operations with mocks
- Test configuration merging
- Test validation logic
- Test component discovery
- Achieve >85% coverage

**Test Categories**:
- Filesystem operations (mocked)
- Configuration management
- Path validation
- Component discovery
- Dependency resolution
- Settings merging

**Acceptance Criteria**:
- [ ] All modules have tests
- [ ] Mocks work correctly
- [ ] Edge cases covered
- [ ] >85% code coverage
- [ ] Tests run quickly

### Task 6.2: Create integration tests
**Description**: Test complete flows and command interactions
**Size**: Large
**Priority**: High
**Dependencies**: All Phase 4-5 tasks
**Can run parallel with**: Task 6.1, 6.3

**Technical Requirements**:
- Test full installation flow
- Test each command
- Test flag combinations
- Test error scenarios
- Use temporary directories

**Test Scenarios**:
- Interactive installation
- Non-interactive with flags
- Component add/remove
- Update scenarios
- Error handling

**Acceptance Criteria**:
- [ ] All commands tested
- [ ] Flows work end-to-end
- [ ] No side effects
- [ ] Cleanup after tests
- [ ] CI-friendly tests

### Task 6.3: Add macOS/Linux compatibility tests
**Description**: Ensure Unix platform compatibility
**Size**: Medium
**Priority**: High
**Dependencies**: Task 6.1, Task 6.2
**Can run parallel with**: Task 6.1, 6.2

**Technical Requirements**:
- Test path handling on both platforms
- Test file permissions
- Test home directory expansion
- Test in CI on both platforms
- Document platform differences

**Platform Tests**:
- Path resolution
- File permissions (chmod)
- Home directory paths
- Symlink handling
- Line endings

**Acceptance Criteria**:
- [ ] Tests pass on macOS
- [ ] Tests pass on Linux
- [ ] CI runs both platforms
- [ ] Platform issues documented
- [ ] No Windows-specific code

## Phase 7: Release Infrastructure

### Task 7.1: Create npm package configuration
**Description**: Set up package.json for npm distribution
**Size**: Small
**Priority**: High
**Dependencies**: All core tasks
**Can run parallel with**: Task 7.2, 7.3

**Technical Requirements**:
- Proper ESM configuration
- Correct bin field
- Files whitelist
- Engine requirements
- Proper exports

**Implementation from spec**:
```json
{
  "name": "claudekit",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "claudekit": "./bin/claudekit"
  },
  "files": ["dist/", "bin/", "README.md", "CHANGELOG.md"],
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Acceptance Criteria**:
- [ ] Package structure correct
- [ ] npx execution works
- [ ] Types exported properly
- [ ] Only necessary files included
- [ ] Metadata complete

### Task 7.2: Implement AI-powered release script
**Description**: Create prepare-release.sh using Claude Code
**Size**: Large
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 7.1, 7.3

**Technical Requirements**:
- Support both claude and gemini CLI
- Auto-generate changelog entries
- Update version in package.json
- Validate README completeness
- Create release commit

**Script Features** (from spec):
1. Check for uncommitted changes
2. Run tests before release
3. Analyze code changes (not just commits)
4. Generate accurate changelog
5. Update version appropriately
6. Validate and update README
7. Create release commit

**Acceptance Criteria**:
- [ ] Script works with claude CLI
- [ ] Changelog generated accurately
- [ ] Version bumped correctly
- [ ] README validated/updated
- [ ] Tests must pass first

### Task 7.3: Set up GitHub Actions workflows
**Description**: Create automated release and version bump workflows
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 7.1, 7.2

**Technical Requirements**:
- Release workflow triggered on main push
- Version check before release
- Build validation
- npm publishing
- GitHub release creation
- Version bump workflow

**Workflows to create**:
1. `.github/workflows/release.yaml` - Main release automation
2. `.github/workflows/version-bump.yaml` - Manual version bumps

**Acceptance Criteria**:
- [ ] Workflows syntactically correct
- [ ] Build validation works
- [ ] npm publish configured
- [ ] GitHub releases created
- [ ] Version bumps create PRs

### Task 7.4: Update setup.sh with deprecation
**Description**: Add deprecation notice to existing setup.sh
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 7.1
**Can run parallel with**: None

**Technical Requirements**:
- Add deprecation warning
- Point to new npm package
- Maintain existing functionality
- Set deprecation timeline
- Update documentation

**Implementation Steps**:
1. Add warning message to setup.sh
2. Show npx command alternative
3. Keep script functional
4. Document migration path
5. Set removal date

**Acceptance Criteria**:
- [ ] Clear deprecation message
- [ ] Alternative shown
- [ ] Script still works
- [ ] Timeline communicated
- [ ] Docs updated

## Phase 8: Documentation

### Task 8.1: Write comprehensive README
**Description**: Create user-facing documentation
**Size**: Medium
**Priority**: High
**Dependencies**: All implementation tasks
**Can run parallel with**: Task 8.2, 8.3

**Documentation Sections**:
- Installation instructions
- CLI command reference
- Usage examples
- Configuration guide
- Troubleshooting

**Acceptance Criteria**:
- [ ] All commands documented
- [ ] Examples for common uses
- [ ] Configuration explained
- [ ] Migration guide included
- [ ] Troubleshooting section

### Task 8.2: Create migration guide
**Description**: Document migration from setup.sh to new CLI
**Size**: Small
**Priority**: High
**Dependencies**: All implementation tasks
**Can run parallel with**: Task 8.1, 8.3

**Guide Contents**:
- Feature comparison
- Migration steps
- Command equivalents
- Breaking changes
- Timeline

**Acceptance Criteria**:
- [ ] Clear migration steps
- [ ] Command mapping table
- [ ] Common issues addressed
- [ ] Timeline explained
- [ ] Examples provided

### Task 8.3: Add code documentation
**Description**: Document code with JSDoc/TSDoc
**Size**: Medium
**Priority**: Medium
**Dependencies**: All implementation tasks
**Can run parallel with**: Task 8.1, 8.2

**Documentation Requirements**:
- Public API documented
- Complex functions explained
- Type definitions documented
- Examples in comments
- Generate API docs

**Acceptance Criteria**:
- [ ] All exports documented
- [ ] Complex logic explained
- [ ] Types have descriptions
- [ ] Examples included
- [ ] Docs generateable

## Execution Strategy

### Parallel Execution Opportunities
1. **Phase 1**: Tasks 1.2, 1.3, 1.4, 1.5 can run in parallel after 1.1
2. **Phase 2**: All tasks (2.1-2.4) can run in parallel
3. **Phase 3**: Tasks 3.1 and 3.2 can run in parallel, then 3.3 and 3.4
4. **Phase 4**: Tasks 4.1 and 4.2 can run in parallel, then 4.3 and 4.4
5. **Phase 5**: All tasks (5.1-5.4) can run in parallel
6. **Phase 6**: All test tasks can run in parallel after implementation
7. **Phase 7**: Tasks 7.1, 7.2, 7.3 can run in parallel

### Critical Path
1. Task 1.1 → Task 1.4 → Task 2.1 → Task 3.2 → Task 4.1 → Task 6.2 → Task 7.1

### Risk Mitigation
- Start with core functionality (Phases 1-3)
- Get basic setup command working early
- Add features incrementally
- Test continuously
- Document as you go