# GitHub Release Setup for claudekit

This document explains how to configure the GitHub repository for automated NPM publishing using the release workflows.

## Prerequisites

✅ **NPM Package Created**: The `claudekit` package is now published on NPM  
✅ **GitHub Workflows**: Release workflows are configured in `.github/workflows/`  
✅ **Code Quality**: All tests pass and code quality checks are clean

## Required GitHub Secrets

To enable automated NPM publishing, you need to add the following secret to your GitHub repository:

### NPM_TOKEN

1. **Generate NPM Access Token**:
   - Go to [npmjs.com](https://www.npmjs.com) and log in
   - Navigate to your profile → "Access Tokens"
   - Click "Generate New Token"
   - Select "Automation" token type
   - Set scope to allow publishing
   - Copy the generated token

2. **Add Token to GitHub Repository**:
   - Go to your GitHub repository: `https://github.com/carlrannaberg/claudekit`
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your NPM access token
   - Click "Add secret"

## GitHub Workflows Overview

### 1. Version Workflow (`.github/workflows/version.yml`)
- **Purpose**: Bump package version and create git tags
- **Trigger**: Manual dispatch from GitHub Actions
- **Options**: patch, minor, or major version bump
- **Process**:
  1. Runs tests and quality checks
  2. Bumps version in package.json
  3. Creates git commit and tag
  4. Pushes changes to repository

### 2. Release Workflow (`.github/workflows/release.yml`)
- **Purpose**: Build and publish to NPM
- **Trigger**: Automatically when version tags (v*) are pushed
- **Process**:
  1. Runs full test suite
  2. Builds the project
  3. Publishes to NPM using `NPM_TOKEN`
  4. Creates GitHub release

## Usage Instructions

### Automated Release Process

1. **Trigger Version Bump**:
   - Go to GitHub Actions tab
   - Select "Version" workflow
   - Click "Run workflow"
   - Choose version bump type (patch/minor/major)
   - Click "Run workflow"

2. **Automatic NPM Publishing**:
   - The version workflow creates a new tag
   - This automatically triggers the release workflow
   - The release workflow publishes to NPM
   - A GitHub release is created

### Manual Release (Alternative)

You can also use the local release script:

```bash
# Dry run to see what would happen
./scripts/release.sh --dry-run

# Actual release (patch version)
./scripts/release.sh

# Minor or major release
./scripts/release.sh --type minor
./scripts/release.sh --type major
```

## Current Package Status

- **Package Name**: `claudekit`
- **Current Version**: `0.1.0`
- **NPM URL**: https://www.npmjs.com/package/claudekit
- **Installation**: `npm install -g claudekit`
- **Usage**: `claudekit --help`
- **GitHub Repository**: https://github.com/carlrannaberg/claudekit
- **NPM_TOKEN**: ✅ Configured (added 2025-07-20)

## Security Notes

- The NPM_TOKEN should be an "Automation" token for CI/CD use
- Keep tokens secure and rotate them regularly
- Only repository admins should have access to manage secrets
- The token allows publishing to NPM under your account

## Testing the Setup

After adding the NPM_TOKEN secret, you can test the release process:

1. Make a small change (like updating README)
2. Commit and push to main
3. Use the Version workflow to create a patch release
4. Verify the Release workflow runs successfully
5. Check that the new version appears on NPM

## Troubleshooting

### Common Issues:

1. **NPM_TOKEN Authentication Failed**:
   - Verify the token is correctly copied
   - Ensure the token has publish permissions
   - Check if the token has expired

2. **Version Workflow Fails**:
   - Ensure all tests pass locally first
   - Check that the main branch is up to date

3. **Release Workflow Fails**:
   - Verify the build completes successfully
   - Check TypeScript compilation and linting

For support, see the [NPM Publishing Documentation](./npm-publishing.md).