---
name: build-fix
description: Automatically fix build errors
---

# /build-fix Command

Diagnose and fix build/compilation errors.

## Usage

```
/build-fix
/build-fix [specific error message]
```

## What It Does

1. **Run build**: `pnpm run build`
2. **Capture errors**: Parse error output
3. **Diagnose**: Identify root cause
4. **Fix**: Apply corrections
5. **Verify**: Rebuild to confirm fix

## Common Errors Handled

### TypeScript Errors
```
Type 'X' is not assignable to type 'Y'
Property 'x' does not exist on type 'Y'
Cannot find module 'X'
```

### Import Errors
```
Module not found
Circular dependency detected
```

### Build Configuration
```
Next.js build failures
Webpack errors
PostCSS issues
```

## Process

```
/build-fix

1. Running: pnpm run build
   ERROR: Type 'string' not assignable to type 'number'
   at: /path/to/file.ts:42

2. Reading file to understand context...

3. Fix applied:
   - Changed: const count: number = value
   - To: const count = parseInt(value, 10)

4. Rebuilding...
   BUILD SUCCESS ✓
```

## When to Use

- After `pnpm run build` fails
- After `pnpm run typecheck` shows errors
- When CI pipeline fails on build step

## What It Won't Do

- Fix runtime errors (only compile-time)
- Guess at business logic
- Make architectural changes

If the fix requires understanding business logic, it will ask for clarification instead of guessing.
