# TypeScript Type Expert Research

## Research Overview

This document compiles comprehensive TypeScript type system expertise for the `typescript-type-expert` agent, focusing on advanced type-level programming, complex type manipulations, and solving intricate type system challenges.

## Scope Definition

**One-sentence scope**: Advanced TypeScript type system, generics, utility types, type inference, and complex type manipulation patterns for type-level programming.

## Core Problem Categories

### 1. Generic Types & Constraints
- **Frequency**: High
- **Complexity**: High
- **Focus**: Complex generic constraints, variance, inference failures

### 2. Utility Types & Transformations  
- **Frequency**: Medium
- **Complexity**: High
- **Focus**: Conditional types, mapped types, template literals

### 3. Type Inference & Narrowing
- **Frequency**: High  
- **Complexity**: Medium
- **Focus**: Control flow analysis, type guards, assertion functions

### 4. Advanced Type Patterns
- **Frequency**: Medium
- **Complexity**: High
- **Focus**: Recursive types, brand types, type-level computation

### 5. Performance & Compilation
- **Frequency**: Medium
- **Complexity**: High
- **Focus**: Type instantiation depth, compiler performance

### 6. Library & Module Types
- **Frequency**: Low
- **Complexity**: Medium
- **Focus**: Declaration files, module augmentation, ambient types

## Environment Detection Patterns

```bash
# TypeScript version detection
tsc --version

# Configuration analysis
cat tsconfig.json | jq '.compilerOptions.strict, .compilerOptions.noImplicitAny'

# Type coverage analysis
npx type-coverage --detail

# Performance diagnostics
tsc --extendedDiagnostics --incremental false

# Declaration file validation
tsc --declaration --emitDeclarationOnly --noEmit false
```

## Advanced Type System Patterns

### 1. Complex Generic Constraints

#### Conditional Constraints
```typescript
// Advanced constraint with conditional logic
type ExtractArrayType<T> = T extends (infer U)[] ? U : never;
type ExtractPromiseType<T> = T extends Promise<infer U> ? U : T;

// Recursive generic constraints
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object 
    ? T[K] extends Function 
      ? T[K] 
      : DeepReadonly<T[K]>
    : T[K];
};
```

#### Variance and Covariance Issues
```typescript
// Handling variance in generic types
interface Producer<out T> {
  produce(): T;
}

interface Consumer<in T> {
  consume(item: T): void;
}

// Bivariant function parameters (common issue)
type EventHandler<T> = (event: T) => void;
```

### 2. Advanced Utility Type Compositions

#### Template Literal Type Patterns
```typescript
// Complex string manipulation at type level
type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${P1}${Uppercase<P2>}${CamelCase<P3>}`
  : S;

// API endpoint type generation
type ApiEndpoint<T extends string> = `api/v1/${T}`;
type UserEndpoints = ApiEndpoint<'users' | 'profiles' | 'settings'>;
```

#### Complex Mapped Types
```typescript
// Conditional property transformation
type OptionalByType<T, U> = {
  [K in keyof T]: T[K] extends U ? T[K] | undefined : T[K];
};

// Key remapping with template literals
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

### 3. Type Inference and Narrowing

#### Advanced Type Guards
```typescript
// Generic type guard with type predicate
function isOfType<T>(
  value: unknown,
  validator: (x: unknown) => x is T
): value is T {
  return validator(value);
}

// Assertion function pattern
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Expected string');
  }
}
```

#### Control Flow Analysis Edge Cases
```typescript
// Union type narrowing challenges
type Status = 'loading' | 'success' | 'error';
type DataState<T> = 
  | { status: 'loading'; data: undefined }
  | { status: 'success'; data: T }
  | { status: 'error'; data: undefined; error: string };

// Discriminated union with complex narrowing
function handleState<T>(state: DataState<T>) {
  switch (state.status) {
    case 'loading':
      // TypeScript knows data is undefined here
      break;
    case 'success':
      // TypeScript knows data is T here
      console.log(state.data.toString());
      break;
    case 'error':
      // TypeScript knows error exists here
      console.error(state.error);
      break;
  }
}
```

### 4. Advanced Type Patterns

#### Recursive Type Definitions
```typescript
// Safe recursive types with depth limiting
type Json = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: Json };
type JsonArray = Json[];

// Recursive type with depth control
type DeepPartial<T, D extends number = 5> = D extends 0
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K], [-1, 0, 1, 2, 3, 4][D]> }
    : T;
```

#### Brand Types and Nominal Typing
```typescript
// Nominal typing with brands
declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & {
  [__brand]: TBrand;
};

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// Type-safe branded construction
function createUserId(id: string): UserId {
  // Runtime validation would go here
  return id as UserId;
}
```

#### Type-Level Computation
```typescript
// Arithmetic at type level
type Length<T extends readonly unknown[]> = T['length'];
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest] ? Rest : never;

// Boolean logic at type level
type And<A extends boolean, B extends boolean> = A extends true 
  ? B extends true 
    ? true 
    : false 
  : false;

type Or<A extends boolean, B extends boolean> = A extends true 
  ? true 
  : B extends true 
    ? true 
    : false;
```

## Common Type System Issues and Solutions

### 1. "Type instantiation is excessively deep and possibly infinite"

**Root Cause**: Recursive type definitions without proper termination conditions.

**Solutions**:
- Add depth limiting to recursive types
- Use conditional types to break recursion
- Simplify type relationships

```typescript
// Problem: Infinite recursion
type BadRecursive<T> = T extends object ? BadRecursive<T[keyof T]> : T;

// Solution: Depth limiting
type GoodRecursive<T, D extends number = 10> = D extends 0
  ? T
  : T extends object
    ? GoodRecursive<T[keyof T], [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9][D]>
    : T;
```

### 2. "Type 'X' is not assignable to type 'Y'"

**Root Cause**: Structural type mismatch or missing properties.

**Solutions**:
- Use intersection types for combining requirements
- Apply utility types for transformations
- Implement proper type guards

```typescript
// Problem: Structural mismatch
interface User { name: string; }
interface Employee { name: string; department: string; }

// Solution: Intersection type
type UserEmployee = User & Employee;
```

### 3. "Object is possibly 'null' or 'undefined'"

**Root Cause**: Strict null checking without proper narrowing.

**Solutions**:
- Use optional chaining and nullish coalescing
- Implement type guards
- Apply non-null assertion when safe

```typescript
// Problem: Possible null/undefined
function processUser(user: User | null) {
  console.log(user.name); // Error!
}

// Solution: Proper narrowing
function processUser(user: User | null) {
  if (user) {
    console.log(user.name); // OK
  }
}
```

### 4. Generic Type Inference Failures

**Root Cause**: TypeScript cannot infer generic parameters from usage.

**Solutions**:
- Provide explicit type parameters
- Use constraint inference
- Apply helper types for inference

```typescript
// Problem: Cannot infer T
function identity<T>(value: T): T {
  return value;
}

// Solution: Constraint inference
function identity<T extends unknown>(value: T): T {
  return value;
}
```

## Performance Optimization Patterns

### 1. Type Complexity Reduction
```typescript
// Avoid complex union types
type BadUnion = A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P;

// Use discriminated unions instead
type GoodUnion = 
  | { type: 'group1'; value: A | B | C | D }
  | { type: 'group2'; value: E | F | G | H }
  | { type: 'group3'; value: I | J | K | L };
```

### 2. Compilation Performance
```bash
# Performance diagnostics
tsc --generateTrace trace --incremental false

# Type checking performance
tsc --extendedDiagnostics | grep -E "Check time|Files|Nodes"

# Memory usage monitoring
node --max-old-space-size=8192 ./node_modules/typescript/lib/tsc.js
```

### 3. Type Coverage Analysis
```bash
# Install type coverage tool
npm install -g type-coverage

# Analyze type coverage
type-coverage --detail --strict

# Generate coverage report
type-coverage --detail --reportDir coverage-report
```

## Migration Strategies

### 1. Strict Mode Migration
```json
{
  "compilerOptions": {
    // Phase 1: Enable strict gradually
    "noImplicitAny": true,
    "strictNullChecks": false,
    
    // Phase 2: Add null checking
    "strictNullChecks": true,
    "strictFunctionTypes": false,
    
    // Phase 3: Full strict mode
    "strict": true
  }
}
```

### 2. Legacy Code Integration
```typescript
// Gradual typing with module augmentation
declare global {
  namespace LegacyLib {
    interface Config {
      apiUrl: string;
      timeout: number;
    }
  }
}

// Safe any usage with branded types
type SafeAny = any & { __safe: true };
```

## Library Type Authoring

### 1. Declaration File Best Practices
```typescript
// Use overloads for complex APIs
declare function parseData(input: string): object;
declare function parseData<T>(input: string, validator: (x: unknown) => x is T): T;
declare function parseData(input: string, validator?: any): any;

// Export namespace and default
declare namespace MyLibrary {
  interface Config {
    apiUrl: string;
  }
}

export = MyLibrary;
export as namespace MyLibrary;
```

### 2. Module Augmentation Patterns
```typescript
// Extend existing modules safely
declare module 'existing-module' {
  interface ExistingInterface {
    newProperty: string;
  }
}

// Global augmentation
declare global {
  interface Window {
    myCustomProperty: string;
  }
}
```

## Diagnostic Commands Reference

```bash
# Type checking
tsc --noEmit                          # Check types without emitting
tsc --listFiles                       # Show all input files
tsc --traceResolution                 # Debug module resolution

# Performance analysis
tsc --extendedDiagnostics            # Show timing information
tsc --generateTrace trace            # Generate performance trace

# Declaration files
tsc --declaration --emitDeclarationOnly  # Generate .d.ts files only
tsc --showConfig                     # Show resolved configuration

# Advanced debugging
tsc --explainFiles                   # Why files are included
tsc --listEmittedFiles              # Show emitted file names
```

## Integration Patterns

### 1. Build Tool Integration
```json
// Vite with TypeScript
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

### 2. Testing Type Safety
```typescript
// Type-only tests with expectType
import { expectType } from 'tsd';

// Test utility type behavior
type Result = MyUtilityType<{ name: string; age: number }>;
expectType<{ name: string; age: number }>(Result);

// Test generic inference
const result = myGenericFunction('hello');
expectType<string>(result);
```

## Advanced Resources

### Official Documentation
- [TypeScript Handbook - Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [TypeScript Deep Dive - Type System](https://basarat.gitbook.io/typescript/type-system)
- [TypeScript Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)

### Community Resources
- [Type Challenges](https://github.com/type-challenges/type-challenges) - Advanced type exercises
- [TypeScript Exercises](https://typescript-exercises.github.io/) - Practical type problems
- [Total TypeScript](https://www.totaltypescript.com/) - Advanced TypeScript patterns

### Tools and Libraries
- [tsd](https://github.com/SamVerschueren/tsd) - Test TypeScript type definitions
- [type-coverage](https://github.com/plantain-00/type-coverage) - Type coverage analysis
- [ts-essentials](https://github.com/ts-essentials/ts-essentials) - Essential TypeScript utility types

## Conclusion

TypeScript's type system is incredibly powerful but requires deep understanding of its nuances and edge cases. This research provides a foundation for handling complex type system challenges, from basic generic constraints to advanced type-level programming patterns. The key is understanding when to use each pattern and how to debug type-related issues effectively.