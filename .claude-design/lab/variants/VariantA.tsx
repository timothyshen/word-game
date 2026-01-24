// Variant A: 经典网格布局 - 建筑网格 + 侧边信息栏
// 设计理念：类似经典策略游戏的网格布局，建筑占主体，信息在侧边

import { buildingsData, charactersData, tasksData, playerData, resourcesData, dailyInfo } from "../data/fixtures";

export default function VariantA() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#e8e4d9] font-mono">
      {/* 顶部状态栏 */}
      <header className="border-b-2 border-[#3d3529] bg-[#1a1814] px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-[#c9a227] font-bold">DAY {dailyInfo.day}</span>
            <span className="text-[#888]">|</span>
            <span className="text-sm">结算: {dailyInfo.nextSettlement}</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <ResourceBadge icon="🪙" value={resourcesData.gold} color="#c9a227" />
            <ResourceBadge icon="🪵" value={resourcesData.wood} color="#8b6914" />
            <ResourceBadge icon="🪨" value={resourcesData.stone} color="#666" />
            <ResourceBadge icon="🍞" value={resourcesData.food} color="#a67c52" />
            <ResourceBadge icon="💎" value={resourcesData.crystals} color="#9b59b6" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#c9a227]">⚡ {playerData.actionPoints.current}/{playerData.actionPoints.max}</span>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* 主内容区 - 建筑网格 */}
        <main className="flex-1 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg text-[#c9a227] border-b border-[#3d3529] pb-1">
              ═══ 领地建筑 ═══
            </h2>
            <button className="px-3 py-1 text-sm border border-[#3d3529] hover:border-[#c9a227] hover:text-[#c9a227]">
              + 建造
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {buildingsData.map((b) => (
              <BuildingCard key={b.id} building={b} />
            ))}
            {/* 空槽位 */}
            <div className="border-2 border-dashed border-[#2a2520] h-28 flex items-center justify-center text-[#444] hover:border-[#3d3529] cursor-pointer">
              + 空地
            </div>
          </div>
        </main>

        {/* 右侧边栏 */}
        <aside className="w-72 border-l-2 border-[#3d3529] bg-[#13120f] p-4">
          {/* 玩家信息 */}
          <div className="mb-6 p-3 border border-[#3d3529] bg-[#1a1814]">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">👤</span>
              <div>
                <div className="text-[#c9a227] font-bold">{playerData.name}</div>
                <div className="text-xs text-[#888]">{playerData.title} · Lv.{playerData.level}</div>
              </div>
            </div>
            <div className="text-xs text-[#666]">📍 {playerData.currentWorld}</div>
          </div>

          {/* 角色列表 */}
          <div className="mb-6">
            <h3 className="text-sm text-[#c9a227] mb-2 border-b border-[#3d3529] pb-1">
              ── 下属角色 ──
            </h3>
            <div className="space-y-2">
              {charactersData.map((c) => (
                <CharacterRow key={c.id} character={c} />
              ))}
            </div>
          </div>

          {/* 任务列表 */}
          <div>
            <h3 className="text-sm text-[#c9a227] mb-2 border-b border-[#3d3529] pb-1">
              ── 可用任务 ──
            </h3>
            <div className="space-y-2">
              {tasksData.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ResourceBadge({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1">
      <span>{icon}</span>
      <span style={{ color }}>{value.toLocaleString()}</span>
    </span>
  );
}

function BuildingCard({ building }: { building: typeof buildingsData[0] }) {
  const statusColor = building.status === "working" ? "#4a9" : building.status === "ready" ? "#c9a227" : "#666";
  return (
    <div className="border-2 border-[#3d3529] bg-[#1a1814] p-3 hover:border-[#c9a227] cursor-pointer transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{building.icon}</span>
        <span className="text-xs px-2 py-0.5 border" style={{ borderColor: statusColor, color: statusColor }}>
          {building.status === "working" ? "运作中" : building.status === "ready" ? "就绪" : "空闲"}
        </span>
      </div>
      <div className="text-sm font-bold">{building.name}</div>
      <div className="text-xs text-[#888]">Lv.{building.level}</div>
      {building.assignedChar && (
        <div className="text-xs text-[#4a9] mt-1">👷 {building.assignedChar}</div>
      )}
    </div>
  );
}

function CharacterRow({ character }: { character: typeof charactersData[0] }) {
  const hpPercent = (character.hp / character.maxHp) * 100;
  return (
    <div className="flex items-center gap-2 p-2 border border-[#2a2520] hover:border-[#3d3529] cursor-pointer text-sm">
      <span className="text-lg">{character.portrait}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{character.name}</div>
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 bg-[#2a2520]">
            <div className="h-full bg-[#4a9]" style={{ width: `${hpPercent}%` }} />
          </div>
          <span className="text-xs text-[#666]">{character.status === "working" ? "工作中" : "空闲"}</span>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: typeof tasksData[0] }) {
  return (
    <div className="p-2 border border-[#2a2520] hover:border-[#c9a227] cursor-pointer text-sm">
      <div className="flex items-center justify-between">
        <span>{task.title}</span>
        {task.status === "new" && <span className="text-xs text-[#c9a227]">NEW</span>}
      </div>
      <div className="text-xs text-[#666] mt-1">
        📍 {task.world} · 🎁 {task.reward}
      </div>
    </div>
  );
}
