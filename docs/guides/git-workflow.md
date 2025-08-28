# Git Workflow: Safe Version Control for Claude Code

## Overview

Claudekit's git workflow commands provide safe, convention-aware version control operations designed specifically for AI-assisted development. These commands add safety checks, automatic formatting, and helpful insights to prevent common mistakes and maintain clean repository history.

**Key Benefits:**
- **Smart commits** - Automatic message formatting following project conventions
- **Safety checks** - Pre-flight validation before push operations
- **Intelligent insights** - Enhanced status with actionable recommendations
- **Clean setup** - Initialize proper .gitignore for Claude Code projects
- **Convention-aware** - Respects and follows existing project patterns

## Installation

```bash
# Install claudekit (if not already installed)
npm install -g claudekit

# Add git workflow commands to your project
claudekit setup --yes --force --commands git:commit,git:status,git:push,gh:repo-init
```

This will:
- Install all git workflow commands
- Create symlinks in `.claude/commands/git/`
- Preserve existing configuration
- Skip interactive prompts with `--yes --force`

### Verify Setup

```bash
# Check commands are available
ls -la .claude/commands/git/

# Should show:
# checkout.md
# commit.md
# ignore-init.md
# push.md
# status.md
```

## Command Reference

### 1. `/git:checkout` - Smart Branch Management

**Purpose**: Create and switch branches with consistent naming conventions

**Features**:
- Supports conventional branch prefixes (feature/, hotfix/, bugfix/, etc.)
- Automatically handles upstream tracking
- Smart base branch selection for different branch types
- Branch name validation and formatting
- Seamless integration with `/git:push`

**Usage**:
```bash
/git:checkout <branch-type/branch-name>
```

**Supported Branch Types**:
- `feature/` - New features and enhancements
- `bugfix/` - Bug fixes (non-critical)
- `hotfix/` - Urgent production fixes (bases off main/master)
- `release/` - Release preparation branches
- `chore/` - Maintenance and cleanup tasks
- `experiment/` - Experimental features
- `docs/` - Documentation updates
- `test/` - Test-related changes
- `refactor/` - Code refactoring

**Examples**:
```bash
# Create feature branch
/git:checkout feature/user-authentication

# Create hotfix from main
/git:checkout hotfix/security-patch

# Switch to existing branch
/git:checkout develop

# Create branch (will suggest prefix)
/git:checkout payment-integration
```

**Smart Behaviors**:
- **Hotfix branches**: Automatically checks out from main/master first
- **Feature branches**: Uses develop if exists, otherwise current branch
- **Release branches**: Validates version format (e.g., release/v1.2.0)
- **New branches**: Sets up for easy push with `/git:push` (uses -u flag)

**Workflow Integration**:
```bash
# 1. Create new feature branch
/git:checkout feature/oauth-login

# 2. Make changes
# (Claude implements feature)

# 3. Push with automatic upstream
/git:push
# Automatically uses: git push -u origin feature/oauth-login
```

### 2. `/git:status` - Repository Analysis

**Purpose**: Provides detailed git status with insights and recommendations

**Features**:
- Shows uncommitted changes with file categorization
- Identifies potential issues (large files, sensitive data)
- Suggests next actions based on repository state
- Highlights branch divergence and upstream status
- Groups changes by type (modified, added, deleted)

**Usage**:
```bash
/git:status
```

**Example Output**:
```
Current branch: feature/authentication
Upstream: origin/feature/authentication (2 commits behind, 1 ahead)

Changes to be committed:
  new file:   src/auth/login.ts
  modified:   src/auth/user.model.ts

Changes not staged:
  modified:   src/auth/validate.ts (324 lines changed)
  modified:   README.md (12 lines changed)

Untracked files:
  debug-auth.js   ⚠️ Consider adding to .gitignore
  .env.local      ⚠️ Contains potential secrets

Insights:
- Branch is behind upstream, consider pulling before push
- Large number of changes in validate.ts, consider breaking into smaller commits
- Debug file detected, use /git:ignore-init to update .gitignore
```

### 2. `/git:commit` - Convention-Aware Smart Commits

**Purpose**: Creates well-formatted commits following project conventions

**Features**:
- Analyzes recent commit history for style patterns
- Generates descriptive commit messages
- Adds Claude Code attribution
- Validates staged changes before commit
- Handles pre-commit hooks gracefully
- Creates backup checkpoint before commit

**Usage**:
```bash
/git:commit
```

**Workflow**:
1. Analyzes staged and unstaged changes
2. Reviews recent commit messages for style
3. Generates appropriate commit message
4. Creates commit with attribution
5. Verifies commit success

**Example**:
```bash
# Claude stages the relevant changes
# Then runs /git:commit
# Generates: "feat: add OAuth2 authentication flow

Implemented Google OAuth2 provider with JWT token handling
and secure session management.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Commit Message Patterns Detected**:
- Conventional commits (feat:, fix:, chore:, etc.)
- Angular style (type(scope): message)
- Imperative mood vs past tense
- Emoji usage patterns
- Issue/ticket references

### 3. `/git:push` - Safe Push with Pre-flight Checks

**Purpose**: Safely pushes changes with validation and protection

**Features**:
- Pre-push validation checks
- Automatic upstream tracking for new branches (uses `-u` flag)
- Branch protection awareness
- Force-push prevention on protected branches
- Large file detection
- Merge conflict detection

**Usage**:
```bash
/git:push
```

**Safety Checks & Smart Behaviors**:
1. Detects if branch has upstream tracking
   - If tracked: uses `git push`
   - If untracked: automatically uses `git push -u origin <branch>`
2. Checks for uncommitted changes
3. Validates no merge conflicts exist
4. Confirms branch isn't protected
5. Warns about large files
6. Ensures tests pass (if configured)

**Example Flow (Tracked Branch)**:
```bash
/git:push

# Pre-flight checks:
✓ Branch has upstream tracking
✓ No uncommitted changes
✓ No merge conflicts detected
✓ Branch 'feature/auth' is not protected
✓ No large files detected (>50MB)

Pushing to origin/feature/auth...
Success! Pushed 3 commits to origin/feature/auth
```

**Example Flow (New Branch - Automatic Upstream)**:
```bash
/git:push

# Pre-flight checks:
⚠️ No upstream tracking detected
✓ No uncommitted changes
✓ Branch 'feature/new-feature' is not protected

Setting upstream and pushing...
Executing: git push -u origin feature/new-feature
Success! Branch 'feature/new-feature' set up to track 'origin/feature/new-feature'
Pushed 2 commits to origin/feature/new-feature
```

### 4. `/git:ignore-init` - Initialize Claude Code Gitignore

**Purpose**: Sets up comprehensive .gitignore for Claude Code projects

**Features**:
- Adds Claude-specific patterns
- Includes common development artifacts
- Preserves existing entries
- Smart pattern detection
- Comments for clarity

**Usage**:
```bash
/git:ignore-init
```

**Patterns Added**:
```gitignore
# Claude Code local files
CLAUDE.local.md
.claude/settings.local.json
.mcp.local.json

# Temporary and debug files
temp/
temp-*/
test-*/
debug-*.js
test-*.js
*-test.js
*-debug.js
```

**Example**:
```bash
/git:ignore-init

# Output:
EXISTS: .gitignore found
---CONTENTS---
[current .gitignore content shown]

Adding missing patterns:
✓ Added CLAUDE.local.md
✓ Added .claude/settings.local.json
✓ Pattern temp/ already exists
✓ Added debug-*.js

.gitignore updated successfully!
```

## Workflow Examples

### Standard Development Flow

```bash
# 1. Start new feature
git checkout -b feature/user-profiles

# 2. Initialize proper gitignore
/git:ignore-init

# 3. Check current status
/git:status

# 4. Make changes with Claude
# (Claude modifies files)

# 5. Review changes
/git:status

# 6. Commit changes
/git:commit

# 7. Push to remote
/git:push
```

### Collaborative Workflow

```bash
# 1. Check branch status
/git:status
# Shows: "2 commits behind origin/main"

# 2. Pull latest changes
git pull origin main

# 3. Make changes
# (Claude implements feature)

# 4. Review what changed
/git:status
# Shows organized list of changes with insights

# 5. Commit with proper message
/git:commit
# Generates conventional commit following team patterns

# 6. Safe push with checks
/git:push
# Validates before pushing
```

### Feature Development with Checkpoints

```bash
# 1. Create checkpoint before starting
/checkpoint:create starting payment feature

# 2. Initialize gitignore if needed
/git:ignore-init

# 3. Implement feature
# (Claude makes changes)

# 4. Check progress
/git:status
# Shows: "15 files changed, 2 untracked"

# 5. Create checkpoint before commit
/checkpoint:create payment feature working

# 6. Clean commit
/git:commit
# Creates: "feat: implement Stripe payment integration"

# 7. Safe push
/git:push
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch (automatically from main)
/git:checkout hotfix/security-patch
# Automatically switches to main/master first, then creates hotfix

# 2. Quick status check
/git:status

# 3. Apply fix
# (Claude fixes issue)

# 4. Immediate commit
/git:commit
# Generates: "fix: patch SQL injection vulnerability in user query"

# 5. Push with automatic upstream
/git:push
# Uses: git push -u origin hotfix/security-patch
```

## Best Practices

### 1. Branch Naming Conventions

Use `/git:checkout` with proper prefixes:
```bash
# ✅ Good branch names
/git:checkout feature/user-authentication
/git:checkout hotfix/critical-security-fix
/git:checkout bugfix/login-error
/git:checkout release/v2.0.0

# ❌ Poor branch names (avoid)
/git:checkout my-branch
/git:checkout test
/git:checkout fix
```

### 2. Commit Message Excellence

Let `/git:commit` analyze and generate proper messages:
```bash
# The command will automatically generate messages like:
# feat: add OAuth2 authentication
# fix: resolve memory leak in user service
# docs: update API documentation
# refactor: simplify validation logic
```

### 3. Safe Push Workflow

Always use `/git:push` for safety:
```bash
# ✅ Safe approach
/git:push
# Performs checks and handles upstream

# ❌ Risky approach
git push --force
# Bypasses safety checks
```

### 4. Complete Workflow Example

```bash
# Start new feature
/git:checkout feature/payment-gateway

# Check status regularly
/git:status

# Make changes...

# Commit with proper message
/git:commit

# Push safely
/git:push
```

## Integration with Checkpoint System

The git commands work seamlessly with the checkpoint system:

```bash
# Create checkpoint before risky changes
/checkpoint:create before major refactor

# Make changes
/git:checkout feature/refactor-auth

# If things go wrong
/checkpoint:restore latest

# When ready
/git:commit
/git:push
```

## Troubleshooting

### Command Not Found

If commands aren't recognized in Claude Code:

```bash
# Verify installation
ls -la .claude/commands/git/

# Reinstall if needed
claudekit setup --commands git:checkout,git:commit,git:status,git:push,git:ignore-init
```

### Push Fails on New Branch

The `/git:push` command automatically handles new branches:
- Detects when branch has no upstream
- Uses `git push -u origin <branch>` automatically
- No manual upstream configuration needed

### Checkout Creates Wrong Base

The `/git:checkout` command uses automatic base selection:
- `hotfix/*` branches always base off main/master
- `feature/*` branches use develop if it exists
- Override by checking out base branch first if needed

## Summary

Claudekit's git workflow commands provide:

✅ **Smart branch management** - `/git:checkout` with conventional naming
✅ **Smart commits** - `/git:commit` follows project conventions
✅ **Safe push operations** - `/git:push` with pre-flight checks
✅ **Detailed status** - `/git:status` with actionable insights
✅ **Clean .gitignore** - `/git:ignore-init` for Claude Code projects

These commands work together to create a seamless, safe git workflow optimized for AI-assisted development with Claude Code.

For questions or issues, visit [GitHub Issues](https://github.com/carlrannaberg/claudekit/issues).
