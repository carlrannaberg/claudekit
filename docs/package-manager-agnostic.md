# Package Manager Agnostic Support

claudekit is designed to work seamlessly with npm, yarn, and pnpm. This document explains how the automatic package manager detection works and how to ensure your hooks and commands remain package manager agnostic.

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

All claudekit hooks include inlined package manager detection:

```bash
# Detect package manager
detect_package_manager() {
    if [[ -f "pnpm-lock.yaml" ]]; then
        echo "pnpm"
    elif [[ -f "yarn.lock" ]]; then
        echo "yarn"
    elif [[ -f "package-lock.json" ]]; then
        echo "npm"
    elif [[ -f "package.json" ]]; then
        # Check packageManager field if available
        if command -v jq &> /dev/null; then
            local pkg_mgr=$(jq -r '.packageManager // empty' package.json 2>/dev/null)
            if [[ -n "$pkg_mgr" ]]; then
                echo "${pkg_mgr%%@*}"
                return
            fi
        fi
        echo "npm"
    else
        echo ""
    fi
}

# Use detected package manager
local pkg_exec=$(get_package_manager_exec)
$pkg_exec eslint "$file_path"
```

## Best Practices

### For Hook Development

1. **Always use detection functions**:
   ```bash
   # Bad - hardcoded
   npx tsc --noEmit
   
   # Good - package manager agnostic
   local pkg_exec=$(get_package_manager_exec)
   $pkg_exec tsc --noEmit
   ```

2. **Include detection functions inline**: Hooks must be self-contained, so include the detection functions directly in each hook rather than sourcing external files.

3. **Provide appropriate error messages**:
   ```bash
   echo "Run $(get_package_manager_run) lint to fix issues"
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

To test package manager detection:

1. **Create test environments**:
   ```bash
   # Test with npm
   mkdir test-npm && cd test-npm
   npm init -y
   npm install typescript
   
   # Test with yarn
   mkdir test-yarn && cd test-yarn
   yarn init -y
   yarn add typescript
   
   # Test with pnpm
   mkdir test-pnpm && cd test-pnpm
   pnpm init
   pnpm add typescript
   ```

2. **Verify detection**:
   ```bash
   # Source the detection functions
   source /path/to/package-manager-detect.sh
   
   # Check detection
   echo "Detected: $(detect_package_manager)"
   echo "Run command: $(get_package_manager_run)"
   echo "Exec command: $(get_package_manager_exec)"
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

### Hooks using wrong commands

**Problem**: Old version of hooks with hardcoded npm commands.

**Solution**: Re-run the claudekit setup to install updated hooks:
```bash
npm install -g claudekit
claudekit init
```

## Migration Guide

If you have existing hooks with hardcoded npm commands:

1. **Identify hardcoded commands**:
   ```bash
   grep -n "npm\|npx" .claude/hooks/*.sh
   ```

2. **Update to use detection**:
   - Replace `npm test` with `$(get_package_manager_test)`
   - Replace `npm run` with `$(get_package_manager_run)`
   - Replace `npx` with `$(get_package_manager_exec)`

3. **Test with different package managers**:
   - Create test projects with each package manager
   - Verify hooks work correctly in each environment

## Future Enhancements

Potential improvements for even better package manager support:

1. **Bun support**: Detect and support Bun package manager
2. **Deno support**: Add detection for Deno projects
3. **Custom package managers**: Allow configuration for enterprise/custom package managers
4. **Performance caching**: Cache detection results for faster execution

## See Also

- [Hooks Documentation](hooks-documentation.md) - General hooks guide
- [Create Command Documentation](create-command-documentation.md) - Creating package manager agnostic commands
- [Package Manager Detection Source](../src/hooks/package-manager-detect.sh) - The detection implementation