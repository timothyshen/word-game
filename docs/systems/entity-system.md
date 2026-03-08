# 实体系统 (ECS)

实体系统实现了轻量级 ECS 模式，底层使用 Prisma/SQLite。所有玩家拥有的实例（角色、卡牌、建筑、装备）都存储为 Entity 记录，状态使用 JSON 格式。

**位置**: `src/engine/entity/`

## 三层层级结构

```
EntitySchema（蓝图）
    |-- 定义组件和默认值
    v
EntityTemplate（配置）
    |-- 继承 Schema，预配置数据
    v
Entity（实例）
    |-- 归属玩家，运行时 JSON 状态
```

### Schema

定义实体类型支持的组件及其默认值。

```typescript
// 示例："character" schema
{
  name: "character",
  components: ["stats"],
  defaults: { stats: { hp: 100, atk: 10, def: 5 } }
}
```

### Template

继承自 Schema 的具体配置。多个 Template 可以共享同一个 Schema。

```typescript
// 示例："generic-character" template
{
  schemaId: "...",
  name: "generic-character",
  data: { characterId: "", level: 1, exp: 0, ... },
  icon: "",
  rarity: null
}
```

### Entity

归属于玩家的运行时实例。状态存储为 JSON 字符串，合并了 Schema 默认值 + Template 数据 + 实例覆盖值。

```typescript
{
  id: "cuid...",
  templateId: "...",
  ownerId: "player-id",
  state: '{"characterId":"...","level":3,"hp":80,"attack":15,...}'
}
```

## EntityManager API

**文件**: `src/engine/entity/EntityManager.ts`

```typescript
// Schema 操作
createSchema(gameId, name, components, defaults?)
getSchema(gameId, name)

// Template 操作
createTemplate(schemaId, name, data, options?)
getTemplateBySchemaAndName(schemaId, name)
getEntitiesByTemplate(templateId)

// Entity CRUD
createEntity(templateId, ownerId, initialState?)
getEntity(entityId)
updateEntityState(entityId, partialState)
deleteEntity(entityId)

// 查询操作
getEntitiesByOwner(ownerId)
getEntitiesByOwnerAndSchema(ownerId, schemaName)
findEntityByOwnerAndTemplate(ownerId, templateId)
queryEntitiesByState(ownerId, schemaName, stateFilter)

// 批量操作
createManyEntities(entries[])
deleteManyEntities(entityIds[])
```

## 组件系统

**文件**: `src/engine/entity/components.ts`

| 组件 | 用途 | 关键字段 |
|------|------|----------|
| `stats` | 战斗/RPG 属性 | hp, maxHp, mp, maxMp, atk, def, spd, luck |
| `inventory` | 物品存储 | items[], capacity |
| `position` | 世界位置 | x, y, worldId |
| `production` | 资源产出 | output (map), interval |
| `equipment` | 装备槽位 | slots (name -> equipmentId) |
| `skills` | 技能槽位 | equipped[], maxSlots |

**工具函数**:
```typescript
getComponent(state, name)    // 从状态中提取组件
setComponent(state, name, v) // 更新组件，返回新状态
hasComponent(state, name)    // 检查组件是否存在
serializeState(state)        // 转换为 JSON 字符串
```

## 角色实体状态

角色使用扁平状态结构（非嵌套组件）：

```typescript
interface CharacterEntityState {
  characterId: string;  // 引用 Character 模板
  level: number;
  exp: number;
  maxLevel: number;
  tier: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  status: string;       // idle/working/exploring/injured
  workingAt: string | null;
}
```

**工具**: `src/server/api/utils/character-utils.ts`
- `parseCharacterState(entity)` - 将 JSON 状态解析为类型化对象
- `getCharacterTemplateId(db, entities)` - 查找/创建 generic-character 模板

## FK 关联

引用 Entity 的关联表：
- `CharacterSkill.playerCharacterId` -> `Entity.id`
- `CharacterProfession.playerCharacterId` -> `Entity.id`
- `HeroInstance.characterId` -> `Entity.id`
