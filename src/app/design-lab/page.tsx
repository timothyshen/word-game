"use client";

import { useState } from "react";

// Mock data for design variations
const mockPlayer = {
  name: "测试领主",
  tier: 3,
  level: 15,
  gold: 2500,
  wood: 450,
  stone: 280,
  food: 890,
  crystals: 45,
  stamina: 75,
  maxStamina: 100,
  currentDayScore: 285,
  streakDays: 5,
  currentGameDay: 42,
};

const mockCharacters = [
  { id: "1", name: "剑圣", class: "战士", level: 12, hp: 85, maxHp: 100, portrait: "⚔️", status: "idle" },
  { id: "2", name: "法师", class: "法师", level: 10, hp: 60, maxHp: 80, portrait: "🔮", status: "working" },
  { id: "3", name: "游侠", class: "弓手", level: 8, hp: 70, maxHp: 90, portrait: "🏹", status: "idle" },
];

const mockBuildings = [
  { id: 1, name: "主城堡", level: 5, icon: "🏰", x: 2, y: 2 },
  { id: 2, name: "农田", level: 3, icon: "🌾", x: 1, y: 1 },
  { id: 3, name: "铁匠铺", level: 2, icon: "⚒️", x: 3, y: 1 },
  { id: 4, name: "兵营", level: 2, icon: "🛡️", x: 1, y: 3 },
  { id: 5, name: "市场", level: 1, icon: "🏪", x: 3, y: 3 },
];

export default function DesignLabPage() {
  const [activeVariant, setActiveVariant] = useState(0);

  const variants = [
    { name: "A: 地图中心", description: "地图为主焦点，角色侧边栏" },
    { name: "B: 双栏平衡", description: "左右分栏，地图与角色并重" },
    { name: "C: 卡片网格", description: "模块化卡片布局，灵活排列" },
    { name: "D: 沉浸式", description: "全屏地图，浮动UI元素" },
    { name: "E: 复古终端", description: "像素终端风格，ASCII装饰" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#e0dcd0]">
      {/* 变体选择器 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a20] border-b-2 border-[#c9a227] p-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span className="text-[#c9a227] font-bold text-sm">Design Lab</span>
          <div className="flex gap-2">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => setActiveVariant(i)}
                className={`px-3 py-1.5 text-sm font-mono transition-colors ${
                  activeVariant === i
                    ? "bg-[#c9a227] text-[#0a0a0c]"
                    : "bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-[#666]">{variants[activeVariant]?.description}</span>
        </div>
      </div>

      {/* 变体内容 */}
      <div className="pt-16">
        {activeVariant === 0 && <VariantA player={mockPlayer} characters={mockCharacters} buildings={mockBuildings} />}
        {activeVariant === 1 && <VariantB player={mockPlayer} characters={mockCharacters} buildings={mockBuildings} />}
        {activeVariant === 2 && <VariantC player={mockPlayer} characters={mockCharacters} buildings={mockBuildings} />}
        {activeVariant === 3 && <VariantD player={mockPlayer} characters={mockCharacters} buildings={mockBuildings} />}
        {activeVariant === 4 && <VariantE player={mockPlayer} characters={mockCharacters} buildings={mockBuildings} />}
      </div>
    </div>
  );
}

// ============================================
// 变体 A: 地图中心 - Map-Centric Layout
// 地图作为主焦点，角色在右侧边栏
// ============================================
function VariantA({ player, characters, buildings }: VariantProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部状态栏 - 像素边框风格 */}
      <header className="bg-[#12121a] border-b-4 border-[#2a2a30] relative">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* 玩家信息 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c9a227] text-[#0a0a0c] flex items-center justify-center font-bold text-lg border-2 border-[#8b6914]" style={{ imageRendering: "pixelated" }}>
              {player.tier}
            </div>
            <div>
              <div className="text-[#c9a227] font-bold text-sm">{player.name}</div>
              <div className="text-[10px] text-[#666]">Lv.{player.level} · DAY {player.currentGameDay}</div>
            </div>
          </div>

          {/* 资源条 - 像素风格 */}
          <div className="flex gap-4">
            <PixelResource icon="🪙" value={player.gold} color="#c9a227" />
            <PixelResource icon="⚡" value={`${player.stamina}/${player.maxStamina}`} color="#4a9eff" />
            <PixelResource icon="💎" value={player.crystals} color="#9b59b6" />
          </div>

          {/* 今日分数 */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-[#1a1a20] border-2 border-[#2a2a30]">
              <span className="text-xs text-[#666]">SCORE</span>
              <span className="ml-2 text-[#c9a227] font-bold">{player.currentDayScore}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 h-full">
          {/* 左侧 - 地图区域 (主焦点) */}
          <div className="col-span-8">
            <div className="bg-[#12121a] border-4 border-[#2a2a30] h-[500px] relative overflow-hidden">
              {/* 像素角装饰 */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#c9a227]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#c9a227]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#c9a227]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#c9a227]" />

              <div className="p-4">
                <div className="text-xs text-[#c9a227] mb-2 font-mono">[ TERRITORY MAP ]</div>
                <IsometricMapMock buildings={buildings} />
              </div>
            </div>

            {/* 快速行动 - 像素按钮 */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              <PixelButton icon="👥" label="角色" />
              <PixelButton icon="🎒" label="背包" />
              <PixelButton icon="🗺️" label="冒险" />
              <PixelButton icon="⬆️" label="进阶" />
            </div>
          </div>

          {/* 右侧 - 角色列表 */}
          <div className="col-span-4">
            <div className="bg-[#12121a] border-4 border-[#2a2a30] h-full">
              <div className="px-3 py-2 border-b-2 border-[#2a2a30] bg-[#1a1a20]">
                <span className="text-xs text-[#c9a227] font-mono">[ ROSTER ]</span>
                <span className="ml-2 text-xs text-[#666]">{characters.length} units</span>
              </div>
              <div className="p-2 space-y-2">
                {characters.map((char) => (
                  <PixelCharacterCard key={char.id} character={char} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 底部状态栏 */}
      <footer className="bg-[#12121a] border-t-4 border-[#2a2a30] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-mono">
          <span className="text-[#c9a227]">🔥 STREAK: {player.streakDays} DAYS</span>
          <span className="text-[#666]">Press [ESC] for menu</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// 变体 B: 双栏平衡 - Balanced Two-Column
// 左右分栏，地图与角色同等重要
// ============================================
function VariantB({ player, characters, buildings }: VariantProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a0a0c] to-[#12121a]">
      {/* 紧凑顶栏 */}
      <header className="bg-[#0a0a0c]/80 backdrop-blur border-b border-[#2a2a30]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* 玩家头像 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#8b6914] flex items-center justify-center text-[#0a0a0c] font-bold border border-[#c9a227]/50">
                {player.tier}
              </div>
              <div className="text-sm">
                <span className="text-[#c9a227]">{player.name}</span>
                <span className="text-[#666] ml-2">Lv.{player.level}</span>
              </div>
            </div>

            {/* 资源指示器 */}
            <div className="flex gap-3 text-sm">
              <span><span className="opacity-50">🪙</span> {player.gold}</span>
              <span><span className="opacity-50">💎</span> {player.crystals}</span>
              <span className="text-[#4a9eff]">⚡ {player.stamina}/{player.maxStamina}</span>
            </div>
          </div>

          {/* 右侧快捷入口 */}
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-[#c9a227] text-[#0a0a0c] text-sm font-bold hover:bg-[#ddb52f]">
              📊 结算 ({player.currentDayScore})
            </button>
          </div>
        </div>
      </header>

      {/* 主内容 - 双栏布局 */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 gap-4 h-full">
          {/* 左栏 - 地图 */}
          <div className="space-y-4">
            <div className="bg-[#12121a] border-2 border-[#2a2a30] rounded-sm overflow-hidden">
              <div className="px-3 py-2 bg-[#1a1a20] border-b border-[#2a2a30] flex items-center justify-between">
                <span className="text-sm font-bold text-[#c9a227]">🏰 领地地图</span>
                <span className="text-xs text-[#666]">{buildings.length} 建筑</span>
              </div>
              <div className="p-4 h-[400px]">
                <IsometricMapMock buildings={buildings} />
              </div>
            </div>

            {/* 快速行动网格 */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: "🗺️", label: "冒险" },
                { icon: "👹", label: "战斗" },
                { icon: "🎒", label: "背包" },
                { icon: "📋", label: "记录" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="p-3 bg-[#1a1a20] border border-[#2a2a30] hover:border-[#c9a227] transition-colors text-center"
                >
                  <div className="text-xl mb-1">{action.icon}</div>
                  <div className="text-xs text-[#888]">{action.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 右栏 - 角色 */}
          <div className="bg-[#12121a] border-2 border-[#2a2a30] rounded-sm overflow-hidden">
            <div className="px-3 py-2 bg-[#1a1a20] border-b border-[#2a2a30] flex items-center justify-between">
              <span className="text-sm font-bold text-[#c9a227]">👥 我的角色</span>
              <span className="text-xs text-[#666]">{characters.length} 人</span>
            </div>
            <div className="p-3 space-y-3">
              {characters.map((char) => (
                <div key={char.id} className="flex items-center gap-3 p-3 bg-[#0a0a0c] border border-[#2a2a30] hover:border-[#4a9] transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#3a3a40] flex items-center justify-center text-2xl">
                    {char.portrait}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{char.name}</span>
                      <span className="text-xs text-[#c9a227]">Lv.{char.level}</span>
                    </div>
                    <div className="text-xs text-[#666]">{char.class}</div>
                    <div className="mt-1 h-1.5 bg-[#2a2a30] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4a9]"
                        style={{ width: `${(char.hp / char.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-0.5 ${char.status === "working" ? "bg-[#4a9]/20 text-[#4a9]" : "bg-[#2a2a30] text-[#666]"}`}>
                    {char.status === "working" ? "工作中" : "待命"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================
// 变体 C: 卡片网格 - Modular Card Grid
// 模块化设计，可拖拽重排
// ============================================
function VariantC({ player, characters, buildings }: VariantProps) {
  return (
    <div className="min-h-screen bg-[#08080a]">
      {/* 迷你状态条 */}
      <div className="bg-[#0a0a0c] border-b-2 border-[#1a1a20] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-6 text-sm">
          <span className="text-[#c9a227] font-bold">{player.name}</span>
          <div className="flex gap-4 text-[#888]">
            <span>🪙 {player.gold}</span>
            <span>💎 {player.crystals}</span>
            <span>⚡ {player.stamina}</span>
          </div>
          <span className="ml-auto text-[#666]">DAY {player.currentGameDay}</span>
        </div>
      </div>

      {/* 卡片网格 */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-12 gap-3">
          {/* 地图卡片 - 大尺寸 */}
          <div className="col-span-8 row-span-2">
            <ModuleCard title="领地地图" icon="🗺️" accent="#c9a227">
              <div className="h-[400px]">
                <IsometricMapMock buildings={buildings} />
              </div>
            </ModuleCard>
          </div>

          {/* 快速统计 */}
          <div className="col-span-4">
            <ModuleCard title="今日统计" icon="📊" accent="#4a9eff">
              <div className="grid grid-cols-2 gap-2 p-2">
                <StatBox label="分数" value={player.currentDayScore} color="#c9a227" />
                <StatBox label="连续" value={`${player.streakDays}天`} color="#e67e22" />
                <StatBox label="体力" value={`${player.stamina}%`} color="#4a9eff" />
                <StatBox label="角色" value={characters.length} color="#9b59b6" />
              </div>
            </ModuleCard>
          </div>

          {/* 角色预览 */}
          <div className="col-span-4">
            <ModuleCard title="角色" icon="👥" accent="#4a9">
              <div className="p-2 space-y-2">
                {characters.slice(0, 2).map((char) => (
                  <div key={char.id} className="flex items-center gap-2 p-2 bg-[#0a0a0c] border border-[#2a2a30]">
                    <span className="text-xl">{char.portrait}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{char.name}</div>
                      <div className="text-xs text-[#666]">Lv.{char.level}</div>
                    </div>
                  </div>
                ))}
                <button className="w-full py-1 text-xs text-[#888] hover:text-[#c9a227]">
                  查看全部 →
                </button>
              </div>
            </ModuleCard>
          </div>

          {/* 快速行动 */}
          <div className="col-span-6">
            <ModuleCard title="快速行动" icon="⚡" accent="#e67e22">
              <div className="grid grid-cols-4 gap-2 p-2">
                {[
                  { icon: "🗺️", label: "冒险" },
                  { icon: "👹", label: "战斗" },
                  { icon: "🎒", label: "背包" },
                  { icon: "⬆️", label: "进阶" },
                ].map((a) => (
                  <button key={a.label} className="py-3 bg-[#1a1a20] hover:bg-[#222228] text-center">
                    <div className="text-lg">{a.icon}</div>
                    <div className="text-xs text-[#888] mt-1">{a.label}</div>
                  </button>
                ))}
              </div>
            </ModuleCard>
          </div>

          {/* 资源 */}
          <div className="col-span-6">
            <ModuleCard title="资源" icon="💰" accent="#c9a227">
              <div className="grid grid-cols-5 gap-2 p-2">
                <ResourceMini icon="🪙" value={player.gold} />
                <ResourceMini icon="🪵" value={player.wood} />
                <ResourceMini icon="🪨" value={player.stone} />
                <ResourceMini icon="🍞" value={player.food} />
                <ResourceMini icon="💎" value={player.crystals} />
              </div>
            </ModuleCard>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================
// 变体 D: 沉浸式 - Immersive Full-screen
// 全屏地图，浮动UI
// ============================================
function VariantD({ player, characters, buildings }: VariantProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0c] relative overflow-hidden">
      {/* 全屏地图背景 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full max-w-4xl max-h-[600px] p-8">
          <IsometricMapMock buildings={buildings} fullscreen />
        </div>
      </div>

      {/* 顶部浮动状态 */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
        {/* 左上 - 玩家信息 */}
        <div className="pointer-events-auto bg-[#0a0a0c]/90 backdrop-blur border border-[#2a2a30] p-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#c9a227] text-[#0a0a0c] flex items-center justify-center font-bold text-xl border-2 border-[#8b6914]">
              {player.tier}
            </div>
            <div>
              <div className="text-[#c9a227] font-bold">{player.name}</div>
              <div className="text-xs text-[#888]">Lv.{player.level} · Day {player.currentGameDay}</div>
              {/* 体力条 */}
              <div className="mt-1 w-32 h-2 bg-[#1a1a20] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4a9eff] to-[#59b]"
                  style={{ width: `${(player.stamina / player.maxStamina) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右上 - 资源 */}
        <div className="pointer-events-auto bg-[#0a0a0c]/90 backdrop-blur border border-[#2a2a30] p-2">
          <div className="flex gap-4 text-sm">
            <span className="text-[#c9a227]">🪙 {player.gold}</span>
            <span className="text-[#9b59b6]">💎 {player.crystals}</span>
          </div>
        </div>
      </div>

      {/* 左侧浮动 - 角色 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto">
        <div className="bg-[#0a0a0c]/90 backdrop-blur border border-[#2a2a30] p-2 space-y-2">
          {characters.map((char) => (
            <div key={char.id} className="w-14 h-14 bg-[#1a1a20] border border-[#2a2a30] flex items-center justify-center text-2xl cursor-pointer hover:border-[#c9a227] transition-colors relative">
              {char.portrait}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2a2a30]">
                <div className="h-full bg-[#4a9]" style={{ width: `${(char.hp / char.maxHp) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧浮动 - 快速行动 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
        <div className="bg-[#0a0a0c]/90 backdrop-blur border border-[#2a2a30] p-2 space-y-2">
          {["🗺️", "👹", "🎒", "⬆️", "📊"].map((icon) => (
            <button key={icon} className="w-12 h-12 bg-[#1a1a20] border border-[#2a2a30] flex items-center justify-center text-xl hover:bg-[#c9a227] hover:text-[#0a0a0c] transition-colors">
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* 底部浮动 - 分数 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-[#0a0a0c]/90 backdrop-blur border border-[#c9a227] px-6 py-3">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-[#888]">TODAY</div>
              <div className="text-2xl font-bold text-[#c9a227]">{player.currentDayScore}</div>
            </div>
            <div className="w-px h-8 bg-[#2a2a30]" />
            <div className="text-center">
              <div className="text-xs text-[#888]">STREAK</div>
              <div className="text-xl font-bold text-[#e67e22]">{player.streakDays}🔥</div>
            </div>
            <button className="ml-4 px-4 py-2 bg-[#c9a227] text-[#0a0a0c] font-bold hover:bg-[#ddb52f]">
              结算
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 变体 E: 复古终端 - Retro Terminal
// 全面像素风，ASCII装饰
// ============================================
function VariantE({ player, characters, buildings }: VariantProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0c] font-mono p-4">
      {/* CRT效果 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#4a9eff]/[0.02] to-transparent animate-pulse" style={{ backgroundSize: "100% 4px" }} />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* ASCII标题 */}
        <pre className="text-[#c9a227] text-xs mb-4 text-center">
{`
╔══════════════════════════════════════════════════════════════╗
║  ▓▓▓ 诸 天 领 域 ▓▓▓  │  REALM OF REALMS  │  DAY ${String(player.currentGameDay).padStart(3, '0')}  ║
╚══════════════════════════════════════════════════════════════╝
`}
        </pre>

        <div className="grid grid-cols-12 gap-2">
          {/* 状态面板 */}
          <div className="col-span-4">
            <TerminalBox title="STATUS">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#888]">NAME:</span>
                  <span className="text-[#c9a227]">{player.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">TIER:</span>
                  <span className="text-[#4a9]">{player.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">LEVEL:</span>
                  <span>{player.level}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[#888]">STAMINA:</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[#4a9eff]">[</span>
                    <span className="text-[#4a9eff]">{"█".repeat(Math.floor(player.stamina / 10))}</span>
                    <span className="text-[#2a2a30]">{"░".repeat(10 - Math.floor(player.stamina / 10))}</span>
                    <span className="text-[#4a9eff]">]</span>
                    <span className="text-[#888] ml-1">{player.stamina}%</span>
                  </div>
                </div>
              </div>
            </TerminalBox>
          </div>

          {/* 资源面板 */}
          <div className="col-span-4">
            <TerminalBox title="RESOURCES">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-[#888]">GOLD....</span><span className="text-[#c9a227]">{player.gold}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">WOOD....</span><span className="text-[#8b6914]">{player.wood}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">STONE...</span><span className="text-[#888]">{player.stone}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">FOOD....</span><span className="text-[#a67c52]">{player.food}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">CRYSTAL.</span><span className="text-[#9b59b6]">{player.crystals}</span></div>
              </div>
            </TerminalBox>
          </div>

          {/* 分数面板 */}
          <div className="col-span-4">
            <TerminalBox title="DAILY SCORE">
              <div className="text-center py-2">
                <div className="text-3xl font-bold text-[#c9a227]">{player.currentDayScore}</div>
                <div className="text-xs text-[#666] mt-1">STREAK: {player.streakDays} DAYS</div>
              </div>
            </TerminalBox>
          </div>

          {/* 地图 */}
          <div className="col-span-8 row-span-2">
            <TerminalBox title="TERRITORY MAP">
              <div className="h-[300px]">
                <IsometricMapMock buildings={buildings} ascii />
              </div>
            </TerminalBox>
          </div>

          {/* 角色 */}
          <div className="col-span-4 row-span-2">
            <TerminalBox title="ROSTER">
              <div className="space-y-2 text-xs">
                {characters.map((char, i) => (
                  <div key={char.id} className="p-2 border border-[#2a2a30]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#c9a227]">[{i + 1}]</span>
                      <span>{char.portrait}</span>
                      <span className="font-bold">{char.name}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-[#666]">
                      <span>{char.class}</span>
                      <span>LV.{char.level}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[#888]">HP:</span>
                      <span className="text-[#4a9]"> {"█".repeat(Math.floor(char.hp / 10))}</span>
                      <span className="text-[#2a2a30]">{"░".repeat(10 - Math.floor(char.hp / 10))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TerminalBox>
          </div>

          {/* 命令行 */}
          <div className="col-span-12">
            <TerminalBox title="COMMANDS">
              <div className="flex gap-4 text-xs">
                <span className="text-[#4a9eff]">[1]冒险</span>
                <span className="text-[#4a9eff]">[2]战斗</span>
                <span className="text-[#4a9eff]">[3]背包</span>
                <span className="text-[#4a9eff]">[4]角色</span>
                <span className="text-[#4a9eff]">[5]进阶</span>
                <span className="text-[#4a9eff]">[6]记录</span>
                <span className="text-[#c9a227] ml-auto">[ENTER]结算</span>
              </div>
            </TerminalBox>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 辅助组件
// ============================================

interface VariantProps {
  player: typeof mockPlayer;
  characters: typeof mockCharacters;
  buildings: typeof mockBuildings;
}

function PixelResource({ icon, value, color }: { icon: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1a20] border-2 border-[#2a2a30]">
      <span>{icon}</span>
      <span style={{ color }} className="font-bold text-sm">{value}</span>
    </div>
  );
}

function PixelButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="p-3 bg-[#1a1a20] border-4 border-[#2a2a30] hover:border-[#c9a227] transition-colors active:translate-y-0.5">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
    </button>
  );
}

function PixelCharacterCard({ character }: { character: typeof mockCharacters[0] }) {
  const hpPercent = (character.hp / character.maxHp) * 100;
  return (
    <div className="flex items-center gap-2 p-2 bg-[#0a0a0c] border-2 border-[#2a2a30] hover:border-[#4a9] cursor-pointer transition-colors">
      <div className="w-10 h-10 bg-[#1a1a20] border-2 border-[#3a3a40] flex items-center justify-center text-xl">
        {character.portrait}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm truncate">{character.name}</span>
          <span className="text-xs text-[#c9a227]">L{character.level}</span>
        </div>
        <div className="text-xs text-[#666]">{character.class}</div>
        <div className="mt-1 flex items-center gap-1 font-mono text-[10px]">
          <span className="text-[#4a9]">HP</span>
          <span className="text-[#3a3a40]">[</span>
          <span className="text-[#4a9]">{"█".repeat(Math.round(hpPercent / 20))}</span>
          <span className="text-[#2a2a30]">{"░".repeat(5 - Math.round(hpPercent / 20))}</span>
          <span className="text-[#3a3a40]">]</span>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ title, icon, accent, children }: { title: string; icon: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#12121a] border border-[#2a2a30] h-full">
      <div className="px-3 py-2 border-b border-[#2a2a30] flex items-center gap-2" style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
        <span>{icon}</span>
        <span className="text-sm font-bold" style={{ color: accent }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="p-2 bg-[#0a0a0c] border border-[#2a2a30] text-center">
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[#666]">{label}</div>
    </div>
  );
}

function ResourceMini({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="text-center p-2 bg-[#0a0a0c] border border-[#2a2a30]">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{value}</div>
    </div>
  );
}

function TerminalBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#2a2a30] bg-[#0a0a0c]">
      <div className="px-2 py-1 bg-[#1a1a20] border-b border-[#2a2a30] text-xs text-[#c9a227]">
        ┌─[ {title} ]
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function IsometricMapMock({ buildings, fullscreen, ascii }: { buildings: typeof mockBuildings; fullscreen?: boolean; ascii?: boolean }) {
  if (ascii) {
    return (
      <pre className="text-[10px] text-[#4a9] leading-tight">
{`
    ╭───────────────────────────────╮
    │     .   .   🏰   .   .        │
    │   .   🌾   .   ⚒️   .   .    │
    │     .   .   .   .   .        │
    │   🛡️   .   .   .   🏪   .    │
    │     .   .   .   .   .        │
    ╰───────────────────────────────╯
`}
      </pre>
    );
  }

  return (
    <div className={`relative ${fullscreen ? "w-full h-full" : "w-full h-full"} bg-[#0a0a0c]`}>
      {/* 简化的等距网格 */}
      <div className="absolute inset-4 grid grid-cols-5 grid-rows-5 gap-1">
        {Array.from({ length: 25 }).map((_, i) => {
          const x = i % 5;
          const y = Math.floor(i / 5);
          const building = buildings.find((b) => b.x === x && b.y === y);

          return (
            <div
              key={i}
              className={`flex items-center justify-center text-2xl border ${
                building
                  ? "border-[#c9a227]/50 bg-[#1a1a20]"
                  : "border-[#1a1a20] bg-[#0a0a0c]"
              } hover:border-[#c9a227] transition-colors cursor-pointer`}
            >
              {building?.icon ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
