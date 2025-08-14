# claudekit Release Checklist

This document provides a comprehensive checklist for releasing new versions of claudekit. Follow these steps to ensure a smooth and reliable release process.

## Pre-Release Verification

### Code Quality
- [ ] All shell scripts pass syntax check (`bash -n` on all .sh files)
- [ ] JSON files validated with `jq` (settings.json examples)
- [ ] No shellcheck warnings or errors in critical scripts
- [ ] All unit tests passing (`./tests/run-tests.sh`)
- [ ] All integration tests passing (or skipped with reason)
- [ ] Setup script executes without errors on clean system

### Documentation Review
- [ ] README.md version and features up to date
- [ ] CHANGELOG.md updated with new version entries
- [ ] AGENT.md guidelines current and accurate
- [ ] Command documentation in `src/commands/` reviewed
- [ ] Hook documentation in `docs/hooks-documentation.md` current
- [ ] All new commands have proper frontmatter and descriptions
- [ ] Examples in `examples/` directory tested and working

### Testing Coverage
- [ ] Manual test of each hook with real projects:
  - [ ] TypeScript validation hook
  - [ ] ESLint validation hook
  - [ ] Auto-checkpoint hook
  - [ ] Todo validation hook
  - [ ] Run related tests hook
- [ ] Test slash commands in Claude Code:
  - [ ] `/checkpoint:*` commands
  - [ ] `/spec:*` commands
  - [ ] `/git:*` commands
  - [ ] `/agent-md:*` commands
  - [ ] `/validate-and-fix` command
- [ ] Verify hook configuration loading works
- [ ] Test error handling and exit codes
- [ ] Confirm Claude Code integration functions properly
- [ ] Test on both macOS and Linux environments

### Feature Verification
- [ ] New features documented with examples
- [ ] Breaking changes clearly noted
- [ ] Migration path documented for breaking changes
- [ ] Performance impact assessed for new features
- [ ] Security implications reviewed

## Release Steps

### 1. Version Update
Update version references throughout the project:

```bash
# Update version in key files
# - package.json version field
# - README.md installation instructions
# - Any version constant files
```

### 2. Update CHANGELOG.md
Add new version entry with release date:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features and commands
- New hooks or validations
- Documentation improvements

### Changed
- Modified behaviors
- Updated dependencies
- Improved performance

### Fixed
- Bug fixes
- Security patches

### Removed
- Deprecated features
- Obsolete commands
```

### 3. Final Build and Test
```bash
# Run comprehensive tests
./tests/run-tests.sh

# Verify CLI installation
npm run test

# Check all scripts for syntax
find . -name "*.sh" -type f -exec bash -n {} \;

# Validate JSON files
find . -name "*.json" -type f -exec jq . {} \;
```

### 4. Git Operations
```bash
# Ensure working directory is clean
git status

# Create release commit
git add -A
git commit -m "chore: prepare release vX.Y.Z"

# Tag the release
git tag -a vX.Y.Z -m "Release version X.Y.Z"

# Push to remote
git push origin main
git push origin vX.Y.Z
```

### 5. GitHub Release
1. Go to GitHub repository releases page
2. Click "Create a new release"
3. Select the version tag
4. Title: `claudekit vX.Y.Z`
5. Copy CHANGELOG entries for this version
6. Add installation instructions:
   ```bash
   # Install claudekit
   npm install -g claudekit
   claudekit setup
   ```
7. Attach any binary artifacts if applicable
8. Mark as pre-release if beta/rc
9. Publish release

### 6. Distribution Testing
```bash
# Test fresh installation
cd /tmp
git clone https://github.com/[username]/claudekit.git test-install
cd test-install
npm install -g claudekit
claudekit setup

# Verify installation
ls ~/.claude/commands/
ls .claude/hooks/

# Test a few commands
# (In Claude Code, test slash commands)
```

## Post-Release Tasks

### Immediate Tasks
- [ ] Verify GitHub release is published correctly
- [ ] Test installation from fresh clone
- [ ] Update any project templates using claudekit
- [ ] Post release notes to relevant channels
- [ ] Monitor GitHub issues for immediate problems

### Within 24 Hours
- [ ] Check for user feedback and issues
- [ ] Address any critical bugs with hotfix
- [ ] Update documentation if clarifications needed
- [ ] Respond to user questions

### Within 1 Week
- [ ] Review adoption metrics
- [ ] Gather feature requests
- [ ] Plan next version improvements
- [ ] Update roadmap if needed

## Rollback Plan

If critical issues are discovered post-release:

### 1. Immediate Response
```bash
# Document the issue
echo "CRITICAL: [Issue description]" >> KNOWN_ISSUES.md

# If needed, remove the release tag
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```

### 2. Hotfix Process
```bash
# Create hotfix branch
git checkout -b hotfix/vX.Y.Z-fix

# Make necessary fixes
# Update tests to catch the issue
# Update CHANGELOG with hotfix entry

# Test thoroughly
./tests/run-tests.sh

# Merge and tag hotfix
git checkout main
git merge hotfix/vX.Y.Z-fix
git tag -a vX.Y.Z-hotfix1 -m "Hotfix for issue..."
git push origin main --tags
```

### 3. User Communication
- Post notice about known issue
- Provide workaround if available
- Give timeline for fix
- Update installation instructions if needed

### 4. Prevention
- Add test case for the issue
- Update pre-release checklist
- Document lessons learned

## Version Numbering

claudekit follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes to commands or hooks
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes and minor improvements

Examples:
- Adding new command: MINOR bump
- Changing command syntax: MAJOR bump
- Fixing hook bug: PATCH bump

## Release Schedule

- **Regular releases**: As features are ready
- **Patch releases**: As needed for bug fixes
- **Security releases**: Immediately when needed

## Notes

- Always test the release process on a fork first if making major changes
- Keep release artifacts for at least 3 versions
- Document any special steps needed for specific versions
- Consider user impact and provide migration guides
- Test on clean systems to catch dependency issues