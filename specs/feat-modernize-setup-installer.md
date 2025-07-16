# Modernize Setup Installer: From Shell Script to Cross-Platform CLI

**Status**: Draft  
**Authors**: Claude, 2025-07-13

## Overview

Replace the current monolithic bash setup.sh script with a modern TypeScript CLI installer that provides interactive wizard flows, non-interactive CI/CD support, and selective component installation for macOS and Linux. The new installer will be distributed as an npm package and maintain backward compatibility during transition.

## Background/Problem Statement

The current `setup.sh` is a 108-line bash script that works but has significant limitations:

### Current Issues
- **Readability**: While better than the original one-liner, still lacks clear separation of concerns
- **POSIX-only**: Relies on bash, `read -p`, hard-coded `~/.claude`, ANSI colors, assumes Unix environment
- **All-or-nothing**: Copies all commands and hooks without user choice
- **No CI support**: Requires interactive input, impossible to run from CI or larger scripts
- **POSIX-only limitations**: Restricts user base to Unix-like systems
- **Limited UX**: Basic prompts with no validation or rich interactions
- **No idempotency**: Always copies files regardless of whether they've changed
- **No rollback**: No way to undo installation or selectively remove components

### Why Change Now
- Need for automated CI/CD workflows
- Request for selective installation (only specific hooks/commands)
- Better developer experience with rich prompts and validation
- Foundation for future extensibility (plugin system, updates, etc.)
- Cleaner codebase for maintenance and testing

## Goals

- ✅ **Unix platform support**: Work on macOS and Linux
- ✅ **Interactive wizard**: Rich prompts with validation, checkboxes, confirmations
- ✅ **Non-interactive mode**: Full CI/CD support with flags
- ✅ **Selective installation**: Choose specific commands and hooks
- ✅ **Idempotency**: Only update files when changed (SHA-256 comparison)
- ✅ **Rich UX**: Progress indicators, colored output, error handling
- ✅ **Rollback capability**: Uninstall and selective removal
- ✅ **Backward compatibility**: Keep existing setup.sh during transition
- ✅ **Zero global install**: Use `npx claudekit setup`
- ✅ **Extensible**: Foundation for future features (updates, plugins)

## Non-Goals

- ❌ **Rewriting existing hooks/commands**: Only changing the installer
- ❌ **Breaking changes**: Must maintain same file locations and formats
- ❌ **Custom package manager**: Use npm for distribution
- ❌ **Complex plugin system**: Keep it simple for v1
- ❌ **GUI installer**: Stay in terminal for consistency with Claude Code
- ❌ **Multiple languages**: TypeScript only for maintainability

## Technical Dependencies

### Core Libraries
- **Node.js**: >=20.0.0 (for stable ESM and performance)
- **@inquirer/prompts**: ^7.6.0 - Modern prompts with TypeScript support
- **commander**: ^14.0.0 - CLI argument parsing and subcommands
- **ora**: ^8.2.0 - Elegant terminal spinners
- **picocolors**: ^1.1.0 - Lightweight terminal colors (7KB vs chalk's 101KB)
- **fs-extra**: ^11.3.0 - Enhanced file system operations

### Development Dependencies
- **TypeScript**: ^5.8.0 - Latest stable with improved ESM support
- **esbuild**: ^0.25.0 - Fast bundling for distribution
- **@types/node**: ^22.0.0 - Node.js 20+ type definitions
- **@types/fs-extra**: ^11.0.4 - fs-extra type definitions
- **vitest**: ^3.2.0 - Fast testing framework
- **prettier**: ^3.6.0 - Code formatting

### Distribution Strategy
- **Primary**: `npx claudekit@latest setup` (no global install needed)
- **Local dev**: `pnpm build && pnpm link`
- **Package format**: Pure ESM with proper Node.js 20+ support
- **Release automation**: AI-powered release preparation with automated workflows

#### Release Infrastructure
Borrowing proven release automation from the autoagent project:

1. **AI-Powered Release Preparation** (`scripts/prepare-release.sh`):
   ```bash
   #!/bin/bash
   
   # prepare-release.sh - Automate release preparation using Claude Code
   
   set -e  # Exit on error
   
   # Check which AI CLI is available
   AI_CLI=""
   AI_MODEL=""
   AI_FLAGS=""
   
   if command -v claude &> /dev/null; then
       AI_CLI="claude"
       AI_MODEL="--model sonnet"
       AI_FLAGS="--add-dir . --dangerously-skip-permissions --output-format stream-json --verbose --max-turns 30"
       echo "Using Claude CLI with sonnet model"
   elif command -v gemini &> /dev/null; then
       AI_CLI="gemini"
       AI_MODEL="--model gemini-2.5-flash"
       AI_FLAGS="--include-all"
       echo "Using Gemini CLI with gemini-2.5-flash model"
   else
       echo "Error: Neither claude nor gemini CLI is installed"
       echo "Please install one of them to use this script"
       exit 1
   fi
   
   # Check for uncommitted changes
   if ! git diff-index --quiet HEAD --; then
       echo "Error: You have uncommitted changes. Please commit or stash them first."
       exit 1
   fi
   
   # Get the release type (patch, minor, major)
   RELEASE_TYPE=${1:-patch}
   
   if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
       echo "Usage: $0 [patch|minor|major]"
       echo "  patch: 0.0.1 -> 0.0.2 (bug fixes)"
       echo "  minor: 0.0.1 -> 0.1.0 (new features)"
       echo "  major: 0.0.1 -> 1.0.0 (breaking changes)"
       exit 1
   fi
   
   echo "Preparing $RELEASE_TYPE release..."
   
   # Run tests first to ensure we don't release with failing tests
   echo "Running tests to ensure code quality..."
   if ! npm test; then
       echo "Error: Tests are failing. Please fix the failing tests before preparing a release."
       exit 1
   fi
   echo "All tests passed. Continuing with release preparation..."
   
   # Fetch latest tags from remote to ensure we have complete information
   echo "Fetching latest tags from remote..."
   git fetch --tags
   
   # Get current version
   CURRENT_VERSION=$(node -p "require('./package.json').version")
   echo "Current version in package.json: $CURRENT_VERSION"
   
   # Get the published version from NPM (this is the source of truth)
   PUBLISHED_VERSION=$(npm view claudekit version 2>/dev/null || echo "")
   if [ -n "$PUBLISHED_VERSION" ]; then
       echo "Latest published version on NPM: $PUBLISHED_VERSION"
       LAST_VERSION_TAG="v$PUBLISHED_VERSION"
   else
       echo "No version found on NPM registry"
       LAST_VERSION_TAG=""
   fi
   
   # Get the last git tag
   LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
   if [ -z "$LAST_TAG" ]; then
       echo "No previous tags found in git."
       if [ -n "$LAST_VERSION_TAG" ]; then
           echo "Using NPM version $PUBLISHED_VERSION as reference"
           LAST_TAG=$LAST_VERSION_TAG
       else
           echo "This will be the first release."
           LAST_TAG="HEAD"
       fi
   else
       echo "Last git tag: $LAST_TAG"
       # Warn if git tag doesn't match NPM version
       if [ -n "$PUBLISHED_VERSION" ] && [ "$LAST_TAG" != "v$PUBLISHED_VERSION" ]; then
           echo "⚠️  WARNING: Git tag ($LAST_TAG) doesn't match NPM version (v$PUBLISHED_VERSION)"
           echo "Using NPM version as the reference for changes"
           LAST_TAG="v$PUBLISHED_VERSION"
       fi
   fi
   
   # Show recent commits
   echo
   echo "Commits since last release ($LAST_TAG):"
   echo "==========================="
   COMMIT_COUNT=$(git rev-list ${LAST_TAG}..HEAD --count)
   echo "Found $COMMIT_COUNT commits since $LAST_TAG"
   git log ${LAST_TAG}..HEAD --oneline | head -20
   echo
   echo "Using $AI_CLI to analyze changes and prepare release..."
   echo "This process typically takes 3-5 minutes as the AI analyzes the codebase..."
   echo "Timeout set to 10 minutes for safety."
   
   # Use AI CLI to prepare the release with faster model and longer timeout
   # Temporarily disable exit on error for AI command
   set +e
   
   # Check if timeout command is available (not on macOS by default)
   # Timeout is set to 600 seconds (10 minutes) for AI processing
   if command -v gtimeout >/dev/null 2>&1; then
       # On macOS with GNU coreutils installed
       TIMEOUT_CMD="gtimeout 600"
   elif command -v timeout >/dev/null 2>&1; then
       # On Linux or other systems with timeout
       TIMEOUT_CMD="timeout 600"
   else
       # No timeout command available
       echo "Warning: No timeout command available. Install coreutils on macOS: brew install coreutils"
       TIMEOUT_CMD=""
   fi
   
   $TIMEOUT_CMD $AI_CLI $AI_MODEL $AI_FLAGS -p "You are preparing a new $RELEASE_TYPE release for the claudekit npm package.
   
   Current version in package.json: $CURRENT_VERSION
   Latest published version on NPM: ${PUBLISHED_VERSION:-"Not published yet"}
   Reference version for changes: ${LAST_TAG#v}
   
   Please do the following:
   1. Check the published version using: npm view claudekit version
   2. Find the last release tag using: git describe --tags --abbrev=0
   2. Get the actual changes since that tag using: git diff <last-tag>..HEAD --stat and git diff <last-tag>..HEAD
   3. Analyze the ACTUAL CODE CHANGES (not just commit messages) and write accurate changelog entries:
      - Fixed: bug fixes (what was actually fixed in the code)
      - Added: new features (what new functionality was added)
      - Changed: changes to existing functionality (what behavior changed)
      - Removed: removed features (what was deleted)
      - Security: security fixes
      - Documentation: documentation only changes
   4. DO NOT just copy commit messages. Look at what files changed and what the changes actually do.
   5. Update CHANGELOG.md with a new section for the new version, organizing changes by category
   6. Update the version in package.json using: npm version $RELEASE_TYPE --no-git-tag-version
   7. Create a git commit with message \"chore: prepare for vX.X.X release\" where X.X.X is the new version
   
   Follow the Keep a Changelog format and include the date. Only include categories that have changes.
   
   DO NOT create a git tag - the GitHub Actions workflow will create it during the release process."
   
   AI_EXIT_CODE=$?
   set -e  # Re-enable exit on error
   
   if [ $AI_EXIT_CODE -eq 124 ]; then
       echo "Error: $AI_CLI command timed out after 15 minutes. You can try running it manually with:"
       echo "$AI_CLI $AI_MODEL $AI_FLAGS -p 'Prepare $RELEASE_TYPE release for claudekit package'"
       exit 1
   elif [ $AI_EXIT_CODE -ne 0 ]; then
       echo "Error: $AI_CLI command failed with exit code $AI_EXIT_CODE"
       exit 1
   fi
   
   echo
   echo "✅ CHANGELOG.md and package.json updated successfully!"
   echo
   
   # Now validate README.md documentation against the updated CHANGELOG.md
   echo "🔍 Validating README.md documentation completeness..."
   
   # Use AI to validate README against CHANGELOG and capture response
   set +e  # Temporarily disable exit on error
   
   # Create temporary file for AI response
   README_VALIDATION_FILE=$(mktemp)
   
   # Run AI validation and capture output
   $AI_CLI $AI_MODEL $AI_FLAGS -p "You are validating that README.md is up to date with the newly updated CHANGELOG.md before a release.
   
   Please analyze both CHANGELOG.md and README.md files and determine if README.md properly documents all features listed in the CHANGELOG.md [Unreleased] section.
   
   Check specifically:
   1. Are all new features from CHANGELOG.md documented in README.md?
   2. Are new CLI flags/options shown in usage examples?
   3. Are major features included in the feature list?
   4. Do usage examples reflect new functionality?
   
   IMPORTANT: Start your response with exactly one of these status lines:
   - 'README_COMPLETE' if README.md fully documents all unreleased features
   - 'README_INCOMPLETE' if documentation is missing
   
   Then provide details. Be strict - any significant missing documentation should result in README_INCOMPLETE." > "$README_VALIDATION_FILE" 2>&1
   
   AI_VALIDATION_EXIT_CODE=$?
   set -e  # Re-enable exit on error
   
   if [ $AI_VALIDATION_EXIT_CODE -ne 0 ]; then
       echo "Error: README validation AI command failed."
       cat "$README_VALIDATION_FILE"
       rm -f "$README_VALIDATION_FILE"
       exit 1
   fi
   
   # Check the AI response
   README_STATUS=$(head -1 "$README_VALIDATION_FILE" | grep -o "README_[A-Z]*" || echo "UNKNOWN")
   
   echo "README validation result: $README_STATUS"
   echo
   cat "$README_VALIDATION_FILE"
   echo
   
   if [[ "$README_STATUS" == "README_INCOMPLETE" ]]; then
       echo "❌ README.md is missing documentation for unreleased features."
       echo "🤖 Automatically updating README.md with missing documentation..."
       
       # Use AI to automatically fix README.md based on the validation analysis
       set +e
       $AI_CLI $AI_MODEL $AI_FLAGS -p "You need to update README.md to include missing documentation identified in the previous analysis.
   
   Previous validation analysis:
   $(cat "$README_VALIDATION_FILE")
   
   Based on this analysis and the CHANGELOG.md [Unreleased] section, please:
   
   1. Update the README.md file to include all missing features and documentation
   2. Add new CLI flags/options to the appropriate usage examples
   3. Include major new features in the feature list section
   4. Update usage examples to reflect new functionality
   5. Ensure all unreleased features from CHANGELOG.md are properly documented
   
   Please update the README.md file directly. Make sure the documentation is comprehensive and follows the existing README structure and style."
   
       README_UPDATE_EXIT_CODE=$?
       set -e
       
       if [ $README_UPDATE_EXIT_CODE -ne 0 ]; then
           echo "❌ Error: Failed to automatically update README.md"
           echo "Please manually update README.md based on the analysis above."
           rm -f "$README_VALIDATION_FILE"
           exit 1
       fi
       
       echo "✅ README.md has been automatically updated."
       echo "📝 Please review the changes made to README.md before continuing."
       echo "Press Enter after reviewing the README updates, or Ctrl+C to cancel..."
       read -r
       
   elif [[ "$README_STATUS" == "README_COMPLETE" ]]; then
       echo "✅ README.md documentation is complete."
   else
       echo "⚠️  Unable to determine README status. Please review the analysis above."
       echo "Press Enter to continue if README looks complete, or Ctrl+C to cancel..."
       read -r
   fi
   
   rm -f "$README_VALIDATION_FILE"
   
   echo
   echo "Release preparation complete!"
   echo "Next steps:"
   echo "1. Review the changes: git diff HEAD~1"
   echo "2. Push to GitHub: git push origin main"
   echo "3. The GitHub Actions will create the tag and publish to npm"
   ```

2. **Automated Release Pipeline** (`.github/workflows/release.yaml`):
   ```yaml
   name: Release Package
   
   on:
     push:
       branches:
         - main
         - master
     workflow_dispatch:
       inputs:
         release-type:
           description: 'Release type (patch, minor, major)'
           required: true
           default: 'patch'
           type: choice
           options:
             - patch
             - minor
             - major
   
   permissions:
     contents: write
     packages: write
   
   jobs:
     check-version:
       name: Check Version and Prepare Release
       runs-on: ubuntu-latest
       outputs:
         should-release: ${{ steps.check.outputs.should-release }}
         version: ${{ steps.check.outputs.version }}
       
       steps:
       - name: Checkout repository
         uses: actions/checkout@v4
         with:
           fetch-depth: 0
       
       - name: Check if version changed
         id: check
         run: |
           # Get current version from package.json
           CURRENT_VERSION=$(node -p "require('./package.json').version")
           echo "Current version: $CURRENT_VERSION"
           
           # Check if tag already exists
           if git tag | grep -q "^v$CURRENT_VERSION$"; then
             echo "Tag v$CURRENT_VERSION already exists. Skipping release."
             echo "should-release=false" >> $GITHUB_OUTPUT
           else
             echo "Tag v$CURRENT_VERSION does not exist. Proceeding with release."
             echo "should-release=true" >> $GITHUB_OUTPUT
             echo "version=$CURRENT_VERSION" >> $GITHUB_OUTPUT
           fi
   
     release:
       name: Build and Publish
       needs: check-version
       if: needs.check-version.outputs.should-release == 'true'
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout repository
         uses: actions/checkout@v4
       
       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
           node-version: 22.x
           registry-url: 'https://registry.npmjs.org'
       
       - name: Install dependencies
         run: npm install
       
       - name: Run tests
         run: npm test
       
       - name: Build package
         run: npm run build
       
       - name: Validate build output
         run: |
           # Check that dist directory exists and contains files
           if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
             echo "::error::Build output directory 'dist' is empty or missing"
             exit 1
           fi
           
           # Check that main entry point exists
           if [ ! -f "dist/index.js" ]; then
             echo "::error::Main entry point 'dist/index.js' is missing"
             exit 1
           fi
           
           # Check that type definitions exist
           if [ ! -f "dist/index.d.ts" ]; then
             echo "::error::Type definitions 'dist/index.d.ts' are missing"
             exit 1
           fi
           
           # Check that CLI entry point exists
           if [ ! -f "bin/claudekit" ]; then
             echo "::error::CLI entry point 'bin/claudekit' is missing"
             exit 1
           fi
           
           echo "Build validation passed ✓"
       
       - name: Create release tag
         run: |
           VERSION=${{ needs.check-version.outputs.version }}
           git config --global user.name "github-actions[bot]"
           git config --global user.email "github-actions[bot]@users.noreply.github.com"
           git tag -a "v$VERSION" -m "Release v$VERSION"
           git push origin "v$VERSION"
       
       - name: Publish to npm
         run: npm publish
         env:
           NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
       
       - name: Create GitHub Release
         uses: actions/create-release@v1
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
         with:
           tag_name: v${{ needs.check-version.outputs.version }}
           release_name: Release v${{ needs.check-version.outputs.version }}
           body: |
             ## claudekit v${{ needs.check-version.outputs.version }}
             
             ### Installation
             ```bash
             npx claudekit@${{ needs.check-version.outputs.version }} setup
             ```
             
             ### What's Changed
             Please see the [changelog](https://github.com/${{ github.repository }}/compare/v${{ needs.check-version.outputs.version }}...HEAD) for details.
             
             ### Full Changelog
             https://github.com/${{ github.repository }}/commits/v${{ needs.check-version.outputs.version }}
           draft: false
           prerelease: false
   
     post-release:
       name: Post-Release Actions
       needs: [check-version, release]
       if: needs.check-version.outputs.should-release == 'true'
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout repository
         uses: actions/checkout@v4
       
       - name: Notify on failure
         if: failure()
         run: |
           echo "::error::Release failed! Please check the logs and fix any issues."
   ```

3. **Version Bump Workflow** (`.github/workflows/version-bump.yaml`):
   ```yaml
   name: Version Bump
   
   on:
     workflow_dispatch:
       inputs:
         version-type:
           description: 'Version type to bump'
           required: true
           default: 'patch'
           type: choice
           options:
             - patch
             - minor
             - major
             - prerelease
         prerelease-id:
           description: 'Prerelease identifier (e.g., beta, alpha)'
           required: false
           default: 'beta'
   
   permissions:
     contents: write
     pull-requests: write
   
   jobs:
     bump-version:
       name: Bump Version
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout repository
         uses: actions/checkout@v4
         with:
           token: ${{ secrets.GITHUB_TOKEN }}
       
       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
           node-version: 22.x
       
       - name: Configure Git
         run: |
           git config --global user.name "github-actions[bot]"
           git config --global user.email "github-actions[bot]@users.noreply.github.com"
       
       - name: Bump version
         id: bump
         run: |
           # Get current version
           CURRENT_VERSION=$(node -p "require('./package.json').version")
           echo "Current version: $CURRENT_VERSION"
           
           # Bump version based on input
           if [ "${{ inputs.version-type }}" == "prerelease" ]; then
             npm version prerelease --preid=${{ inputs.prerelease-id }} --no-git-tag-version
           else
             npm version ${{ inputs.version-type }} --no-git-tag-version
           fi
           
           # Get new version
           NEW_VERSION=$(node -p "require('./package.json').version")
           echo "New version: $NEW_VERSION"
           echo "new-version=$NEW_VERSION" >> $GITHUB_OUTPUT
       
       - name: Create Pull Request
         uses: peter-evans/create-pull-request@v6
         with:
           token: ${{ secrets.GITHUB_TOKEN }}
           commit-message: "chore: bump version to ${{ steps.bump.outputs.new-version }}"
           title: "chore: bump version to ${{ steps.bump.outputs.new-version }}"
           body: |
             ## Version Bump
             
             This PR bumps the version from `${{ steps.bump.outputs.current-version }}` to `${{ steps.bump.outputs.new-version }}`.
             
             ### Type of change
             - Version bump: `${{ inputs.version-type }}`
             ${{ inputs.version-type == 'prerelease' && format('- Prerelease ID: `{0}`', inputs.prerelease-id) || '' }}
             
             ### Checklist
             - [ ] Version number follows semantic versioning
             - [ ] No breaking changes (or they are documented)
             - [ ] Ready for release after merge
             
             ---
             *This PR was automatically created by the Version Bump workflow.*
           branch: version-bump-${{ steps.bump.outputs.new-version }}
           delete-branch: true
           labels: |
             version-bump
             automated-pr
   ```

#### Package Configuration
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

## Detailed Design

### Project Structure
```
packages/cli/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── commands/
│   │   ├── setup.ts          # Interactive setup wizard
│   │   ├── add.ts            # Add specific components
│   │   ├── remove.ts         # Remove components
│   │   ├── update.ts         # Update existing installation
│   │   └── list.ts           # List available/installed components
│   ├── lib/
│   │   ├── installer.ts      # Core installation logic
│   │   ├── filesystem.ts     # File operations with backup
│   │   ├── config.ts         # Configuration management
│   │   ├── validation.ts     # Input validation
│   │   └── components.ts     # Component discovery and metadata
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── dist/                     # Build output
├── package.json
├── tsconfig.json
└── README.md
```

### Core Architecture

#### 1. Component System
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

interface Installation {
  components: Component[];
  target: InstallTarget;
  backup: boolean;
  dryRun: boolean;
}
```

#### 2. Installation Flow
```typescript
// Interactive mode
const components = await selectComponents();
const target = await selectTarget();
const options = await configureOptions();

// Non-interactive mode
const components = parseComponentsFlag(flags.components);
const target = resolveTarget(flags.project || process.cwd());
```

#### 3. File Operations
- **Idempotency**: SHA-256 comparison before copying
- **Backup**: Automatic backup of existing files
- **Atomic**: All-or-nothing installation with rollback
- **Unix-focused**: Use `path.join`, `os.homedir()`, standard Unix permissions

### User Experience

#### Interactive Wizard Flow
```bash
$ npx claudekit setup

┌ claudekit installer
│
◇ Welcome! Let's set up claudekit for your development workflow.
│
◇ Installation type:
│ ○ Full installation (all commands + hooks)
│ ● Custom installation (choose components)
│ ○ Commands only (no hooks)
│
◇ Select commands to install:
│ ◉ checkpoint:create - Git checkpoint management
│ ◉ checkpoint:restore - Restore checkpoints  
│ ◉ spec:create - Generate specifications
│ ◯ git:commit - Smart commit helper
│ ◯ agent:init - Initialize AGENT.md
│
◇ Select hooks to install:
│ ◉ auto-checkpoint.sh - Auto-save on stop
│ ◉ typecheck.sh - TypeScript validation
│ ◯ eslint.sh - Code linting
│ ◯ run-related-tests.sh - Test automation
│
◇ Project path for hooks (optional):
│ /Users/carl/my-project
│
◇ Options:
│ ◉ Create backups of existing files
│ ◯ Update PATH for global access
│ ◯ Skip settings.json merge
│
● Installing components...
│ ✓ Commands installed to ~/.claude/commands
│ ✓ Hooks installed to /Users/carl/my-project/.claude/hooks
│ ✓ Settings merged successfully
│
└ Installation complete! 🎉
```

#### Non-Interactive Mode
```bash
# Full installation
npx claudekit setup --yes

# Custom installation  
npx claudekit setup --yes \
  --commands "checkpoint:create,spec:create" \
  --hooks "auto-checkpoint,typecheck" \
  --project "/path/to/project"

# Commands only
npx claudekit setup --yes --commands-only

# Dry run
npx claudekit setup --dry-run --verbose
```

#### Component Management
```bash
# List available components
npx claudekit list --available

# List installed components  
npx claudekit list --installed

# Add specific hook
npx claudekit add hook eslint

# Remove component
npx claudekit remove command git:commit

# Update all components
npx claudekit update
```

### Implementation Details

#### Unix Platform Implementation
```typescript
import { createColors } from 'picocolors';

// Path handling
const userDir = os.homedir();
const claudeDir = path.join(userDir, '.claude');

// Lightweight colors (7KB vs 101KB for chalk)
const colors = createColors(process.stdout.isTTY);

// File permissions (Unix systems)
await fs.chmod(hookPath, 0o755);

// Platform validation
if (process.platform === 'win32') {
  throw new Error('Windows is not supported in this version. Please use WSL or macOS/Linux.');
}
```

#### Idempotency Implementation
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

#### Enhanced Settings Merge Strategy
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

### Testing Strategy

#### Unit Tests
- **Component discovery**: Test component metadata parsing
- **File operations**: Test copy, backup, restore with mocks
- **Unix path handling**: Test path resolution on macOS and Linux
- **Settings merge**: Test various merge scenarios
- **Validation**: Test input validation edge cases

#### Integration Tests  
- **Full installation flow**: Test complete wizard in headless mode
- **Non-interactive mode**: Test all flag combinations
- **Rollback scenarios**: Test installation failures and cleanup
- **Platform compatibility**: Test on macOS and Linux (via CI)

#### E2E Tests
- **Real file system**: Test actual file operations (isolated)
- **Claude Code integration**: Verify commands work after installation
- **Update scenarios**: Test updating from previous versions

#### Mock Strategy
```typescript
// Mock file system for unit tests
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  copy: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
}));

// Mock prompts for non-interactive testing
vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));
```

## Performance Considerations

### Optimization Strategies
- **Lazy loading**: Only load required components
- **Concurrent operations**: Parallel file operations where safe
- **Caching**: Cache component metadata and file hashes
- **Incremental updates**: Only process changed files

### Performance Targets
- **Cold start**: < 2 seconds for `npx claudekit setup --help`
- **Full installation**: < 10 seconds for complete setup
- **Component discovery**: < 500ms to scan all available components
- **File operations**: Batch operations for better I/O performance

## Basic Safety Considerations

### File System Safety
- **Path validation**: Basic checks for reasonable paths
- **Permission checks**: Verify write permissions before operations
- **Backup creation**: Simple backup before overwriting files
- **Error handling**: Graceful failure with helpful messages

### Input Validation
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

### Dependency Security
- **Lock file**: Use package-lock.json for reproducible builds
- **Audit**: Regular `npm audit` in CI
- **Minimal dependencies**: Keep dependency tree small
- **Type safety**: Full TypeScript coverage

## Documentation

### User Documentation
- **Installation guide**: Step-by-step setup instructions
- **CLI reference**: Complete command and flag documentation  
- **Migration guide**: Moving from setup.sh to CLI
- **Troubleshooting**: Common issues and solutions
- **Examples**: Real-world usage scenarios

### Developer Documentation
- **Architecture overview**: System design and components
- **Contributing guide**: How to add new components/features
- **Testing guide**: Running and writing tests
- **Release process**: How to publish new versions

### API Documentation
```typescript
/**
 * Install claudekit components to user and/or project directories
 * @param options Installation configuration
 * @returns Promise<InstallationResult>
 */
export async function install(options: InstallationOptions): Promise<InstallationResult>;

/**
 * List available or installed components
 * @param filter Component filter criteria
 * @returns Promise<Component[]>
 */
export async function listComponents(filter: ComponentFilter): Promise<Component[]>;
```

## Implementation Phases

### Phase 1: MVP Core Installer
**Goal**: Feature parity with current setup.sh for Unix systems

- ✅ Basic TypeScript CLI with commander
- ✅ Interactive prompts with @inquirer/prompts
- ✅ File copying with backup
- ✅ Enhanced settings.json merging (handle complex hook structures)
- ✅ Unix path handling (macOS/Linux)
- ✅ Non-interactive mode with basic flags
- ✅ Unit tests for core functionality

**Deliverables**:
- Working `npx claudekit setup` command
- Feature parity with existing setup.sh
- macOS/Linux compatibility

### Phase 2: Enhanced UX & Component System
**Goal**: Rich user experience and selective installation

- ✅ Component discovery and metadata
- ✅ Checkbox component selection with picocolors styling
- ✅ Progress indicators and spinners
- ✅ Idempotency with SHA-256 comparison
- ✅ Add/remove individual components
- ✅ Dry-run mode with detailed preview

**Deliverables**:
- Rich interactive wizard with lightweight colors
- Selective component installation
- Component management commands

### Phase 3: Advanced Features & Polish
**Goal**: Production-ready with all advanced features

- ✅ Update mechanism for existing installations
- ✅ Simple rollback and uninstall capabilities
- ✅ macOS/Linux compatibility testing
- ✅ Comprehensive error handling
- ✅ Performance optimizations
- ✅ Complete documentation

**Deliverables**:
- Full feature set implemented
- macOS/Linux compatibility verified
- Complete documentation and migration guide
- npm package published

### Phase 4: Release Infrastructure & Polish
**Goal**: Production-ready release automation and distribution

- ✅ Implement AI-powered release preparation script
- ✅ Set up automated GitHub Actions workflows
- ✅ Configure version bump automation
- ✅ ESM package configuration with proper exports
- ✅ Deprecation warnings in setup.sh
- ✅ Migration guide and documentation

**Deliverables**:
- `scripts/prepare-release.sh` with Claude Code integration
- `.github/workflows/release.yaml` for automated publishing
- `.github/workflows/version-bump.yaml` for version management
- setup.sh updated with deprecation notice
- Complete migration documentation
- Production-ready npm package with automated releases

## Implementation Decisions

### Technical Choices
1. **Bundle strategy**: Pure npm package distribution
   - **Decision**: npm package only, no single executable needed for MVP
2. **Configuration format**: JSON for consistency
   - **Decision**: JSON for consistency with existing settings.json
3. **Update mechanism**: In-place updates with simple rollback
   - **Decision**: In-place with basic rollback capability
4. **Platform support**: macOS and Linux only
   - **Decision**: Unix systems only for initial version

### UX Decisions
1. **Default installation**: Interactive prompts with smart defaults
   - **Decision**: Prompt with smart defaults based on detected environment
2. **Error recovery**: Simple retry with clear error messages
   - **Decision**: Basic retry with helpful error messages
3. **Progress feedback**: Detailed output with picocolors
   - **Decision**: Detailed by default, --quiet flag for minimal output

### Compatibility
1. **Node.js version support**: Node.js 20+
   - **Decision**: Node.js 20+ for stable ESM and latest features
2. **Breaking changes**: No breaking changes to file locations
   - **Decision**: Maintain compatibility with existing setup.sh locations
3. **Migration timeline**: Gradual transition
   - **Decision**: 6 months overlap, then deprecate setup.sh

## Implementation Approach

### Core Development
- ✅ Scaffold TypeScript CLI project structure
- ✅ Implement core installation logic with enhanced settings merge
- ✅ Add interactive prompts with picocolors
- ✅ Achieve feature parity with setup.sh for Unix systems
- ✅ Non-interactive mode for CI/CD

### Testing & Enhancement
- ✅ Unit and integration testing on macOS/Linux
- ✅ Component selection and management
- ✅ Performance optimization and caching
- ✅ Idempotency with SHA-256 comparison

### Release Infrastructure & Documentation
- ✅ AI-powered release preparation script (using Claude Code)
- ✅ Automated GitHub Actions workflows for publishing
- ✅ Version bump automation with PR creation
- ✅ npm package configuration with proper ESM exports
- ✅ Complete documentation and migration guide
- ✅ CI/CD integration examples
- ✅ Update setup.sh with deprecation notice

### Maintenance & Evolution
- ✅ Monitor adoption and performance
- ✅ Address feedback and edge cases through automated release cycles
- ✅ Plan future enhancements (Windows support, plugin system, etc.)
- ✅ Continuous integration with quality gates

## Success Metrics

### Technical Metrics
- **Unix compatibility**: 100% functionality on macOS/Linux
- **Performance**: < 10 seconds for full installation
- **Reliability**: < 1% installation failure rate
- **Test coverage**: > 85% code coverage

### User Experience Metrics
- **Adoption rate**: Smooth migration for existing users
- **User satisfaction**: Improved UX with rich prompts and colors
- **Support requests**: Clearer error messages reduce support load
- **Feature usage**: Selective installation provides better control

### Development Metrics
- **Code quality**: TypeScript strict mode, no lint errors
- **Maintainability**: Clear architecture, comprehensive docs
- **Extensibility**: Easy to add new components and features
- **Release efficiency**: AI-powered changelog generation and validation
- **Deployment reliability**: Automated testing and build validation

## References

### External Libraries Documentation
- **@inquirer/prompts**: https://github.com/SBoudrias/Inquirer.js/tree/main/packages/prompts
- **commander**: https://github.com/tj/commander.js#readme
- **ora**: https://github.com/sindresorhus/ora#readme
- **picocolors**: https://github.com/alexeyraspopov/picocolors#readme
- **fs-extra**: https://github.com/jprichardson/node-fs-extra
- **vitest**: https://vitest.dev/

### Design References
- **Claude Code CLI patterns**: Existing slash command structure
- **npm CLI**: Package installation and management patterns
- **Homebrew**: Unix installation strategies
- **Git CLI**: Subcommand organization and UX patterns

### Related Issues & Discussions
- Current setup.sh limitations and user feedback
- CI/CD automation requirements
- Component management feature requests
- Enhanced settings merge complexity
- Performance and bundle size optimization

---

**Next Steps**: Begin implementation with TypeScript CLI scaffolding, focusing on Unix compatibility and enhanced settings merging for the complex hook configuration structure discovered in the validation.