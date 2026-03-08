# 模块系统与 EventBus

事件驱动架构，可插拔模块订阅游戏事件并发出新事件，形成响应式链。

**位置**: `src/engine/modules/`, `src/engine/core/`

## EventBus

**文件**: `src/engine/core/EventBus.ts`

发布/订阅事件分发器，支持模式匹配和优先级。

```typescript
engine.events.on(event, handler, priority?)  // 订阅
engine.events.off(event, handler)            // 取消订阅
engine.events.emit(event, payload, source?)  // 发布（异步）
```

**特性**:
- **模式匹配**: `"combat:*"` 匹配 `"combat:start"`, `"combat:victory"` 等
- **优先级排序**: 优先级高的处理器先执行
- **异步执行**: 处理器按顺序运行，异常会被记录但不会中断链
- **即发即忘**: 路由器使用 `void ctx.engine.events.emit(...)` 避免阻塞

**事件结构**:
```typescript
interface GameEvent {
  type: string;       // 如 "combat:victory"
  payload: unknown;   // 事件特定数据
  timestamp: number;  // Unix 毫秒
  source: string;     // 发出者名称
}
```

## 模块生命周期

```typescript
interface GameModule {
  name: string;
  dependencies?: string[];
  init(engine: GameEngine): Promise<void>;       // 设置订阅
  handleEvent?(event: GameEvent): Promise<void>; // 可选处理器
  destroy?(): Promise<void>;                     // 清理
}
```

**初始化**: ModuleRegistry 使用拓扑排序（Kahn 算法）确保依赖顺序，检测循环依赖。

```
engine.start()
  -> modules.initAll()
    -> topologicalSort(modules)
    -> for each: await module.init(engine)
       -> engine.events.on("event:name", handler)
```

## 模块注册表

| 模块 | 依赖 | 订阅事件 | 发出事件 |
|------|------|----------|----------|
| **core** | - | `player:expGain`, `achievement:claimed` | `player:statusChanged` |
| **combat** | core | `combat:start`, `combat:action` | `combat:started`, `combat:victory`, `combat:defeat` |
| **economy** | core | `settlement:daily`, `building:upgrade` | `economy:output`, `building:upgraded` |
| **exploration** | core | `exploration:complete` | - |
| **progression** | core | `boss:challenge`, `card:used`, `character:levelUp`, `breakthrough:complete` | `progression:check` |
| **content** | core | `character:levelUp`, `breakthrough:complete` | `content:checkUnlocks` |
| **territory** | core | `territory:unlock`, `territory:build`, `territory:expand` | `territory:expanded` |
| **settlement** | core | `settlement:daily` | `settlement:graded` |

## 事件链示例

### Boss 胜利链
```
路由器发出 "boss:challenge" { victory: true }
  -> ProgressionModule: 发出 "combat:victory" + "progression:check"
    -> CoreModule: 检查成就
```

### 建筑放置链
```
路由器发出 "territory:build" { positionX, positionY }
  -> TerritoryModule: 发出 "territory:expanded" { trigger: "build" }
```

### 角色升级链
```
路由器发出 "character:levelUp" { characterId, newLevel }
  -> ProgressionModule: 发出 "progression:check" { trigger: "character_level_up" }
  -> ContentModule: 发出 "content:checkUnlocks"
```

## 路由器事件发出

路由器在数据变更后使用即发即忘方式发出事件：

```typescript
// 在路由器 mutation 中
const result = await someService.doAction(ctx.db, ...);
void ctx.engine.events.emit("domain:action", {
  userId: ctx.session.user.id,
  ...payload,
}, "router-name");
return result;
```

路由器发出的事件：
- `boss:challenge`, `card:used`, `character:levelUp`, `character:expGain`
- `breakthrough:complete`, `achievement:claimed`
- `territory:unlock`, `territory:build`, `territory:expand`
- `combat:start`（世界战斗）

## StateManager

**文件**: `src/engine/core/StateManager.ts`

支持 TTL 的内存键值存储，用于规则缓存和临时战斗状态。

```typescript
engine.state.get<T>(key)              // 获取值
engine.state.set<T>(key, value, ttl?) // 设置值（可选 TTL，单位毫秒）
engine.state.delete(key)              // 删除
engine.state.clear()                  // 清空所有
```
