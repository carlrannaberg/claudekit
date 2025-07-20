#!/usr/bin/env bash
# Example CI/CD setup script for ClaudeKit
# This demonstrates various non-interactive installation scenarios

set -euo pipefail

echo "ClaudeKit CI/CD Setup Examples"
echo "=============================="

# Example 1: Full installation with defaults
echo "1. Full installation with all defaults:"
echo "claudekit setup --yes --quiet"

# Example 2: Install specific components only
echo -e "\n2. Install specific TypeScript and ESLint hooks only:"
echo "claudekit setup --hooks typecheck,eslint --quiet"

# Example 3: Install git commands only
echo -e "\n3. Install git-related commands only:"
echo "claudekit setup --commands git-commit,git-status,git-push,checkpoint-create --quiet"

# Example 4: User-only installation (no project setup)
echo -e "\n4. Install commands globally without project setup:"
echo "claudekit setup --commands-only --quiet"

# Example 5: Project-specific installation
echo -e "\n5. Install in specific project directory:"
echo "claudekit setup --yes --project /path/to/project --quiet"

# Example 6: Dry run to preview installation
echo -e "\n6. Preview what would be installed (dry run):"
echo "claudekit setup --yes --dry-run"

# Example 7: Docker container setup
echo -e "\n7. Docker container setup (in Dockerfile):"
cat << 'EOF'
FROM node:18
WORKDIR /app
RUN npm install -g @claudekit/cli
RUN claudekit setup --yes --quiet --project /app
EOF

# Example 8: GitHub Actions workflow
echo -e "\n8. GitHub Actions workflow example:"
cat << 'YAML'
name: Setup ClaudeKit
on: [push]
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install and setup ClaudeKit
        run: |
          npm install -g @claudekit/cli
          claudekit setup --yes --quiet
      - name: Validate installation
        run: claudekit validate
YAML

# Example 9: Multiple project setup
echo -e "\n9. Setup multiple projects in batch:"
cat << 'SCRIPT'
#!/bin/bash
projects=(
  "/workspace/project1"
  "/workspace/project2"
  "/workspace/project3"
)

for project in "${projects[@]}"; do
  echo "Setting up ClaudeKit for $project"
  claudekit setup --yes --project "$project" --quiet
done
SCRIPT

# Example 10: Conditional component installation
echo -e "\n10. Install components based on project type:"
cat << 'SCRIPT'
#!/bin/bash
# Detect project type and install appropriate components
if [ -f "package.json" ]; then
  if grep -q '"typescript"' package.json; then
    # TypeScript project
    claudekit setup --hooks typecheck,eslint --commands git-commit,spec-create --quiet
  else
    # JavaScript project
    claudekit setup --hooks eslint --commands git-commit --quiet
  fi
fi
SCRIPT

# Example 11: Error handling
echo -e "\n11. Proper error handling in scripts:"
cat << 'SCRIPT'
#!/bin/bash
set -e

# Function to handle errors
handle_error() {
  echo "Error: ClaudeKit setup failed"
  exit 1
}

# Set error trap
trap handle_error ERR

# Run setup
claudekit setup --yes --quiet

# Validate installation
claudekit validate || handle_error

echo "ClaudeKit setup completed successfully"
SCRIPT

# Example 12: Environment-specific setup
echo -e "\n12. Environment-specific configurations:"
cat << 'SCRIPT'
#!/bin/bash
# Setup based on environment
case "$ENV" in
  development)
    claudekit setup --yes --quiet
    ;;
  staging)
    claudekit setup --hooks typecheck,eslint --quiet
    ;;
  production)
    claudekit setup --commands git-commit,git-push --quiet
    ;;
  *)
    echo "Unknown environment: $ENV"
    exit 1
    ;;
esac
SCRIPT

echo -e "\n=============================="
echo "Available Component IDs:"
echo ""
echo "Commands:"
echo "  - checkpoint-create, checkpoint-restore, checkpoint-list"
echo "  - git-commit, git-status, git-push"
echo "  - spec-create, spec-validate, spec-decompose, spec-execute"
echo "  - agent-init, agent-migration, agent-cli"
echo "  - gh-repo-init, validate-and-fix, create-command"
echo "  - dev-cleanup, config-bash-timeout"
echo ""
echo "Hooks:"
echo "  - typecheck, eslint, prettier"
echo "  - run-related-tests, auto-checkpoint"
echo "  - validate-todo-completion, project-validation"
echo "  - package-manager-detect"