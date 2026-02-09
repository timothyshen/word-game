---
description: Testing requirements - TDD workflow and coverage standards
globs: "**/*.{ts,tsx}"
---

# Testing Rules

## Coverage Requirements

| Metric | Minimum |
|--------|---------|
| Lines | 80% |
| Branches | 80% |
| Functions | 80% |
| Statements | 80% |

**Exception**: 100% coverage required for:
- Authentication code
- Payment/billing code
- Security-sensitive functions

## TDD Workflow (Mandatory)

```
1. Write test FIRST (RED)
   ↓
2. Run test - it should FAIL
   ↓
3. Write minimal implementation (GREEN)
   ↓
4. Run test - it should PASS
   ↓
5. Refactor while keeping tests green (IMPROVE)
   ↓
6. Verify coverage (80%+)
```

## Test Types Required

### Unit Tests (Always)
- Individual functions
- React hooks
- Utility functions
- Pure logic

```typescript
// Example: hooks/use-word-count.test.ts
describe('useWordCount', () => {
  it('should count words correctly', () => {
    const { result } = renderHook(() => useWordCount('hello world'))
    expect(result.current).toBe(2)
  })

  it('should handle empty string', () => {
    const { result } = renderHook(() => useWordCount(''))
    expect(result.current).toBe(0)
  })
})
```

### Integration Tests (For API/DB)
- API endpoints
- Database operations
- External service calls

```typescript
// Example: app/api/books/route.test.ts
describe('POST /api/books', () => {
  it('should create a book', async () => {
    const response = await POST(new Request('...', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Book' })
    }))
    expect(response.status).toBe(201)
  })
})
```

### E2E Tests (Critical Paths)
- User authentication flow
- Core feature workflows
- Payment flows

```typescript
// Example: tests/e2e/auth.spec.ts
test('user can login and access editor', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/library')
})
```

## Test Commands

```bash
pnpm run test          # Unit/integration tests (watch)
pnpm run test:run      # Run once
pnpm run test:coverage # With coverage report
pnpm run test:e2e      # Playwright E2E
```

## Edge Cases to Always Test

| Category | Examples |
|----------|----------|
| Empty/Null | `null`, `undefined`, `''`, `[]`, `{}` |
| Boundaries | 0, -1, MAX_INT |
| Invalid Types | Wrong type passed |
| Error States | Network failure, timeout |
| Race Conditions | Concurrent mutations |

## Test Isolation

Each test must:
- Set up its own state
- Clean up after itself
- Not depend on other tests
- Not share mutable state

```typescript
// GOOD: Isolated
beforeEach(() => {
  vi.clearAllMocks()
})

// BAD: Shared state
let sharedData = [] // Don't do this
```
