"use client";

// 游戏主页面 - Cinematic设计
import { useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

import { RESOURCE_COLORS, STATUS_COLORS } from "~/constants/game-colors";
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
import { useGamePanels } from "~/hooks/use-game-panels";
import { UnlockToast } from "~/components/game/UnlockToast";
import { HintBar } from "~/components/game/HintBar";
import { GuidancePanel } from "~/components/game/panels/GuidancePanel";
import { GameErrorBoundary } from "~/components/game/ErrorBoundary";

export default function GamePage() {
  const panels = useGamePanels();

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
      panels.setShowInnerCityPanel(true);
    }
  }, [innerCityStatus]);

  const utils = api.useUtils();

  // 升级mutation
  const levelUpMutation = api.player.levelUp.useMutation({
    onSuccess: () => {
      void utils.player.getStatus.invalidate();
      void utils.player.getLevelUpInfo.invalidate();
    },
  });

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-center">
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
          <h1 className="font-display text-5xl text-[#c9a227] mb-2">诸天领域</h1>
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
        <GameErrorBoundary fallback={<div className="w-full h-full bg-[#050810] flex items-center justify-center text-[#5a6a7a]">地图加载失败，请刷新页面</div>}>
          <OuterCityFullMap onOpenInnerCity={() => panels.openInnerCity()} />
        </GameErrorBoundary>
      </div>

      {/* Cinematic HUD Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${panels.showHUD ? "opacity-100" : "opacity-0"}`}>
        {/* Top-left: Player info */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-6 pointer-events-auto">
          <div className={`transition-all duration-500 ${panels.showHUD ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`}>
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
                      className="px-2 py-0.5 bg-[#c9a227] text-[#08080a] text-[10px] font-bold rounded animate-attention hover:bg-[#ddb52f] disabled:opacity-50"
                    >
                      升级!
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#5a6a7a]">Lv.{levelUpInfo?.currentLevel ?? 1}</span>
                  <span className="text-[#3a4a5a]">•</span>
                  <span style={{ color: STATUS_COLORS.hp }}>♥ {player.characters[0]?.hp ?? 100}</span>
                  <span style={{ color: STATUS_COLORS.stamina }}>⚡ {player.stamina}</span>
                </div>
                {/* 经验条 */}
                {levelUpInfo && (
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-24 h-1 bg-[#1a1a20] rounded-full overflow-hidden"
                      role="progressbar"
                      aria-label="经验值"
                      aria-valuenow={levelUpInfo.currentExp}
                      aria-valuemin={0}
                      aria-valuemax={levelUpInfo.expNeeded}
                    >
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
        <div className="absolute top-3 right-3 sm:top-4 sm:right-6 pointer-events-auto">
          <div className={`transition-all duration-500 delay-100 ${panels.showHUD ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}>
            <div className="text-right">
              <div className="text-5xl font-black text-[#c9a227] leading-none">{player.currentGameDay}</div>
              <div className="text-xs text-[#5a6a7a] tracking-widest uppercase">Day</div>
              <div className="mt-2 flex items-center justify-end gap-2 text-sm">
                <span className="text-[#e67e22]">{player.streakDays}</span>
                <span className="text-[#3a4a5a]">|</span>
                <span className="text-[#c9a227]">⭐ {player.currentDayScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-left: Resources */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-6 pointer-events-auto">
          <div className={`transition-all duration-500 delay-200 ${panels.showHUD ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {[
                { icon: "🪙", value: player.gold, color: RESOURCE_COLORS.gold },
                { icon: "🪵", value: player.wood, color: RESOURCE_COLORS.wood },
                { icon: "🪨", value: player.stone, color: RESOURCE_COLORS.stone },
                { icon: "🍞", value: player.food, color: RESOURCE_COLORS.food },
                { icon: "💎", value: player.crystals, color: RESOURCE_COLORS.crystals },
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
              <div
                className="w-32 h-1.5 bg-[#1a1a20] rounded-full overflow-hidden"
                role="progressbar"
                aria-label="体力"
                aria-valuenow={player.stamina}
                aria-valuemin={0}
                aria-valuemax={player.maxStamina}
              >
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
        <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 pointer-events-auto">
          <div className={`transition-all duration-500 delay-250 ${panels.showHUD ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`}>
            {player.hints && (
              <HintBar
                hints={player.hints}
                onHintClick={(action) => panels.handleHintAction(action, () => levelUpMutation.mutate())}
                onShowAll={() => panels.setShowGuidancePanel(true)}
              />
            )}
          </div>
        </div>

        {/* Bottom-right: Quick actions */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-6 pointer-events-auto">
          <div className={`transition-all duration-500 delay-300 ${panels.showHUD ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="flex gap-2">
              {[
                { icon: "👥", label: "角色", system: "character_list", onClick: () => panels.openCharacterHub() },
                { icon: "🎒", label: "背包", system: "backpack", onClick: () => panels.openInventoryHub() },
                { icon: "🗺️", label: "冒险", system: "exploration", onClick: () => panels.openAdventureHub() },
                { icon: "⚔️", label: "战斗", system: "combat", onClick: () => panels.openCombat() },
                { icon: "🏙️", label: "城市", system: "inner_city", onClick: () => panels.openInnerCity() },
              ].filter(a => unlocks.has(a.system)).map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="w-11 h-11 bg-[#0a0a15]/80 border border-[#2a3a4a] hover:border-[#c9a227] rounded-full flex items-center justify-center transition-all hover:scale-110 group"
                  title={action.label}
                  aria-label={action.label}
                >
                  <span className="text-lg" aria-hidden="true">{action.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom-center: Secondary actions */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className={`transition-all duration-500 delay-150 ${panels.showHUD ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="flex items-center gap-2 bg-[#0a0a15]/60 border border-[#2a3a4a] rounded-full px-3 py-1.5">
              {[
                { icon: "📊", label: "经济", system: "economy", onClick: () => panels.setShowEconomyPanel(true) },
                { icon: "⬆️", label: "进阶", system: "progression", onClick: () => panels.openProgressHub() },
                { icon: "🎴", label: "结算", system: "log", onClick: () => panels.openLogHub("settlement"), highlight: true },
                { icon: "📋", label: "记录", system: "log", onClick: () => panels.openLogHub("action") },
              ].filter(a => unlocks.has(a.system)).map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className={`w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                    action.highlight
                      ? "bg-[#c9a227]/20 border border-[#c9a227] text-[#c9a227]"
                      : "hover:bg-[#c9a227]/10"
                  }`}
                  title={action.label}
                  aria-label={action.label}
                >
                  <span className="text-base" aria-hidden="true">{action.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggle HUD button */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => panels.setShowHUD(!panels.showHUD)}
            className="px-4 py-1.5 bg-[#0a0a15]/60 border border-[#2a3a4a] hover:border-[#c9a227] rounded-full text-xs text-[#5a6a7a] hover:text-[#c9a227] transition-all"
          >
            {panels.showHUD ? "隐藏界面 (H)" : "显示界面 (H)"}
          </button>
        </div>

      </div>

      {/* ESC Menu */}
      {panels.showMenu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm">
          <div className="w-80 bg-[#0a0a15]/95 border border-[#2a3a4a] rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-[#2a3a4a] text-center">
              <h2 className="font-display text-3xl text-[#c9a227]">诸天领域</h2>
              <p className="text-xs text-[#5a6a7a] mt-1">按 ESC 返回游戏</p>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <button
                onClick={() => panels.setShowMenu(false)}
                className="w-full py-3 bg-[#c9a227]/10 border border-[#c9a227]/30 hover:border-[#c9a227] text-[#c9a227] rounded transition-colors text-sm font-medium"
              >
                继续游戏
              </button>
              <button
                onClick={() => { panels.setShowMenu(false); panels.openInnerCity(); }}
                className="w-full py-3 bg-[#1a1a25] border border-[#2a3a4a] hover:border-[#4a9eff] text-[#e0dcd0] rounded transition-colors text-sm"
              >
                内城管理
              </button>
              <Link
                href="/login"
                className="w-full py-3 bg-[#1a1a25] border border-[#2a3a4a] hover:border-[#4a9eff] text-[#e0dcd0] rounded transition-colors text-sm text-center block"
              >
                切换账号
              </Link>
              <Link
                href="/"
                className="w-full py-3 bg-[#1a1a25] border border-[#2a3a4a] hover:border-[#e74c3c] text-[#e0dcd0] rounded transition-colors text-sm text-center block"
              >
                返回主页
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 角色Hub */}
      {panels.showCharacterHub && (
        <GameErrorBoundary>
          <CharacterHub
            onClose={() => panels.setShowCharacterHub(false)}
            initialTab={panels.characterHubTab}
            initialCharacterId={panels.selectedCharacterId ?? undefined}
          />
        </GameErrorBoundary>
      )}

      {/* 背包Hub */}
      {panels.showInventoryHub && (
        <GameErrorBoundary>
          <InventoryHub
            onClose={() => panels.setShowInventoryHub(false)}
            initialTab={panels.inventoryHubTab}
          />
        </GameErrorBoundary>
      )}

      {/* 冒险Hub */}
      {panels.showAdventureHub && (
        <GameErrorBoundary>
          <AdventureHub
            onClose={() => panels.setShowAdventureHub(false)}
            initialTab={panels.adventureHubTab}
          />
        </GameErrorBoundary>
      )}

      {/* 进阶Hub */}
      {panels.showProgressHub && (
        <GameErrorBoundary>
          <ProgressHub
            onClose={() => panels.setShowProgressHub(false)}
            initialTab={panels.progressHubTab}
          />
        </GameErrorBoundary>
      )}

      {/* 记录Hub */}
      {panels.showLogHub && (
        <GameErrorBoundary>
          <LogHub
            onClose={() => panels.setShowLogHub(false)}
            initialTab={panels.logHubTab}
            onResumeCombat={() => {
              panels.setShowLogHub(false);
              panels.openCombat(1);
            }}
          />
        </GameErrorBoundary>
      )}

      {/* 经济面板 */}
      {panels.showEconomyPanel && (
        <GameErrorBoundary>
          <EconomyPanel onClose={() => panels.setShowEconomyPanel(false)} />
        </GameErrorBoundary>
      )}

      {/* 战斗面板 */}
      {panels.showCombatPanel && (
        <GameErrorBoundary>
          <CombatPanel
            monsterLevel={panels.combatLevel}
            onClose={() => panels.setShowCombatPanel(false)}
          />
        </GameErrorBoundary>
      )}

      {/* 内城面板 */}
      {panels.showInnerCityPanel && player && (
        <GameErrorBoundary>
          <InnerCityPanel
            playerId={player.id}
            onClose={() => panels.setShowInnerCityPanel(false)}
          />
        </GameErrorBoundary>
      )}

      {/* 引导面板 */}
      {panels.showGuidancePanel && player && (
        <GameErrorBoundary>
          <GuidancePanel
            hints={player.hints}
            onClose={() => panels.setShowGuidancePanel(false)}
            onHintClick={(action) => panels.handleHintAction(action, () => levelUpMutation.mutate())}
          />
        </GameErrorBoundary>
      )}

      {/* 解锁通知 */}
      {player && <UnlockToast unlockedSystems={player.unlockedSystems} />}
    </div>
  );
}
