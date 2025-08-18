# Debugging Expert Research Report

## 1. Scope and Boundaries

**One-sentence scope**: Gathering context, diagnostics, and formulating initial problem descriptions for handoff to other domain experts.

### 15 Recurring Problems (Priority: Frequency × Complexity)

1. **Context Gathering** (HIGH × HIGH = CRITICAL)
   - Incomplete environment information
   - Missing error reproduction steps
   - Insufficient code context

2. **Error Analysis** (HIGH × MEDIUM = HIGH)
   - Cryptic error messages
   - Stack trace interpretation
   - Error classification

3. **Environment Detection** (HIGH × MEDIUM = HIGH)
   - Framework/library versions
   - Configuration conflicts
   - Tool availability

4. **System State Capture** (MEDIUM × HIGH = HIGH)
   - Process states
   - Resource usage
   - Network conditions

5. **Log Analysis** (HIGH × MEDIUM = HIGH)
   - Log correlation
   - Pattern identification
   - Noise filtering

6. **Dependency Mapping** (MEDIUM × HIGH = HIGH)
   - Package conflicts
   - Version mismatches
   - Dependency trees

7. **Configuration Analysis** (MEDIUM × MEDIUM = MEDIUM)
   - Config file validation
   - Setting conflicts
   - Default overrides

8. **Code Flow Tracing** (MEDIUM × HIGH = HIGH)
   - Execution paths
   - State mutations
   - Call hierarchies

9. **Performance Profiling** (LOW × HIGH = MEDIUM)
   - Resource bottlenecks
   - Memory leaks
   - CPU usage patterns

10. **Network Diagnostics** (MEDIUM × MEDIUM = MEDIUM)
    - Connection issues
    - Request/response analysis
    - Timeout problems

11. **File System Issues** (MEDIUM × LOW = LOW)
    - Permission problems
    - Path resolution
    - File locks

12. **Build System Problems** (MEDIUM × HIGH = HIGH)
    - Build failures
    - Asset resolution
    - Tool chain issues

13. **Test Failures** (HIGH × MEDIUM = HIGH)
    - Test environment setup
    - Mock/stub issues
    - Timing problems

14. **Database Connectivity** (LOW × HIGH = MEDIUM)
    - Connection strings
    - Authentication failures
    - Query performance

15. **Browser/Runtime Issues** (MEDIUM × MEDIUM = MEDIUM)
    - Browser compatibility
    - Runtime environment
    - Polyfill problems

### Sub-domain Mapping
- Complex performance issues → **react-performance-expert**, **database-expert**
- Build system failures → **webpack-expert**, **vite-expert**
- Test debugging → **jest-testing-expert**, **vitest-expert**, **playwright-expert**
- Type system errors → **typescript-type-expert**
- Database queries → **postgres-expert**, **mongodb-expert**
- Infrastructure issues → **devops-expert**, **docker-expert**

## 2. Topic Map (6 Categories)

### Category 1: Environment Context Gathering

**Common Problems:**
- "It works on my machine"
- Missing version information
- Incomplete system state

**Root Causes:**
- Insufficient diagnostic information
- Environment variables not captured
- Tool versions not checked

**Fix Strategies:**
1. **Minimal**: Basic version checks (`node --version`, `npm --version`)
2. **Better**: Comprehensive environment audit (all tools, configs)
3. **Complete**: Full system snapshot with environment dump

**Diagnostics:**
```bash
# Environment audit
node --version; npm --version; git --version
echo "Platform: $(uname -a)"
echo "Shell: $SHELL"
printenv | grep -E "(NODE|NPM|PATH)" | sort
```

**Validation:**
- All relevant versions captured
- Environment variables documented
- System constraints identified

**Resources:**
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [npm Environment Variables](https://docs.npmjs.com/cli/v7/using-npm/config)

### Category 2: Error Pattern Recognition

**Common Problems:**
- Cryptic error messages
- Stack traces too long or too short
- Error masking/swallowing

**Root Causes:**
- Poor error handling
- Library abstraction layers
- Async error propagation

**Fix Strategies:**
1. **Minimal**: Capture full error object and stack
2. **Better**: Enable verbose/debug modes
3. **Complete**: Add structured logging and error boundaries

**Diagnostics:**
```bash
# Error analysis
echo "Error type: $error_type"
echo "Stack trace depth: $(echo "$stack" | wc -l)"
echo "First error line: $(echo "$stack" | head -1)"
echo "Last user code: $(echo "$stack" | grep -v node_modules | head -1)"
```

**Validation:**
- Error type correctly identified
- Root cause traced to source
- Reproduction steps captured

### Category 3: System State Analysis

**Common Problems:**
- Resource exhaustion
- Process conflicts
- Permission issues

**Root Causes:**
- Memory leaks
- Port conflicts
- File permission problems

**Fix Strategies:**
1. **Minimal**: Check basic system resources
2. **Better**: Process monitoring and analysis
3. **Complete**: Full system profiling

**Diagnostics:**
```bash
# System state capture
ps aux | head -10
df -h
free -m
netstat -tlnp | grep LISTEN
lsof +D . | head -10
```

**Validation:**
- Resource usage within limits
- No conflicting processes
- Proper permissions set

### Category 4: Code Context Mapping

**Common Problems:**
- Missing code context
- Unclear execution flow
- State mutation tracking

**Root Causes:**
- Complex control flow
- Hidden state changes
- Insufficient logging

**Fix Strategies:**
1. **Minimal**: Add strategic console.log statements
2. **Better**: Use debugger breakpoints
3. **Complete**: Implement structured tracing

**Diagnostics:**
```bash
# Code analysis
find . -name "*.js" -o -name "*.ts" | xargs wc -l
grep -r "console\." --include="*.js" --include="*.ts" . | wc -l
grep -r "debugger" --include="*.js" --include="*.ts" . | wc -l
```

**Validation:**
- Execution path documented
- Key variables tracked
- State changes logged

### Category 5: Dependency Investigation

**Common Problems:**
- Version conflicts
- Missing dependencies
- Circular dependencies

**Root Causes:**
- Peer dependency issues
- Package hoisting problems
- Import/export mismatches

**Fix Strategies:**
1. **Minimal**: Check package.json vs package-lock.json
2. **Better**: Analyze dependency tree
3. **Complete**: Dependency audit and resolution

**Diagnostics:**
```bash
# Dependency analysis
npm ls --depth=0
npm audit
npm outdated
npx madge --circular --extensions js,ts src/
```

**Validation:**
- No version conflicts
- All dependencies resolved
- No circular dependencies

### Category 6: Configuration Validation

**Common Problems:**
- Invalid configuration files
- Environment-specific settings
- Tool compatibility issues

**Root Causes:**
- Syntax errors in configs
- Missing environment variables
- Tool version incompatibilities

**Fix Strategies:**
1. **Minimal**: Validate JSON/YAML syntax
2. **Better**: Check configuration schemas
3. **Complete**: Environment-specific validation

**Diagnostics:**
```bash
# Configuration validation
find . -name "*.json" -exec echo "Checking {}" \; -exec jq . {} \; 2>&1 | grep -A1 "parse error"
find . -name "*.yml" -o -name "*.yaml" | head -5
test -f .env && echo "Environment file found"
```

**Validation:**
- All configs syntactically valid
- Required settings present
- Tool compatibility verified

## 3. Environment Detection Methods

### Project Type Detection
```bash
# Framework detection
test -f package.json && echo "Node.js project"
test -f requirements.txt && echo "Python project"
test -f Cargo.toml && echo "Rust project"
test -f composer.json && echo "PHP project"

# Frontend framework detection
grep -q "react" package.json 2>/dev/null && echo "React"
grep -q "vue" package.json 2>/dev/null && echo "Vue"
grep -q "angular" package.json 2>/dev/null && echo "Angular"
grep -q "svelte" package.json 2>/dev/null && echo "Svelte"
```

### Tool Availability
```bash
# Development tools
command -v git >/dev/null && echo "Git available"
command -v docker >/dev/null && echo "Docker available"
command -v node >/dev/null && echo "Node.js available"
command -v npm >/dev/null && echo "npm available"
command -v yarn >/dev/null && echo "Yarn available"
```

### Configuration Discovery
```bash
# Find configuration files
find . -maxdepth 2 -name ".*rc*" -o -name "*.config.*" | head -10
ls -la | grep -E "\.(json|yml|yaml|toml)$"
```

## 4. Source Material Priority

### Official Documentation (High Priority)
1. [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
2. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
3. [Firefox Developer Tools](https://developer.mozilla.org/en-US/docs/Tools)
4. [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)

### Community Resources (Medium Priority)
1. [Debugging JavaScript](https://javascript.info/debugging-chrome)
2. [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
3. [Web Performance](https://web.dev/performance/)

### Tool-Specific Documentation (Context-Dependent)
1. Framework debugging guides (React DevTools, Vue DevTools)
2. Build tool debugging (Webpack, Vite)
3. Test framework debugging (Jest, Vitest, Playwright)

## 5. Content Matrix Structure

### Matrix Columns
- **Category**: Problem domain
- **Symptom**: Observable issue
- **Context_Needed**: What information to gather
- **Diagnostic_Command**: How to gather it
- **Analysis_Pattern**: What to look for
- **Handoff_Criteria**: When to delegate to specialist
- **Specialist_Agent**: Which expert to recommend

### Example Entries
- Context: Error_Analysis, Symptom: "TypeError: Cannot read property", Context: Stack trace + variable states, Diagnostic: Add logging + debugger, Analysis: Undefined variables, Handoff: Type-related → typescript-type-expert
- Context: Performance, Symptom: "Application slow", Context: Resource usage + profiling, Diagnostic: Monitor memory/CPU, Analysis: Bottlenecks, Handoff: React perf → react-performance-expert

## 6. Canonical Template Requirements

### Frontmatter Requirements
```yaml
name: triage-expert
description: Context gathering and initial problem diagnosis specialist. Use PROACTIVELY when encountering errors, performance issues, or unexpected behavior before engaging specialized experts.
tools: Read, Grep, Glob, Bash
category: technology
universal: true
defaultSelected: true
```

### Step 0 (Delegation Logic)
```
0. If specific domain expertise needed, recommend and stop:
   - Type system errors → typescript-type-expert
   - Build failures → webpack-expert, vite-expert
   - Test failures → jest-testing-expert, vitest-expert
   - Performance issues → react-performance-expert
   - Database queries → postgres-expert, mongodb-expert
   Output: "This requires [domain] expertise. Use the [expert] subagent. Here's the gathered context: [context]"
```

### Validation Order
1. **Context Complete**: All relevant information gathered
2. **Problem Classified**: Issue type identified
3. **Specialist Identified**: Appropriate expert selected
4. **Handoff Package**: Clean context transfer

### Safety Rules
- Only use one-shot diagnostic commands
- No destructive operations
- No long-running processes
- No system modifications

## 7. Distillation Guidelines

### Focus Areas for Non-Obvious Knowledge
1. **Error Pattern Recognition**: Common error signatures and root causes
2. **Context Correlation**: Which information pieces are most diagnostic
3. **Handoff Timing**: When to stop investigating and delegate
4. **Information Hierarchy**: What to capture first vs. what's optional

### Pitfalls to Document
- Over-investigation: Spending too much time before delegating
- Context pollution: Capturing too much irrelevant information
- Tool assumptions: Assuming tools are available without checking
- Environment blindness: Missing crucial environment details

## 8. Deliverables Checklist

- [x] Research document with 15+ problems across 6 categories
- [ ] Content matrix (CSV) with diagnostic workflows
- [ ] Final agent file following canonical template
- [ ] Environment detection scripts tested
- [ ] Handoff criteria clearly defined
- [ ] Safety validation for all diagnostic commands

---
*Research completed: 2025-08-18*