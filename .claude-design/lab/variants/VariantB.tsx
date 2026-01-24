// Variant B: 标签页切换布局 - 更适合移动端
// 设计理念：底部导航 + 标签切换，移动优先但桌面也适用

import { useState } from "react";
import { buildingsData, charactersData, tasksData, playerData, resourcesData, dailyInfo } from "../data/fixtures";

type Tab = "territory" | "characters" | "tasks" | "explore";

export default function VariantB() {
  const [activeTab, setActiveTab] = useState<Tab>("territory");

  return (
    <div className="min-h-screen bg-[#0a0a08] text-[#d4d0c4] font-mono flex flex-col">
      {/* 顶部紧凑状态栏 */}
      <header className="bg-[#151510] border-b border-[#2d2a20] px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border border-[#c9a227] flex items-center justify-center text-sm bg-[#1a1814]">
              {playerData.level}
            </div>
            <div>
              <div className="text-xs text-[#c9a227]">{playerData.name}</div>
              <div className="text-[10px] text-[#666]">{playerData.title}</div>
            </div>
          </div>

          {/* 资源条 - 可滚动 */}
          <div className="flex items-center gap-3 text-xs overflow-x-auto">
            <span className="text-[#c9a227] whitespace-nowrap">🪙{resourcesData.gold}</span>
            <span className="text-[#8b6914] whitespace-nowrap">🪵{resourcesData.wood}</span>
            <span className="text-[#666] whitespace-nowrap">🪨{resourcesData.stone}</span>
            <span className="text-[#a67c52] whitespace-nowrap">🍞{resourcesData.food}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#c9a227] text-sm font-bold">⚡{playerData.actionPoints.current}</span>
            <span className="text-[10px] text-[#666]">D{dailyInfo.day}</span>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto p-3">
        {activeTab === "territory" && <TerritoryPanel />}
        {activeTab === "characters" && <CharactersPanel />}
        {activeTab === "tasks" && <TasksPanel />}
        {activeTab === "explore" && <ExplorePanel />}
      </main>

      {/* 底部导航 */}
      <nav className="bg-[#151510] border-t-2 border-[#2d2a20] px-2 py-1">
        <div className="flex justify-around">
          <TabButton icon="🏰" label="领地" active={activeTab === "territory"} onClick={() => setActiveTab("territory")} />
          <TabButton icon="👥" label="角色" active={activeTab === "characters"} onClick={() => setActiveTab("characters")} badge={charactersData.filter(c => c.status === "idle").length} />
          <TabButton icon="📜" label="任务" active={activeTab === "tasks"} onClick={() => setActiveTab("tasks")} badge={tasksData.filter(t => t.status === "new").length} />
          <TabButton icon="🗺️" label="探索" active={activeTab === "explore"} onClick={() => setActiveTab("explore")} />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ icon, label, active, onClick, badge }: {
  icon: string; label: string; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-4 py-2 relative ${active ? "text-[#c9a227]" : "text-[#666]"}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] mt-0.5">{label}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#c9a227] text-[#0a0a08] text-[10px] flex items-center justify-center">
          {badge}
        </span>
      )}
      {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#c9a227]" />}
    </button>
  );
}

function TerritoryPanel() {
  return (
    <div className="space-y-3">
      <SectionHeader title="核心建筑" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {buildingsData.filter(b => b.slot === "core" || b.slot === "special").map(b => (
          <CompactBuildingCard key={b.id} building={b} />
        ))}
      </div>

      <SectionHeader title="生产设施" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {buildingsData.filter(b => b.slot === "production").map(b => (
          <CompactBuildingCard key={b.id} building={b} />
        ))}
      </div>

      <SectionHeader title="其他建筑" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {buildingsData.filter(b => b.slot === "military" || b.slot === "commerce").map(b => (
          <CompactBuildingCard key={b.id} building={b} />
        ))}
        <button className="h-20 border border-dashed border-[#2d2a20] text-[#444] text-sm hover:border-[#c9a227] hover:text-[#c9a227]">
          + 建造
        </button>
      </div>
    </div>
  );
}

function CharactersPanel() {
  return (
    <div className="space-y-2">
      <SectionHeader title="下属角色" count={charactersData.length} />
      {charactersData.map(c => (
        <div key={c.id} className="flex items-center gap-3 p-3 bg-[#151510] border border-[#2d2a20]">
          <div className="w-10 h-10 bg-[#1a1814] border border-[#3d3529] flex items-center justify-center text-xl">
            {c.portrait}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold">{c.name}</span>
              <span className="text-xs text-[#c9a227]">Lv.{c.level}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 flex-1 bg-[#2d2a20]">
                <div className="h-full bg-[#4a9]" style={{ width: `${(c.hp / c.maxHp) * 100}%` }} />
              </div>
              <span className="text-[10px] text-[#666]">{c.hp}/{c.maxHp}</span>
            </div>
            <div className="text-xs text-[#666] mt-1">{c.class} · {c.status === "working" ? "工作中" : "空闲"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TasksPanel() {
  return (
    <div className="space-y-2">
      <SectionHeader title="可用任务" count={tasksData.length} />
      {tasksData.map(t => (
        <div key={t.id} className="p-3 bg-[#151510] border border-[#2d2a20] hover:border-[#c9a227]">
          <div className="flex items-center justify-between">
            <span className="font-bold">{t.title}</span>
            {t.status === "new" && <span className="text-[10px] px-1.5 py-0.5 bg-[#c9a227] text-[#0a0a08]">NEW</span>}
          </div>
          <div className="text-xs text-[#666] mt-1">
            {t.type === "combat" ? "⚔️" : t.type === "gather" ? "🔍" : "❓"} {t.world}
          </div>
          <div className="text-xs text-[#c9a227] mt-1">奖励: {t.reward}</div>
        </div>
      ))}
    </div>
  );
}

function ExplorePanel() {
  return (
    <div className="space-y-3">
      <SectionHeader title="当前位置" />
      <div className="p-4 bg-[#151510] border border-[#2d2a20] text-center">
        <div className="text-2xl mb-2">🏠</div>
        <div className="text-[#c9a227]">{playerData.currentWorld}</div>
        <div className="text-xs text-[#666] mt-1">你的领地</div>
      </div>

      <SectionHeader title="可前往" />
      <div className="grid grid-cols-2 gap-2">
        {["仙侠世界", "末日世界", "中世纪", "东瀛"].map(world => (
          <button key={world} className="p-3 bg-[#151510] border border-[#2d2a20] hover:border-[#c9a227] text-left">
            <div className="text-lg">🌀</div>
            <div className="text-sm mt-1">{world}</div>
            <div className="text-[10px] text-[#666]">消耗: ⚡2</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[#c9a227] border-b border-[#2d2a20] pb-1">
      <span>▸ {title}</span>
      {count !== undefined && <span className="text-[#666]">({count})</span>}
    </div>
  );
}

function CompactBuildingCard({ building }: { building: typeof buildingsData[0] }) {
  return (
    <div className="p-2 bg-[#151510] border border-[#2d2a20] hover:border-[#c9a227]">
      <div className="flex items-center gap-2">
        <span className="text-xl">{building.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{building.name}</div>
          <div className="text-[10px] text-[#666]">Lv.{building.level}</div>
        </div>
      </div>
      {building.assignedChar && (
        <div className="text-[10px] text-[#4a9] mt-1 truncate">👷 {building.assignedChar.split("·")[1]}</div>
      )}
    </div>
  );
}
