#!/usr/bin/env bash

# This script automates the release preparation process with AI assistance
# Optimized with pre-computation and smart diff filtering

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PACKAGE_JSON="${PROJECT_ROOT}/package.json"
CHANGELOG_FILE="${PROJECT_ROOT}/CHANGELOG.md"
README_FILE="${PROJECT_ROOT}/README.md"
PACKAGE_NAME="claudekit"

# Default values
DRY_RUN=false
INTERACTIVE=true
RELEASE_TYPE=""
AI_CLI=""
AI_MODEL=""
AI_FLAGS=""

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

print_ai() {
    echo -e "${CYAN}🤖 $1${NC}"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

AI-powered release preparation script for Claudekit.

OPTIONS:
    -t, --type TYPE     Release type: patch, minor, major
    -d, --dry-run       Perform a dry run without making changes
    -y, --yes           Non-interactive mode (use defaults)
    -h, --help          Show this help message

EXAMPLES:
    $0                          # Interactive mode
    $0 --type minor             # Prepare minor release
    $0 --type patch --dry-run   # Dry run for patch release
    $0 --type major --yes       # Non-interactive major release

EOF
}

# Function to detect available AI CLI
detect_ai_cli() {
    print_step "Detecting available AI CLI tools..."

    if command -v claude &> /dev/null; then
        AI_CLI="claude"
        AI_MODEL="--model claude-sonnet-4-20250514"
        AI_FLAGS='--output-format stream-json --verbose --max-turns 30 --allowedTools Edit MultiEdit Read Write'
        print_success "Found Claude CLI with Sonnet 4 model"
    elif command -v gemini &> /dev/null; then
        AI_CLI="gemini"
        AI_MODEL="--model gemini-2.5-flash-exp"
        AI_FLAGS="--include-all --yolo"
        print_success "Found Gemini CLI with Flash 2.5 model"
    else
        print_error "No AI CLI found. Install Claude CLI or Gemini CLI to use this script."
        echo "Installation instructions:"
        echo "  - Claude CLI: https://github.com/anthropics/claude-cli"
        echo "  - Gemini CLI: https://github.com/google/generative-ai-cli"
        exit 1
    fi
}

# Function to validate environment
validate_environment() {
    print_step "Validating environment..."

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository. Please run this script from the project root."
        exit 1
    fi

    # Check if aio-stream is available
    if ! command -v aio-stream &> /dev/null; then
        print_warning "aio-stream not found. Install it for better output formatting:"
        echo "  npm install -g @agent-io/stream"
        echo ""
        echo "Continuing without formatted output..."
        AIO_STREAM_CMD=""
    else
        AIO_STREAM_CMD="aio-stream"
    fi

    # Check if package.json exists
    if [[ ! -f "$PACKAGE_JSON" ]]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_error "Uncommitted changes detected. Please commit or stash changes before release."
        git status --short
        exit 1
    fi

    # Check if we're on master branch
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "master" && "$current_branch" != "main" ]]; then
        print_warning "Not on main / master branch (current: $current_branch)"
        if [[ "$INTERACTIVE" == "true" ]]; then
            read -p "Continue anyway? [y/N]: " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    print_success "Environment validation passed"
}

# Function to get current version
get_current_version() {
    node -p "require('$PACKAGE_JSON').version"
}

# Function to calculate next version
calculate_next_version() {
    local current_version="$1"
    local release_type="$2"

    case "$release_type" in
        "patch")
            node -p "const v='$current_version'.split('.').map(Number); v[2]++; v.join('.')"
            ;;
        "minor")
            node -p "const v='$current_version'.split('.').map(Number); v[1]++; v[2]=0; v.join('.')"
            ;;
        "major")
            node -p "const v='$current_version'.split('.').map(Number); v[0]++; v[1]=0; v[2]=0; v.join('.')"
            ;;
        *)
            print_error "Invalid release type: $release_type"
            exit 1
            ;;
    esac
}

# Function to prompt for release type
prompt_release_type() {
    if [[ -n "$RELEASE_TYPE" ]]; then
        return
    fi

    local current_version
    current_version=$(get_current_version)

    echo
    print_info "Current version: $current_version"
    echo
    echo "Select release type:"
    echo "  1) patch   - $(calculate_next_version "$current_version" "patch") (bug fixes)"
    echo "  2) minor   - $(calculate_next_version "$current_version" "minor") (new features)"
    echo "  3) major   - $(calculate_next_version "$current_version" "major") (breaking changes)"
    echo

    while true; do
        read -p "Enter choice [1-3]: " -r choice
        case $choice in
            1) RELEASE_TYPE="patch"; break ;;
            2) RELEASE_TYPE="minor"; break ;;
            3) RELEASE_TYPE="major"; break ;;
            *) print_error "Invalid choice. Please enter 1-3." ;;
        esac
    done
}

# Function to run tests
run_tests() {
    print_step "Running test suite to ensure code quality..."

    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "Dry run: Skipping tests"
        return
    fi

    # Build and run tests in non-interactive mode
    if ! npm run build; then
        print_error "Build failed. Please fix the build errors before preparing a release."
        exit 1
    fi

    # Run tests with CI reporter (non-interactive)
    if ! npm run test:ci; then
        print_error "Tests are failing. Please fix the failing tests before preparing a release."
        exit 1
    fi

    # Run bash hook tests (for local validation before release)
    print_info "Running bash hook tests for release validation..."
    if ! ./tests/run-tests.sh --silent --no-integration; then
        print_error "Bash hook tests are failing. Please fix the failing tests before preparing a release."
        exit 1
    fi

    # Run claudekit linting checks
    print_info "Running claudekit linting checks..."
    
    # Run cclint with JSON output and check for errors
    CCLINT_OUTPUT=$(npx @carlrannaberg/cclint --format json 2>&1 || true)
    CCLINT_EXIT_CODE=$?
    
    if [ $CCLINT_EXIT_CODE -ne 0 ]; then
        print_error "claudekit linting failed. Please fix all linting errors before preparing a release."
        # Parse JSON output to show errors in a readable format
        if echo "$CCLINT_OUTPUT" | jq -e '.errors > 0' >/dev/null 2>&1; then
            echo "$CCLINT_OUTPUT" | jq -r '.results[] | select(.errors > 0) | "\(.filePath): \(.messages[].message)"'
        else
            echo "$CCLINT_OUTPUT"
        fi
        exit 1
    fi
    
    print_info "All claudekit linting checks passed."

    # Check all markdown links in documentation
    print_info "Checking markdown links in documentation..."
    
    # Run markdown-link-check and capture output (use config if available)
    if [ -f ".markdown-link-check.json" ]; then
        LINK_CHECK_OUTPUT=$(npx --yes markdown-link-check --config .markdown-link-check.json README.md CHANGELOG.md CONTRIBUTING.md docs/**/*.md 2>&1 || true)
    else
        LINK_CHECK_OUTPUT=$(npx --yes markdown-link-check README.md CHANGELOG.md CONTRIBUTING.md docs/**/*.md 2>&1 || true)
    fi
    
    # Check if any broken links were found (look for [✖] in output)
    if echo "$LINK_CHECK_OUTPUT" | grep -q '\[✖\]'; then
        print_error "Broken links found in documentation. Please fix all broken links before preparing a release."
        echo "$LINK_CHECK_OUTPUT" | grep '\[✖\]' | head -20
        print_info "Run 'npx markdown-link-check README.md CHANGELOG.md CONTRIBUTING.md docs/**/*.md' to see all errors."
        exit 1
    fi
    
    print_info "All documentation links verified successfully."

    print_success "All tests passed. Continuing with release preparation..."
}

# Function to pre-compute release data
pre_compute_release_data() {
    print_step "Pre-computing release data..."
    echo "==========================="

    # Fetch latest tags
    git fetch --tags

    # Get versions
    CURRENT_VERSION=$(get_current_version)
    echo "Current version in package.json: $CURRENT_VERSION"

    # Get published version from NPM
    PUBLISHED_VERSION=$(npm view "$PACKAGE_NAME" version 2>/dev/null || echo "")
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
            print_warning "Git tag ($LAST_TAG) doesn't match NPM version (v$PUBLISHED_VERSION)"
            echo "Using NPM version as the reference for changes"
            LAST_TAG="v$PUBLISHED_VERSION"
        fi
    fi

    # Get commit information
    if [ "$LAST_TAG" != "HEAD" ]; then
        COMMIT_COUNT=$(git rev-list ${LAST_TAG}..HEAD --count)
        echo "Found $COMMIT_COUNT commits since $LAST_TAG"

        # Get recent commits (limit to avoid long output)
        RECENT_COMMITS=$(git log ${LAST_TAG}..HEAD --oneline --max-count=20)

        # Get file changes with smart filtering
        DIFF_STAT=$(git diff ${LAST_TAG}..HEAD --stat)
        ALL_CHANGED_FILES=$(git diff ${LAST_TAG}..HEAD --name-only)

        # Smart filtering: Include code files, exclude documentation/planning
        # First check if we have too many files to process efficiently
        FILE_COUNT=$(echo "$ALL_CHANGED_FILES" | wc -l)
        echo "Total files changed: $FILE_COUNT"

        if [ "$FILE_COUNT" -gt 200 ]; then
            echo "Too many files changed ($FILE_COUNT) - skipping detailed diff analysis"
            CODE_CHANGED_FILES=""
        else
            CODE_CHANGED_FILES=$(echo "$ALL_CHANGED_FILES" | grep -v -E '^(docs/|issues/|plans/|specs/|\.github/)' | \
                grep -E '\.(ts|js|json|yml|yaml|sh|py|css|scss|html|vue|jsx|tsx|mjs|cjs|toml|env|gitignore|nvmrc|dockerignore)$|^(package\.json|tsconfig|vitest\.config|eslint|prettier|babel|webpack|rollup|vite\.config|jest\.config|Dockerfile|Makefile|\.eslintrc|\.prettierrc)' || echo "")
        fi

        if [ -n "$CODE_CHANGED_FILES" ]; then
            # Count files and estimate diff size first
            CODE_FILE_COUNT=$(echo "$CODE_CHANGED_FILES" | wc -l)
            echo "Code files to analyze: $CODE_FILE_COUNT"

            # If too many files, skip diff generation entirely
            if [ "$CODE_FILE_COUNT" -gt 50 ]; then
                echo "Too many code files changed ($CODE_FILE_COUNT) - providing file list only"
                DIFF_FULL="[DIFF TOO LARGE - $CODE_FILE_COUNT code files changed: $(echo "$CODE_CHANGED_FILES" | head -20 | tr '\n' ' ')...]"
                INCLUDE_DIFF_INSTRUCTION="Use 'git diff ${LAST_TAG}..HEAD -- [filename]' to check individual files: $(echo "$CODE_CHANGED_FILES" | head -10 | tr '\n' ' ')"
            else
                # Create filtered diff for smaller changesets
                FILTERED_DIFF=""
                for file in $CODE_CHANGED_FILES; do
                    if [ -f "$file" ]; then
                        FILTERED_DIFF="$FILTERED_DIFF$(git diff ${LAST_TAG}..HEAD -- "$file" 2>/dev/null || echo "")"
                    fi
                done

                if [ -n "$FILTERED_DIFF" ]; then
                    DIFF_LINES=$(echo "$FILTERED_DIFF" | wc -l)
                    DIFF_CHARS=$(echo "$FILTERED_DIFF" | wc -c)
                    echo "Filtered diff (code files only): $DIFF_LINES lines, $DIFF_CHARS characters"

                    # Check if diff is too large
                    if [ "$DIFF_LINES" -gt 3000 ] || [ "$DIFF_CHARS" -gt 80000 ]; then
                        echo "Even filtered diff is large - providing file list only"
                        DIFF_FULL="[DIFF TOO LARGE - Code files changed: $(echo "$CODE_CHANGED_FILES" | tr '\n' ' ')]"
                        INCLUDE_DIFF_INSTRUCTION="Use 'git diff ${LAST_TAG}..HEAD -- [filename]' to check individual files: $(echo "$CODE_CHANGED_FILES" | head -10 | tr '\n' ' ')"
                    else
                        DIFF_FULL="$FILTERED_DIFF"
                        INCLUDE_DIFF_INSTRUCTION=""
                    fi
                else
                    DIFF_FULL="[NO CODE CHANGES - Only documentation/planning files changed]"
                    INCLUDE_DIFF_INSTRUCTION="No source code changes found. This release contains only documentation updates."
                fi
            fi
        else
            if [ "$FILE_COUNT" -gt 200 ]; then
                DIFF_FULL="[DIFF TOO LARGE - $FILE_COUNT total files changed - analysis skipped for performance]"
                INCLUDE_DIFF_INSTRUCTION="Use 'git diff ${LAST_TAG}..HEAD --stat' to see file changes and 'git log ${LAST_TAG}..HEAD --oneline' for commit history"
            else
                DIFF_FULL="[NO CODE CHANGES - Only documentation/planning files changed]"
                INCLUDE_DIFF_INSTRUCTION="No source code changes found. This release contains only documentation updates."
            fi
        fi
    else
        COMMIT_COUNT=0
        RECENT_COMMITS=""
        DIFF_STAT="No previous release found - this is the first release"
        DIFF_FULL=""
        CODE_CHANGED_FILES=""
        INCLUDE_DIFF_INSTRUCTION=""
    fi

    # Get current CHANGELOG content
    CHANGELOG_CONTENT=$(head -100 "$CHANGELOG_FILE" 2>/dev/null || echo "# Changelog\n\nAll notable changes to this project will be documented in this file.")

    # Calculate new version
    NEW_VERSION=$(calculate_next_version "$CURRENT_VERSION" "$RELEASE_TYPE")

    echo "New version will be: $NEW_VERSION"
    echo "Changes to analyze: $COMMIT_COUNT commits"
    echo
}

# Function to generate AI changelog and update README
generate_ai_updates() {
    print_ai "Analyzing changes and updating CHANGELOG.md and README.md..."

    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "Dry run: Skipping AI-powered CHANGELOG and README updates"
        return
    fi

    # Check if timeout command is available
    if command -v gtimeout >/dev/null 2>&1; then
        TIMEOUT_CMD="gtimeout 180"
    elif command -v timeout >/dev/null 2>&1; then
        TIMEOUT_CMD="timeout 180"
    else
        print_warning "No timeout command available. Install coreutils on macOS: brew install coreutils"
        TIMEOUT_CMD=""
    fi

    # Temporarily disable exit on error for AI command
    set +e

    local prompt="You are preparing a new $RELEASE_TYPE release for the $PACKAGE_NAME npm package.

CURRENT SITUATION:
- Current version in package.json: $CURRENT_VERSION
- Latest published version on NPM: ${PUBLISHED_VERSION:-"Not published yet"}
- Reference version for changes: ${LAST_TAG#v}
- New version will be: $NEW_VERSION
- Date: $(date +%Y-%m-%d)

COMMITS SINCE LAST RELEASE ($COMMIT_COUNT commits):
$RECENT_COMMITS

CODE FILES CHANGED:
$(echo "$CODE_CHANGED_FILES" | tr '\n' ' ')

FILE CHANGES STATISTICS (all files):
$DIFF_STAT

ACTUAL CODE CHANGES (filtered - code files only):
$DIFF_FULL

$INCLUDE_DIFF_INSTRUCTION

CURRENT CHANGELOG (first 100 lines):
$CHANGELOG_CONTENT

TASKS:
1. CHANGELOG.md Update:
   - Analyze the ACTUAL CODE CHANGES (not just commit messages)
   - Write accurate changelog entries based on the code changes:
     * Fixed: bug fixes (what was actually fixed in the code)
     * Added: new features (what new functionality was added)
     * Changed: changes to existing functionality (what behavior changed)
     * Removed: removed features (what was deleted)
     * Security: security fixes
     * Documentation: documentation only changes
   - Add a new section for version $NEW_VERSION at the top of CHANGELOG.md
   - Follow the Keep a Changelog format with today's date ($(date +%Y-%m-%d))
   - Only include categories that have changes

2. README.md Update:
   - Review the new features and changes you're adding to CHANGELOG.md
   - Update README.md to ensure all new features are properly documented:
     * Add new CLI flags/options to usage examples
     * Update feature lists to include major new functionality
     * Ensure usage examples reflect any changed behavior
     * Add any new configuration options or environment variables
   - Maintain consistency with the existing README structure and style

IMPORTANT:
- DO NOT update package.json or create any git commits - those will be handled separately
- Focus on accuracy - changelog entries should reflect actual code changes, not just commit messages
- Ensure README.md is comprehensive and up-to-date with all features in the new release"

    # Check if aio-stream is available and AI is Claude with stream-json output
    if [[ -n "$AIO_STREAM_CMD" ]] && [[ "$AI_CLI" == "claude" ]]; then
        print_info "Using aio-stream for formatted output..."
        $TIMEOUT_CMD $AI_CLI $AI_MODEL $AI_FLAGS -p "$prompt" | $AIO_STREAM_CMD --vendor claude
        AI_EXIT_CODE=${PIPESTATUS[0]}  # Get exit code from claude, not aio-stream
    else
        $TIMEOUT_CMD $AI_CLI $AI_MODEL $AI_FLAGS -p "$prompt"
        AI_EXIT_CODE=$?
    fi
    set -e  # Re-enable exit on error

    if [ $AI_EXIT_CODE -eq 124 ]; then
        print_error "$AI_CLI command timed out after 3 minutes."
        exit 1
    elif [ $AI_EXIT_CODE -ne 0 ]; then
        print_error "$AI_CLI command failed with exit code $AI_EXIT_CODE"
        exit 1
    fi

    print_success "CHANGELOG.md and README.md updated successfully!"
}


# Function to update version in package.json
update_package_version() {
    local new_version="$1"

    print_step "Updating package.json version to $new_version..."

    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "Dry run: Would update package.json version to $new_version"
        return
    fi

    # Use npm version to update
    npm version "$new_version" --no-git-tag-version

    print_success "package.json updated to version $new_version"
}

# Function to create release commit
create_release_commit() {
    local new_version="$1"

    print_step "Creating release commit..."

    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "Dry run: Would create release commit for version $new_version"
        return
    fi

    # Add all changes
    git add .

    # Create commit with proper message
    local commit_message="chore: prepare release v$new_version

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

    git commit -m "$commit_message"

    print_success "Release commit created"
}

# Function to show release summary
show_release_summary() {
    echo
    print_success "Release preparation complete!"
    echo
    echo "📊 Release Summary:"
    echo "  Previous version: $CURRENT_VERSION"
    echo "  New version:      $NEW_VERSION"
    echo "  Release type:     $RELEASE_TYPE"
    echo "  Commits included: $COMMIT_COUNT"
    echo

    if [[ "$DRY_RUN" == "false" ]]; then
        echo "🚀 Next steps:"
        echo "  1. Review the changes: git diff HEAD~1"
        echo "  2. Push to GitHub: git push origin master"
        echo "  3. The GitHub Actions will create the tag and publish to npm"
        echo
        echo "🔗 Links:"
        echo "  - GitHub Actions: https://github.com/your-username/$PACKAGE_NAME/actions"
        echo "  - NPM Package: https://www.npmjs.com/package/$PACKAGE_NAME"
        echo "  - Releases: https://github.com/your-username/$PACKAGE_NAME/releases"
    else
        echo "💡 This was a dry run. No changes were made."
        echo "   Remove --dry-run to perform the actual release preparation."
    fi
    echo
}

# Function to cleanup temporary files
cleanup() {
    rm -f /tmp/stm-*.txt /tmp/stm-*.md
}

# Function to handle script interruption
handle_interrupt() {
    echo
    print_warning "Script interrupted"
    cleanup
    exit 130
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                RELEASE_TYPE="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -y|--yes)
                INTERACTIVE=false
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Set up interrupt handler
    trap handle_interrupt SIGINT SIGTERM

    echo
    print_info "Claudekit - AI-Powered Release Preparation"
    echo

    # Validate release type if provided
    if [[ -n "$RELEASE_TYPE" ]]; then
        case "$RELEASE_TYPE" in
            patch|minor|major) ;;
            *)
                print_error "Invalid release type: $RELEASE_TYPE"
                print_info "Valid types: patch, minor, major"
                exit 1
                ;;
        esac
    fi

    # Main workflow
    detect_ai_cli
    validate_environment
    prompt_release_type
    run_tests

    # Pre-compute all data for AI
    pre_compute_release_data

    print_info "Preparing release: $CURRENT_VERSION → $NEW_VERSION"
    echo

    if [[ "$INTERACTIVE" == "true" ]]; then
        read -p "Continue with release preparation? [Y/n]: " -r
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_info "Release preparation cancelled"
            exit 0
        fi
    fi

    # Run the release preparation with AI
    generate_ai_updates

    # Update version and create commit
    update_package_version "$NEW_VERSION"
    create_release_commit "$NEW_VERSION"

    # Show summary
    show_release_summary

    # Cleanup
    cleanup

    print_success "Release preparation script completed successfully!"
}

# Run main function with all arguments
main "$@"
