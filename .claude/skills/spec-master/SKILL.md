---
name: spec-master
description: |
  文档驱动开发 - 管理 .phrase/ 目录下的规范文档（spec/plan/task/issue/adr/change）。
  与 doc-keeper 联动：spec-master 管"为什么做"，doc-keeper 管"代码是什么"。
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Spec Master - 文档驱动开发

"Doc-Driven Development": first lock in the docs → split into `taskNNN` → implement and verify → write the docs back.

---

## 与 doc-keeper 的协作关系

```
┌─────────────────────────────────────────────────────────────┐
│                      文档体系全景                            │
├─────────────────────────────────────────────────────────────┤
│  spec-master (流程文档)          doc-keeper (代码文档)       │
│  ├── .phrase/                    ├── */ARCHITECTURE.md      │
│  │   ├── spec_*   为什么做       │   └── 文件夹结构说明      │
│  │   ├── plan_*   做什么         └── 每个文件头注释          │
│  │   ├── task_*   怎么验收           └── input/output/pos   │
│  │   ├── change_* 改了什么                                  │
│  │   └── issue_*  出了什么问题                              │
│  └── 面向：需求追踪              └── 面向：代码理解          │
└─────────────────────────────────────────────────────────────┘
```

**联动规则**：
1. 完成 `taskNNN` 后：spec-master 更新 `change_*`，doc-keeper 更新 `ARCHITECTURE.md`
2. 新增模块时：spec-master 写 `spec_*`，doc-keeper 创建 `ARCHITECTURE.md`
3. 重构时：两边都要同步更新

---

## 0. Principles (by priority)

- Existing repository conventions take precedence over this document. When they conflict, follow `README`, `STYLEGUIDE`, etc., and record the decision in `issue_*` / `change_*`.  
- Docs are the source of truth: requirements, interactions, and interfaces must come only from `spec` / `plan` / `tech-refer` / `adr`.  
- Each session handles only one atomic task; every change must be traceable to a `taskNNN` and its origin (`spec` / `issue` / `adr`).  
- Every `taskNNN` must describe how it will be validated (tests or manual steps).  
- After implementation, you must write back to `task_*` and `change_*`, and update `spec_*` / `issue_*` / `adr_*` when needed.

---

## 1. Repo structure & docs

- Code roots: `App/`, `Core/`, `UI/`, `Shared/`, `Tests/`, `Assets/`, `Samples/`, `Schemas/`, `StackWM-Bridging-Header.h`. Keep layers clear; `Tests/` should mirror core modules.  
- Docs root: `.phrase/`  
  - Phases: `.phrase/phases/phase-<purpose>-<YYYYMMDD>/`  
  - Global indexes: `.phrase/docs/`  
- `Docs/` is for external documents and can continue to be used independently.

---

## 2. Phase workflow

1. **Phase Gate** (only when the user explicitly starts a new phase): in a new `phase-*` directory, create the minimal set `spec_*`, `plan_*`, `task_*`, and add `tech-refer_*` / `adr_*` as needed. `issue_*` can come later.  
2. **In-Phase Loop** (default):  
   - New requirement → update the current `plan_*` → break it down into `taskNNN`.  
   - Implementation → add/update and execute the corresponding items in `task_*`.  
   - Bug → register `issueNNN` in `.phrase/docs/ISSUES.md`, write a detailed issue file under the phase, then create `taskNNN`.  
   - Irreversible decision → write an `adr_*` first, or add a “Decision” section to `tech-refer_*`.  
3. **Task closure**: when finished, you must
   1) mark the corresponding `task_*` item as `[x]`
   2) add an entry to the phase's `change_*` file and add an index to `.phrase/docs/CHANGE.md`
   3) update the relevant `spec_*` if interactions are affected
   4) update `ISSUES.md` and the issue detail file (including validation results) if a problem is resolved
   5) **联动 doc-keeper**: 更新受影响文件的头注释和 `ARCHITECTURE.md`

When the goal clearly differs from the current phase purpose, requires an independent milestone, or involves major architectural refactoring, you may suggest starting a new phase, but this must be confirmed by the user.

### Phase lifecycle

- Start a phase: create `spec/plan/task/...` under `.phrase/phases/phase-<purpose>-<date>/`.  
- Close a phase: after user confirmation, rename the entire directory to `DONE-phase-<purpose>-<date>/`, and rename the main docs following the same pattern (`DONE-PLAN-*`, `DONE-TASK-*`, etc.), so the completed status is obvious at a glance.

---

## 3. Task / Issue conventions

- `taskNNN` is a three-digit increasing ID (starting at `task001`) that must not be reordered or reused. When splitting/merging tasks, create a new ID and record how it relates to the original task.  
- Any addition, deletion, modification, or checkbox change in `task_*` must be recorded once in the current phase’s `change_*`. You can batch changes, but they must remain traceable.  
- Atomic task criteria: completable in one work session, observable output, independently verifiable, neither too fine-grained nor too coarse.  
- Issues:  
  - Global index: `.phrase/docs/ISSUES.md` uses `issueNNN [ ]/[x]` and links to phase-specific details.  
  - Detail files `issue_<purpose>_<YYYYMMDD>.md` must include environment, reproduction steps, investigation, root cause, fix, verification, and related `taskNNN` / commits.  
  - For user-visible issues, you must obtain confirmation before marking `[x]`, and record `Resolved At/By/Commit`.

---

## 4. Build / Test / Dev

- Prefer repository-provided entry points (Xcode schemes, SwiftPM, `Scripts/` tools, etc.). If there is no unified entry, add a minimal script and record it in `plan_*`.  
- Build: `swift build` (or `swift build -c release`). Run: `swift run StackWM`. Test: `swift test` (optionally with `--enable-code-coverage`).  
- Optional tools: `swiftformat .` → `swiftlint` (when available and allowed).

---

## 5. Coding & verification

- Style: Swift 5.9+ / macOS 13+; 4-space indentation, ≤120 columns; types in PascalCase, functions/properties in lowerCamelCase, global constants in UPPER_SNAKE_CASE. Prefer value types and immutability; mark things `final` when possible.  
- Follow existing error-handling, logging frameworks, and module boundaries. Unless the task is explicitly “cleanup”, do not bulk-reorder imports or reformat large areas.  
- Add diagnosable logging to critical paths (following the project’s logging approach).  
- Prioritize tests for core logic; for UI/system glue, manual verification steps are acceptable. Tests must be deterministic; inject dependencies or use mocks as needed.

---

## 6. Docs & changelog

- `change_*`: real change records within a phase. Each completed `taskNNN` should have at least one entry including date, file/path, Add|Modify|Delete, affected functions, behavioral changes/risks, and should be ordered newest first.  
- `.phrase/docs/CHANGE.md`: only an index and summary pointing to phase `change_*` entries; can be updated in batches per work session.  
- `spec_*` / `plan_*` / `tech-refer_*` / `adr_*` / `issue_*` must all be updated along with changes (incrementally), keeping a single source of truth.

---

## 7. Commits, PRs & safety

- Use Conventional Commits by default (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, etc.), with each commit focused on a single `taskNNN`.  
- PR descriptions must list related `taskNNN` / `issueNNN`, motivation, behavioral changes, verification method, risks/rollback plan, and attach screenshots/GIFs when there are UI changes.  
- Never commit secrets, tokens, certificates, or real user data. For tasks involving permissions/configuration, describe failure modes, API boundaries, and troubleshooting methods clearly in `spec_*` and `tech-refer_*`.

---

## 8. Template cheatsheet

- `spec`: Summary / Goals & Non-goals / User Flows (action → feedback → fallback) / Edge Cases / Acceptance Criteria  
- `plan`: Milestones / Scope / Priorities / Risks & Dependencies / (optional) Rollback  
- `tech-refer`: Options / Proposed Approach / Interfaces & APIs / Trade-offs / Risks & Mitigations  
- `task`: `task001 [ ] output + verification method + impact scope`  
- `issue`: `issueNNN [ ] Summary + Environment + Repro + Expected vs Actual + Investigation + Fix + Verification + User Confirmation + Resolved At/By/Commit`  
- `adr`: Context / Decision / Alternatives / Consequences / Rollback

---

## 9. Collaboration tips

- When explaining a solution, prioritize describing user actions (shortcuts/mouse/commands), visible feedback, rollback/failure paths, and edge cases.
- When referencing docs, mention them conversationally as "filename + section" instead of reciting them verbatim.
- When offering options, clarify whether they belong to the current milestone or a later one, to help the user decide.

---

## 10. 完整工作流（spec-master + doc-keeper 联动）

```text
开始任务
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ spec-master: 文档先行                                    │
│   1. 明确 spec_* 中的需求                                │
│   2. 分解为 taskNNN                                      │
│   3. 记录技术决策到 tech-refer_* 或 adr_*                │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ 实现代码                                                 │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ doc-keeper: 更新代码文档                                 │
│   1. 新/改文件添加头注释 (@input/@output/@pos)           │
│   2. 更新 ARCHITECTURE.md 文件清单                       │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ spec-master: 闭环                                        │
│   1. 标记 taskNNN 为 [x]                                 │
│   2. 写入 change_* 记录                                  │
│   3. 如有接口变化，更新 spec_*                           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
完成任务
```

**快速检查清单**：

```text
□ spec-master: task_* 已标记 [x]
□ spec-master: change_* 已记录
□ doc-keeper: 文件头注释已更新
□ doc-keeper: ARCHITECTURE.md 已更新
□ 如有重大变更: CLAUDE.md 已更新
```
