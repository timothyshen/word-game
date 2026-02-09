---
description: Git workflow and commit conventions
globs: "**/*"
---

# Git Workflow Rules

## Commit Format (Conventional Commits)

```
<type>: <description>

<optional body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no new feature/fix) |
| `docs` | Documentation changes |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Examples

```bash
feat: add character relationship visualization
fix: resolve memory leak in canvas component
refactor: simplify knowledge base store
docs: update API documentation
test: add E2E tests for onboarding flow
chore: upgrade dependencies
```

## Feature Implementation Workflow

```
1. /plan [feature]           # Plan before coding
   ↓
2. /tdd [implementation]     # Implement with tests
   ↓
3. /code-review              # Review quality
   ↓
4. git add && git commit     # Commit with message
   ↓
5. git push                  # Push to remote
```

## Branch Naming

```
feat/short-description
fix/issue-description
refactor/what-changed
```

## Pull Request Process

1. **Analyze full history**: `git diff main...HEAD`
2. **Draft PR**: Include summary and test plan
3. **Create**: `gh pr create --title "..." --body "..."`

### PR Template

```markdown
## Summary
- [Bullet points of changes]

## Test Plan
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

---
Generated with [Claude Code](https://claude.com/claude-code)
```

## Commit Rules

### DO
- Write clear, descriptive messages
- Use imperative mood ("add" not "added")
- Reference issues when applicable

### DON'T
- Commit secrets or credentials
- Force push to main/master
- Skip pre-commit hooks
- Amend commits that are already pushed

## Before Pushing

Verify:
- [ ] Tests pass: `pnpm run test:run`
- [ ] Types check: `pnpm run typecheck`
- [ ] Lint passes: `pnpm run lint`
- [ ] Build succeeds: `pnpm run build`

Or use: `pnpm run ci` (runs all checks)
