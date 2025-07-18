# Flexible Command Names

claudekit's hooks are designed to work with any project, regardless of what the npm scripts are named. This document explains the philosophy and implementation.

## The Problem

Many tools assume specific script names in package.json:
- They expect `lint` to run linting
- They expect `typecheck` to run TypeScript checking
- They expect `test` to run tests

But projects use various names:
- Linting might be: `eslint`, `lint:js`, `check:style`, `validate`, etc.
- Type checking might be: `tsc`, `type-check`, `check:types`, `types`, etc.
- Testing might be: `test:unit`, `jest`, `check`, `validate:tests`, etc.

## The Solution

claudekit hooks don't assume script names. Instead, they:

1. **Run the actual tool directly** (ESLint, TypeScript compiler, etc.)
2. **Instruct AI assistants to find the correct commands** in AGENT.md or package.json
3. **Keep error messages concise** without verbose discovery instructions

## Implementation

### Hooks Run Tools Directly

The hooks use the package manager's exec command to run tools:
```bash
# ESLint hook runs ESLint directly
$pkg_exec eslint "$file_path"

# TypeScript hook runs tsc directly  
$pkg_exec tsc --noEmit
```

### Error Messages Guide Discovery

When validation fails, hooks provide concise instructions:
```
REQUIRED ACTIONS:
1. Fix all errors shown above
2. Run the project's lint command to verify all issues are resolved
   (Check AGENT.md/CLAUDE.md or package.json scripts for the exact command)
```

### AGENT.md Documents Exact Commands

The `/agent:init` command emphasizes documenting actual script names:
```markdown
## Build & Commands

**CRITICAL**: Document the EXACT script names from package.json, not generic placeholders.
For example:
- Build: `npm run build` (if package.json has "build": "webpack")
- Test: `npm test` (if package.json has "test": "jest")
- Type check: `npm run tsc` (if that's what's in package.json)
- Lint: `npm run eslint` (if that's what's in package.json)
```

## Best Practices

### For Projects Using claudekit

1. **Document your actual commands in AGENT.md**
   - Don't use placeholders
   - List the exact npm script names
   - Include any special flags or options

2. **Use descriptive script names**
   - Good: `lint:typescript`, `test:unit`, `typecheck`
   - Avoid: `check`, `validate`, `run`

3. **Keep related commands grouped**
   ```json
   {
     "scripts": {
       "lint": "npm run lint:js && npm run lint:css",
       "lint:js": "eslint .",
       "lint:css": "stylelint '**/*.css'"
     }
   }
   ```

### For AI Assistants

1. **Always check AGENT.md/CLAUDE.md first** for documented commands
2. **Look at package.json scripts** to find actual command names
3. **Don't assume standard names** - use what's actually there
4. **Run validation after fixes** using the project's actual commands

## Examples

### Project with Standard Names
```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### Project with Custom Names
```json
{
  "scripts": {
    "compile": "tsc",
    "validate": "jest",
    "check-style": "eslint .",
    "types": "tsc --noEmit"
  }
}
```

### Project with Grouped Commands
```json
{
  "scripts": {
    "ci": "npm run ci:lint && npm run ci:types && npm run ci:test",
    "ci:lint": "eslint . --max-warnings 0",
    "ci:types": "tsc --noEmit",
    "ci:test": "jest --coverage"
  }
}
```

In all cases, claudekit hooks will run the tools directly and instruct you to use whatever commands are actually defined in the project.

## Summary

- Hooks are tool-focused, not script-name-focused
- AI assistants must discover actual command names
- AGENT.md should document exact commands, not placeholders
- This approach works with any project structure or naming convention