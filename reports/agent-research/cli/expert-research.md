# CLI Development Expert Research Report

## 1. Scope and Boundaries

**One-sentence scope:** Command-line interface development for npm packages with Unix philosophy, argument parsing, interactive prompts, monorepo detection, cross-platform compatibility, and global installation management.

### 15 Recurring Problems (Frequency × Complexity Ratings)

1. **Shebang path corruption on npm install** - HIGH × HIGH = Critical
2. **Global binary PATH configuration failures** - HIGH × MEDIUM = High Priority  
3. **Cross-platform path separator issues (Windows vs Unix)** - HIGH × MEDIUM = High Priority
4. **Monorepo workspace detection failures** - MEDIUM × HIGH = High Priority
5. **Interactive prompt freezing with spinners** - MEDIUM × MEDIUM = Medium Priority
6. **npm 11.2+ unknown config warnings** - HIGH × LOW = Medium Priority
7. **Package-lock version incompatibilities** - MEDIUM × MEDIUM = Medium Priority
8. **Platform-specific optional dependencies** - MEDIUM × HIGH = High Priority
9. **Binary symlink creation failures** - MEDIUM × MEDIUM = Medium Priority
10. **Incorrect Node binary name in shebang** - LOW × HIGH = Medium Priority
11. **Terminal color theme compatibility** - LOW × LOW = Low Priority
12. **CLI argument parsing with workspaces** - MEDIUM × MEDIUM = Medium Priority
13. **Configuration file precedence issues** - LOW × MEDIUM = Low Priority
14. **npx hanging on optional peer deps** - MEDIUM × HIGH = High Priority
15. **Postinstall script failures in workspaces** - MEDIUM × HIGH = High Priority

### Sub-domain Mapping (When to Delegate)

- **Node.js runtime issues** → nodejs-expert
- **Testing CLI tools** → testing-expert  
- **TypeScript CLI compilation** → typescript-build-expert
- **Docker containerization** → docker-expert
- **GitHub Actions for CLI publishing** → github-actions-expert

## 2. Topic Map (6 Categories)

### Category 1: Installation & Setup Issues
**Common Errors:**
- "command not found" after global npm install
- "npm install corrupts binary executable shebang files"
- "Unknown user/project config" warnings in npm 11.2+
- ".bin directory not created with v6 package-lock"

**Root Causes:**
- PATH environment variable not including npm global bin directory
- npm converting line endings in shebang scripts
- npm 11.2.0 not recognizing environment configs from other package managers
- Missing "bin": {} property in older package-lock files

**Fix Strategies:**
1. **Minimal**: Add npm global bin to PATH manually
2. **Better**: Use npx for local binary execution (available since npm 5.2.0)
3. **Complete**: Configure .npmrc with proper prefix and bin-links settings

**Diagnostics:**
```bash
# Check npm global bin location
npm config get prefix
echo $PATH | grep -q "$(npm config get prefix)/bin" && echo "PATH configured" || echo "PATH missing npm bin"

# Verify binary creation
ls -la node_modules/.bin/

# Check shebang in installed script
head -n1 $(which your-cli)
```

**Validation:**
- CLI command executes without "command not found"
- Shebang points to correct node binary
- No warning messages during installation

**Resources:**
- [npm CLI common errors](https://docs.npmjs.com/common-errors/)
- [npm install documentation](https://docs.npmjs.com/cli/install/)

### Category 2: Cross-Platform Compatibility
**Common Errors:**
- Path separator issues between Windows (\) and Unix (/)
- "npm query failing on Windows with case insensitive paths"
- Configuration paths differ across Windows/macOS/Linux
- Line ending issues (CRLF vs LF)

**Root Causes:**
- Hard-coded path separators
- Not using path normalization functions
- Platform-specific configuration locations
- Git autocrlf settings affecting scripts

**Fix Strategies:**
1. **Minimal**: Use forward slashes everywhere
2. **Better**: Use path.join() and os.homedir() for paths
3. **Complete**: Implement platform detection with specific handlers

**Diagnostics:**
```bash
# Detect platform
node -e "console.log(process.platform)"

# Check line endings
file your-cli.js | grep -q CRLF && echo "Windows line endings" || echo "Unix line endings"

# Test on different platforms
npm test -- --platform=win32
npm test -- --platform=darwin
npm test -- --platform=linux
```

**Validation:**
- CLI works on Windows, macOS, and Linux
- Paths resolve correctly on all platforms
- Configuration files found in platform-appropriate locations

**Resources:**
- [Node.js path module](https://nodejs.org/api/path.html)
- [Cross-platform CLI best practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)

### Category 3: Argument Parsing & Command Structure
**Common Errors:**
- "Arguments not correctly passed when --workspace is used"
- Complex argument parsing with process.argv
- Subcommand routing failures
- Option conflicts between global and command-specific

**Root Causes:**
- Manual process.argv parsing instead of using libraries
- Incorrect command hierarchy setup
- Missing validation for required arguments
- Workspace flag interfering with script arguments

**Fix Strategies:**
1. **Minimal**: Use minimist for basic parsing
2. **Better**: Implement with Commander.js or Yargs
3. **Complete**: Full command architecture with validation and help

**Diagnostics:**
```javascript
// Test argument parsing
const { program } = require('commander');
console.log('Parsed options:', program.opts());
console.log('Remaining args:', program.args);
```

**Validation:**
- All documented options work as expected
- Help text generated automatically
- Subcommands route correctly
- Error messages are clear for invalid input

**Resources:**
- [Commander.js documentation](https://github.com/tj/commander.js)
- [Yargs documentation](https://yargs.js.org/)
- [Node.js parseArgs API](https://nodejs.org/api/util.html#utilparseargsconfig)

### Category 4: Interactive CLI & User Experience
**Common Errors:**
- "ORA Spinner stops on CLI with Inquirer.js"
- Terminal colors unreadable on certain themes
- Interactive prompts fail in CI environments
- Spinner blocks during synchronous operations

**Root Causes:**
- Synchronous code blocking event loop
- Not detecting TTY/CI environment
- Default Inquirer colors hard to override
- Missing error handling for interrupted prompts

**Fix Strategies:**
1. **Minimal**: Detect CI and skip interactive features
2. **Better**: Use async/await properly with spinners
3. **Complete**: Implement fallback for non-interactive mode

**Diagnostics:**
```javascript
// Check interactive capability
const isInteractive = process.stdin.isTTY && 
                     process.stdout.isTTY && 
                     !process.env.CI;

// Test spinner with async operation
const spinner = ora('Loading...').start();
await someAsyncOperation();
spinner.succeed('Done!');
```

**Validation:**
- Spinners animate during async operations
- Prompts work in terminal but skip in CI
- Colors are readable on dark and light themes
- Graceful degradation in non-TTY environments

**Resources:**
- [Inquirer.js examples](https://github.com/SBoudrias/Inquirer.js)
- [Ora spinner documentation](https://github.com/sindresorhus/ora)
- [Chalk terminal colors](https://github.com/chalk/chalk)

### Category 5: Monorepo & Workspace Management
**Common Errors:**
- "postinstall in workspace throws 'command not found'"
- Workspace detection failures across different tools
- "npm workspace incorrectly flags dependency as optional peer"
- Lerna v6 modifying lock file formatting

**Root Causes:**
- Different monorepo tools use different config files
- Package manager incompatibilities
- Workspace hoisting strategies differ
- Lerna v6 now requires Nx underneath

**Fix Strategies:**
1. **Minimal**: Walk up directory tree to find package.json
2. **Better**: Detect specific monorepo tool and adapt
3. **Complete**: Support all major monorepo configurations

**Diagnostics:**
```bash
# Detect monorepo type
test -f lerna.json && echo "Lerna monorepo"
test -f nx.json && echo "Nx monorepo"  
test -f pnpm-workspace.yaml && echo "pnpm workspace"
test -f rush.json && echo "Rush monorepo"
grep -q '"workspaces"' package.json && echo "npm/yarn workspaces"
```

**Validation:**
- Correctly identifies monorepo root
- Finds all workspace packages
- Commands work from any workspace directory
- Handles different hoisting strategies

**Resources:**
- [pnpm workspaces](https://pnpm.io/workspaces)
- [Nx monorepo setup](https://nx.dev/recipes/adopting-nx/adding-to-monorepo)
- [Lerna and Nx integration](https://lerna.js.org/docs/lerna-and-nx)

### Category 6: Package Distribution & Publishing
**Common Errors:**
- Binary not executable after installation
- Missing files in published package
- Version conflicts in lock files
- Platform-specific dependencies not included

**Root Causes:**
- Missing executable permissions
- Incorrect "files" field in package.json
- Not testing with npm pack before publish
- Optional dependencies misconfigured

**Fix Strategies:**
1. **Minimal**: chmod +x on binary files
2. **Better**: Proper package.json bin configuration
3. **Complete**: Automated release workflow with validation

**Diagnostics:**
```bash
# Test package before publishing
npm pack
tar -tzf *.tgz | head -20

# Verify binary configuration
node -e "console.log(require('./package.json').bin)"

# Test local installation
npm install -g .
which your-cli
```

**Validation:**
- Package installs globally without errors
- Binary is executable with correct permissions
- All necessary files included in package
- Works on fresh npm install

**Resources:**
- [npm publish documentation](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Making npm packages executable](https://dev.to/orkhanhuseyn/making-your-npm-package-executable-1j0b)

## Quick Decision Trees

### Package Manager Choice
```
Simple project → npm
Need workspace support → pnpm  
Enterprise with many teams → Yarn Berry
Already using Lerna → Consider migration to Nx
```

### CLI Framework Selection
```
< 3 commands → Native parseArgs or minimist
Complex subcommands → Commander.js
Need middleware/plugins → Yargs
Enterprise CLI → Oclif
```

### Monorepo Tool Selection
```
< 10 packages → npm/yarn workspaces
10-50 packages → pnpm workspaces + Turborepo
> 50 packages → Nx
Legacy Lerna project → Migrate to Nx gradually
```

### Interactive Library Choice
```
Simple prompts → Native readline
Standard prompts → Inquirer.js
Performance critical → Prompts or Enquirer
Custom UI needed → Build on blessed/ink
```

## Performance Considerations

### Startup Time Optimization
- Use lazy loading for commands
- Avoid synchronous file operations
- Cache expensive computations
- Minimize dependencies

### Binary Size Reduction
- Tree-shake unused code
- Use dynamic imports
- Consider bundling with esbuild
- Audit dependency sizes

## Security Best Practices

### Dependency Management
- Regular security audits with npm audit
- Use lock files for reproducible builds
- Validate user input thoroughly
- Sanitize file paths to prevent traversal

### Publishing Safety
- Use 2FA on npm account
- Test with npm pack before publish
- Use automated release workflows
- Include security policy in repository

## Migration Strategies

### From Lerna to Modern Tools
1. Keep Lerna for versioning initially
2. Add Nx/Turborepo for task running
3. Gradually migrate scripts
4. Finally replace Lerna completely

### From Global to npx
1. Document npx usage in README
2. Keep global install as fallback
3. Use package.json scripts for complex commands
4. Educate users about npx benefits

## Resources

### Official Documentation
- [npm CLI documentation](https://docs.npmjs.com/cli/v10)
- [Node.js CLI best practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- [Commander.js guide](https://github.com/tj/commander.js)
- [Yargs documentation](https://yargs.js.org/)
- [Inquirer.js documentation](https://github.com/SBoudrias/Inquirer.js)

### Tools & Libraries
- [npx](https://www.npmjs.com/package/npx) - Execute packages without installing globally
- [cross-env](https://www.npmjs.com/package/cross-env) - Cross-platform environment variables
- [pkg](https://www.npmjs.com/package/pkg) - Package into standalone executable
- [nexe](https://www.npmjs.com/package/nexe) - Create single executable

### Learning Resources
- [Building CLIs with Node.js](https://www.twilio.com/blog/how-to-build-a-cli-with-node-js)
- [Effective CLI Design](https://clig.dev/)
- [12 Factor CLI Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46)

## Common Anti-Patterns to Avoid

1. **Hard-coding paths** - Always use path.join() and detect platform
2. **Ignoring CI environments** - Always check process.env.CI
3. **Synchronous I/O in spinners** - Use async/await properly
4. **Manual argv parsing** - Use established libraries
5. **No error messages** - Provide actionable error output
6. **Missing help text** - Auto-generate with commander/yargs
7. **No version command** - Include --version flag
8. **Platform-specific code** - Abstract into separate modules
9. **No progress indication** - Use spinners for long operations
10. **Forgetting Windows** - Test on all platforms

## Testing Strategies

### Unit Testing
- Mock file system operations
- Test argument parsing combinations
- Validate error handling
- Check platform-specific code paths

### Integration Testing
- Test actual CLI execution with child_process
- Verify npm install scenarios
- Test in Docker containers for different OS
- CI matrix for Node versions and platforms

### End-to-End Testing
- Full installation from npm registry
- Test all documented examples
- Verify in monorepo setups
- Check global and local installations