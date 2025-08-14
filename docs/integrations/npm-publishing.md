# NPM Publishing Setup

This document explains how to set up NPM publishing for claudekit.

## Prerequisites

1. **NPM Account**: Ensure you have an NPM account at [npmjs.com](https://www.npmjs.com)
2. **GitHub Repository**: The project should be pushed to GitHub
3. **Node.js**: Version 20 or higher installed locally

## NPM Token Setup

### 1. Create NPM Access Token

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to your profile settings → "Access Tokens"
3. Click "Generate New Token"
4. Choose "Automation" token type (for CI/CD)
5. Set appropriate scopes (publish permissions)
6. Copy the generated token

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your NPM access token
6. Click "Add secret"

## Publishing Methods

### Method 1: Automated GitHub Workflows

The project includes two GitHub workflows:

#### Version Workflow (`.github/workflows/version.yml`)
- **Purpose**: Bump version and create git tags
- **Trigger**: Manual dispatch from GitHub Actions tab
- **Options**: patch, minor, or major version bump
- **Actions**: 
  - Runs tests
  - Bumps version in package.json
  - Creates git commit and tag
  - Pushes to GitHub

#### Release Workflow (`.github/workflows/release.yml`)
- **Purpose**: Build and publish to NPM
- **Trigger**: When version tags (v*) are pushed
- **Actions**:
  - Runs full test suite
  - Builds the project
  - Publishes to NPM
  - Creates GitHub release

#### Usage:
1. Go to GitHub Actions tab
2. Select "Version" workflow
3. Click "Run workflow"
4. Choose version bump type (patch/minor/major)
5. The release will automatically trigger after the tag is pushed

### Method 2: Manual Release Script

Use the included release script for local publishing:

```bash
# Dry run to see what would happen
./scripts/release.sh --dry-run

# Patch release (default)
./scripts/release.sh

# Minor release
./scripts/release.sh --type minor

# Major release  
./scripts/release.sh --type major

# Skip tests (not recommended)
./scripts/release.sh --skip-tests
```

### Method 3: Manual Steps

For complete manual control:

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Run tests
npm run test:ci
npm run lint
npm run typecheck

# 3. Build
npm run build

# 4. Bump version
npm version patch  # or minor, major

# 5. Publish
npm publish --access public

# 6. Push git changes
git push origin main --tags
```

## Initial Publication

For the very first publication:

1. **Verify package name**: Ensure `@claudekit/cli` is available on NPM
2. **Set up NPM token** (as described above)
3. **Choose publication method**:
   - **Recommended**: Use GitHub workflow for consistency
   - **Alternative**: Use release script locally

### First Release with GitHub Workflow:
```bash
# Push your changes to main
git push origin main

# Go to GitHub Actions → Version workflow → Run workflow
# Select "patch" (for v0.1.0 → v0.1.1 or similar)
# The release will automatically follow
```

### First Release with Script:
```bash
# From project root
./scripts/release.sh --dry-run  # Review what will happen
./scripts/release.sh            # Execute the release
```

## Package Information

- **Package Name**: `@claudekit/cli`
- **Current Version**: `0.1.0`
- **Registry**: NPM public registry
- **Access**: Public package
- **Binary**: Installs `claudekit` command globally

## Post-Publication

After successful publication:

1. **Verify on NPM**: Visit https://www.npmjs.com/package/@claudekit/cli
2. **Test installation**: `npm install -g @claudekit/cli`
3. **Test binary**: `claudekit --help`
4. **Update documentation**: Add installation instructions to README

## Troubleshooting

### Common Issues:

1. **403 Forbidden**: Check NPM token permissions and expiry
2. **Package name taken**: Update package name in package.json
3. **Version already exists**: Bump version number
4. **Build failures**: Ensure all tests pass locally first

### Debug Commands:

```bash
# Check NPM login status
npm whoami

# Test publish without actually publishing
npm publish --dry-run

# Check package contents
npm pack && tar -tvf *.tgz
```

## Security Notes

- Never commit NPM tokens to git
- Use automation tokens for CI/CD
- Regularly rotate access tokens
- Review package contents before publishing
- Ensure no sensitive data in published files