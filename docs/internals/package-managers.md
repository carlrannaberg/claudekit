# Package Manager Agnostic Support

claudekit is designed to work seamlessly with npm, yarn, and pnpm. This document explains how the automatic package manager detection works in the embedded hooks system and how to ensure your commands remain package manager agnostic.

## Automatic Detection

claudekit automatically detects which package manager your project uses by checking for:

1. **Lock files** (in order of preference):
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → yarn
   - `package-lock.json` → npm

2. **packageManager field** in package.json:
   ```json
   {
     "packageManager": "pnpm@8.0.0"
   }
   ```

3. **Default**: If only `package.json` exists without a lock file, npm is assumed

## How It Works

### Package Manager Commands

Each hook includes detection functions that map commands appropriately:

| Action | npm | yarn | pnpm |
|--------|-----|------|------|
| Run script | `npm run <script>` | `yarn <script>` | `pnpm run <script>` |
| Execute package | `npx <package>` | `yarn dlx <package>` | `pnpm dlx <package>` |
| Install | `npm install` | `yarn install` | `pnpm install` |
| Install global | `npm install -g` | `yarn global add` | `pnpm add -g` |
| Test | `npm test` | `yarn test` | `pnpm test` |

### Hook Implementation

The embedded hooks system automatically detects your package manager. When you use:

```bash
claudekit-hooks run typecheck-changed
```

The embedded hook internally:
1. Detects your package manager (npm, yarn, or pnpm)
2. Uses the appropriate command syntax
3. Handles all platform differences

This detection happens automatically - you don't need to configure anything.

## Best Practices

### For Custom Hook Development

If you're creating custom shell script hooks:

1. **Use the embedded hooks when possible**: The embedded hooks handle package manager detection automatically.

2. **For custom scripts, detect package managers**:
   ```bash
   # Detect which package manager to use
   if [[ -f "pnpm-lock.yaml" ]]; then
       PKG_RUNNER="pnpm run"
   elif [[ -f "yarn.lock" ]]; then
       PKG_RUNNER="yarn"
   else
       PKG_RUNNER="npm run"
   fi
   
   # Use the detected runner
   $PKG_RUNNER lint
   ```

3. **Provide appropriate error messages**:
   ```bash
   echo "Run your package manager's lint command to fix issues"
   ```

### For Command Development

1. **Use generic placeholders in documentation**:
   ```markdown
   Run tests: <package-manager> test
   Build: <package-manager> run build
   ```

2. **Show examples for all package managers**:
   ```markdown
   Install globally:
   - npm: `npm install -g <package>`
   - yarn: `yarn global add <package>`
   - pnpm: `pnpm add -g <package>`
   ```

## Testing

To test package manager detection with embedded hooks:

1. **Create test environments**:
   ```bash
   # Test with npm
   mkdir test-npm && cd test-npm
   npm init -y
   npm install typescript eslint
   
   # Test with yarn
   mkdir test-yarn && cd test-yarn
   yarn init -y
   yarn add typescript eslint
   
   # Test with pnpm
   mkdir test-pnpm && cd test-pnpm
   pnpm init
   pnpm add typescript eslint
   ```

2. **Verify embedded hooks work correctly**:
   ```bash
   # Test that hooks use the correct package manager
   claudekit-hooks test typecheck-changed --file test.ts
   claudekit-hooks test lint-changed --file test.js
   
   # The hooks should automatically use npm, yarn, or pnpm
   # based on which lock file is present
   ```

## Supported Package Managers

### npm (Node Package Manager)
- **Lock file**: `package-lock.json`
- **Execute**: `npx`
- **Global install**: `npm install -g`
- **Website**: https://www.npmjs.com/

### Yarn
- **Lock file**: `yarn.lock`
- **Execute**: `yarn dlx` (Yarn 2+)
- **Global install**: `yarn global add`
- **Website**: https://yarnpkg.com/

### pnpm
- **Lock file**: `pnpm-lock.yaml`
- **Execute**: `pnpm dlx`
- **Global install**: `pnpm add -g`
- **Website**: https://pnpm.io/

## Troubleshooting

### Hook fails with "command not found"

**Problem**: The package manager's execute command isn't available.

**Solution**: Ensure the detected package manager is installed:
```bash
# Check what's detected
cd your-project
# Run the detection manually
```

### Wrong package manager detected

**Problem**: Multiple lock files present or packageManager field conflicts.

**Solution**: 
1. Remove conflicting lock files
2. Set explicit `packageManager` in package.json:
   ```json
   {
     "packageManager": "pnpm@8.15.0"
   }
   ```

### Hooks using wrong package manager

**Problem**: Embedded hooks not detecting the correct package manager.

**Solution**: 
1. Ensure you have the latest claudekit:
   ```bash
   npm install -g claudekit@latest
   ```
2. Check for conflicting lock files
3. Set explicit packageManager in `.claudekit/config.json`:
   ```json
   {
     "packageManager": "pnpm"
   }
   ```

## Migration Guide

If you're migrating from shell script hooks to embedded hooks:

1. **Update your settings.json**:
   ```json
   // Old: Shell script
   {"type": "command", "command": ".claude/hooks/typecheck.sh"}
   
   // New: Embedded hook
   {"type": "command", "command": "claudekit-hooks run typecheck-changed"}
   ```

2. **Remove old shell scripts** (after testing):
   ```bash
   rm -rf .claude/hooks/*.sh
   ```

3. **Test with different package managers**:
   - The embedded hooks automatically handle all package managers
   - No code changes needed when switching package managers

## Future Enhancements

Potential improvements for even better package manager support:

1. **Bun support**: Detect and support Bun package manager
2. **Deno support**: Add detection for Deno projects
3. **Custom package managers**: Allow configuration for enterprise/custom package managers
4. **Performance caching**: Cache detection results for faster execution

## See Also

- [Hooks Documentation](../reference/hooks.md) - Embedded hooks guide
- [Commands Reference](../reference/commands.md) - Available commands
- [Creating Subagents](creating-subagents.md) - Creating custom AI agents