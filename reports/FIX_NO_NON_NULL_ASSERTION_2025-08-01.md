# Fix @typescript-eslint/no-non-null-assertion Errors

## Summary
Fixed all 16 occurrences of the `@typescript-eslint/no-non-null-assertion` rule violations in `tests/cli/commands/setup.test.ts`.

## Changes Made

### Pattern Used
Instead of using the non-null assertion operator (`!`), I added proper type guards with early error throwing:

```typescript
// Before:
expect(entry!.property).toBe(value);

// After:
if (!entry) {
  throw new Error('entry not found');
}
expect(entry.property).toBe(value);
```

### Specific Fixes

1. **Hook Entry Assertions (8 occurrences)**
   - Fixed assertions for: `typecheckEntry`, `eslintEntry`, `prettierEntry`, `noAnyEntry`, `testsEntry`, and multiple `stopEntry` instances
   - Each now includes a proper type guard that throws a descriptive error if the entry is not found

2. **Array Access Assertions (5 occurrences)**
   - Fixed assertions when accessing array elements like `writtenContent.hooks.Stop[0]`
   - Extracted array elements to variables and added null checks before usage

3. **Nested Property Access (3 occurrences)**
   - Fixed assertions for nested properties like `entry.hooks[0].command`
   - Added checks for both the parent object and the nested property

## Results

- ✅ All ESLint `@typescript-eslint/no-non-null-assertion` errors resolved
- ✅ All 24 tests continue to pass
- ✅ Type safety improved with explicit error handling
- ✅ More descriptive error messages if tests fail

## Benefits

1. **Better Error Messages**: When a test fails due to missing data, developers get clear error messages indicating what wasn't found
2. **Type Safety**: TypeScript can now properly track nullability throughout the test code
3. **Maintainability**: The code is more explicit about handling undefined cases
4. **No Functional Changes**: All tests maintain their original functionality and pass/fail criteria