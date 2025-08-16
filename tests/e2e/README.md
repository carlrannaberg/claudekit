# End-to-End Tests

This directory contains end-to-end tests that verify the complete functionality of claudekit CLI commands in real-world scenarios.

## Test Files

### `cli-show-piping.test.sh`

Tests the piping functionality of the `claudekit show` command to ensure:

1. **Text output piping to files** - Verifies clean markdown output suitable for file redirection
2. **Text output piping to grep** - Tests compatibility with text processing tools  
3. **JSON output piping to jq** - Validates JSON format for programmatic consumption
4. **Text output cleanliness** - Ensures no extra formatting or metadata artifacts
5. **JSON output validity** - Confirms proper JSON structure and parsing
6. **Error handling** - Verifies errors go to stderr, not stdout for clean piping
7. **Complex pipe chains** - Tests real-world multi-tool pipe scenarios
8. **Concurrent operations** - Ensures thread safety with parallel executions
9. **Special character handling** - Validates Unicode and special formatting support

## Running E2E Tests

From the project root:

```bash
# Run all tests including e2e
./tests/run-tests.sh

# Run only e2e tests  
./tests/run-tests.sh --test cli-show-piping

# Run specific e2e test directly
bash tests/e2e/cli-show-piping.test.sh
```

## Test Requirements

- Node.js and npx for running TypeScript CLI
- Standard Unix tools: grep, wc, head, jq (optional)
- Built claudekit CLI (`npm run build`)

## Test Architecture

E2E tests follow these principles:

- **Self-contained**: Each test includes setup/teardown  
- **Real commands**: Uses actual claudekit CLI, not mocks
- **Cross-platform**: Compatible with macOS/Linux environments
- **Timeout protection**: Prevents hanging in CI environments
- **Detailed assertions**: Clear pass/fail conditions with explanations