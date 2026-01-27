"use client";

import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Box } from "@react-three/drei";
import * as THREE from "three";

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
    { name: "F: 精炼版", description: "沉浸式+像素装饰+可折叠面板+底部导航" },
    { name: "G: 3D模拟城市", description: "Three.js 3D等距地图，SimCity风格" },
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
        {activeVariant === 5 && <VariantF player={mockPlayer} characters={mockCharacters} buildings={mockBuildings} />}
        {activeVariant === 6 && <VariantG player={mockPlayer} characters={mockCharacters} buildings={mockBuildings} />}
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
// 变体 F: 精炼版 - Refined Immersive
// 沉浸式布局 + 像素装饰 + 可折叠面板 + 底部导航
// ============================================
function VariantF({ player, characters, buildings }: VariantProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0c] relative overflow-hidden pb-16 lg:pb-0">
      {/* 全屏地图背景 */}
      <div className="absolute inset-0 lg:inset-4 lg:bottom-4 flex items-center justify-center">
        <div className="w-full h-full p-4 lg:p-8">
          <IsometricMapMock buildings={buildings} fullscreen />
        </div>
      </div>

      {/* 顶部浮动状态 - 像素装饰 */}
      <div className="absolute top-2 lg:top-4 left-2 lg:left-4 right-2 lg:right-4 flex items-start justify-between pointer-events-none z-10">
        {/* 左上 - 玩家信息 */}
        <div className="pointer-events-auto">
          <PixelFloatingPanel>
            {/* 像素角装饰 */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#c9a227]" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#c9a227]" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#c9a227]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#c9a227]" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-[#c9a227] to-[#8b6914] text-[#0a0a0c] flex items-center justify-center font-bold text-lg lg:text-xl border-2 border-[#8b6914]">
                {player.tier}
              </div>
              <div>
                <div className="text-[#c9a227] font-bold text-sm lg:text-base">{player.name}</div>
                <div className="text-[10px] lg:text-xs text-[#888]">Lv.{player.level} · DAY {player.currentGameDay}</div>
                {/* 体力条 - 像素风格 */}
                <div className="mt-1 flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-[#4a9eff]">⚡</span>
                  <span className="text-[#3a3a40]">[</span>
                  <span className="text-[#4a9eff]">{"█".repeat(Math.floor(player.stamina / 10))}</span>
                  <span className="text-[#1a1a20]">{"░".repeat(10 - Math.floor(player.stamina / 10))}</span>
                  <span className="text-[#3a3a40]">]</span>
                  <span className="text-[#666] hidden lg:inline">{player.stamina}%</span>
                </div>
              </div>
            </div>
          </PixelFloatingPanel>
        </div>

        {/* 右上 - 资源 */}
        <div className="pointer-events-auto">
          <PixelFloatingPanel>
            <div className="flex gap-3 lg:gap-4 text-xs lg:text-sm">
              <span className="text-[#c9a227]">🪙 {player.gold}</span>
              <span className="text-[#9b59b6]">💎 {player.crystals}</span>
              <span className="text-[#888] hidden lg:inline">🪵 {player.wood}</span>
            </div>
          </PixelFloatingPanel>
        </div>
      </div>

      {/* 左侧浮动 - 角色 (可折叠, 桌面端) */}
      <div className="hidden lg:block absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto z-10">
        <div className="relative">
          {/* 折叠按钮 */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#1a1a20] border border-[#2a2a30] border-l-0 flex items-center justify-center text-[#666] hover:text-[#c9a227] z-10"
          >
            {leftPanelOpen ? "◀" : "▶"}
          </button>

          <div className={`transition-all duration-300 ${leftPanelOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full pointer-events-none"}`}>
            <PixelFloatingPanel>
              <div className="text-[10px] text-[#c9a227] mb-2 font-mono">[ ROSTER ]</div>
              <div className="space-y-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="w-14 h-14 bg-[#1a1a20] border-2 border-[#2a2a30] flex items-center justify-center text-2xl cursor-pointer hover:border-[#c9a227] transition-colors relative group"
                  >
                    {char.portrait}
                    {/* HP条 */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2a2a30]">
                      <div
                        className="h-full bg-[#4a9]"
                        style={{ width: `${(char.hp / char.maxHp) * 100}%` }}
                      />
                    </div>
                    {/* 工作状态指示 */}
                    {char.status === "working" && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#4a9] border border-[#0a0a0c] rounded-full" />
                    )}
                    {/* 悬停提示 */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#0a0a0c] border border-[#2a2a30] text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {char.name} Lv.{char.level}
                    </div>
                  </div>
                ))}
              </div>
            </PixelFloatingPanel>
          </div>
        </div>
      </div>

      {/* 右侧浮动 - 快速行动 (可折叠, 桌面端) */}
      <div className="hidden lg:block absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto z-10">
        <div className="relative">
          {/* 折叠按钮 */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#1a1a20] border border-[#2a2a30] border-r-0 flex items-center justify-center text-[#666] hover:text-[#c9a227] z-10"
          >
            {rightPanelOpen ? "▶" : "◀"}
          </button>

          <div className={`transition-all duration-300 ${rightPanelOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"}`}>
            <PixelFloatingPanel>
              <div className="text-[10px] text-[#c9a227] mb-2 font-mono">[ ACTIONS ]</div>
              <div className="space-y-2">
                {[
                  { icon: "🗺️", label: "冒险" },
                  { icon: "👹", label: "战斗" },
                  { icon: "🎒", label: "背包" },
                  { icon: "⬆️", label: "进阶" },
                  { icon: "📊", label: "经济" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="w-12 h-12 bg-[#1a1a20] border-2 border-[#2a2a30] flex flex-col items-center justify-center hover:bg-[#c9a227] hover:text-[#0a0a0c] hover:border-[#c9a227] transition-colors group"
                  >
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-[8px] text-[#666] group-hover:text-[#0a0a0c]">{action.label}</span>
                  </button>
                ))}
              </div>
            </PixelFloatingPanel>
          </div>
        </div>
      </div>

      {/* 底部浮动 - 分数 (桌面端) */}
      <div className="hidden lg:block absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
        <PixelFloatingPanel highlight>
          {/* 像素角装饰 */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#c9a227]" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#c9a227]" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#c9a227]" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#c9a227]" />

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] text-[#888] font-mono">TODAY</div>
              <div className="text-2xl font-bold text-[#c9a227]">{player.currentDayScore}</div>
            </div>
            <div className="w-px h-10 bg-[#2a2a30]" />
            <div className="text-center">
              <div className="text-[10px] text-[#888] font-mono">STREAK</div>
              <div className="text-xl font-bold text-[#e67e22]">
                {player.streakDays}<span className="text-sm">🔥</span>
              </div>
            </div>
            <button className="ml-2 px-4 py-2 bg-[#c9a227] text-[#0a0a0c] font-bold hover:bg-[#ddb52f] border-2 border-[#8b6914]">
              结算
            </button>
          </div>
        </PixelFloatingPanel>
      </div>

      {/* 移动端底部导航 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-[#0a0a0c]/95 backdrop-blur border-t-2 border-[#2a2a30]">
          {/* 展开的面板内容 */}
          {activeNav && (
            <div className="p-4 border-b border-[#2a2a30] max-h-[40vh] overflow-y-auto">
              {activeNav === "characters" && (
                <div className="space-y-2">
                  <div className="text-xs text-[#c9a227] font-mono mb-2">[ ROSTER ]</div>
                  {characters.map((char) => (
                    <div key={char.id} className="flex items-center gap-3 p-2 bg-[#1a1a20] border border-[#2a2a30]">
                      <span className="text-2xl">{char.portrait}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{char.name}</div>
                        <div className="text-xs text-[#666]">{char.class} · Lv.{char.level}</div>
                      </div>
                      <div className="text-xs text-[#4a9]">HP {char.hp}/{char.maxHp}</div>
                    </div>
                  ))}
                </div>
              )}
              {activeNav === "actions" && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: "🗺️", label: "冒险" },
                    { icon: "👹", label: "战斗" },
                    { icon: "🎒", label: "背包" },
                    { icon: "⬆️", label: "进阶" },
                    { icon: "📊", label: "经济" },
                    { icon: "📋", label: "记录" },
                    { icon: "👥", label: "角色" },
                    { icon: "🎴", label: "结算" },
                  ].map((a) => (
                    <button key={a.label} className="p-3 bg-[#1a1a20] border border-[#2a2a30] text-center">
                      <div className="text-xl">{a.icon}</div>
                      <div className="text-[10px] text-[#888] mt-1">{a.label}</div>
                    </button>
                  ))}
                </div>
              )}
              {activeNav === "score" && (
                <div className="flex items-center justify-center gap-8 py-4">
                  <div className="text-center">
                    <div className="text-xs text-[#888]">TODAY</div>
                    <div className="text-3xl font-bold text-[#c9a227]">{player.currentDayScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[#888]">STREAK</div>
                    <div className="text-2xl font-bold text-[#e67e22]">{player.streakDays}🔥</div>
                  </div>
                  <button className="px-6 py-3 bg-[#c9a227] text-[#0a0a0c] font-bold">
                    领取结算
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex">
            {[
              { id: "characters", icon: "👥", label: "角色" },
              { id: "actions", icon: "⚡", label: "行动" },
              { id: "score", icon: "🎴", label: "结算" },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveNav(activeNav === nav.id ? null : nav.id)}
                className={`flex-1 py-3 flex flex-col items-center transition-colors ${
                  activeNav === nav.id
                    ? "bg-[#c9a227] text-[#0a0a0c]"
                    : "text-[#888]"
                }`}
              >
                <span className="text-lg">{nav.icon}</span>
                <span className="text-[10px] mt-0.5">{nav.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 辅助组件
// ============================================

function PixelFloatingPanel({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`relative bg-[#0a0a0c]/90 backdrop-blur border-2 p-3 ${highlight ? "border-[#c9a227]" : "border-[#2a2a30]"}`}>
      {children}
    </div>
  );
}

// ============================================
// 变体 G: 3D模拟城市 - SimCity Style 3D
// Three.js 3D等距地图
// ============================================
function VariantG({ player, characters, buildings }: VariantProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<typeof buildings[0] | null>(null);
  const [activeNav, setActiveNav] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0c] relative overflow-hidden pb-16 lg:pb-0">
      {/* 3D Canvas背景 */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [8, 8, 8], fov: 50 }}
          shadows
          style={{ background: "linear-gradient(to bottom, #2a3a4e, #1a1a2e)" }}
        >
          <Suspense fallback={null}>
            {/* 场景雾效 - 增加深度感 */}
            <fog attach="fog" args={["#1a1a2e", 8, 25]} />

            {/* 环境光 - 明亮的整体照明 */}
            <ambientLight intensity={0.6} />

            {/* 半球光 - 模拟天空和地面的颜色反射 */}
            <hemisphereLight
              color="#ffe4c4"
              groundColor="#4a6a4a"
              intensity={0.8}
            />

            {/* 主方向光 - 明亮的太阳光，带阴影 */}
            <directionalLight
              position={[8, 15, 6]}
              intensity={2.0}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-far={30}
              shadow-camera-left={-10}
              shadow-camera-right={10}
              shadow-camera-top={10}
              shadow-camera-bottom={-10}
              shadow-bias={-0.0001}
              color="#fff5e6"
            />

            {/* 补光 - 填充阴影区域 */}
            <directionalLight
              position={[-5, 10, -5]}
              intensity={0.8}
              color="#aaccff"
            />

            {/* 顶部补光 */}
            <directionalLight
              position={[0, 12, 0]}
              intensity={0.5}
              color="#ffffff"
            />

            {/* 点光源 - 温暖的金色光芒 */}
            <pointLight position={[-3, 4, -3]} intensity={0.8} color="#c9a227" distance={15} />

            {/* 边缘光 - 增加轮廓感 */}
            <pointLight position={[5, 3, 5]} intensity={0.5} color="#ffaa66" distance={12} />

            {/* 战争迷雾效果 */}
            <FogOfWar />

            {/* 地面网格 */}
            <IsometricGround />

            {/* 建筑物 */}
            {buildings.map((building) => (
              <Building3D
                key={building.id}
                building={building}
                onClick={() => setSelectedBuilding(building)}
                isSelected={selectedBuilding?.id === building.id}
              />
            ))}

            {/* 轨道控制 */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={5}
              maxDistance={20}
              maxPolarAngle={Math.PI / 2.5}
              minPolarAngle={Math.PI / 6}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 顶部浮动状态 - SimCity风格 */}
      <div className="absolute top-2 lg:top-4 left-2 lg:left-4 right-2 lg:right-4 flex items-start justify-between pointer-events-none z-10">
        {/* 左上 - 玩家信息 */}
        <div className="pointer-events-auto">
          <div className="bg-gradient-to-r from-[#1a1a20]/95 to-[#0a0a0c]/95 backdrop-blur border border-[#c9a227]/50 rounded-sm shadow-lg shadow-[#c9a227]/10">
            <div className="px-3 py-1 bg-[#c9a227] text-[#0a0a0c] text-[10px] font-bold">
              CITY STATUS
            </div>
            <div className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c9a227] to-[#8b6914] text-[#0a0a0c] flex items-center justify-center font-bold text-lg rounded-sm">
                {player.tier}
              </div>
              <div>
                <div className="text-[#c9a227] font-bold text-sm">{player.name}</div>
                <div className="text-[10px] text-[#888]">Level {player.level} · Day {player.currentGameDay}</div>
                {/* 体力条 */}
                <div className="mt-1 w-28 h-2 bg-[#1a1a20] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4a9eff] to-[#59b] rounded-full"
                    style={{ width: `${(player.stamina / player.maxStamina) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右上 - 资源面板 */}
        <div className="pointer-events-auto">
          <div className="bg-gradient-to-l from-[#1a1a20]/95 to-[#0a0a0c]/95 backdrop-blur border border-[#4a9]/50 rounded-sm">
            <div className="px-3 py-1 bg-[#4a9] text-[#0a0a0c] text-[10px] font-bold">
              TREASURY
            </div>
            <div className="p-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1"><span>🪙</span><span className="text-[#c9a227]">{player.gold}</span></div>
              <div className="flex items-center gap-1"><span>💎</span><span className="text-[#9b59b6]">{player.crystals}</span></div>
              <div className="flex items-center gap-1 hidden lg:flex"><span>🪵</span><span className="text-[#8b6914]">{player.wood}</span></div>
              <div className="flex items-center gap-1 hidden lg:flex"><span>🪨</span><span className="text-[#888]">{player.stone}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 选中建筑信息 */}
      {selectedBuilding && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
          <div className="bg-[#0a0a0c]/95 backdrop-blur border border-[#c9a227] rounded-sm p-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedBuilding.icon}</span>
                <div>
                  <div className="font-bold text-[#c9a227]">{selectedBuilding.name}</div>
                  <div className="text-xs text-[#888]">Level {selectedBuilding.level}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="text-[#666] hover:text-[#c9a227]"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-1 text-xs bg-[#c9a227] text-[#0a0a0c] font-bold hover:bg-[#ddb52f]">
                升级
              </button>
              <button className="flex-1 py-1 text-xs bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]">
                详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 左侧浮动 - 角色 (桌面端) */}
      <div className="hidden lg:block absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto z-10">
        <div className="relative">
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="absolute -right-5 top-1/2 -translate-y-1/2 w-5 h-10 bg-[#1a1a20] border border-[#2a2a30] border-l-0 flex items-center justify-center text-[10px] text-[#666] hover:text-[#c9a227] z-10 rounded-r-sm"
          >
            {leftPanelOpen ? "◀" : "▶"}
          </button>

          <div className={`transition-all duration-300 ${leftPanelOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full pointer-events-none"}`}>
            <div className="bg-[#0a0a0c]/95 backdrop-blur border border-[#4a9]/50 rounded-sm">
              <div className="px-3 py-1 bg-[#4a9] text-[#0a0a0c] text-[10px] font-bold">
                CITIZENS
              </div>
              <div className="p-2 space-y-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="w-14 h-14 bg-[#1a1a20] border border-[#2a2a30] flex items-center justify-center text-2xl cursor-pointer hover:border-[#c9a227] hover:bg-[#1a1a20]/80 transition-all relative group rounded-sm"
                  >
                    {char.portrait}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2a2a30] rounded-b-sm overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#4a9] to-[#5ba]"
                        style={{ width: `${(char.hp / char.maxHp) * 100}%` }}
                      />
                    </div>
                    {char.status === "working" && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#4a9] border border-[#0a0a0c] rounded-full animate-pulse" />
                    )}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#0a0a0c] border border-[#2a2a30] text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-sm">
                      <div className="font-bold text-[#c9a227]">{char.name}</div>
                      <div className="text-[#888]">{char.class} Lv.{char.level}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧浮动 - 快速行动 (桌面端) */}
      <div className="hidden lg:block absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto z-10">
        <div className="relative">
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="absolute -left-5 top-1/2 -translate-y-1/2 w-5 h-10 bg-[#1a1a20] border border-[#2a2a30] border-r-0 flex items-center justify-center text-[10px] text-[#666] hover:text-[#c9a227] z-10 rounded-l-sm"
          >
            {rightPanelOpen ? "▶" : "◀"}
          </button>

          <div className={`transition-all duration-300 ${rightPanelOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"}`}>
            <div className="bg-[#0a0a0c]/95 backdrop-blur border border-[#e67e22]/50 rounded-sm">
              <div className="px-3 py-1 bg-[#e67e22] text-[#0a0a0c] text-[10px] font-bold">
                ACTIONS
              </div>
              <div className="p-2 space-y-1">
                {[
                  { icon: "🗺️", label: "冒险", color: "#4a9eff" },
                  { icon: "👹", label: "战斗", color: "#e74c3c" },
                  { icon: "🎒", label: "背包", color: "#8b6914" },
                  { icon: "⬆️", label: "进阶", color: "#9b59b6" },
                  { icon: "📊", label: "经济", color: "#4a9" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="w-12 h-10 bg-[#1a1a20] border border-[#2a2a30] flex flex-col items-center justify-center hover:border-[#c9a227] transition-all rounded-sm group"
                  >
                    <span className="text-base">{action.icon}</span>
                    <span className="text-[8px] text-[#666] group-hover:text-[#c9a227]">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部浮动 - 分数 (桌面端) */}
      <div className="hidden lg:block absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
        <div className="bg-[#0a0a0c]/95 backdrop-blur border border-[#c9a227] rounded-sm overflow-hidden">
          <div className="px-4 py-1 bg-[#c9a227] text-[#0a0a0c] text-[10px] font-bold text-center">
            DAILY PROGRESS
          </div>
          <div className="p-3 flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#c9a227]">{player.currentDayScore}</div>
              <div className="text-[10px] text-[#888]">SCORE</div>
            </div>
            <div className="w-px h-10 bg-[#2a2a30]" />
            <div className="text-center">
              <div className="text-xl font-bold text-[#e67e22]">{player.streakDays}🔥</div>
              <div className="text-[10px] text-[#888]">STREAK</div>
            </div>
            <button className="ml-2 px-4 py-2 bg-gradient-to-r from-[#c9a227] to-[#e6b82a] text-[#0a0a0c] font-bold hover:from-[#ddb52f] hover:to-[#f0c940] rounded-sm">
              结算
            </button>
          </div>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-[#0a0a0c]/95 backdrop-blur border-t border-[#2a2a30]">
          {activeNav && (
            <div className="p-4 border-b border-[#2a2a30] max-h-[40vh] overflow-y-auto">
              {activeNav === "characters" && (
                <div className="space-y-2">
                  {characters.map((char) => (
                    <div key={char.id} className="flex items-center gap-3 p-2 bg-[#1a1a20] border border-[#2a2a30] rounded-sm">
                      <span className="text-2xl">{char.portrait}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{char.name}</div>
                        <div className="text-xs text-[#666]">{char.class} · Lv.{char.level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeNav === "actions" && (
                <div className="grid grid-cols-4 gap-2">
                  {["🗺️冒险", "👹战斗", "🎒背包", "⬆️进阶", "📊经济", "📋记录", "👥角色", "🎴结算"].map((a) => (
                    <button key={a} className="p-3 bg-[#1a1a20] border border-[#2a2a30] rounded-sm text-center">
                      <div className="text-xl">{a.slice(0, 2)}</div>
                      <div className="text-[10px] text-[#888] mt-1">{a.slice(2)}</div>
                    </button>
                  ))}
                </div>
              )}
              {activeNav === "score" && (
                <div className="flex items-center justify-center gap-8 py-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#c9a227]">{player.currentDayScore}</div>
                    <div className="text-xs text-[#888]">TODAY</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#e67e22]">{player.streakDays}🔥</div>
                    <div className="text-xs text-[#888]">STREAK</div>
                  </div>
                  <button className="px-6 py-3 bg-[#c9a227] text-[#0a0a0c] font-bold rounded-sm">
                    结算
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex">
            {[
              { id: "characters", icon: "👥", label: "角色" },
              { id: "actions", icon: "⚡", label: "行动" },
              { id: "score", icon: "🎴", label: "结算" },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveNav(activeNav === nav.id ? null : nav.id)}
                className={`flex-1 py-3 flex flex-col items-center transition-colors ${
                  activeNav === nav.id ? "bg-[#c9a227] text-[#0a0a0c]" : "text-[#888]"
                }`}
              >
                <span className="text-lg">{nav.icon}</span>
                <span className="text-[10px] mt-0.5">{nav.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 3D 地面网格 - 带阴影接收
function IsometricGround() {
  return (
    <group>
      {/* 主地面 - 接收阴影，更亮的颜色 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#2a4a2a" roughness={0.85} />
      </mesh>

      {/* 网格线 - 更明显 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <group key={`grid-${i}`}>
          {/* X方向 */}
          <Box args={[10, 0.02, 0.02]} position={[0, 0.005, i - 2.5]}>
            <meshStandardMaterial color="#3a5a3a" roughness={0.8} />
          </Box>
          {/* Z方向 */}
          <Box args={[0.02, 0.02, 10]} position={[i - 2.5, 0.005, 0]}>
            <meshStandardMaterial color="#3a5a3a" roughness={0.8} />
          </Box>
        </group>
      ))}

      {/* 草地贴片 - 更亮的绿色 */}
      {Array.from({ length: 25 }).map((_, i) => {
        const x = (i % 5) - 2;
        const z = Math.floor(i / 5) - 2;
        const heightVar = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.02;
        return (
          <mesh
            key={`grass-${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.01 + heightVar, z]}
            receiveShadow
          >
            <planeGeometry args={[0.88, 0.88]} />
            <meshStandardMaterial
              color={`hsl(${110 + Math.random() * 15}, ${35 + Math.random() * 10}%, ${22 + Math.random() * 8}%)`}
              roughness={0.8}
            />
          </mesh>
        );
      })}

      {/* 装饰性小石头和草丛 */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 3.5 + Math.random() * 1;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <mesh key={`rock-${i}`} position={[x, 0.02, z]} castShadow>
            <sphereGeometry args={[0.04 + Math.random() * 0.03, 6, 6]} />
            <meshStandardMaterial color={`hsl(30, 15%, ${35 + Math.random() * 10}%)`} roughness={0.85} />
          </mesh>
        );
      })}

      {/* 草丛装饰 */}
      {Array.from({ length: 8 }).map((_, i) => {
        const gx = (Math.random() - 0.5) * 4;
        const gz = (Math.random() - 0.5) * 4;
        return (
          <group key={`grass-tuft-${i}`} position={[gx, 0, gz]}>
            {[0, 1, 2].map((j) => (
              <mesh
                key={j}
                position={[(j - 1) * 0.03, 0.03, 0]}
                rotation={[0, j * 0.5, 0.1 * (j - 1)]}
                castShadow
              >
                <coneGeometry args={[0.01, 0.06, 4]} />
                <meshStandardMaterial color="#4a7a3a" roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

// 战争迷雾效果
function FogOfWar() {
  const fogRef = useRef<THREE.Group>(null);

  // 迷雾动画 - 缓慢飘动
  useFrame((state) => {
    if (fogRef.current) {
      fogRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  // 已探索的区域（中心5x5格子是已探索的）
  const exploredTiles = new Set([
    "0,0", "1,0", "0,1", "1,1", "-1,0", "0,-1", "-1,-1", "1,-1", "-1,1",
    "2,0", "0,2", "2,2", "-2,0", "0,-2", "2,-2", "-2,-2", "2,-1", "-2,1",
    "2,1", "-2,-1", "1,2", "-1,2", "1,-2", "-1,-2"
  ]);

  return (
    <group ref={fogRef}>
      {/* 边缘迷雾墙 - 围绕已探索区域 */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        const radius = 4.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 1.5 + Math.sin(i * 0.5) * 0.5;

        return (
          <mesh
            key={`fog-wall-${i}`}
            position={[x, height / 2, z]}
          >
            <boxGeometry args={[1.2, height, 0.8]} />
            <meshStandardMaterial
              color="#1a1a2e"
              transparent
              opacity={0.7 + Math.sin(i * 0.3) * 0.15}
              roughness={1}
            />
          </mesh>
        );
      })}

      {/* 未探索区域覆盖 - 外圈格子 */}
      {Array.from({ length: 49 }).map((_, i) => {
        const gx = (i % 7) - 3;
        const gz = Math.floor(i / 7) - 3;
        const key = `${gx},${gz}`;

        // 跳过已探索区域
        if (exploredTiles.has(key)) return null;

        return (
          <group key={`unexplored-${i}`} position={[gx, 0, gz]}>
            {/* 黑暗覆盖 */}
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.95, 0.95]} />
              <meshStandardMaterial
                color="#0a0a0c"
                transparent
                opacity={0.85}
                roughness={1}
              />
            </mesh>

            {/* 迷雾粒子 */}
            <mesh position={[0, 0.3 + Math.random() * 0.2, 0]}>
              <sphereGeometry args={[0.15 + Math.random() * 0.1, 8, 8]} />
              <meshStandardMaterial
                color="#2a2a3e"
                transparent
                opacity={0.5}
                roughness={1}
              />
            </mesh>
          </group>
        );
      })}

      {/* 边缘过渡迷雾 - 已探索区域边界的柔和过渡 */}
      {([
        [-2.5, 0], [2.5, 0], [0, -2.5], [0, 2.5],
        [-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5],
        [-2.5, 1], [-2.5, -1], [2.5, 1], [2.5, -1],
        [1, -2.5], [-1, -2.5], [1, 2.5], [-1, 2.5],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={`edge-fog-${i}`} position={[x, 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 1.2]} />
          <meshStandardMaterial
            color="#1a1a2e"
            transparent
            opacity={0.4}
            roughness={1}
          />
        </mesh>
      ))}

      {/* 飘动的迷雾球体 */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 5 + Math.sin(i) * 0.5;

        return (
          <mesh
            key={`fog-cloud-${i}`}
            position={[Math.cos(angle) * radius, 0.8 + Math.sin(i * 0.7) * 0.4, Math.sin(angle) * radius]}
          >
            <sphereGeometry args={[0.4 + Math.sin(i) * 0.15, 8, 8]} />
            <meshStandardMaterial
              color="#1a1a2e"
              transparent
              opacity={0.5}
              roughness={1}
            />
          </mesh>
        );
      })}

      {/* 神秘光点 - 暗示未探索区域有东西 */}
      {([[-3, -3], [3, 3], [-3, 3], [3, -3]] as [number, number][]).map(([x, z], i) => (
        <pointLight
          key={`mystery-light-${i}`}
          position={[x, 0.5, z]}
          intensity={0.15}
          color="#9b59b6"
          distance={2}
        />
      ))}
    </group>
  );
}

// 3D 建筑组件 - 详细版
function Building3D({ building, onClick, isSelected }: {
  building: typeof mockBuildings[0];
  onClick: () => void;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const x = building.x - 2;
  const z = building.y - 2;

  // 悬浮动画
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.03;
    } else if (groupRef.current) {
      groupRef.current.position.y = 0;
    }
  });

  // 根据建筑类型渲染不同的3D模型
  const renderBuilding = () => {
    switch (building.icon) {
      case "🏰": return <CastleModel level={building.level} isSelected={isSelected} />;
      case "🌾": return <FarmModel level={building.level} isSelected={isSelected} />;
      case "⚒️": return <BlacksmithModel level={building.level} isSelected={isSelected} />;
      case "🛡️": return <BarracksModel level={building.level} isSelected={isSelected} />;
      case "🏪": return <MarketModel level={building.level} isSelected={isSelected} />;
      default: return <GenericBuildingModel level={building.level} isSelected={isSelected} />;
    }
  };

  return (
    <group position={[x, 0, z]} onClick={onClick}>
      <group ref={groupRef}>
        {renderBuilding()}
      </group>

      {/* 选中高亮环 */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#c9a227" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

// 城堡模型 - 圆形塔楼 + 穹顶设计
function CastleModel({ level, isSelected }: { level: number; isSelected: boolean }) {
  const baseHeight = 0.4 + level * 0.12;
  const towerHeight = baseHeight * 1.5;
  const towerRadius = 0.1;

  return (
    <group>
      {/* 主体 - 带圆角的城堡主楼 */}
      <mesh position={[0, baseHeight / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.45, baseHeight, 0.45]} />
        <meshStandardMaterial
          color="#b8956a"
          roughness={0.7}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 城墙顶部城垛 */}
      {Array.from({ length: 4 }).map((_, side) => {
        const positions: [number, number, number][] = side < 2
          ? Array.from({ length: 3 }).map((_, i) => [(i - 1) * 0.15, 0, side === 0 ? 0.24 : -0.24] as [number, number, number])
          : Array.from({ length: 3 }).map((_, i) => [side === 2 ? 0.24 : -0.24, 0, (i - 1) * 0.15] as [number, number, number]);
        return positions.map((pos, i) => (
          <Box
            key={`merlon-${side}-${i}`}
            args={[0.08, 0.06, 0.08]}
            position={[pos[0], baseHeight + 0.05, pos[2]]}
            castShadow
          >
            <meshStandardMaterial color="#9a8560" roughness={0.75} />
          </Box>
        ));
      })}

      {/* 四角圆形塔楼 */}
      {([[- 0.24, -0.24], [-0.24, 0.24], [0.24, -0.24], [0.24, 0.24]] as [number, number][]).map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          {/* 圆柱形塔身 */}
          <mesh position={[0, towerHeight / 2 + 0.02, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[towerRadius, towerRadius * 1.1, towerHeight, 16]} />
            <meshStandardMaterial color="#8a7545" roughness={0.65} />
          </mesh>

          {/* 圆锥形尖顶 */}
          <mesh position={[0, towerHeight + 0.14, 0]} castShadow>
            <coneGeometry args={[towerRadius * 1.3, 0.25, 16]} />
            <meshStandardMaterial color="#c9a227" roughness={0.4} metalness={0.3} />
          </mesh>

          {/* 顶部球形装饰 */}
          <mesh position={[0, towerHeight + 0.3, 0]} castShadow>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial color="#ffd700" metalness={0.6} roughness={0.2} />
          </mesh>

          {/* 拱形窗户 */}
          <group position={[0, towerHeight * 0.65, towerRadius + 0.01]} rotation={[0, (i % 2) * Math.PI, 0]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.025, 0.04, 4, 8]} />
              <meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.6} />
            </mesh>
          </group>

          {/* 底部石环 */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <torusGeometry args={[towerRadius * 1.1, 0.02, 8, 16]} />
            <meshStandardMaterial color="#6a5a3a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 拱形城门 */}
      <group position={[0, 0, 0.24]}>
        <mesh castShadow>
          <boxGeometry args={[0.14, 0.16, 0.04]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>
        {/* 拱顶 */}
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.001, 4, 8]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>
      </group>

      {/* 中央穹顶 */}
      <group position={[0, baseHeight + 0.02, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#8b7355" roughness={0.6} />
        </mesh>
        {/* 穹顶上的旗杆 */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.35, 8]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.7} />
        </mesh>
        {/* 旗帜 - 飘动效果 */}
        <mesh position={[0.08, 0.28, 0]} castShadow>
          <planeGeometry args={[0.14, 0.09]} />
          <meshStandardMaterial color="#c9a227" side={THREE.DoubleSide} roughness={0.5} />
        </mesh>
      </group>

      {/* 等级指示灯 - 根据等级数量 */}
      {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
        <mesh key={`light-${i}`} position={[0.18, 0.1 + i * 0.08, 0.24]} castShadow>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial
            color="#4a9eff"
            emissive="#4a9eff"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// 农田模型 - 田地+圆顶谷仓+风车
function FarmModel({ level, isSelected }: { level: number; isSelected: boolean }) {
  const barnHeight = 0.25 + level * 0.05;
  const windmillRef = useRef<THREE.Group>(null);

  // 风车旋转动画
  useFrame((state) => {
    if (windmillRef.current) {
      windmillRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group>
      {/* 田地地块 - 更丰富的土壤纹理 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial color="#4a6830" roughness={0.95} />
      </mesh>

      {/* 犁过的田垄 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`furrow-${i}`} position={[-0.3 + i * 0.15, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.08, 0.7]} />
          <meshStandardMaterial color="#3a5020" roughness={0.9} />
        </mesh>
      ))}

      {/* 作物 - 更有机的形状 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={i} position={[-0.25 + i * 0.17, 0, -0.1]}>
          {Array.from({ length: 3 }).map((_, j) => {
            const cropHeight = 0.06 + Math.random() * 0.06 + level * 0.015;
            return (
              <group key={j} position={[0, 0, j * 0.14]}>
                {/* 茎 */}
                <mesh position={[0, cropHeight / 2 + 0.02, 0]} castShadow>
                  <cylinderGeometry args={[0.008, 0.012, cropHeight, 6]} />
                  <meshStandardMaterial color="#5a7030" roughness={0.8} />
                </mesh>
                {/* 麦穗/果实 */}
                <mesh position={[0, cropHeight + 0.04, 0]} castShadow>
                  <sphereGeometry args={[0.025, 8, 8]} />
                  <meshStandardMaterial color={`hsl(${40 + Math.random() * 15}, 75%, ${50 + Math.random() * 15}%)`} roughness={0.7} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}

      {/* 圆顶谷仓 */}
      <group position={[0.25, 0, 0.25]}>
        {/* 谷仓主体 */}
        <mesh position={[0, barnHeight / 2 + 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, barnHeight, 0.18]} />
          <meshStandardMaterial
            color="#8b5530"
            roughness={0.75}
            emissive={isSelected ? "#c9a227" : "#000"}
            emissiveIntensity={isSelected ? 0.15 : 0}
          />
        </mesh>

        {/* 圆弧屋顶 */}
        <mesh position={[0, barnHeight + 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.09, 0.2, 8, 16]} />
          <meshStandardMaterial color="#a05a28" roughness={0.7} />
        </mesh>

        {/* 拱形门 */}
        <group position={[0, 0.06, 0.1]}>
          <mesh castShadow>
            <boxGeometry args={[0.07, 0.1, 0.02]} />
            <meshStandardMaterial color="#3a2515" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.035, 0.001, 4, 8]} />
            <meshStandardMaterial color="#3a2515" roughness={0.9} />
          </mesh>
        </group>

        {/* 圆窗 */}
        <mesh position={[0, barnHeight * 0.7, 0.1]} castShadow>
          <circleGeometry args={[0.025, 12]} />
          <meshStandardMaterial color="#ffd070" emissive="#ffa500" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* 风车 (level >= 2) */}
      {level >= 2 && (
        <group position={[-0.25, 0, 0.3]}>
          {/* 塔身 - 圆柱形 */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.35, 12]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
          </mesh>

          {/* 圆顶 */}
          <mesh position={[0, 0.38, 0]} castShadow>
            <sphereGeometry args={[0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#8b6040" roughness={0.6} />
          </mesh>

          {/* 旋转的风车叶片 */}
          <group ref={windmillRef} position={[0, 0.3, 0.05]}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.02, 0.12, 0.01]} />
                <meshStandardMaterial color="#c9b896" roughness={0.6} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* 水井 (level >= 3) */}
      {level >= 3 && (
        <group position={[-0.3, 0, -0.25]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
            <meshStandardMaterial color="#6a6a6a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.04, 12]} />
            <meshStandardMaterial color="#3a5a8a" roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// 铁匠铺模型 - 圆形烟囱+发光熔炉+详细铁砧
function BlacksmithModel({ level, isSelected }: { level: number; isSelected: boolean }) {
  const height = 0.3 + level * 0.08;
  const smokeRef = useRef<THREE.Group>(null);

  // 烟雾漂浮动画
  useFrame((state) => {
    if (smokeRef.current) {
      smokeRef.current.children.forEach((smoke, i) => {
        smoke.position.y = 0.3 + i * 0.08 + Math.sin(state.clock.elapsedTime + i) * 0.02;
        smoke.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.1);
      });
    }
  });

  return (
    <group>
      {/* 主体建筑 - 石砖质感 */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.48, height, 0.38]} />
        <meshStandardMaterial
          color="#5a5560"
          roughness={0.85}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 木质斜屋顶 */}
      <mesh position={[0, height + 0.06, 0]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.54, 0.08, 0.44]} />
        <meshStandardMaterial color="#4a3a30" roughness={0.8} />
      </mesh>

      {/* 屋檐 */}
      <mesh position={[0, height + 0.02, 0.22]} castShadow>
        <boxGeometry args={[0.56, 0.03, 0.06]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.85} />
      </mesh>

      {/* 圆形石烟囱 */}
      <group position={[0.15, height, -0.1]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.07, 0.3, 12]} />
          <meshStandardMaterial color="#4a4550" roughness={0.9} />
        </mesh>
        {/* 烟囱顶环 */}
        <mesh position={[0, 0.32, 0]} castShadow>
          <torusGeometry args={[0.055, 0.015, 8, 12]} />
          <meshStandardMaterial color="#3a3540" roughness={0.85} />
        </mesh>

        {/* 动态烟雾 */}
        <group ref={smokeRef}>
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={i} position={[0, 0.35 + i * 0.1, 0]}>
              <sphereGeometry args={[0.025 + i * 0.012, 8, 8]} />
              <meshStandardMaterial color="#999" transparent opacity={0.35 - i * 0.08} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 发光锻造炉 */}
      <group position={[0, 0.1, 0.2]}>
        {/* 炉口 */}
        <mesh castShadow>
          <boxGeometry args={[0.14, 0.12, 0.04]} />
          <meshStandardMaterial color="#2a2025" roughness={0.9} />
        </mesh>
        {/* 火焰光芒 */}
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.1, 0.08]} />
          <meshStandardMaterial
            color="#ff6600"
            emissive="#ff4400"
            emissiveIntensity={1.2}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* 点光源模拟火焰照明 */}
        <pointLight position={[0, 0, 0.1]} intensity={0.5} color="#ff6600" distance={1} />
      </group>

      {/* 详细铁砧 */}
      <group position={[-0.22, 0, 0.28]}>
        {/* 底座 - 木桩 */}
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.055, 0.09, 8]} />
          <meshStandardMaterial color="#5a4530" roughness={0.9} />
        </mesh>
        {/* 铁砧主体 */}
        <mesh position={[0, 0.11, 0]} castShadow>
          <boxGeometry args={[0.06, 0.04, 0.05]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* 铁砧角 */}
        <mesh position={[0.04, 0.12, 0]} castShadow>
          <coneGeometry args={[0.015, 0.04, 8]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>

      {/* 武器架 (level >= 2) */}
      {level >= 2 && (
        <group position={[-0.28, 0, 0]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.02, 0.22, 0.08]} />
            <meshStandardMaterial color="#5a4030" roughness={0.85} />
          </mesh>
          {/* 挂着的剑 */}
          <mesh position={[0.02, 0.15, 0]} rotation={[0, 0, 0.2]} castShadow>
            <capsuleGeometry args={[0.008, 0.1, 4, 8]} />
            <meshStandardMaterial color="#8a8a9a" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* 冷却水桶 (level >= 3) */}
      {level >= 3 && (
        <group position={[0.22, 0, 0.28]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.035, 0.08, 12]} />
            <meshStandardMaterial color="#6a5540" roughness={0.8} />
          </mesh>
          {/* 水面 */}
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.035, 12]} />
            <meshStandardMaterial color="#4a6a8a" roughness={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// 兵营模型 - 圆形瞭望塔+军事风格
function BarracksModel({ level, isSelected }: { level: number; isSelected: boolean }) {
  const height = 0.35 + level * 0.08;
  const flagRef = useRef<THREE.Mesh>(null);

  // 旗帜飘动动画
  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });

  return (
    <group>
      {/* 主建筑 - 石砖军营 */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, height, 0.32]} />
        <meshStandardMaterial
          color="#4a5565"
          roughness={0.8}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 屋顶 - 带坡度 */}
      <mesh position={[0, height + 0.05, 0]} castShadow>
        <boxGeometry args={[0.56, 0.06, 0.36]} />
        <meshStandardMaterial color="#3a4552" roughness={0.75} />
      </mesh>

      {/* 屋脊 */}
      <mesh position={[0, height + 0.1, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.04, 0.04, 0.38]} />
        <meshStandardMaterial color="#2a3542" roughness={0.8} />
      </mesh>

      {/* 拱形窗户 */}
      {[-0.16, 0, 0.16].map((wx, i) => (
        <group key={i} position={[wx, height * 0.55, 0.17]}>
          <mesh castShadow>
            <boxGeometry args={[0.055, 0.07, 0.02]} />
            <meshStandardMaterial color="#2a3545" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.035, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.0275, 0.001, 4, 8]} />
            <meshStandardMaterial color="#2a3545" roughness={0.9} />
          </mesh>
          {/* 窗户光 */}
          <mesh position={[0, 0, 0.011]}>
            <planeGeometry args={[0.04, 0.05]} />
            <meshStandardMaterial color="#ffd080" emissive="#ffa040" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* 拱形大门 */}
      <group position={[0, 0.1, 0.17]}>
        <mesh castShadow>
          <boxGeometry args={[0.11, 0.16, 0.02]} />
          <meshStandardMaterial color="#2a2535" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.001, 4, 8]} />
          <meshStandardMaterial color="#2a2535" roughness={0.9} />
        </mesh>
        {/* 门环 */}
        <mesh position={[0.03, 0.02, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.015, 0.004, 6, 12]} />
          <meshStandardMaterial color="#8a7a50" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* 圆形瞭望塔 */}
      <group position={[0.28, 0, 0]}>
        {/* 塔身 */}
        <mesh position={[0, (height + 0.15) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, height + 0.15, 12]} />
          <meshStandardMaterial color="#4a5060" roughness={0.75} />
        </mesh>

        {/* 塔顶平台 */}
        <mesh position={[0, height + 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.1, 0.04, 12]} />
          <meshStandardMaterial color="#3a4050" roughness={0.8} />
        </mesh>

        {/* 城垛 */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.1, height + 0.2, Math.sin(angle) * 0.1]}
              castShadow
            >
              <boxGeometry args={[0.03, 0.05, 0.03]} />
              <meshStandardMaterial color="#3a4050" roughness={0.8} />
            </mesh>
          );
        })}

        {/* 圆锥顶 */}
        <mesh position={[0, height + 0.32, 0]} castShadow>
          <coneGeometry args={[0.1, 0.15, 12]} />
          <meshStandardMaterial color="#8a2530" roughness={0.6} />
        </mesh>
      </group>

      {/* 旗杆和飘动的旗帜 */}
      <group position={[-0.2, height + 0.04, 0]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.3, 8]} />
          <meshStandardMaterial color="#4a4540" roughness={0.7} />
        </mesh>
        {/* 旗帜顶球 */}
        <mesh position={[0, 0.32, 0]} castShadow>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#c9a227" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* 飘动的旗帜 */}
        <mesh ref={flagRef} position={[0.06, 0.26, 0]} castShadow>
          <planeGeometry args={[0.12, 0.07]} />
          <meshStandardMaterial color="#8a2530" side={THREE.DoubleSide} roughness={0.6} />
        </mesh>
      </group>

      {/* 武器架 */}
      <group position={[-0.32, 0, 0.08]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.03, 0.18, 0.06]} />
          <meshStandardMaterial color="#5a4535" roughness={0.85} />
        </mesh>
        {/* 长矛 */}
        <mesh position={[0.02, 0.12, 0]} rotation={[0.1, 0, 0.15]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.8} />
        </mesh>
        {/* 矛头 */}
        <mesh position={[0.035, 0.22, -0.01]} rotation={[0.1, 0, 0.15]} castShadow>
          <coneGeometry args={[0.012, 0.03, 6]} />
          <meshStandardMaterial color="#8a8a9a" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* 训练假人 (level >= 2) */}
      {level >= 2 && (
        <group position={[-0.32, 0, -0.12]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.02, 0.15, 8]} />
            <meshStandardMaterial color="#8a7560" roughness={0.9} />
          </mesh>
          {/* 头 */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#c9b590" roughness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// 市场模型 - 圆顶帐篷+丰富货摊
function MarketModel({ level, isSelected }: { level: number; isSelected: boolean }) {
  const lanternRef = useRef<THREE.Group>(null);

  // 灯笼摇摆动画
  useFrame((state) => {
    if (lanternRef.current) {
      lanternRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  return (
    <group>
      {/* 铺装地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[0.42, 16]} />
        <meshStandardMaterial color="#7a6a55" roughness={0.9} />
      </mesh>

      {/* 内圈地砖 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} receiveShadow>
        <ringGeometry args={[0.15, 0.38, 16]} />
        <meshStandardMaterial color="#6a5a48" roughness={0.85} />
      </mesh>

      {/* 主帐篷 - 圆顶设计 */}
      <group position={[0, 0, 0]}>
        {/* 圆形支柱 */}
        {([[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]] as [number, number][]).map(([px, pz], i) => (
          <mesh key={i} position={[px, 0.17, pz]} castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.32, 8]} />
            <meshStandardMaterial color="#6a5035" roughness={0.8} />
          </mesh>
        ))}

        {/* 布帘式圆顶 */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <sphereGeometry args={[0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#9b59b6"
            roughness={0.6}
            side={THREE.DoubleSide}
            emissive={isSelected ? "#c9a227" : "#000"}
            emissiveIntensity={isSelected ? 0.15 : 0}
          />
        </mesh>

        {/* 顶部装饰球 */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#c9a227" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* 条纹装饰 */}
        {Array.from({ length: 4 }).map((_, i) => {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.2, 0.35, Math.sin(angle) * 0.2]}
              rotation={[Math.PI / 4, angle, 0]}
              castShadow
            >
              <planeGeometry args={[0.15, 0.25]} />
              <meshStandardMaterial color="#7a3996" side={THREE.DoubleSide} roughness={0.7} />
            </mesh>
          );
        })}
      </group>

      {/* 主货摊 - 圆形桌面 */}
      <group position={[0, 0, 0]}>
        {/* 圆形展示台 */}
        <mesh position={[0, 0.07, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.16, 0.1, 12]} />
          <meshStandardMaterial color="#8b6520" roughness={0.75} />
        </mesh>

        {/* 货物 - 各种形状 */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 0.1;
          const colors = ["#c9a227", "#e67e22", "#4a9", "#e74c3c", "#9b59b6", "#3498db"];
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius]}
              castShadow
            >
              <sphereGeometry args={[0.025 + (i % 3) * 0.005, 8, 8]} />
              <meshStandardMaterial color={colors[i]} roughness={0.5} />
            </mesh>
          );
        })}

        {/* 中央大货物 */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <dodecahedronGeometry args={[0.04, 0]} />
          <meshStandardMaterial color="#c9a227" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>

      {/* 货物箱堆 */}
      <group position={[-0.28, 0, 0.18]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.09, 0.08, 0.09]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.85} />
        </mesh>
        <mesh position={[0.08, 0.04, 0.02]} castShadow>
          <boxGeometry args={[0.07, 0.06, 0.07]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
        </mesh>
        <mesh position={[0.04, 0.1, 0]} castShadow>
          <boxGeometry args={[0.06, 0.05, 0.06]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
        </mesh>
      </group>

      {/* 布袋 */}
      <group position={[0.28, 0, -0.18]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#c9b896" roughness={0.9} />
        </mesh>
        <mesh position={[-0.06, 0.035, 0.02]} castShadow>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#b9a886" roughness={0.9} />
        </mesh>
      </group>

      {/* 挂灯笼 (level >= 2) */}
      {level >= 2 && (
        <group ref={lanternRef} position={[0.2, 0.35, 0.2]}>
          {/* 灯笼绳 */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.08, 4]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
          {/* 灯笼体 */}
          <mesh position={[0, -0.02, 0]} castShadow>
            <sphereGeometry args={[0.035, 8, 12]} />
            <meshStandardMaterial
              color="#ff6633"
              emissive="#ff4400"
              emissiveIntensity={0.6}
              transparent
              opacity={0.85}
            />
          </mesh>
          <pointLight position={[0, -0.02, 0]} intensity={0.3} color="#ff6633" distance={0.8} />
        </group>
      )}

      {/* 招牌 (level >= 3) */}
      {level >= 3 && (
        <group position={[0, 0.55, 0.25]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.08, 0.02]} />
            <meshStandardMaterial color="#5a4030" roughness={0.8} />
          </mesh>
          {/* 金色装饰 */}
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[0.16, 0.05]} />
            <meshStandardMaterial color="#c9a227" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// 通用建筑模型 - 带穹顶和圆窗
function GenericBuildingModel({ level, isSelected }: { level: number; isSelected: boolean }) {
  const height = 0.3 + level * 0.1;

  return (
    <group>
      {/* 主体 */}
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.45, height, 0.45]} />
        <meshStandardMaterial
          color="#6a6a72"
          roughness={0.75}
          emissive={isSelected ? "#c9a227" : "#000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* 圆顶 */}
      <mesh position={[0, height + 0.02, 0]} castShadow>
        <sphereGeometry args={[0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5a5a62" roughness={0.7} />
      </mesh>

      {/* 顶部装饰 */}
      <mesh position={[0, height + 0.15, 0]} castShadow>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* 圆形窗户 */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(angle) * 0.24,
            height * 0.55,
            Math.cos(angle) * 0.24,
          ]}
          rotation={[0, angle, 0]}
          castShadow
        >
          <circleGeometry args={[0.04, 12]} />
          <meshStandardMaterial color="#ffd080" emissive="#ffa040" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* 入口 */}
      <group position={[0, 0.08, 0.24]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.14, 0.02]} />
          <meshStandardMaterial color="#3a3a42" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.001, 4, 8]} />
          <meshStandardMaterial color="#3a3a42" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

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
