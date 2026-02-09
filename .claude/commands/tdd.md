---
name: tdd
description: Implement with test-driven development
---

# /tdd Command

Implement features using strict TDD: write tests FIRST, then code.

## Usage

```
/tdd [feature or task description]
```

## Examples

```
/tdd Implement word count calculation
/tdd Fix the duplicate character detection bug
/tdd Add chapter reordering with drag-drop
```

## The TDD Cycle

```
RED → GREEN → REFACTOR → VERIFY
 ↑                         |
 └─────────────────────────┘
```

1. **RED**: Write failing test
2. **GREEN**: Minimal code to pass
3. **REFACTOR**: Improve while green
4. **VERIFY**: Check 80%+ coverage

## Test Stack

| Type | Framework | Command |
|------|-----------|---------|
| Unit | Vitest | `pnpm run test` |
| Integration | Vitest | `pnpm run test` |
| E2E | Playwright | `pnpm run test:e2e` |

## Coverage Requirements

| Metric | Minimum |
|--------|---------|
| Lines | 80% |
| Branches | 80% |
| Functions | 80% |
| Statements | 80% |

## Example Session

```
/tdd Calculate reading time for chapters

Phase 1: RED
- Write test: calculateReadingTime returns minutes for word count
- Run test: FAILS (function doesn't exist)

Phase 2: GREEN
- Implement minimal function
- Run test: PASSES

Phase 3: REFACTOR
- Handle edge cases (empty, very long)
- Run tests: STILL PASSING

Phase 4: VERIFY
- Coverage: 85% ✓
```

## Edge Cases to Always Test

- Empty/null inputs
- Boundary values (0, -1, MAX)
- Invalid types
- Error states
- Concurrent operations
