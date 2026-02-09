---
description: Security requirements - mandatory checks before any commit
globs: "**/*.{ts,tsx,js,jsx}"
---

# Security Rules

## Mandatory Pre-Commit Checklist

Before ANY commit, verify:

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated and sanitized
- [ ] SQL injection prevented (use Prisma, not raw queries)
- [ ] XSS prevented (sanitize HTML, use React's escaping)
- [ ] CSRF protection enabled (NextAuth handles this)
- [ ] Authentication/authorization verified on all protected routes
- [ ] Rate limiting on public endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

**Required Environment Variables**:
| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | NextAuth session encryption |
| `DATABASE_URL` | Prisma database connection |
| `OPENAI_API_KEY` | AI features |
| `RESEND_API_KEY` | Email sending |

## Input Validation

```typescript
// ALWAYS validate at system boundaries
import { z } from 'zod'

const UserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

// In API route
const result = UserInputSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
}
```

## XSS Prevention

```typescript
// DANGEROUS - never do this with user content
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// SAFE - use sanitization library
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// SAFEST - let React escape
<div>{userContent}</div>
```

## Authentication Checks

```typescript
// Every protected API route must check auth
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... proceed with authenticated request
}
```

## Security Response Protocol

If you discover a security issue:

1. **STOP** - Don't proceed with other work
2. **ASSESS** - Use security-reviewer agent
3. **FIX** - Address CRITICAL issues immediately
4. **ROTATE** - If secrets exposed, rotate them
5. **SCAN** - Check for similar issues elsewhere
