// Variant E: 卡片仪表盘布局 - 现代感 + 像素元素融合
// 设计理念：现代仪表盘布局，但使用像素化的装饰元素和复古配色

import { buildingsData, charactersData, tasksData, playerData, resourcesData, dailyInfo } from "../data/fixtures";

export default function VariantE() {
  return (
    <div className="min-h-screen bg-[#08080a] text-[#e0dcd0] font-mono">
      {/* 顶部导航 */}
      <header className="bg-[#101014] border-b-4 border-[#c9a227]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#c9a227] text-[#08080a] flex items-center justify-center font-bold text-lg">
                {playerData.level}
              </div>
              <div>
                <div className="text-[#c9a227] font-bold">{playerData.name}</div>
                <div className="text-xs text-[#666]">{playerData.title} · {playerData.currentWorld}</div>
              </div>
            </div>
          </div>

          {/* 行动点显示 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {Array.from({ length: playerData.actionPoints.max }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-6 ${i < playerData.actionPoints.current ? "bg-[#c9a227]" : "bg-[#2a2a30]"}`}
                />
              ))}
            </div>
            <div className="text-sm">
              <span className="text-[#c9a227] font-bold">{playerData.actionPoints.current}</span>
              <span className="text-[#666]">/{playerData.actionPoints.max} AP</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666]">结算倒计时</span>
            <span className="px-2 py-1 bg-[#1a1a20] text-[#c9a227] text-sm">{dailyInfo.nextSettlement}</span>
          </div>
        </div>
      </header>

      {/* 资源条 */}
      <div className="bg-[#0c0c10] border-b border-[#2a2a30]">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-8">
          <ResourceChip icon="🪙" value={resourcesData.gold} color="#c9a227" />
          <ResourceChip icon="🪵" value={resourcesData.wood} color="#8b6914" />
          <ResourceChip icon="🪨" value={resourcesData.stone} color="#666" />
          <ResourceChip icon="🍞" value={resourcesData.food} color="#a67c52" />
          <ResourceChip icon="💎" value={resourcesData.crystals} color="#9b59b6" />
        </div>
      </div>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左侧 - 建筑网格 */}
          <div className="lg:col-span-7">
            <DashboardCard title="领地建筑" badge={`${buildingsData.length}/9`} action="+ 建造">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                {buildingsData.map((b) => (
                  <ModernBuildingCard key={b.id} building={b} />
                ))}
                <EmptySlot />
                <EmptySlot />
                <EmptySlot />
              </div>
            </DashboardCard>
          </div>

          {/* 右侧 - 信息栏 */}
          <div className="lg:col-span-5 space-y-4">
            {/* 快速行动 */}
            <DashboardCard title="快速行动" compact>
              <div className="grid grid-cols-2 gap-2 p-3">
                <ActionButton icon="🗺️" label="探索" sublabel="消耗 2 AP" />
                <ActionButton icon="🎴" label="抽卡" sublabel="每日免费" highlight />
                <ActionButton icon="🏪" label="商店" sublabel="新商品!" />
                <ActionButton icon="🌀" label="穿梭" sublabel="传送门就绪" />
              </div>
            </DashboardCard>

            {/* 角色列表 */}
            <DashboardCard title="下属角色" badge={`${charactersData.filter(c => c.status === "idle").length} 空闲`}>
              <div className="divide-y divide-[#1a1a20]">
                {charactersData.map((c) => (
                  <ModernCharacterRow key={c.id} character={c} />
                ))}
              </div>
            </DashboardCard>

            {/* 任务列表 */}
            <DashboardCard title="可用任务" badge={`${tasksData.length}`}>
              <div className="divide-y divide-[#1a1a20]">
                {tasksData.map((t) => (
                  <ModernTaskRow key={t.id} task={t} />
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>
      </main>

      {/* 底部状态栏 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#101014] border-t border-[#2a2a30] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-[#666]">第 {dailyInfo.day} 天</span>
            <span className="text-[#666]">|</span>
            <span className="text-[#c9a227]">{dailyInfo.unreadEvents} 条未读消息</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#666]">⌨️ 按 ? 查看快捷键</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ResourceChip({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className="font-bold" style={{ color }}>{value.toLocaleString()}</span>
    </div>
  );
}

function DashboardCard({ title, badge, action, compact, children }: {
  title: string; badge?: string; action?: string; compact?: boolean; children: React.ReactNode
}) {
  return (
    <div className="bg-[#101014] border border-[#2a2a30] overflow-hidden">
      <div className={`flex items-center justify-between bg-[#151518] border-b border-[#2a2a30] ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[#c9a227] font-bold">{title}</span>
          {badge && <span className="text-xs text-[#666] px-2 py-0.5 bg-[#1a1a20]">{badge}</span>}
        </div>
        {action && (
          <button className="text-xs text-[#c9a227] hover:underline">{action}</button>
        )}
      </div>
      {children}
    </div>
  );
}

function ModernBuildingCard({ building }: { building: typeof buildingsData[0] }) {
  const statusColor = building.status === "working" ? "#4a9" : building.status === "ready" ? "#c9a227" : "#444";
  return (
    <div className="group relative bg-[#151518] border border-[#2a2a30] p-3 hover:border-[#c9a227] cursor-pointer transition-colors">
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
      <div className="text-3xl mb-2">{building.icon}</div>
      <div className="font-bold text-sm">{building.name}</div>
      <div className="text-xs text-[#666]">Lv.{building.level}</div>
      {building.assignedChar && (
        <div className="text-xs text-[#4a9] mt-1 truncate">{building.assignedChar}</div>
      )}
      <div className="absolute inset-0 bg-[#c9a227] opacity-0 group-hover:opacity-5 transition-opacity" />
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="h-28 border-2 border-dashed border-[#2a2a30] flex items-center justify-center text-[#444] hover:border-[#c9a227] hover:text-[#c9a227] cursor-pointer transition-colors">
      <span className="text-2xl">+</span>
    </div>
  );
}

function ActionButton({ icon, label, sublabel, highlight }: {
  icon: string; label: string; sublabel: string; highlight?: boolean
}) {
  return (
    <button className={`p-3 text-left transition-colors ${highlight ? 'bg-[#c9a227] text-[#08080a]' : 'bg-[#1a1a20] hover:bg-[#222228]'}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-bold text-sm">{label}</div>
      <div className={`text-xs ${highlight ? 'text-[#08080a]/70' : 'text-[#666]'}`}>{sublabel}</div>
    </button>
  );
}

function ModernCharacterRow({ character }: { character: typeof charactersData[0] }) {
  const hpPercent = (character.hp / character.maxHp) * 100;
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#151518] cursor-pointer">
      <div className="w-10 h-10 bg-[#1a1a20] flex items-center justify-center text-xl">
        {character.portrait}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm truncate">{character.name}</span>
          <span className="text-xs text-[#c9a227]">Lv.{character.level}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1 flex-1 bg-[#1a1a20]">
            <div className="h-full bg-[#4a9]" style={{ width: `${hpPercent}%` }} />
          </div>
          <span className={`text-xs ${character.status === "working" ? "text-[#4a9]" : "text-[#666]"}`}>
            {character.status === "working" ? "工作中" : "空闲"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ModernTaskRow({ task }: { task: typeof tasksData[0] }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-[#151518] cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{task.title}</span>
          {task.status === "new" && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#c9a227] text-[#08080a]">NEW</span>
          )}
        </div>
        <div className="text-xs text-[#666] mt-0.5">
          {task.type === "combat" ? "⚔️" : task.type === "gather" ? "🔍" : "❓"} {task.world} · 奖励: {task.reward}
        </div>
      </div>
      <button className="px-3 py-1 text-xs border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a] transition-colors">
        前往
      </button>
    </div>
  );
}
