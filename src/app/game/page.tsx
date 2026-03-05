"use client";

// 游戏主页面 - Cinematic设计
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

// 导入游戏组件
import OuterCityFullMap from "~/components/game/outer-city";
import {
  CharacterHub,
  InventoryHub,
  AdventureHub,
  ProgressHub,
  LogHub,
  BuildingDetailPanel,
  EconomyPanel,
  CombatPanel,
} from "~/components/game/panels";
import { InnerCityPanel } from "~/components/game/panels/InnerCityPanel";
import { useUnlocks } from "~/hooks/use-unlocks";
import { UnlockToast } from "~/components/game/UnlockToast";
import { HintBar } from "~/components/game/HintBar";
import { GuidancePanel } from "~/components/game/panels/GuidancePanel";

export default function GamePage() {
  // Hub弹窗状态
  const [showCharacterHub, setShowCharacterHub] = useState(false);
  const [characterHubTab, setCharacterHubTab] = useState("list");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const [showInventoryHub, setShowInventoryHub] = useState(false);
  const [inventoryHubTab, setInventoryHubTab] = useState("backpack");

  const [showAdventureHub, setShowAdventureHub] = useState(false);
  const [adventureHubTab, setAdventureHubTab] = useState("exploration");

  const [showProgressHub, setShowProgressHub] = useState(false);
  const [progressHubTab, setProgressHubTab] = useState("profession");

  const [showLogHub, setShowLogHub] = useState(false);
  const [logHubTab, setLogHubTab] = useState("settlement");

  // 独立弹窗状态
  const [showEconomyPanel, setShowEconomyPanel] = useState(false);
  const [showCombatPanel, setShowCombatPanel] = useState(false);
  const [combatLevel, setCombatLevel] = useState(1);
  const [showInnerCityPanel, setShowInnerCityPanel] = useState(false);

  // HUD显示状态
  const [showHUD, setShowHUD] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showGuidancePanel, setShowGuidancePanel] = useState(false);

  // 获取玩家数据
  const { data: player, isLoading, error } = api.player.getStatus.useQuery();
  const unlocks = useUnlocks(player?.unlockedSystems);

  // 获取升级信息
  const { data: levelUpInfo } = api.player.getLevelUpInfo.useQuery(undefined, {
    enabled: !!player,
  });

  // 检查内城是否已初始化
  const { data: innerCityStatus } = api.innerCity.getStatus.useQuery(undefined, {
    enabled: !!player,
  });

  // 未初始化时自动打开内城面板
  useEffect(() => {
    if (innerCityStatus && !innerCityStatus.initialized) {
      setShowInnerCityPanel(true);
    }
  }, [innerCityStatus]);

  // ESC键打开/关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 如果有其他面板打开，先关闭它们
        if (showCharacterHub || showInventoryHub || showAdventureHub || showProgressHub || showLogHub || showEconomyPanel || showCombatPanel || showInnerCityPanel || showGuidancePanel) {
          return; // 让面板自己处理 ESC
        }
        setShowMenu((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCharacterHub, showInventoryHub, showAdventureHub, showProgressHub, showLogHub, showEconomyPanel, showCombatPanel, showInnerCityPanel, showGuidancePanel]);

  const utils = api.useUtils();

  // 升级mutation
  const levelUpMutation = api.player.levelUp.useMutation({
    onSuccess: () => {
      void utils.player.getStatus.invalidate();
      void utils.player.getLevelUpInfo.invalidate();
    },
  });

  const handleHintAction = (action: string) => {
    if (action === "levelUp") {
      levelUpMutation.mutate();
      return;
    }
    const [hub, tab] = action.split(":");
    switch (hub) {
      case "logHub": setLogHubTab(tab ?? "settlement"); setShowLogHub(true); break;
      case "adventureHub": setAdventureHubTab(tab ?? "exploration"); setShowAdventureHub(true); break;
      case "inventoryHub": setInventoryHubTab(tab ?? "backpack"); setShowInventoryHub(true); break;
      case "progressHub": setProgressHubTab(tab ?? "profession"); setShowProgressHub(true); break;
      case "characterHub": setCharacterHubTab(tab ?? "list"); setShowCharacterHub(true); break;
      case "innerCity": setShowInnerCityPanel(true); break;
      case "combat": setCombatLevel(1); setShowCombatPanel(true); break;
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🏰</div>
          <div className="text-[#5a6a7a] text-sm">进入诸天领域...</div>
        </div>
      </div>
    );
  }

  // 未登录
  if (error?.data?.code === "UNAUTHORIZED" || !player) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-[#0a0a15]/80 border border-[#2a3a4a] rounded-lg">
          <div className="text-6xl mb-4">🏰</div>
          <h1 className="text-2xl text-[#c9a227] mb-2">诸天领域</h1>
          <p className="text-[#5a6a7a] mb-6">请先登录以继续游戏</p>
          <Link
            href="/login?callbackUrl=/game"
            className="inline-block px-8 py-3 bg-[#c9a227] text-[#0a0a08] font-medium rounded hover:bg-[#ddb52f] transition-colors"
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  const staminaPercent = (player.stamina / player.maxStamina) * 100;

  return (
    <div className="h-screen bg-[#050810] text-[#e0dcd0] overflow-hidden">
      {/* 全屏Three.js地图 */}
      <div className="absolute inset-0">
        <OuterCityFullMap onOpenInnerCity={() => setShowInnerCityPanel(true)} />
      </div>

      {/* Cinematic HUD Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${showHUD ? "opacity-100" : "opacity-0"}`}>
        {/* Top-left: Player info */}
        <div className="absolute top-4 left-6 pointer-events-auto">
          <div className={`transition-all duration-500 ${showHUD ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c9a227] to-[#8b6914] p-0.5">
                <div className="w-full h-full rounded-full bg-[#0a0a15] flex items-center justify-center">
                  <span className="text-2xl font-black text-[#c9a227]">{player.tier}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[#c9a227] font-bold text-lg tracking-wide">{player.name}</span>
                  {levelUpInfo?.canLevelUp && (
                    <button
                      onClick={() => levelUpMutation.mutate()}
                      disabled={levelUpMutation.isPending}
                      className="px-2 py-0.5 bg-[#c9a227] text-[#08080a] text-[10px] font-bold rounded animate-pulse hover:bg-[#ddb52f] disabled:opacity-50"
                    >
                      升级!
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#5a6a7a]">Lv.{levelUpInfo?.currentLevel ?? 1}</span>
                  <span className="text-[#3a4a5a]">•</span>
                  <span className="text-[#e74c3c]">♥ {player.characters[0]?.hp ?? 100}</span>
                  <span className="text-[#4a9eff]">⚡ {player.stamina}</span>
                </div>
                {/* 经验条 */}
                {levelUpInfo && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-1 bg-[#1a1a20] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#9b59b6] transition-all"
                        style={{ width: `${levelUpInfo.progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-[#5a6a7a]">
                      {levelUpInfo.currentExp}/{levelUpInfo.expNeeded}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top-right: Day & Score */}
        <div className="absolute top-4 right-6 pointer-events-auto">
          <div className={`transition-all duration-500 delay-100 ${showHUD ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}>
            <div className="text-right">
              <div className="text-5xl font-black text-[#c9a227] leading-none">{player.currentGameDay}</div>
              <div className="text-xs text-[#5a6a7a] tracking-widest uppercase">Day</div>
              <div className="mt-2 flex items-center justify-end gap-2 text-sm">
                <span className="text-[#e67e22]">🔥 {player.streakDays}</span>
                <span className="text-[#3a4a5a]">|</span>
                <span className="text-[#c9a227]">⭐ {player.currentDayScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-left: Resources */}
        <div className="absolute bottom-4 left-6 pointer-events-auto">
          <div className={`transition-all duration-500 delay-200 ${showHUD ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="flex gap-4 text-sm">
              {[
                { icon: "🪙", value: player.gold, color: "#c9a227" },
                { icon: "🪵", value: player.wood, color: "#8b6914" },
                { icon: "🪨", value: player.stone, color: "#6a7a8a" },
                { icon: "🍞", value: player.food, color: "#a67c52" },
                { icon: "💎", value: player.crystals, color: "#9b59b6" },
              ].map((res, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span>{res.icon}</span>
                  <span className="font-medium" style={{ color: res.color }}>{res.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            {/* Stamina bar */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[#4a9eff] text-xs">⚡</span>
              <div className="w-32 h-1.5 bg-[#1a1a20] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4a9eff] to-[#2980b9] transition-all"
                  style={{ width: `${staminaPercent}%` }}
                />
              </div>
              <span className="text-xs text-[#5a6a7a]">{player.stamina}/{player.maxStamina}</span>
            </div>
          </div>
        </div>

        {/* Left-center: Hints */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-auto">
          <div className={`transition-all duration-500 delay-250 ${showHUD ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`}>
            {player.hints && (
              <HintBar
                hints={player.hints}
                onHintClick={handleHintAction}
                onShowAll={() => setShowGuidancePanel(true)}
              />
            )}
          </div>
        </div>

        {/* Bottom-right: Quick actions */}
        <div className="absolute bottom-4 right-6 pointer-events-auto">
          <div className={`transition-all duration-500 delay-300 ${showHUD ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="flex gap-2">
              {[
                { icon: "👥", label: "角色", system: "character_list", onClick: () => { setCharacterHubTab("list"); setShowCharacterHub(true); } },
                { icon: "🎒", label: "背包", system: "backpack", onClick: () => { setInventoryHubTab("backpack"); setShowInventoryHub(true); } },
                { icon: "🗺️", label: "冒险", system: "exploration", onClick: () => { setAdventureHubTab("exploration"); setShowAdventureHub(true); } },
                { icon: "⚔️", label: "战斗", system: "combat", onClick: () => { setCombatLevel(1); setShowCombatPanel(true); } },
                { icon: "🏙️", label: "城市", system: "inner_city", onClick: () => setShowInnerCityPanel(true) },
              ].filter(a => unlocks.has(a.system)).map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="w-11 h-11 bg-[#0a0a15]/80 border border-[#2a3a4a] hover:border-[#c9a227] rounded-full flex items-center justify-center transition-all hover:scale-110 group"
                  title={action.label}
                >
                  <span className="text-lg">{action.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom-center: Secondary actions */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className={`transition-all duration-500 delay-150 ${showHUD ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="flex items-center gap-2 bg-[#0a0a15]/60 border border-[#2a3a4a] rounded-full px-3 py-1.5">
              {[
                { icon: "📊", label: "经济", system: "economy", onClick: () => setShowEconomyPanel(true) },
                { icon: "⬆️", label: "进阶", system: "progression", onClick: () => { setProgressHubTab("profession"); setShowProgressHub(true); } },
                { icon: "🎴", label: "结算", system: "log", onClick: () => { setLogHubTab("settlement"); setShowLogHub(true); }, highlight: true },
                { icon: "📋", label: "记录", system: "log", onClick: () => { setLogHubTab("action"); setShowLogHub(true); } },
              ].filter(a => unlocks.has(a.system)).map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                    action.highlight
                      ? "bg-[#c9a227]/20 border border-[#c9a227] text-[#c9a227]"
                      : "hover:bg-[#c9a227]/10"
                  }`}
                  title={action.label}
                >
                  <span className="text-base">{action.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggle HUD button */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => setShowHUD(!showHUD)}
            className="px-4 py-1.5 bg-[#0a0a15]/60 border border-[#2a3a4a] hover:border-[#c9a227] rounded-full text-xs text-[#5a6a7a] hover:text-[#c9a227] transition-all"
          >
            {showHUD ? "隐藏界面 (H)" : "显示界面 (H)"}
          </button>
        </div>

      </div>

      {/* ESC Menu */}
      {showMenu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm">
          <div className="w-80 bg-[#0a0a15]/95 border border-[#2a3a4a] rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-[#2a3a4a] text-center">
              <h2 className="text-xl font-bold text-[#c9a227]">诸天领域</h2>
              <p className="text-xs text-[#5a6a7a] mt-1">按 ESC 返回游戏</p>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-3 bg-[#c9a227]/10 border border-[#c9a227]/30 hover:border-[#c9a227] text-[#c9a227] rounded transition-colors text-sm font-medium"
              >
                继续游戏
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowInnerCityPanel(true); }}
                className="w-full py-3 bg-[#1a1a25] border border-[#2a3a4a] hover:border-[#4a9eff] text-[#e0dcd0] rounded transition-colors text-sm"
              >
                🏙️ 内城管理
              </button>
              <Link
                href="/login"
                className="w-full py-3 bg-[#1a1a25] border border-[#2a3a4a] hover:border-[#4a9eff] text-[#e0dcd0] rounded transition-colors text-sm text-center block"
              >
                🔄 切换账号
              </Link>
              <Link
                href="/"
                className="w-full py-3 bg-[#1a1a25] border border-[#2a3a4a] hover:border-[#e74c3c] text-[#e0dcd0] rounded transition-colors text-sm text-center block"
              >
                🏠 返回主页
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 角色Hub */}
      {showCharacterHub && (
        <CharacterHub
          onClose={() => setShowCharacterHub(false)}
          initialTab={characterHubTab}
          initialCharacterId={selectedCharacterId ?? undefined}
        />
      )}

      {/* 背包Hub */}
      {showInventoryHub && (
        <InventoryHub
          onClose={() => setShowInventoryHub(false)}
          initialTab={inventoryHubTab}
        />
      )}

      {/* 冒险Hub */}
      {showAdventureHub && (
        <AdventureHub
          onClose={() => setShowAdventureHub(false)}
          initialTab={adventureHubTab}
        />
      )}

      {/* 进阶Hub */}
      {showProgressHub && (
        <ProgressHub
          onClose={() => setShowProgressHub(false)}
          initialTab={progressHubTab}
        />
      )}

      {/* 记录Hub */}
      {showLogHub && (
        <LogHub
          onClose={() => setShowLogHub(false)}
          initialTab={logHubTab}
          onResumeCombat={(combatId) => {
            setShowLogHub(false);
            setCombatLevel(1);
            setShowCombatPanel(true);
          }}
        />
      )}

      {/* 经济面板 */}
      {showEconomyPanel && (
        <EconomyPanel onClose={() => setShowEconomyPanel(false)} />
      )}

      {/* 战斗面板 */}
      {showCombatPanel && (
        <CombatPanel
          monsterLevel={combatLevel}
          onClose={() => setShowCombatPanel(false)}
        />
      )}

      {/* 内城面板 */}
      {showInnerCityPanel && player && (
        <InnerCityPanel
          playerId={player.id}
          onClose={() => setShowInnerCityPanel(false)}
        />
      )}

      {/* 引导面板 */}
      {showGuidancePanel && player && (
        <GuidancePanel
          hints={player.hints}
          onClose={() => setShowGuidancePanel(false)}
          onHintClick={handleHintAction}
        />
      )}

      {/* 解锁通知 */}
      {player && <UnlockToast unlockedSystems={player.unlockedSystems} />}
    </div>
  );
}
