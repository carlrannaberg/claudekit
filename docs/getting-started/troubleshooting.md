# Troubleshooting

## Common Issues and Solutions

### Hooks Not Triggering

**Problem**: Hooks don't run when files change or Claude stops.

**Solutions**:
1. Check `.claude/settings.json` exists and has correct hook configuration
2. Verify hooks are using the embedded format: `claudekit-hooks run <hook-name>`
3. Run `claudekit doctor` to check configuration syntax
4. Ensure claudekit is installed globally: `npm list -g claudekit`

### TypeScript/ESLint Not Found

**Problem**: TypeScript or ESLint hooks fail with "command not found".

**Solutions**:
1. Install missing dependencies in your project:
   ```bash
   npm install --save-dev typescript eslint
   ```
2. Configure custom commands in `.claudekit/config.json`:
   ```json
   {
     "hooks": {
       "typecheck-changed": {
         "command": "npx tsc --noEmit"  // Use npx if not in PATH
       }
     }
   }
   ```

### Test Suite Timeout in Claude Code

**Problem**: The `test-project` hook fails with a timeout when running tests through Claude Code's Stop hook.

**Cause**: Claude Code has a 60-second timeout limit for hooks. Test suites that include building and running comprehensive tests often exceed this limit.

**Solutions**:
1. **Configure a faster test command** in `.claudekit/config.json`:
   ```json
   {
     "hooks": {
       "test-project": {
         "command": "npm run test:unit",  // Run only unit tests
         "timeout": 50000  // Optional: adjust timeout
       }
     }
   }
   ```
2. **Disable the test-project hook** if your test suite is too large:
   - Remove `test-project` from your `.claude/settings.json` Stop hooks
   - Run tests manually when needed with `npm test`
3. **Create a custom fast test script** in your `package.json`:
   ```json
   {
     "scripts": {
       "test:fast": "vitest run --reporter=dot --bail=1"
     }
   }
   ```

### Tests Failing to Run

**Problem**: Test hooks can't find or run tests.

**Solutions**:
1. Ensure test script exists in `package.json`:
   ```json
   {
     "scripts": {
       "test": "jest"  // or vitest, mocha, etc.
     }
   }
   ```
2. Configure custom test command in `.claudekit/config.json`
3. Increase timeout for large test suites:
   ```json
   {
     "hooks": {
       "test-project": {
         "timeout": 60000  // 60 seconds
       }
     }
   }
   ```

### Checkpoints Not Being Created

**Problem**: Git checkpoints aren't saved when Claude stops.

**Solutions**:
1. Ensure you're in a git repository: `git status`
2. Check for uncommitted changes (checkpoints need changes to stash)
3. Verify the Stop hook is configured in `.claude/settings.json`
4. Check checkpoint limit hasn't been reached (default: 10)

### Self-Review Triggering Repeatedly

**Problem**: Self-review prompts appear even without new changes.

**Solutions**:
1. This is usually a duplicate detection issue
2. Update to latest claudekit version: `npm update -g claudekit`
3. Check transcript permissions: Claude Code needs access to its transcript

### Permission Errors

**Problem**: "EACCES" or permission denied errors.

**Solutions**:
1. Fix npm permissions (avoid using sudo):
   ```bash
   npm config set prefix ~/.npm-global
   export PATH=~/.npm-global/bin:$PATH
   ```
2. Reinstall claudekit without sudo
3. Check file permissions in `.claude/` directory

### Hooks Running Too Slowly

**Problem**: Hooks timeout or slow down Claude Code.

**Solutions**:
1. Use `-changed` variants instead of `-project` hooks for faster feedback
2. Increase timeouts in `.claudekit/config.json`
3. Disable hooks temporarily while debugging:
   ```bash
   # Comment out hooks in .claude/settings.json
   ```
4. Run `claudekit-hooks stats` to identify slow hooks

## Getting Help

If you encounter issues not covered here:

1. Run `claudekit doctor --verbose` for detailed diagnostics
2. Check debug output: `DEBUG=true claudekit-hooks run <hook-name>`
3. Search [existing issues](https://github.com/carlrannaberg/claudekit/issues)
4. Open a new issue with:
   - Your claudekit version: `claudekit --version`
   - Node.js version: `node --version`
   - Error messages and debug output
   - Relevant configuration files