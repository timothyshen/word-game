---
description: When and how to use specialized agents
globs: "**/*"
---

# Agent Usage Rules

## Available Agents

| Agent | Purpose | Model | When to Use |
|-------|---------|-------|-------------|
| `codebase-search` | Find code/files | haiku | "Where is X?", "Find Y" |
| `planner` | Implementation planning | opus | Complex features, refactoring |
| `code-reviewer` | Quality review | opus | After writing code |
| `tdd-guide` | Test-driven development | opus | New features, bug fixes |
| `architect` | System design | opus | Architectural decisions |
| `security-reviewer` | Security analysis | opus | Before commits, audits |

## Immediate Agent Triggers

Use agent **without asking** when:

| Situation | Agent |
|-----------|-------|
| Complex feature request | `planner` |
| "Add X functionality" | `planner` |
| Code just written | `code-reviewer` |
| "Fix bug X" | `tdd-guide` |
| Architectural question | `architect` |
| Security concern | `security-reviewer` |

## Agent Selection Flow

```
User Request
    ↓
Is it a search? ──────────────→ codebase-search (haiku)
    ↓ No
Is it complex? ───────────────→ planner (opus)
    ↓ Already planned
Needs tests? ─────────────────→ tdd-guide (opus)
    ↓ Code exists
Needs review? ────────────────→ code-reviewer (opus)
    ↓ Security concern?
                               → security-reviewer (opus)
```

## Parallel vs Sequential

### Run in Parallel
- Multiple independent searches
- Code review + security review (different concerns)

### Run Sequentially
- planner → tdd-guide (need plan first)
- tdd-guide → code-reviewer (need code first)

## Agent Coordination

### planner + spec-master
- spec-master provides requirements from `.phrase/`
- planner creates implementation plan

### code-reviewer + doc-keeper
- code-reviewer checks code quality
- doc-keeper ensures documentation stays in sync

### architect + pattern-breaker
- architect provides structural guidance
- pattern-breaker challenges assumptions

## Orchestration Workflows

Use `/orchestrate` for multi-agent flows:

```bash
/orchestrate feature [description]  # Full feature flow
/orchestrate bugfix [description]   # Bug fix flow
/orchestrate refactor [description] # Refactoring flow
/orchestrate security [description] # Security audit flow
```

## Model Strategy

| Complexity | Model | Cost |
|------------|-------|------|
| Search, simple tasks | haiku | Low |
| Review, planning | opus | High |

Rule: Use haiku for finding, opus for thinking.
