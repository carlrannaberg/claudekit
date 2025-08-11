# React Expert Research Report

## Research Overview

This document contains comprehensive research from official React documentation (react.dev) to create a React domain expert agent. The research focuses on common error patterns, performance issues, and diagnostic approaches based on React 18+ official guidance.

## 1. Scope and Boundaries

**One-sentence scope**: "React component patterns, hooks hygiene, performance optimization, SSR/hydration, state management, and error handling"

**15 Recurring Problems** (frequency × complexity analysis):
1. **Too many re-renders** (HIGH freq, MEDIUM complexity) - Infinite render loops from state updates
2. **Invalid hook calls** (HIGH freq, LOW complexity) - Rules of hooks violations
3. **Memory leaks in useEffect** (MEDIUM freq, HIGH complexity) - Missing cleanup functions
4. **Stale closure bugs** (MEDIUM freq, HIGH complexity) - Outdated dependencies in callbacks
5. **SSR hydration mismatches** (MEDIUM freq, HIGH complexity) - Server/client rendering differences
6. **State update batching issues** (LOW freq, MEDIUM complexity) - Timing of state updates
7. **Context provider performance** (MEDIUM freq, MEDIUM complexity) - Unnecessary re-renders
8. **Suspense boundary errors** (LOW freq, HIGH complexity) - Fallback and error handling
9. **useEffect dependency warnings** (HIGH freq, LOW complexity) - Missing/incorrect dependencies
10. **Object/array mutation warnings** (HIGH freq, LOW complexity) - Direct state mutation
11. **useMemo/useCallback overuse** (MEDIUM freq, LOW complexity) - Premature optimization
12. **Ref timing issues** (MEDIUM freq, MEDIUM complexity) - Accessing refs during render
13. **Event handler mistakes** (HIGH freq, LOW complexity) - Calling handlers immediately
14. **Component key warnings** (HIGH freq, LOW complexity) - Missing/incorrect keys in lists
15. **Effect cleanup race conditions** (LOW freq, HIGH complexity) - Async cleanup timing

**Sub-domain mapping**:
- **CSS styling issues** → css-styling-expert
- **Accessibility violations** → accessibility-expert
- **Complex performance profiling** → react-performance-expert
- **Testing strategy** → testing-expert
- **Build/bundling issues** → webpack-expert or vite-expert

## 2. Topic Map (6 Categories)

### Category 1: Hooks Hygiene

**Common Error Messages:**
- `"React Hook useXXX has missing dependencies: 'dependency1', 'dependency2'"`
- `"React Hook useXXX is called in function 'x' that is neither a React function component nor a custom React Hook function"`
- `"Invalid hook call. Hooks can only be called inside the body of a function component"`
- `"Cannot update a component while rendering a different component"`

**Root Causes:**
- Calling hooks conditionally or inside loops
- Missing dependencies in dependency arrays
- Calling hooks outside component functions
- State updates during render phase

**Fix Strategies:**
1. **Minimal**: Add missing dependencies to array, move hook to top level
2. **Better**: Extract custom hooks, use useCallback/useMemo for stable references
3. **Complete**: Refactor component architecture, implement proper separation of concerns

**Diagnostics:**
- ESLint rules: `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`
- React DevTools: Hook inspection
- Manual: Check component structure and hook placement

**Validation:**
- No ESLint warnings
- Components render without errors
- State updates work as expected

### Category 2: Rendering Performance

**Common Error Messages:**
- `"Maximum update depth exceeded"`
- `"Too many re-renders. React limits the number of renders to prevent an infinite loop"`
- Performance warnings in React DevTools

**Root Causes:**
- State updates in render phase
- Incorrect dependency arrays causing infinite loops
- Missing React.memo on expensive components
- Creating new objects/functions in render

**Fix Strategies:**
1. **Minimal**: Move state updates to event handlers, add missing dependencies
2. **Better**: Implement React.memo, useMemo, useCallback strategically
3. **Complete**: Component architecture refactor, virtualization, code splitting

**Diagnostics:**
- React DevTools Profiler: `window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`
- Chrome DevTools: Performance tab
- why-did-you-render library
- Manual: `console.time('render')` in components

**Validation:**
- React DevTools shows minimal re-renders
- Performance.measure() shows improved metrics
- Visual inspection of render timing

### Category 3: Effects & Lifecycle

**Common Error Messages:**
- `"Warning: Can't perform a React state update on an unmounted component"`
- `"Warning: useEffect has a missing dependency"`
- Memory leak warnings in DevTools

**Root Causes:**
- Missing cleanup functions
- Async operations after component unmount
- Stale closures in effect callbacks
- Incorrect dependency management

**Fix Strategies:**
1. **Minimal**: Add cleanup function, cancel async operations
2. **Better**: Use AbortController for fetch requests, proper dependency management
3. **Complete**: Custom hooks extraction, effect consolidation

**Diagnostics:**
- Browser DevTools: Memory tab for leak detection
- React DevTools: Effect inspection
- Manual: `useEffect(() => { console.log('effect'); return () => console.log('cleanup'); })`

**Validation:**
- No memory leaks in DevTools
- Effects run only when intended
- Proper cleanup on unmount

### Category 4: State Management

**Common Error Messages:**
- `"Objects are not valid as a React child"`
- `"Cannot read properties of undefined"`
- State update warnings

**Root Causes:**
- Direct mutation of state objects/arrays
- Incorrect state update timing
- Complex nested state structures
- Async state updates

**Fix Strategies:**
1. **Minimal**: Use spread operator, Object.assign for updates
2. **Better**: Implement useReducer for complex state, immutability helpers
3. **Complete**: State management library (Zustand, Redux Toolkit), normalization

**Diagnostics:**
- React DevTools: State inspection
- Manual: `console.log` before/after state updates
- Immutability checking with development tools

**Validation:**
- State updates work predictably
- No mutation warnings
- Expected UI updates occur

### Category 5: SSR/RSC Issues

**Common Error Messages:**
- `"Hydration failed because the initial UI does not match what was rendered on the server"`
- `"Text content does not match server-rendered HTML"`
- `"Warning: Did not expect server HTML to contain"`

**Root Causes:**
- Different rendering between server and client
- Date/time differences
- Browser-only APIs called during SSR
- Inconsistent data fetching

**Fix Strategies:**
1. **Minimal**: Conditional rendering with useEffect, suppressHydrationWarning
2. **Better**: Isomorphic data fetching, environment detection
3. **Complete**: Proper SSR architecture with Next.js/Remix patterns

**Diagnostics:**
- Browser console: Hydration warnings
- Network tab: Compare server HTML vs client
- Manual: `typeof window !== 'undefined'` checks

**Validation:**
- No hydration warnings
- Identical server/client rendering
- Progressive enhancement works

### Category 6: Component Patterns

**Common Error Messages:**
- `"Warning: Each child in a list should have a unique 'key' prop"`
- `"Warning: Failed prop type"`
- `"Cannot read properties of null"`

**Root Causes:**
- Missing or duplicate keys in lists
- Incorrect prop types or shapes
- Ref timing issues
- Component lifecycle misunderstanding

**Fix Strategies:**
1. **Minimal**: Add unique keys, basic prop validation
2. **Better**: TypeScript for prop safety, proper ref handling
3. **Complete**: Design system with consistent patterns, automated testing

**Diagnostics:**
- React DevTools: Component tree inspection
- PropTypes or TypeScript errors
- Manual: Key uniqueness verification

**Validation:**
- No React warnings
- Props flow correctly
- Components behave as expected

## 3. Environment Detection

### React Version Detection
```bash
# Package.json parsing
npm list react --depth=0 2>/dev/null | grep react@

# Alternative: Direct package.json check
node -e "console.log(require('./package.json').dependencies?.react || 'Not found')"
```

### JSX Runtime Detection
```bash
# TypeScript config check
node -e "
const fs = require('fs');
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json'));
  console.log(tsconfig.compilerOptions?.jsx || 'classic');
} catch(e) { console.log('No tsconfig found'); }
"
```

### Build Tool Detection
```bash
# Check for common build tools
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then echo "Next.js"
elif [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then echo "Vite"  
elif [ -f "webpack.config.js" ]; then echo "Webpack"
elif grep -q "react-scripts" package.json; then echo "Create React App"
else echo "Unknown build tool"
fi
```

### React Features Detection
```bash
# Strict Mode detection (in main app file)
grep -r "React.StrictMode\|<StrictMode" src/ 2>/dev/null || echo "No Strict Mode found"

# Router detection
npm list react-router-dom --depth=0 2>/dev/null | grep react-router-dom || 
npm list @tanstack/react-router --depth=0 2>/dev/null | grep @tanstack/react-router ||
echo "No router detected"

# State management libraries
npm list redux react-redux @reduxjs/toolkit zustand mobx recoil --depth=0 2>/dev/null | grep -E "(redux|zustand|mobx|recoil)" || echo "No state management library detected"
```

## 4. Source Material References

**Primary Sources (Official):**
- https://react.dev/learn - Core concepts and patterns
- https://react.dev/reference/react - API reference
- https://react.dev/reference/react-dom - DOM-specific APIs
- https://react.dev/blog - Migration guides and announcements

**Performance Sources:**
- https://web.dev/react - Google's React performance guides
- React DevTools documentation
- React 18 concurrent features guide

**SSR/RSC Sources:**
- Next.js App Router documentation
- React Server Components specification
- Streaming SSR patterns

**Common Issues Sources:**
- React GitHub issues (filtered by labels)
- Stack Overflow top React questions
- React RFC discussions

## 5. Diagnostic Commands

### Quick Health Check
```bash
# React version and setup
npm list react react-dom --depth=0
grep -r "StrictMode" src/ || echo "No StrictMode found"
```

### Performance Diagnostics
```bash
# Bundle analysis (if available)
npm run build && npm run analyze 2>/dev/null || echo "No bundle analyzer"

# TypeScript check
npm run typecheck 2>/dev/null || npx tsc --noEmit || echo "No TypeScript"
```

### Common Issue Detection
```bash
# Find potential memory leaks
grep -r "useEffect" src/ | grep -v "return.*cleanup\|return.*abort\|return.*cancel" | head -5

# Find missing dependencies
npx eslint --print-config . | grep -q "react-hooks/exhaustive-deps" && echo "ESLint rules configured" || echo "Missing ESLint React rules"
```

### Runtime Validation
```bash
# Test build
npm run build || echo "Build failed"

# Test basic functionality  
npm test -- --watchAll=false --passWithNoTests || echo "Tests failed"
```

## 6. Content Matrix Structure

The content matrix captures the diagnostic patterns in a structured format with these columns:

- **Category**: One of the 6 main categories
- **Symptom/Error**: Exact error message or observable issue
- **Root Cause**: Underlying technical reason
- **Fix 1 (Minimal)**: Quick fix, usually single line
- **Fix 2 (Better)**: More robust solution
- **Fix 3 (Complete)**: Architectural or comprehensive fix
- **Diagnostic Command**: How to detect/verify the issue
- **Validation Step**: How to confirm the fix worked
- **Official Link**: Direct link to React documentation

This structure enables rapid pattern matching and progressive problem solving.

## 7. Key Insights from Research

### Anti-Patterns Discovered:
1. **Effect Overuse**: React docs emphasize "you might not need an Effect"
2. **Premature Optimization**: useMemo/useCallback warnings about overuse
3. **Imperative DOM**: Avoid direct DOM manipulation in React components
4. **State Mutations**: Never mutate state objects directly

### Performance Patterns:
1. **Batching**: React 18 automatic batching changes timing expectations
2. **Concurrent Features**: Suspense and transitions require different mental models
3. **Compiler**: React Compiler reduces need for manual memoization

### Safety Patterns:
1. **Strict Mode**: Double execution helps find side effects
2. **Cleanup Functions**: Critical for preventing memory leaks
3. **Dependency Arrays**: ESLint rules are mandatory, not optional
4. **Error Boundaries**: Class components still required for error handling

This research provides the foundation for creating a React expert agent that can diagnose and fix the most common React issues developers encounter.