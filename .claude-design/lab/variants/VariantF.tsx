// Variant F: 融合版 - E仪表盘布局 + D文字进度条
// 设计理念：现代卡片布局为骨架，融入复古文字进度条和终端美学

import { buildingsData, charactersData, tasksData, playerData, resourcesData, dailyInfo } from "../data/fixtures";

export default function VariantF() {
  return (
    <div className="min-h-screen bg-[#08080a] text-[#e0dcd0] font-mono flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-[#101014] border-b-4 border-[#c9a227]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* 玩家信息 */}
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

          {/* 行动点可视化 */}
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

          {/* 结算倒计时 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666]">结算</span>
            <span className="px-2 py-1 bg-[#1a1a20] text-[#c9a227] text-sm">{dailyInfo.nextSettlement}</span>
          </div>
        </div>
      </header>

      {/* 资源条 - 使用文字进度条 */}
      <div className="bg-[#0c0c10] border-b border-[#2a2a30]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <ResourceBar icon="🪙" name="金币" value={resourcesData.gold} max={5000} color="#c9a227" />
            <ResourceBar icon="🪵" name="木材" value={resourcesData.wood} max={1000} color="#8b6914" />
            <ResourceBar icon="🪨" name="石材" value={resourcesData.stone} max={500} color="#888" />
            <ResourceBar icon="🍞" name="粮食" value={resourcesData.food} max={1000} color="#a67c52" />
            <ResourceBar icon="💎" name="水晶" value={resourcesData.crystals} max={100} color="#9b59b6" />
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <main className="flex-1 overflow-y-auto pb-16">
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 左侧 - 建筑网格 */}
            <div className="lg:col-span-7">
              <DashboardCard title="领地建筑" badge={`${buildingsData.length}/9`} action="+ 建造">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                  {buildingsData.map((b) => (
                    <BuildingCard key={b.id} building={b} />
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
                    <CharacterRow key={c.id} character={c} />
                  ))}
                </div>
              </DashboardCard>

              {/* 任务列表 */}
              <DashboardCard title="可用任务" badge={`${tasksData.length}`}>
                <div className="divide-y divide-[#1a1a20]">
                  {tasksData.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              </DashboardCard>
            </div>
          </div>
        </div>
      </main>

      {/* 固定底部状态栏 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#101014] border-t-2 border-[#2a2a30] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-[#c9a227]">DAY {dailyInfo.day}</span>
            <span className="text-[#3a3a40]">|</span>
            <span className="text-[#4a9]">{dailyInfo.unreadEvents} 条新消息</span>
            <span className="text-[#3a3a40]">|</span>
            <span className="text-[#666]">📍 {playerData.currentWorld}</span>
          </div>
          <div className="flex items-center gap-4 text-[#666]">
            <span>[B]建造</span>
            <span>[C]角色</span>
            <span>[Q]任务</span>
            <span>[E]探索</span>
            <span>[?]帮助</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 文字进度条资源显示
function ResourceBar({ icon, name, value, max, color }: {
  icon: string; name: string; value: number; max: number; color: string
}) {
  const percent = Math.min((value / max) * 100, 100);
  const barLength = 8;
  const filled = Math.round((percent / 100) * barLength);

  return (
    <div className="bg-[#151518] border border-[#2a2a30] px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{icon} {name}</span>
        <span className="text-sm font-bold" style={{ color }}>{value.toLocaleString()}</span>
      </div>
      <div className="font-mono text-xs">
        <span className="text-[#3a3a40]">[</span>
        <span style={{ color }}>{"█".repeat(filled)}</span>
        <span className="text-[#2a2a30]">{"░".repeat(barLength - filled)}</span>
        <span className="text-[#3a3a40]">]</span>
        <span className="text-[#666] ml-1">{Math.round(percent)}%</span>
      </div>
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

function BuildingCard({ building }: { building: typeof buildingsData[0] }) {
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

function CharacterRow({ character }: { character: typeof charactersData[0] }) {
  const hpPercent = (character.hp / character.maxHp) * 100;
  const barLength = 10;
  const filled = Math.round((hpPercent / 100) * barLength);

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
        <div className="flex items-center gap-2 mt-1 text-xs font-mono">
          <span className="text-[#666]">HP</span>
          <span className="text-[#3a3a40]">[</span>
          <span className="text-[#4a9]">{"█".repeat(filled)}</span>
          <span className="text-[#2a2a30]">{"░".repeat(barLength - filled)}</span>
          <span className="text-[#3a3a40]">]</span>
          <span className={`${character.status === "working" ? "text-[#4a9]" : "text-[#666]"}`}>
            {character.status === "working" ? "工作中" : "空闲"}
          </span>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: typeof tasksData[0] }) {
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
          {task.type === "combat" ? "⚔️" : task.type === "gather" ? "🔍" : "❓"} {task.world} · 奖励: <span className="text-[#c9a227]">{task.reward}</span>
        </div>
      </div>
      <button className="px-3 py-1 text-xs border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a] transition-colors">
        前往
      </button>
    </div>
  );
}
