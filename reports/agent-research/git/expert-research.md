# Git Expert Research Document

## Scope and Domain Definition
**Scope**: Git workflows, merge conflicts, branch strategies, repository recovery, and collaboration patterns

## Problem Categories and Frequency Analysis

### High Frequency, Medium-High Complexity
1. **Merge conflicts and resolution strategies**
2. **Branch management and workflow organization**
3. **Remote repository synchronization issues**
4. **Collaboration patterns and code review workflows**

### Medium Frequency, Medium-High Complexity
5. **Commit history cleanup and rewriting**
6. **Git hooks configuration and automation**
7. **Large file handling and LFS setup**
8. **Access control and permissions management**
9. **Git security and sensitive data handling**

### Low Frequency, High Complexity
10. **Repository recovery and data restoration**
11. **Submodule management and updates**
12. **Git performance optimization for large repos**
13. **Repository migration and platform switching**

### High Frequency, Low Complexity
14. **Tag management and release workflows**
15. **Git configuration and credential management**

## Research Findings by Category

### Category 1: Merge Conflicts & Branch Management

#### Common Error Messages/Symptoms
- `CONFLICT (content): Merge conflict in <fileName>`
- `error: Entry '<fileName>' not uptodate. Cannot merge`
- `Automatic merge failed; fix conflicts and then commit the result`
- `error: Your local changes to the following files would be overwritten by merge`
- `fatal: refusing to merge unrelated histories`

#### Root Causes
- Two developers modified same lines in a file
- One developer deleted a file while another modified it
- Uncommitted changes in working directory before merge
- Different branching strategies causing history conflicts
- Remote tracking branch divergence

#### Resolution Strategies
**Fix 1 (Minimal - Quick Resolution)**
- `git merge --abort` to cancel problematic merge
- `git stash` to temporarily save changes
- `git checkout <file>` to discard local changes
- Use `git status` to identify conflicted files

**Fix 2 (Better - Proper Resolution)**
- Manual conflict resolution with conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- Use `git mergetool` for graphical conflict resolution
- `git add` conflicted files after resolution
- `git commit` to complete merge
- Configure merge strategy with `git merge -X <option>`

**Fix 3 (Complete - Workflow Prevention)**
- Establish branching strategy (GitFlow, GitHub Flow, GitLab Flow)
- Implement pre-merge hooks for validation
- Regular sync with `git pull --rebase` to maintain linear history
- Use protected branches with required reviews
- Automated testing before merge approval

#### Diagnostic Commands
- `git status` - Shows conflicted files and merge state
- `git diff` - Shows conflict details
- `git log --oneline --graph --all` - Visualizes branch structure
- `git show :1:<file>` - Shows common ancestor version
- `git ls-files -u` - Lists unmerged files

#### Validation Steps
- Verify no conflict markers remain in files
- Run tests after conflict resolution
- Check that `git status` shows clean working directory
- Ensure merge commit includes both parent commits

### Category 2: Commit History & Repository Cleanup

#### Common Error Messages/Symptoms
- `error: cannot 'squash' without a previous commit`
- `fatal: bad revision 'HEAD~N'`
- `error: could not apply <commit>... <message>`
- `hint: after resolving the conflicts, mark the corrected paths`
- `You are in the middle of an am session`

#### Root Causes
- Attempting to rewrite published/shared history
- Interactive rebase conflicts with existing commits
- Improper squashing or commit manipulation
- Lost commits due to forced pushes
- Corrupted repository state during rebase

#### Resolution Strategies
**Fix 1 (Minimal - Emergency Recovery)**
- `git rebase --abort` to cancel problematic rebase
- `git reflog` to find lost commits
- `git reset --hard <commit>` to restore previous state
- `git cherry-pick <commit>` to restore specific commits

**Fix 2 (Better - Controlled History Editing)**
- Use `git rebase -i` for interactive commit editing
- Employ rebase options: pick, reword, edit, squash, fixup, drop
- `git rebase --continue` after resolving conflicts
- `git push --force-with-lease` for safer forced pushes

**Fix 3 (Complete - History Management Strategy)**
- Establish commit message conventions
- Use feature branches with clean, atomic commits
- Implement commit hooks for message validation
- Regular history cleanup before merging to main
- Automated changelog generation from commit history

#### Diagnostic Commands
- `git reflog` - Shows all recent HEAD movements
- `git log --oneline --graph` - Visualizes commit history
- `git rebase --dry-run` - Preview rebase operations
- `git show <commit>` - Inspect specific commit changes
- `git fsck` - Check repository integrity

### Category 3: Remote Repositories & Collaboration

#### Common Error Messages/Symptoms
- `fatal: remote origin already exists`
- `error: failed to push some refs to <remote>`
- `hint: Updates were rejected because the remote contains work`
- `fatal: refusing to merge unrelated histories`
- `error: src refspec <branch> does not match any`

#### Root Causes
- Local branch diverged from remote branch
- Missing upstream tracking configuration
- Authentication or permission issues
- Conflicting remote repository configurations
- Incorrect push/pull patterns in team workflows

#### Resolution Strategies
**Fix 1 (Minimal - Immediate Sync)**
- `git pull --rebase` to sync with remote changes
- `git push --set-upstream origin <branch>` to configure tracking
- `git remote -v` to verify remote configuration
- `git fetch --all` to update remote references

**Fix 2 (Better - Proper Remote Management)**
- Configure upstream tracking: `git branch --set-upstream-to=origin/<branch>`
- Use `git pull --ff-only` for safe fast-forward pulls
- Implement proper fetch/merge workflow
- Set up multiple remotes (origin, upstream) for fork workflows

**Fix 3 (Complete - Team Collaboration Strategy)**
- Establish clear branching and merging policies
- Implement protected branch rules with required reviews
- Use GitHub/GitLab flow for structured collaboration
- Automated CI/CD integration with branch policies
- Team training on remote repository best practices

#### Diagnostic Commands
- `git remote -v` - List configured remotes
- `git branch -vv` - Show tracking branch information
- `git status -b` - Show branch tracking status
- `git log --oneline origin/<branch>..HEAD` - Show unpushed commits
- `git config --list | grep remote` - Show remote configuration

### Category 4: Git Hooks & Automation

#### Common Use Cases and Patterns
- Pre-commit code quality checks (linting, formatting)
- Commit message validation and conventions
- Pre-push testing and security scanning
- Post-receive deployment automation
- Repository maintenance and cleanup

#### Hook Types and Purposes
**Client-Side Hooks:**
- `pre-commit` - Code validation before commit
- `prepare-commit-msg` - Automated commit message formatting
- `commit-msg` - Commit message validation
- `pre-push` - Validation before pushing to remote
- `post-checkout` - Working directory setup after branch switch

**Server-Side Hooks:**
- `pre-receive` - Validation of pushed references
- `update` - Per-branch validation during push
- `post-receive` - Notifications and deployments after push

#### Implementation Strategies
**Fix 1 (Basic Hook Setup)**
- Create executable scripts in `.git/hooks/`
- Use sample hooks as templates
- Basic validation with exit codes (0 = success, non-zero = failure)

**Fix 2 (Team Hook Management)**
- Version control hooks in repository (outside .git/hooks)
- Symlink or copy hooks during setup
- Use hook managers like husky or pre-commit framework
- Shared configuration across team members

**Fix 3 (Advanced Hook Automation)**
- Integration with CI/CD pipelines
- Conditional hook execution based on branch/environment
- Comprehensive testing and validation workflows
- Automated deployment and notification systems

### Category 5: Performance & Large Repositories

#### Common Performance Issues
- Slow clone/fetch operations on large repositories
- Excessive disk usage from large binary files
- Long git log and history operations
- Memory issues during operations on large repos

#### Git LFS Integration
**Setup and Usage:**
```bash
# Install and initialize
git lfs install

# Track large file types
git lfs track "*.psd"
git lfs track "*.zip"

# Commit tracking configuration
git add .gitattributes
git commit -m "Track large files with LFS"
```

**Migration for Existing Files:**
```bash
# Migrate existing files to LFS
git lfs migrate import --include="*.psd"

# Migrate specific commits
git lfs migrate import --include="*.zip" --since="<commit>"
```

#### Performance Optimization Strategies
**Fix 1 (Immediate Performance Gains)**
- Use `git clone --depth=1` for shallow clones
- Configure `git gc` for repository maintenance
- Use `git clean -fd` to remove untracked files
- Enable Git's built-in caching mechanisms

**Fix 2 (Better Repository Management)**
- Implement Git LFS for large binary files
- Use sparse-checkout for partial repository clones
- Configure appropriate Git settings for large repos
- Regular repository maintenance with `git gc --aggressive`

**Fix 3 (Complete Large Repository Strategy)**
- Repository splitting and modularization
- Submodule strategy for large codebases
- CI/CD optimization for large repository workflows
- Monitoring and alerting for repository health

### Category 6: Security & Access Control

#### Security Concerns
- Accidental commit of sensitive data (passwords, API keys)
- Repository access control and permissions
- Secure authentication and credential management
- Code signing and verification

#### Common Security Issues
- Sensitive data in commit history
- Weak authentication patterns
- Improper access control configuration
- Lack of audit trails for repository changes

#### Security Best Practices
**Fix 1 (Immediate Security Measures)**
- Use `.gitignore` to prevent sensitive file commits
- `git filter-branch` to remove sensitive data from history
- Rotate compromised credentials immediately
- Enable two-factor authentication

**Fix 2 (Better Security Practices)**
- Implement pre-commit hooks for secret scanning
- Use environment variables for configuration
- Configure proper branch protection rules
- Regular security audits of repository access

**Fix 3 (Complete Security Strategy)**
- Automated secret scanning in CI/CD pipelines
- Comprehensive access control with role-based permissions
- Code signing and verification workflows
- Security monitoring and incident response procedures

## Environment Detection Patterns

### Repository State Detection
```bash
# Check if in Git repository
if [ -d .git ] || git rev-parse --git-dir > /dev/null 2>&1; then
    echo "In Git repository"
fi

# Check repository status
git status --porcelain

# Detect branch strategy
git branch -r | grep -E "(develop|development|staging)"

# Check for hooks
ls -la .git/hooks/
```

### Configuration Analysis
```bash
# Git version
git --version

# Configuration overview
git config --list

# Remote repositories
git remote -v

# Branch information
git branch -vv

# Recent activity
git reflog --oneline -10
```

## Cross-Domain Recommendations

### When to Recommend Other Experts
- **GitHub Actions Expert**: For CI/CD pipeline issues, workflow automation, action configuration
- **DevOps Expert**: For deployment automation, infrastructure as code, container orchestration
- **Security Expert**: For advanced security scanning, vulnerability management, compliance requirements
- **Performance Expert**: For system-level performance issues, resource optimization, monitoring

### Integration Patterns
- Git hooks triggering CI/CD pipelines
- Repository events triggering deployment workflows
- Security scanning integration with Git workflows
- Performance monitoring for Git operations

## Official Documentation Sources

### Primary Resources
- [Git SCM Official Documentation](https://git-scm.com/doc)
- [Pro Git Book](https://git-scm.com/book)
- [Git Reference Manual](https://git-scm.com/docs)

### Platform-Specific Documentation
- [GitHub Documentation](https://docs.github.com/)
- [GitLab Documentation](https://docs.gitlab.com/)
- [Bitbucket Documentation](https://support.atlassian.com/bitbucket-cloud/)

### Advanced Resources
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Git LFS Documentation](https://git-lfs.github.io/)
- [Git Workflows Comparison](https://www.atlassian.com/git/tutorials/comparing-workflows)

## Content Synthesis for Expert Agent

### Key Diagnostic Flow
1. **Initial Assessment**: `git status` → `git log --oneline -5` → `git remote -v`
2. **Problem Classification**: Error message pattern matching
3. **Environment Context**: Branch strategy, team size, repository complexity
4. **Solution Progression**: Minimal fix → Better approach → Complete strategy

### Safety Rules
- Always backup before destructive operations (`git stash`, `git branch backup-<timestamp>`)
- Use `--dry-run` flags when available
- Verify operations with diagnostic commands
- Maintain audit trail of significant changes

### Non-Obvious Patterns
- Conflict resolution strategies vary by merge vs rebase workflows
- Hook implementation differs between client and server environments
- Performance optimization requires understanding of repository usage patterns
- Security measures must balance usability with protection requirements