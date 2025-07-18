#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Package Manager Detection Functions                                          #
# Detects which package manager is used in the current project                #
################################################################################

# Detect which package manager is being used
detect_package_manager() {
    # Check for lockfiles in order of preference
    if [[ -f "pnpm-lock.yaml" ]]; then
        echo "pnpm"
    elif [[ -f "yarn.lock" ]]; then
        echo "yarn"
    elif [[ -f "package-lock.json" ]]; then
        echo "npm"
    elif [[ -f "package.json" ]]; then
        # No lockfile, but package.json exists
        # Check for packageManager field in package.json
        if command -v jq &> /dev/null; then
            local pkg_mgr=$(jq -r '.packageManager // empty' package.json 2>/dev/null)
            if [[ -n "$pkg_mgr" ]]; then
                # Extract manager name from packageManager field (e.g., "pnpm@8.0.0" -> "pnpm")
                echo "${pkg_mgr%%@*}"
                return
            fi
        fi
        # Default to npm if no specific manager detected
        echo "npm"
    else
        # No package.json found
        echo ""
    fi
}

# Get the package manager's run command
get_package_manager_run() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm)
            echo "npm run"
            ;;
        yarn)
            # yarn doesn't require "run" for scripts
            echo "yarn"
            ;;
        pnpm)
            echo "pnpm run"
            ;;
        *)
            echo "npm run"  # fallback
            ;;
    esac
}

# Get the package manager's execute command (like npx)
get_package_manager_exec() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm)
            echo "npx"
            ;;
        yarn)
            echo "yarn dlx"
            ;;
        pnpm)
            echo "pnpm dlx"
            ;;
        *)
            echo "npx"  # fallback
            ;;
    esac
}

# Get the package manager's install command
get_package_manager_install() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm)
            echo "npm install"
            ;;
        yarn)
            echo "yarn install"
            ;;
        pnpm)
            echo "pnpm install"
            ;;
        *)
            echo "npm install"  # fallback
            ;;
    esac
}

# Get the package manager's test command
get_package_manager_test() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm)
            echo "npm test"
            ;;
        yarn)
            echo "yarn test"
            ;;
        pnpm)
            echo "pnpm test"
            ;;
        *)
            echo "npm test"  # fallback
            ;;
    esac
}

# Check if a package manager is available
is_package_manager_available() {
    local pm="${1:-$(detect_package_manager)}"
    if [[ -z "$pm" ]]; then
        return 1
    fi
    command -v "$pm" &> /dev/null
}

# Get global install command for a package manager
get_package_manager_global_install() {
    local pm="${1:-$(detect_package_manager)}"
    case "$pm" in
        npm)
            echo "npm install -g"
            ;;
        yarn)
            echo "yarn global add"
            ;;
        pnpm)
            echo "pnpm add -g"
            ;;
        *)
            echo "npm install -g"  # fallback
            ;;
    esac
}

# Export functions if sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    export -f detect_package_manager
    export -f get_package_manager_run
    export -f get_package_manager_exec
    export -f get_package_manager_install
    export -f get_package_manager_test
    export -f is_package_manager_available
    export -f get_package_manager_global_install
fi