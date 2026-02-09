---
name: continuous-learning
description: Extract and apply patterns from sessions for improved performance over time. Use when completing tasks to capture reusable patterns, or when starting tasks to apply learned patterns.
---

# Continuous Learning System

Extract patterns from successful work and apply them to future tasks.

## How It Works

```
Session Work
    ↓
Pattern Detection (confidence scoring)
    ↓
Pattern Storage (~/.claude/learned-patterns/)
    ↓
Future Sessions (pattern retrieval)
```

## Pattern Types

| Type | Description | Example |
|------|-------------|---------|
| `testing` | Test patterns and strategies | "Always mock Prisma in API tests" |
| `api` | API design patterns | "Use Zod validation on all inputs" |
| `ui` | Component patterns | "Extract hooks when state logic >20 lines" |
| `error` | Error handling patterns | "Always wrap async in try-catch with specific errors" |
| `perf` | Performance optimizations | "Use React.memo for list items" |

## Confidence Scoring

| Score | Meaning | Action |
|-------|---------|--------|
| 0.9+ | High confidence | Apply automatically |
| 0.7-0.9 | Medium confidence | Suggest to user |
| 0.5-0.7 | Low confidence | Store but don't suggest |
| <0.5 | Noise | Discard |

## Pattern Storage

Location: `~/.claude/learned-patterns/{project-name}.json`

```json
{
  "patterns": [
    {
      "type": "testing",
      "description": "Mock external APIs in unit tests",
      "files": ["lib/api.test.ts"],
      "confidence": 0.85,
      "timestamp": "2025-01-15T10:00:00Z"
    }
  ],
  "lastUpdated": "2025-01-15T10:00:00Z"
}
```

## When Patterns Are Extracted

1. **Session End Hook** - Automatically runs `evaluate-session.js`
2. **After successful task completion** - Captures what worked
3. **After code review approval** - Patterns from reviewed code

## When Patterns Are Applied

1. **Session Start** - Load project patterns
2. **Similar task detected** - Suggest relevant patterns
3. **On request** - `/learn` command

## Manual Pattern Extraction

Use when you want to capture a specific pattern:

```
/learn [description of pattern]
```

Example:
```
/learn Always use useCallback for event handlers passed to child components
```

## Pattern Validation

Before applying a pattern:
1. Check if context is similar
2. Verify pattern is still valid (no breaking changes)
3. Confirm with user if confidence < 0.9

## Integration with Other Systems

### With spec-master
- Extract patterns from completed specs
- Apply patterns when creating new specs

### With code-reviewer
- Patterns from code review feedback
- Apply patterns to prevent repeat issues

### With tdd-guide
- Testing patterns from successful TDD sessions
- Apply test structure patterns

## Pruning

Old patterns are automatically pruned:
- Keep last 50 patterns per project
- Remove patterns with <0.5 confidence after 30 days
- Remove patterns that fail validation

## Privacy

- Patterns stored locally only
- No code content stored, only descriptions
- Project-specific, not shared across projects
