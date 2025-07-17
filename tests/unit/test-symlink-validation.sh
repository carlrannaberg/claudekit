#!/usr/bin/env bash

# Test symlink validation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-framework.sh"

################################################################################
# Test Setup                                                                  #
################################################################################

setUp() {
    # Create temporary directory for test
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR"
    
    # Create mock source structure
    mkdir -p src/commands/agent src/commands/checkpoint src/hooks
    echo "# Agent Init" > src/commands/agent/init.md
    echo "# Checkpoint Create" > src/commands/checkpoint/create.md
    echo "#!/bin/bash" > src/hooks/auto-checkpoint.sh
    
    # Create .claude structure with symlinks
    mkdir -p .claude/commands/agent .claude/commands/checkpoint .claude/hooks
}

tearDown() {
    # Clean up
    cd /
    rm -rf "$TEST_DIR"
}

################################################################################
# Test Cases                                                                  #
################################################################################

test_symlink_validation_detects_valid_links() {
    # Create valid symlinks
    ln -s ../../src/commands/agent/init.md .claude/commands/agent/init.md
    ln -s ../../../src/commands/checkpoint/create.md .claude/commands/checkpoint/create.md
    ln -s ../../src/hooks/auto-checkpoint.sh .claude/hooks/auto-checkpoint.sh
    
    # Test that all symlinks are valid
    find .claude -type l | while read -r link; do
        if [[ -e "$link" ]]; then
            test_pass "Symlink $link should be valid"
        else
            test_fail "Symlink $link should be valid but is broken"
        fi
    done
}

test_symlink_validation_detects_broken_links() {
    # Create broken symlinks
    ln -s ../../src/commands/agent/nonexistent.md .claude/commands/agent/broken.md
    ln -s ../../../src/commands/checkpoint/missing.md .claude/commands/checkpoint/broken.md
    
    # Test that broken symlinks are detected
    find .claude -type l | while read -r link; do
        if [[ ! -e "$link" ]]; then
            test_pass "Should detect broken symlink $link"
        else
            test_fail "Should detect broken symlink $link"
        fi
    done
}

test_symlink_validation_checks_relative_paths() {
    # Create symlinks with correct relative paths
    ln -s ../../../src/commands/agent/init.md .claude/commands/agent/init.md
    ln -s ../../../../src/commands/checkpoint/create.md .claude/commands/checkpoint/create.md
    
    # Test relative path resolution
    local link=".claude/commands/agent/init.md"
    local target=$(readlink "$link")
    local link_dir=$(dirname "$link")
    local resolved_path="$link_dir/$target"
    
    if [[ -e "$resolved_path" ]]; then
        test_pass "Should resolve relative path correctly"
    else
        test_fail "Should resolve relative path correctly: $resolved_path"
    fi
}

test_symlink_validation_handles_absolute_paths() {
    # Create symlink with absolute path
    ln -s "$PWD/src/commands/agent/init.md" .claude/commands/agent/init.md
    
    # Test absolute path resolution
    local link=".claude/commands/agent/init.md"
    if [[ -e "$link" ]]; then
        test_pass "Should handle absolute path symlinks"
    else
        test_fail "Should handle absolute path symlinks"
    fi
}

test_symlink_validation_finds_all_links() {
    # Create multiple symlinks
    ln -s ../../../src/commands/agent/init.md .claude/commands/agent/init.md
    ln -s ../../../../src/commands/checkpoint/create.md .claude/commands/checkpoint/create.md
    ln -s ../../src/hooks/auto-checkpoint.sh .claude/hooks/auto-checkpoint.sh
    
    # Count all symlinks
    local link_count=$(find .claude -type l | wc -l)
    
    assert_equals 3 "$link_count" "Should find all symlinks"
}

test_symlink_validation_ignores_regular_files() {
    # Create mix of symlinks and regular files
    ln -s ../../../src/commands/agent/init.md .claude/commands/agent/init.md
    echo "# Regular file" > .claude/commands/agent/regular.md
    
    # Count only symlinks
    local link_count=$(find .claude -type l | wc -l)
    local file_count=$(find .claude -type f | wc -l)
    
    assert_equals 1 "$link_count" "Should count only symlinks"
    assert_equals 1 "$file_count" "Should count only regular files"
}

test_symlink_validation_ci_script() {
    # Create CI validation script similar to what's in .github/workflows/ci.yml
    cat > validate_symlinks.sh << 'EOF'
#!/bin/bash
invalid_links=0

find . -type l | while read -r link; do
    if [[ -L "$link" ]]; then
        target=$(readlink "$link")
        if [[ "${target#/}" = "$target" ]]; then
            # Relative path
            link_dir=$(dirname "$link")
            target="$link_dir/$target"
        fi
        
        if [[ ! -e "$target" ]]; then
            echo "❌ Broken symlink: $link -> $target"
            invalid_links=$((invalid_links + 1))
        fi
    fi
done

if [[ $invalid_links -gt 0 ]]; then
    exit 1
fi
EOF
    
    chmod +x validate_symlinks.sh
    
    # Create valid symlinks
    ln -s ../../src/commands/agent/init.md .claude/commands/agent/init.md
    ln -s ../../../src/commands/checkpoint/create.md .claude/commands/checkpoint/create.md
    
    # Run validation script
    ./validate_symlinks.sh
    local exit_code=$?
    
    assert_exit_code 0 $exit_code "CI validation script should pass with valid symlinks"
    
    # Create broken symlink
    ln -s ../../src/commands/agent/nonexistent.md .claude/commands/agent/broken.md
    
    # Run validation script again
    ./validate_symlinks.sh
    local exit_code=$?
    
    assert_exit_code 1 $exit_code "CI validation script should fail with broken symlinks"
}

################################################################################
# Run Tests                                                                   #
################################################################################

run_test_suite "test-symlink-validation.sh"