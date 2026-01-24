"use client";

// 游戏主页面 - 基于 VariantG 设计
import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

// 导入游戏组件
import IsometricMap from "~/components/game/IsometricMap";
import {
  CharacterDetailPanel,
  BuildingDetailPanel,
  EconomyPanel,
  MilitaryPanel,
  SettlementPanel,
} from "~/components/game/panels";

// 建筑位置映射
const BUILDING_POSITIONS: Record<string, { x: number; y: number }> = {
  "主城堡": { x: 2, y: 2 },
  "农田": { x: 1, y: 1 },
  "铁匠铺": { x: 3, y: 1 },
  "兵营": { x: 1, y: 3 },
  "市场": { x: 3, y: 3 },
  "传送门": { x: 4, y: 4 },
  "矿场": { x: 0, y: 2 },
  "伐木场": { x: 2, y: 0 },
  "卡牌祭坛": { x: 4, y: 2 },
};

export default function GamePage() {
  const [selectedBuilding, setSelectedBuilding] = useState<ReturnType<typeof transformBuilding> | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<ReturnType<typeof transformCharacter> | null>(null);
  const [showBuildingPanel, setShowBuildingPanel] = useState(false);
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  const [showEconomyPanel, setShowEconomyPanel] = useState(false);
  const [showMilitaryPanel, setShowMilitaryPanel] = useState(false);
  const [showSettlementPanel, setShowSettlementPanel] = useState(false);
  const [exploreMessage, setExploreMessage] = useState<string | null>(null);

  // 获取玩家数据
  const { data: player, isLoading, error } = api.player.getStatus.useQuery();

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <div className="text-[#888]">加载中...</div>
        </div>
      </div>
    );
  }

  // 未登录
  if (error?.data?.code === "UNAUTHORIZED" || !player) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="text-center max-w-md p-8 border border-[#3d3529] bg-[#12110d]">
          <div className="text-6xl mb-4">🏰</div>
          <h1 className="text-2xl text-[#c9a227] mb-2">诸天领域</h1>
          <p className="text-[#888] mb-6">请先登录</p>
          <Link
            href="/login?callbackUrl=/game"
            className="inline-block px-8 py-3 bg-[#c9a227] text-[#0a0a08] font-medium hover:bg-[#ddb52f]"
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  // 转换建筑数据为设计Lab格式
  const buildingsData = player.buildings.map(transformBuilding);

  // 转换角色数据为设计Lab格式
  const charactersData = player.characters.map(transformCharacter);

  // 计算体力百分比
  const staminaPercent = (player.stamina / player.maxStamina) * 100;

  // 打开建筑详情
  const handleBuildingClick = (building: { id: number; name: string }) => {
    const fullBuilding = buildingsData.find(b => b.id === building.id);
    if (fullBuilding) {
      setSelectedBuilding(fullBuilding);
      setShowBuildingPanel(true);
    }
  };

  // 打开角色详情
  const handleCharacterClick = (character: ReturnType<typeof transformCharacter>) => {
    setSelectedCharacter(character);
    setShowCharacterPanel(true);
  };

  // 探索
  const handleExplore = (x: number, y: number) => {
    if (player.stamina < 10) {
      setExploreMessage("体力不足！");
      setTimeout(() => setExploreMessage(null), 2000);
      return;
    }
    const results = [
      "发现了一块空地，可以建造建筑！",
      "发现了一些资源：木材 +20",
      "发现了一个神秘宝箱！",
      "这里什么都没有...",
    ];
    const result = results[Math.floor(Math.random() * results.length)];
    setExploreMessage(`探索 (${x},${y}): ${result}`);
    setTimeout(() => setExploreMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-[#e0dcd0] font-mono flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-[#101014] border-b-4 border-[#c9a227]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* 玩家信息 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#c9a227] text-[#08080a] flex items-center justify-center font-bold text-lg">
                {player.tier}
              </div>
              <div>
                <div className="text-[#c9a227] font-bold">{player.name}</div>
                <div className="text-xs text-[#666]">
                  {player.tier}阶领主
                  {player.profession?.profession && ` · ${player.profession.profession.name}`}
                </div>
              </div>
            </div>
          </div>

          {/* 体力条 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#4a9eff]">⚡</span>
              <div className="w-32 h-3 bg-[#1a1a20] relative">
                <div
                  className="h-full bg-[#4a9eff] transition-all"
                  style={{ width: `${staminaPercent}%` }}
                />
              </div>
              <span className="text-sm">
                <span className="text-[#4a9eff] font-bold">{player.stamina}</span>
                <span className="text-[#666]">/{player.maxStamina}</span>
              </span>
            </div>
          </div>

          {/* 当日分数 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666]">今日分数</span>
            <span className="px-2 py-1 bg-[#1a1a20] text-[#c9a227] text-sm font-bold">
              {player.currentDayScore}
            </span>
          </div>
        </div>
      </header>

      {/* 资源条 */}
      <div className="bg-[#0c0c10] border-b border-[#2a2a30]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <ResourceBar icon="🪙" name="金币" value={player.gold} max={5000} color="#c9a227" />
            <ResourceBar icon="🪵" name="木材" value={player.wood} max={1000} color="#8b6914" />
            <ResourceBar icon="🪨" name="石材" value={player.stone} max={500} color="#888" />
            <ResourceBar icon="🍞" name="粮食" value={player.food} max={1000} color="#a67c52" />
            <ResourceBar icon="💎" name="水晶" value={player.crystals} max={100} color="#9b59b6" />
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <main className="flex-1 overflow-y-auto pb-16">
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 左侧 - 等距像素地图 */}
            <div className="lg:col-span-7">
              <DashboardCard title="领地地图" badge={`${buildingsData.length} 建筑`}>
                {exploreMessage && (
                  <div className="px-4 py-2 bg-[#1a1a20] border-b border-[#2a2a30] text-sm animate-pulse">
                    <span className="text-[#4a9]">✨</span> {exploreMessage}
                  </div>
                )}
                <IsometricMap
                  buildings={buildingsData}
                  onBuildingClick={handleBuildingClick}
                  onExplore={handleExplore}
                />
              </DashboardCard>
            </div>

            {/* 右侧 - 信息栏 */}
            <div className="lg:col-span-5 space-y-4">
              {/* 快速行动 */}
              <DashboardCard title="快速行动" compact>
                <div className="grid grid-cols-2 gap-2 p-3">
                  <ActionButton icon="📊" label="经济" sublabel="资源总览" onClick={() => setShowEconomyPanel(true)} />
                  <ActionButton icon="⚔️" label="军事" sublabel="战力部署" onClick={() => setShowMilitaryPanel(true)} />
                  <ActionButton icon="🎴" label="结算" sublabel="今日分数" onClick={() => setShowSettlementPanel(true)} highlight />
                  <ActionButton icon="📦" label="背包" sublabel={`${player.cards.length} 种卡牌`} />
                </div>
              </DashboardCard>

              {/* 角色列表 */}
              <DashboardCard
                title="我的角色"
                badge={`${charactersData.length} 人`}
              >
                {charactersData.length === 0 ? (
                  <div className="p-6 text-center text-[#666]">
                    <div className="text-3xl mb-2">👤</div>
                    <div>暂无角色</div>
                    <div className="text-xs mt-1">使用招募卡获得角色</div>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1a1a20]">
                    {charactersData.map((c) => (
                      <CharacterRow
                        key={c.id}
                        character={c}
                        onClick={() => handleCharacterClick(c)}
                      />
                    ))}
                  </div>
                )}
              </DashboardCard>

              {/* 技能列表 */}
              <DashboardCard
                title="已学技能"
                badge={`${player.learnedSkills.length}/${player.tier * 6}`}
              >
                {player.learnedSkills.length === 0 ? (
                  <div className="p-6 text-center text-[#666]">
                    <div className="text-3xl mb-2">📖</div>
                    <div>暂无技能</div>
                    <div className="text-xs mt-1">使用技能卡学习技能</div>
                  </div>
                ) : (
                  <div className="p-3 flex flex-wrap gap-2">
                    {player.learnedSkills.map((ps) => (
                      <span
                        key={ps.id}
                        className="px-2 py-1 bg-[#1a1a20] border border-[#2a2a30] text-sm"
                        title={ps.skill.description}
                      >
                        {ps.skill.icon} {ps.skill.name} Lv.{ps.level}
                      </span>
                    ))}
                  </div>
                )}
              </DashboardCard>
            </div>
          </div>
        </div>
      </main>

      {/* 底部状态栏 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#101014] border-t-2 border-[#2a2a30] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-[#c9a227]">DAY {player.currentGameDay}</span>
            <span className="text-[#3a3a40]">|</span>
            <span className="text-[#666]">连续达标 {player.streakDays} 天</span>
          </div>
          <div className="flex items-center gap-4 text-[#666]">
            <Link href="/login" className="hover:text-[#c9a227]">切换账号</Link>
          </div>
        </div>
      </footer>

      {/* 建筑详情面板 */}
      {showBuildingPanel && selectedBuilding && (
        <BuildingDetailPanel
          building={selectedBuilding}
          onClose={() => setShowBuildingPanel(false)}
          onUpgrade={() => {
            alert("升级功能开发中");
            setShowBuildingPanel(false);
          }}
        />
      )}

      {/* 角色详情面板 */}
      {showCharacterPanel && selectedCharacter && (
        <CharacterDetailPanel
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          character={selectedCharacter as any}
          onClose={() => setShowCharacterPanel(false)}
        />
      )}

      {/* 经济面板 */}
      {showEconomyPanel && (
        <EconomyPanel
          onClose={() => setShowEconomyPanel(false)}
          onBuildFacility={() => alert("建造设施功能开发中")}
          onAssignWorker={() => alert("分配工人功能开发中")}
          onViewHistory={() => alert("交易记录功能开发中")}
        />
      )}

      {/* 军事面板 */}
      {showMilitaryPanel && (
        <MilitaryPanel
          onClose={() => setShowMilitaryPanel(false)}
          onFormation={() => alert("编队功能开发中")}
          onTrainSoldiers={() => alert("训练士兵功能开发中")}
          onExpedition={() => alert("出征功能开发中")}
          onDefense={() => alert("防御部署功能开发中")}
        />
      )}

      {/* 结算面板 */}
      {showSettlementPanel && (
        <SettlementPanel
          onClose={() => setShowSettlementPanel(false)}
          onCollectRewards={() => {
            alert("奖励已领取！");
            setShowSettlementPanel(false);
          }}
        />
      )}
    </div>
  );
}

// 转换后端建筑数据为设计Lab格式
function transformBuilding(pb: {
  id: string;
  level: number;
  status: string;
  assignedCharId: string | null;
  positionX: number;
  positionY: number;
  building: {
    id: string;
    name: string;
    icon: string;
    description: string;
    slot: string;
    maxLevel: number;
    baseEffects: string;
  };
}) {
  const effects = JSON.parse(pb.building.baseEffects) as Record<string, unknown>;

  return {
    id: parseInt(pb.id.slice(-4), 16) || 1, // 转换为数字ID
    name: pb.building.name,
    level: pb.level,
    maxLevel: pb.building.maxLevel,
    icon: pb.building.icon,
    status: pb.status,
    slot: pb.building.slot,
    description: pb.building.description,
    effects: Object.entries(effects).map(([type, value]) => ({
      type,
      value: String(value),
    })),
    upgradeCost: { gold: pb.level * 100, wood: pb.level * 50 },
    upgradeTime: `${pb.level}小时`,
    dailyOutput: null,
    positionX: pb.positionX,
    positionY: pb.positionY,
  };
}

// 转换后端角色数据为设计Lab格式
function transformCharacter(pc: {
  id: string;
  level: number;
  tier: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  status: string;
  workingAt: string | null;
  character: {
    name: string;
    baseClass: string;
    rarity: string;
    portrait: string;
    description: string;
    story: string | null;
  };
  profession: { profession: { name: string } } | null;
  learnedSkills: Array<{ skill: { name: string; icon: string; description: string }; level: number }>;
}) {
  return {
    id: parseInt(pc.id.slice(-4), 16) || 1,
    name: pc.character.name,
    class: pc.character.baseClass,
    profession: pc.profession?.profession.name ?? null,
    rarity: pc.character.rarity,
    level: pc.level,
    maxLevel: 20,
    exp: 0,
    expToNext: 100,
    status: pc.status,
    workingAt: pc.workingAt,
    hp: pc.hp,
    maxHp: pc.maxHp,
    mp: pc.mp,
    maxMp: pc.maxMp,
    portrait: pc.character.portrait,
    stats: {
      attack: pc.attack,
      defense: pc.defense,
      speed: pc.speed,
      luck: pc.luck,
    },
    description: pc.character.description,
    story: pc.character.story ?? "",
    traits: [],
    affection: 50, // 默认好感度
    skills: pc.learnedSkills.map((s) => ({
      name: s.skill.name,
      level: s.level,
      description: s.skill.description,
      cooldown: 0, // 默认无冷却
    })),
    equipment: {
      mainHand: null,
      offHand: null,
      helmet: null,
      chest: null,
      belt: null,
      gloves: null,
      pants: null,
      boots: null,
      necklace: null,
      ring1: null,
      ring2: null,
    },
  };
}

// 组件
function ResourceBar({ icon, name, value, max, color }: {
  icon: string; name: string; value: number; max: number; color: string;
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

function DashboardCard({ title, badge, compact, children }: {
  title: string; badge?: string; compact?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#101014] border border-[#2a2a30] overflow-hidden">
      <div className={`flex items-center justify-between bg-[#151518] border-b border-[#2a2a30] ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <div className="flex items-center gap-2">
          <span className="text-[#c9a227] font-bold">{title}</span>
          {badge && <span className="text-xs text-[#666] px-2 py-0.5 bg-[#1a1a20]">{badge}</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ActionButton({ icon, label, sublabel, highlight, onClick }: {
  icon: string; label: string; sublabel: string; highlight?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 text-left transition-colors ${highlight ? "bg-[#c9a227] text-[#08080a]" : "bg-[#1a1a20] hover:bg-[#222228]"}`}
    >
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-bold text-sm">{label}</div>
      <div className={`text-xs ${highlight ? "text-[#08080a]/70" : "text-[#666]"}`}>{sublabel}</div>
    </button>
  );
}

function CharacterRow({ character, onClick }: {
  character: ReturnType<typeof transformCharacter>;
  onClick?: () => void;
}) {
  const hpPercent = (character.hp / character.maxHp) * 100;
  const barLength = 10;
  const filled = Math.round((hpPercent / 100) * barLength);

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#151518] cursor-pointer" onClick={onClick}>
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
