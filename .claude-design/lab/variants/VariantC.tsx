// Variant C: 像素面板布局 - 拟物化窗口
// 设计理念：模拟经典游戏的多窗口界面，可拖拽面板（仅视觉），复古 UI 框架

import { buildingsData, charactersData, tasksData, playerData, resourcesData, dailyInfo } from "../data/fixtures";

export default function VariantC() {
  return (
    <div
      className="min-h-screen p-4 font-mono text-[#d4c5a0]"
      style={{
        backgroundColor: "#0c0c0a",
        backgroundImage: `
          linear-gradient(rgba(20,18,12,0.8) 1px, transparent 1px),
          linear-gradient(90deg, rgba(20,18,12,0.8) 1px, transparent 1px)
        `,
        backgroundSize: "4px 4px",
      }}
    >
      {/* 顶部标题栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PixelBox className="px-3 py-1">
            <span className="text-[#c9a227]">☰</span>
          </PixelBox>
          <span className="text-[#c9a227] tracking-wider">诸天领域</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <PixelBox className="px-2 py-1">DAY {dailyInfo.day}</PixelBox>
          <PixelBox className="px-2 py-1 text-[#c9a227]">⚡ {playerData.actionPoints.current}/{playerData.actionPoints.max}</PixelBox>
        </div>
      </div>

      {/* 资源栏 */}
      <PixelPanel title="◈ 资源 ◈" className="mb-4">
        <div className="flex flex-wrap gap-4 p-2">
          <ResourceItem icon="🪙" name="金币" value={resourcesData.gold} color="#c9a227" />
          <ResourceItem icon="🪵" name="木材" value={resourcesData.wood} color="#8b6914" />
          <ResourceItem icon="🪨" name="石材" value={resourcesData.stone} color="#888" />
          <ResourceItem icon="🍞" name="粮食" value={resourcesData.food} color="#a67c52" />
          <ResourceItem icon="💎" name="水晶" value={resourcesData.crystals} color="#9b59b6" />
        </div>
      </PixelPanel>

      {/* 三栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 建筑面板 */}
        <PixelPanel title="◈ 领地建筑 ◈" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
            {buildingsData.map((b) => (
              <PixelBuildingTile key={b.id} building={b} />
            ))}
            <button className="h-24 border-2 border-dashed border-[#3d3529] text-[#555] hover:border-[#c9a227] hover:text-[#c9a227] flex flex-col items-center justify-center">
              <span className="text-2xl">+</span>
              <span className="text-xs mt-1">建造</span>
            </button>
          </div>
        </PixelPanel>

        {/* 角色面板 */}
        <PixelPanel title="◈ 下属 ◈">
          <div className="p-2 space-y-1">
            {charactersData.map((c) => (
              <PixelCharacterRow key={c.id} character={c} />
            ))}
          </div>
        </PixelPanel>
      </div>

      {/* 底部任务栏 */}
      <PixelPanel title="◈ 当前任务 ◈" className="mt-4">
        <div className="flex gap-2 p-2 overflow-x-auto">
          {tasksData.map((t) => (
            <PixelTaskCard key={t.id} task={t} />
          ))}
        </div>
      </PixelPanel>

      {/* 玩家信息浮窗 */}
      <div className="fixed bottom-4 left-4">
        <PixelPanel title="◈ 身份 ◈" compact>
          <div className="p-2 text-xs">
            <div className="text-[#c9a227] font-bold">{playerData.name}</div>
            <div className="text-[#888]">{playerData.title} · Lv.{playerData.level}</div>
            <div className="text-[#666] mt-1">📍 {playerData.currentWorld}</div>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}

function PixelBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1712] border-2 border-[#3d3529] shadow-[2px_2px_0_#0a0a08] ${className}`}>
      {children}
    </div>
  );
}

function PixelPanel({ title, children, className = "", compact = false }: {
  title: string; children: React.ReactNode; className?: string; compact?: boolean
}) {
  return (
    <div className={`bg-[#12110d] border-2 border-[#3d3529] shadow-[4px_4px_0_#0a0a08] ${className}`}>
      <div className={`bg-gradient-to-r from-[#2d2a20] to-[#1a1712] ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} border-b-2 border-[#3d3529]`}>
        <span className={`text-[#c9a227] ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ResourceItem({ icon, name, value, color }: { icon: string; name: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[#1a1712] border border-[#2d2a20]">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-xs text-[#888]">{name}</div>
        <div className="text-sm font-bold" style={{ color }}>{value.toLocaleString()}</div>
      </div>
    </div>
  );
}

function PixelBuildingTile({ building }: { building: typeof buildingsData[0] }) {
  const borderColor = building.status === "working" ? "#4a9" : building.status === "ready" ? "#c9a227" : "#3d3529";
  return (
    <div
      className="p-2 bg-[#1a1712] cursor-pointer hover:bg-[#201d17] transition-colors"
      style={{ border: `2px solid ${borderColor}` }}
    >
      <div className="flex justify-between items-start">
        <span className="text-3xl">{building.icon}</span>
        <span className="text-[10px] px-1 bg-[#0a0a08] text-[#c9a227]">Lv.{building.level}</span>
      </div>
      <div className="mt-2">
        <div className="text-sm font-bold truncate">{building.name}</div>
        {building.assignedChar ? (
          <div className="text-[10px] text-[#4a9] truncate">👷 {building.assignedChar}</div>
        ) : (
          <div className="text-[10px] text-[#555]">空闲中</div>
        )}
      </div>
    </div>
  );
}

function PixelCharacterRow({ character }: { character: typeof charactersData[0] }) {
  const hpPercent = (character.hp / character.maxHp) * 100;
  return (
    <div className="flex items-center gap-2 p-1.5 bg-[#1a1712] border border-[#2d2a20] hover:border-[#3d3529] cursor-pointer">
      <div className="w-8 h-8 bg-[#0a0a08] border border-[#3d3529] flex items-center justify-center">
        {character.portrait}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate">{character.name}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="h-1 flex-1 bg-[#0a0a08] border border-[#2d2a20]">
            <div className="h-full bg-[#4a9]" style={{ width: `${hpPercent}%` }} />
          </div>
          <span className="text-[8px] text-[#666] w-8">{character.hp}/{character.maxHp}</span>
        </div>
      </div>
      <span className="text-[8px] text-[#c9a227]">{character.level}</span>
    </div>
  );
}

function PixelTaskCard({ task }: { task: typeof tasksData[0] }) {
  return (
    <div className="flex-shrink-0 w-40 p-2 bg-[#1a1712] border-2 border-[#3d3529] hover:border-[#c9a227] cursor-pointer">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold truncate">{task.title}</span>
        {task.status === "new" && <span className="text-[8px] px-1 bg-[#c9a227] text-[#0a0a08]">!</span>}
      </div>
      <div className="text-[10px] text-[#888] mt-1">
        {task.type === "combat" ? "⚔️ 战斗" : task.type === "gather" ? "🔍 采集" : "❓ 事件"}
      </div>
      <div className="text-[10px] text-[#666] mt-0.5">📍 {task.world}</div>
      <div className="text-[10px] text-[#c9a227] mt-1">🎁 {task.reward}</div>
    </div>
  );
}
