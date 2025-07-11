 #!/bin/bash
# Run tests related to changed files

# Read JSON input from stdin
JSON_INPUT=$(cat)

# Extract file path from JSON using jq (or fallback to grep/sed if jq not available)
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // empty')
else
  # Fallback: extract file_path using sed
  FILE_PATH=$(echo "$JSON_INPUT" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p' | head -1)
fi

# Exit if no file path found
if [ -z "$FILE_PATH" ]; then
  echo "No file to test"
  exit 0
fi

# Only run tests for TypeScript/JavaScript files
if [[ ! $FILE_PATH =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Skip test files themselves
if [[ $FILE_PATH =~ \.test\.(ts|tsx|js|jsx)$ ]] || [[ $FILE_PATH =~ \.spec\.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

echo "🧪 Running tests related to: $FILE_PATH..." >&2

# Get the base filename without extension to search for related test files
BASE_NAME=$(basename "$FILE_PATH" | sed 's/\.[^.]*$//')
DIR_NAME=$(dirname "$FILE_PATH")

# Try to find related test files using common patterns
TEST_PATTERNS=(
  "${DIR_NAME}/${BASE_NAME}.test.ts"
  "${DIR_NAME}/${BASE_NAME}.test.tsx"
  "${DIR_NAME}/${BASE_NAME}.test.js"
  "${DIR_NAME}/${BASE_NAME}.test.jsx"
  "${DIR_NAME}/${BASE_NAME}.spec.ts"
  "${DIR_NAME}/${BASE_NAME}.spec.tsx"
  "${DIR_NAME}/${BASE_NAME}.spec.js"
  "${DIR_NAME}/${BASE_NAME}.spec.jsx"
  "${DIR_NAME}/__tests__/${BASE_NAME}.test.ts"
  "${DIR_NAME}/__tests__/${BASE_NAME}.test.tsx"
  "${DIR_NAME}/__tests__/${BASE_NAME}.test.js"
  "${DIR_NAME}/__tests__/${BASE_NAME}.test.jsx"
  "${DIR_NAME}/__tests__/${BASE_NAME}.spec.ts"
  "${DIR_NAME}/__tests__/${BASE_NAME}.spec.tsx"
  "${DIR_NAME}/__tests__/${BASE_NAME}.spec.js"
  "${DIR_NAME}/__tests__/${BASE_NAME}.spec.jsx"
)

# Find existing test files
EXISTING_TESTS=()
for pattern in "${TEST_PATTERNS[@]}"; do
  if [ -f "$pattern" ]; then
    EXISTING_TESTS+=("$pattern")
  fi
done

# If we found related test files, run them
if [ ${#EXISTING_TESTS[@]} -gt 0 ]; then
  echo "Found related test files: ${EXISTING_TESTS[*]}" >&2

  # Create temp file for test output
  TEST_LOG=$(mktemp)

  # Run tests and capture output
  if ! npm test -- "${EXISTING_TESTS[@]}" > "$TEST_LOG" 2>&1; then
    # Tests failed - send detailed instructions to Claude Code
    cat >&2 <<EOF
BLOCKED: Tests failed for $FILE_PATH

MANDATORY INSTRUCTIONS:
You MUST fix ALL test failures, regardless of whether they seem related to your recent changes.
Someone has to fix these tests, and you're the only one working on this codebase.

FAILED TEST FILES:
${EXISTING_TESTS[*]}

REQUIRED ACTIONS:
1. First, examine the failing test output below to understand what's broken

2. Run the failing tests individually for detailed output:
    npm test -- ${EXISTING_TESTS[*]}

3. Then run ALL tests to ensure nothing else is broken:
    npm test

4. Fix ALL failing tests by:
    - Reading each test to understand its purpose
    - Determining if the test or the implementation is wrong
    - Updating whichever needs to change to match expected behavior
    - NEVER skip, comment out, or use .skip() to bypass tests

5. If there are many test failures:
    - Use AgentTool to spawn concurrent agents
    - Assign each agent specific test files to fix
    - Have agents coordinate on shared interfaces/types
    - Each agent must verify their fixes don't break other tests

6. Common fixes to consider:
    - Update mock data to match new types/interfaces
    - Fix async timing issues with proper await/waitFor
    - Update component props in tests to match changes
    - Ensure test database/state is properly reset
    - Check if API contracts have changed

Test output:
$(cat "$TEST_LOG")

Remember: The codebase must have 100% passing tests. No exceptions.
EOF
    rm -f "$TEST_LOG"
    exit 2
  fi

  # Tests passed
  echo "✅ All related tests passed!" >&2
  rm -f "$TEST_LOG"
else
  # No tests found - warning but don't block
  echo "⚠️  No test files found for $FILE_PATH" >&2
  echo "Consider creating tests in: ${DIR_NAME}/${BASE_NAME}.test.ts" >&2
  exit 0
fi
