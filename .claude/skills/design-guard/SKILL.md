---
name: design-guard
description: |
  Unified design review system combining visual design, UX principles, implementation constraints,
  and compliance checks. Use for UI/UX review, accessibility audits, and design system consistency.
argument-hint: <file-or-pattern> [--mode=full|quick|compliance]
---

# Design Guard

统一设计审查系统，整合视觉设计、UX 原则、实现约束和合规检查。

## Usage

```bash
/design-guard src/Button.tsx              # 完整 6 层审查
/design-guard src/Button.tsx --quick      # 快速审查 (视觉+交互)
/design-guard src/Button.tsx --compliance # 仅合规检查 (WCAG+Vercel)
/design-guard src/components/             # 审查整个目录
```

---

## 核心设计哲学

### 1. 简约至上 (Simplicity First)
> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."

- 每个元素必须有明确目的
- 删除比添加更需要勇气
- 复杂性是设计的敌人

### 2. 用户优先 (User-Centric)
> "Design is not just what it looks like. Design is how it works."

- 美观服务于可用性
- 最好的设计是不可见的
- 用户直觉 > 设计师假设

### 3. 系统思维 (System Thinking)
- 设计令牌优先于硬编码值
- 组件组合优于组件定制
- 一致性是用户信任的基础

### 4. 无障碍是权利 (Accessibility is a Right)
- 键盘导航必须完整
- 屏幕阅读器支持不是可选项
- 色彩对比度必须符合 WCAG AA

---

## 审查框架 (6 层)

### 第 1 层：视觉层次 (Visual Hierarchy)

**问题清单**:
- [ ] 用户视线首先落在最重要的信息上吗？
- [ ] 主要/次要/三级操作有清晰视觉区分吗？
- [ ] 排版层次有足够对比度吗？(h1 vs h2 vs body)
- [ ] 间距使用一致比例系统吗？(4/8/16/24/32px)
- [ ] 颜色使用有明确语义吗？(primary/secondary/danger)

**评分**:
- 🟢 优秀: 用户 3 秒内找到核心功能
- 🟡 尚可: 用户需要 5-10 秒搜索
- 🔴 糟糕: 视觉混乱，元素权重相同

### 第 2 层：交互设计 (Interaction Design)

**问题清单**:
- [ ] 交互反馈即时吗？(hover/focus/active)
- [ ] 加载状态有骨架屏或进度指示吗？
- [ ] 错误处理友好且可操作吗？
- [ ] 破坏性操作有二次确认吗？
- [ ] 手势和快捷键符合平台习惯吗？

**关键原则**:
- **Fitts's Law**: 按钮越大、越近、越容易点击
- **Hick's Law**: 选项越多、决策时间越长
- **Miller's Law**: 用户短期记忆最多 7±2 项

### 第 3 层：响应式设计 (Responsive Design)

**问题清单**:
- [ ] 断点设置合理吗？(mobile/tablet/desktop)
- [ ] 触摸目标足够大吗？(至少 44x44px)
- [ ] 文字在小屏幕可读吗？(至少 16px)
- [ ] 导航在移动端可用吗？
- [ ] 表单在触屏设备易用吗？

### 第 4 层：性能与感知 (Performance & Perception)

**问题清单**:
- [ ] 首屏渲染在 1 秒内吗？
- [ ] 动画流畅吗？(60fps, transform/opacity)
- [ ] 图片使用懒加载和现代格式吗？
- [ ] 字体加载优化吗？(font-display: swap)
- [ ] 骨架屏减少感知等待时间吗？

**性能预算**:
- TTI: < 3.8s
- FCP: < 1.8s
- CLS: < 0.1

### 第 5 层：无障碍性 (Accessibility)

**问题清单**:
- [ ] 所有交互元素可键盘访问吗？(Tab/Enter/Escape)
- [ ] focus 状态清晰可见吗？
- [ ] 图片有 alt 文本吗？
- [ ] 表单有正确 label 和 aria 属性吗？
- [ ] 色彩对比度符合 WCAG AA 吗？(4.5:1)
- [ ] 语义化 HTML 正确使用吗？

**快速测试**:
1. 拔掉鼠标，只用键盘能否完成所有操作？
2. 打开屏幕阅读器，信息流合理吗？
3. 浏览器缩放到 200%，布局完好吗？

### 第 6 层：设计系统一致性 (Design System Consistency)

**问题清单**:
- [ ] 按钮样式统一吗？(primary/secondary/ghost)
- [ ] 间距使用设计令牌吗？
- [ ] 颜色来自调色板吗？
- [ ] 组件可复用吗？
- [ ] 图标风格一致吗？

---

## 实现约束 (Implementation Rules)

### Stack
- MUST use Tailwind CSS defaults before custom values
- MUST use `motion/react` for JavaScript animation
- MUST use `cn` utility (clsx + tailwind-merge)

### Components
- MUST use accessible primitives (Radix, React Aria)
- MUST add `aria-label` to icon-only buttons
- NEVER rebuild keyboard/focus behavior by hand

### Animation
- NEVER add animation unless explicitly requested
- MUST animate only `transform`, `opacity`
- NEVER animate layout properties (width, height, margin)
- MUST respect `prefers-reduced-motion`
- NEVER exceed 200ms for interaction feedback

### Typography
- MUST use `text-balance` for headings
- MUST use `tabular-nums` for data
- NEVER modify `letter-spacing` unless requested

### Performance
- NEVER animate large `blur()` surfaces
- NEVER apply `will-change` outside active animation
- NEVER use `useEffect` for render logic

### Design
- NEVER use gradients unless requested
- NEVER use glow effects as primary affordances
- MUST give empty states one clear next action

---

## 合规检查 (Compliance Rules)

### Accessibility Anti-patterns
- `user-scalable=no` disabling zoom
- `outline-none` without focus replacement
- `<div>` with click handlers (should be `<button>`)
- Images without dimensions
- Form inputs without labels
- Icon buttons without `aria-label`

### Form Rules
- Inputs need `autocomplete` and meaningful `name`
- Use correct `type` (email, tel, url)
- Never block paste
- Labels clickable (htmlFor)
- Errors inline next to fields

### Animation Rules
- Honor `prefers-reduced-motion`
- Never `transition: all`
- Animations must be interruptible

### Typography Rules
- Use `…` not `...`
- Use curly quotes `"` `"` not `"`
- `font-variant-numeric: tabular-nums` for numbers

---

## 输出格式

### 完整审查报告

```text
# 【设计审查报告】

## 整体评分
🎨 视觉层次: 🟢/🟡/🔴
🖱️ 交互设计: 🟢/🟡/🔴
📱 响应式: 🟢/🟡/🔴
⚡ 性能感知: 🟢/🟡/🔴
♿ 无障碍性: 🟢/🟡/🔴
🧩 系统一致性: 🟢/🟡/🔴

**总分**: X/6 🟢 | X/6 🟡 | X/6 🔴

---

## 致命问题 (Must Fix)
1. [最严重的可用性/无障碍问题]

## 重大改进 (Should Fix)
1. [显著提升用户体验的改进]

## 优化建议 (Nice to Have)
1. [锦上添花的改进]

## 设计亮点 (What Works Well)
- [值得称赞的设计决策]

---

## 具体改进代码示例
[提供实际代码片段]
```

### 合规检查输出

```text
## src/Button.tsx

src/Button.tsx:42 - icon button missing aria-label
src/Button.tsx:18 - input lacks label
src/Button.tsx:55 - animation missing prefers-reduced-motion

## src/Modal.tsx

src/Modal.tsx:12 - missing overscroll-behavior: contain
src/Modal.tsx:34 - "..." → "…"

## src/Card.tsx

✓ pass
```

---

## 常见设计模式

### 加载状态
```tsx
// ❌ 糟糕：没有加载状态
{data && <Content />}

// ✅ 优秀：骨架屏保持布局
{loading ? <ContentSkeleton /> : <Content />}
```

### 空状态
```tsx
// ❌ 糟糕：空白一片
{items.length === 0 && null}

// ✅ 优秀：友好的空状态引导
<EmptyState
  icon={<PlusIcon />}
  title="还没有内容"
  description="创建你的第一个项目"
  action={<Button>创建项目</Button>}
/>
```

### 错误处理
```tsx
// ❌ 糟糕：技术错误信息
"Error: Network request failed"

// ✅ 优秀：人性化错误 + 可操作方案
<ErrorState
  title="无法加载内容"
  message="请检查网络连接后重试"
  actions={[<Button onClick={retry}>重试</Button>]}
/>
```

---

## 项目特定注意事项

基于沉浸式写作编辑器项目：

1. **编辑器体验**: 写作时不能有视觉干扰
2. **深色模式**: 长时间写作对眼睛友好
3. **沉浸式模式**: 全屏时 UI 应隐藏或半透明
4. **数据可视化**: Timeline、Canvas 的信息密度

---

## 工具与资源

- **Contrast Checker**: webaim.org/resources/contrastchecker
- **Lighthouse**: 性能和无障碍性审计
- **axe DevTools**: 无障碍性测试
- **Material Design**: m3.material.io
- **Radix UI**: radix-ui.com (本项目使用)
- **Tailwind**: tailwindcss.com (本项目使用)
