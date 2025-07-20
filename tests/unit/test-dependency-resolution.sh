#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Test: Dependency Resolution                                                  #
# Tests the component dependency resolution system                             #
################################################################################

# Source test framework
source "$(dirname "$0")/../test-framework.sh"

# Test data directory
TEST_DATA_DIR="${TEST_TMP}/test-components"
mkdir -p "$TEST_DATA_DIR"

# Create test components with dependencies
create_test_components() {
    # Create commands directory
    mkdir -p "$TEST_DATA_DIR/commands"
    
    # Component A (no dependencies)
    cat > "$TEST_DATA_DIR/commands/component-a.md" << 'EOF'
---
description: Component A - No dependencies
allowed-tools: Read
---

# Component A

This component has no dependencies.
EOF

    # Component B (depends on A)
    cat > "$TEST_DATA_DIR/commands/component-b.md" << 'EOF'
---
description: Component B - Depends on A
allowed-tools: Read, Write
---

# Component B

This component depends on component-a.
References: /component-a
EOF

    # Component C (depends on B)
    cat > "$TEST_DATA_DIR/commands/component-c.md" << 'EOF'
---
description: Component C - Depends on B
allowed-tools: Read, Write, Edit
---

# Component C

This component depends on component-b.
References: /component-b
EOF

    # Create hooks directory
    mkdir -p "$TEST_DATA_DIR/hooks"
    
    # Validation lib (base dependency)
    cat > "$TEST_DATA_DIR/hooks/validation-lib.sh" << 'EOF'
#!/usr/bin/env bash
# Validation Library
# Description: Common validation functions
# Category: utility
# Dependencies: package-manager-detect

echo "Validation library"
EOF
    chmod +x "$TEST_DATA_DIR/hooks/validation-lib.sh"

    # TypeCheck hook (depends on validation-lib)
    cat > "$TEST_DATA_DIR/hooks/typecheck.sh" << 'EOF'
#!/usr/bin/env bash
# TypeScript Type Checking Hook
# Description: Validates TypeScript compilation
# Category: validation
# Dependencies: typescript, tsc

echo "TypeScript validation"
EOF
    chmod +x "$TEST_DATA_DIR/hooks/typecheck.sh"

    # Package manager detect (no dependencies)
    cat > "$TEST_DATA_DIR/hooks/package-manager-detect.sh" << 'EOF'
#!/usr/bin/env bash
# Package Manager Detection
# Description: Detects the package manager
# Category: utility

echo "Package manager detection"
EOF
    chmod +x "$TEST_DATA_DIR/hooks/package-manager-detect.sh"
}

# Test 1: Basic dependency resolution
test_start "Basic dependency resolution"
create_test_components

# Create a test script to verify dependency resolution
cat > "$TEST_TMP/test-deps.ts" << 'EOF'
import { discoverComponents, resolveDependencyOrder, resolveAllDependencies } from '../src/lib/components.js';

async function test() {
    const registry = await discoverComponents(process.env.TEST_DATA_DIR);
    
    // Test 1: Single component with no dependencies
    const order1 = resolveDependencyOrder(['component-a'], registry);
    console.log('Order for A:', order1.join(','));
    
    // Test 2: Component with direct dependency
    const order2 = resolveDependencyOrder(['component-b', 'component-a'], registry);
    console.log('Order for B+A:', order2.join(','));
    
    // Test 3: Transitive dependencies
    const allDeps = resolveAllDependencies(['component-c'], registry);
    console.log('All deps for C:', allDeps.join(','));
    
    // Test 4: Hook with static dependencies
    const hookDeps = resolveAllDependencies(['typecheck'], registry);
    console.log('All deps for typecheck:', hookDeps.join(','));
}

test().catch(console.error);
EOF

cd "$PROJECT_ROOT/packages/cli"
export TEST_DATA_DIR
OUTPUT=$(npx tsx "$TEST_TMP/test-deps.ts" 2>&1 || true)

if echo "$OUTPUT" | grep -q "Order for A: component-a"; then
    test_pass
else
    test_fail "Failed to resolve single component"
fi

# Test 2: Dependency order verification
test_start "Dependency order verification"

if echo "$OUTPUT" | grep -q "Order for B+A: component-a,component-b"; then
    test_pass
else
    test_fail "Dependencies not in correct order"
fi

# Test 3: Transitive dependency resolution
test_start "Transitive dependency resolution"

# Check if all dependencies are included (order may vary based on detection)
if echo "$OUTPUT" | grep -q "All deps for C:"; then
    if echo "$OUTPUT" | grep -q "component-a" && \
       echo "$OUTPUT" | grep -q "component-b" && \
       echo "$OUTPUT" | grep -q "component-c"; then
        test_pass
    else
        test_fail "Missing transitive dependencies"
    fi
else
    test_fail "Failed to resolve transitive dependencies"
fi

# Test 4: Static dependency inclusion
test_start "Static dependency inclusion (validation-lib)"

if echo "$OUTPUT" | grep -q "All deps for typecheck:"; then
    if echo "$OUTPUT" | grep -q "validation-lib" && \
       echo "$OUTPUT" | grep -q "typecheck"; then
        test_pass
    else
        test_fail "validation-lib not included for typecheck"
    fi
else
    test_fail "Failed to resolve hook dependencies"
fi

# Test 5: Circular dependency detection
test_start "Circular dependency detection"

# Create circular dependency
cat > "$TEST_DATA_DIR/commands/component-d.md" << 'EOF'
---
description: Component D - Creates circular dependency
allowed-tools: Read
---

# Component D

References: /component-e
EOF

cat > "$TEST_DATA_DIR/commands/component-e.md" << 'EOF'
---
description: Component E - Creates circular dependency  
allowed-tools: Read
---

# Component E

References: /component-d
EOF

# Test circular dependency handling
cat > "$TEST_TMP/test-circular.ts" << 'EOF'
import { discoverComponents, resolveDependencyOrder } from '../src/lib/components.js';

async function test() {
    const registry = await discoverComponents(process.env.TEST_DATA_DIR);
    
    try {
        const order = resolveDependencyOrder(['component-d', 'component-e'], registry);
        console.log('Handled circular deps:', order.join(','));
        console.log('SUCCESS: Circular dependencies handled');
    } catch (error) {
        console.log('ERROR:', error.message);
    }
}

test().catch(console.error);
EOF

CIRCULAR_OUTPUT=$(npx tsx "$TEST_TMP/test-circular.ts" 2>&1 || true)

if echo "$CIRCULAR_OUTPUT" | grep -q "Circular dependency detected" || \
   echo "$CIRCULAR_OUTPUT" | grep -q "SUCCESS: Circular dependencies handled"; then
    test_pass
else
    test_fail "Circular dependency not detected or handled"
fi

# Test 6: Missing dependency detection
test_start "Missing dependency detection"

cat > "$TEST_TMP/test-missing.ts" << 'EOF'
import { discoverComponents, getMissingDependencies } from '../src/lib/components.js';

async function test() {
    const registry = await discoverComponents(process.env.TEST_DATA_DIR);
    
    // Select typecheck but not validation-lib
    const missing = getMissingDependencies(['typecheck'], registry);
    console.log('Missing deps:', missing.join(','));
}

test().catch(console.error);
EOF

MISSING_OUTPUT=$(npx tsx "$TEST_TMP/test-missing.ts" 2>&1 || true)

if echo "$MISSING_OUTPUT" | grep -q "validation-lib"; then
    test_pass
else
    test_fail "Failed to detect missing validation-lib dependency"
fi

# Test 7: External dependency filtering
test_start "External dependency filtering"

# Component with external dependencies
cat > "$TEST_DATA_DIR/hooks/git-hook.sh" << 'EOF'
#!/usr/bin/env bash
# Git Hook
# Description: Git operations
# Dependencies: git, jq

echo "Git operations"
EOF
chmod +x "$TEST_DATA_DIR/hooks/git-hook.sh"

cat > "$TEST_TMP/test-external.ts" << 'EOF'
import { discoverComponents, resolveAllDependencies } from '../src/lib/components.js';

async function test() {
    const registry = await discoverComponents(process.env.TEST_DATA_DIR);
    const deps = resolveAllDependencies(['git-hook'], registry);
    
    // Should not include external dependencies like 'git' or 'jq'
    const hasExternal = deps.includes('git') || deps.includes('jq');
    console.log('Has external deps:', hasExternal);
    console.log('Resolved deps:', deps.join(','));
}

test().catch(console.error);
EOF

EXTERNAL_OUTPUT=$(npx tsx "$TEST_TMP/test-external.ts" 2>&1 || true)

if echo "$EXTERNAL_OUTPUT" | grep -q "Has external deps: false"; then
    test_pass
else
    test_fail "External dependencies were incorrectly included"
fi

# Cleanup
rm -rf "$TEST_DATA_DIR"