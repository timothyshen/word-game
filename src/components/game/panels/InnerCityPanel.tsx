"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { InnerCity3D, type CityBuilding } from "../InnerCity3D";
import { getBuildingSize, wouldRadiusGrow } from "~/shared/building-radius";
import { getRarityColor } from "~/constants/game-colors";

interface InnerCityPanelProps {
  playerId: string;
  onClose: () => void;
}

type PanelMode = "view" | "place" | "expand";

export function InnerCityPanel({ onClose }: InnerCityPanelProps) {
  const [mode, setMode] = useState<PanelMode>("view");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);

  const utils = api.useUtils();

  // API queries
  const { data: status, isLoading: statusLoading } = api.innerCity.getStatus.useQuery();
  const { data: cityData } = api.innerCity.getCity.useQuery();
  const { data: playerCards } = api.card.getAll.useQuery();

  // Card filters
  const buildingCards = useMemo(() => {
    if (!playerCards) return [];
    return playerCards.filter((pc) => pc.card.type === "building");
  }, [playerCards]);

  const expansionCards = useMemo(() => {
    if (!playerCards) return [];
    return playerCards.filter((pc) => pc.card.type === "expansion");
  }, [playerCards]);

  // Mutations
  const initializeMutation = api.innerCity.initialize.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      void utils.outerCity.invalidate();
    },
  });

  const placeBuildingMutation = api.innerCity.placeBuilding.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      void utils.card.invalidate();
      setMode("view");
      setPendingPosition(null);
      setSelectedCardId(null);
    },
  });

  const expandTerritoryMutation = api.innerCity.expandTerritory.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      void utils.card.invalidate();
      setMode("view");
      setSelectedCardId(null);
    },
  });

  const upgradeMutation = api.innerCity.upgradeBuilding.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      setSelectedBuildingId(null);
    },
  });

  const demolishMutation = api.innerCity.demolish.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      setSelectedBuildingId(null);
    },
  });

  // Selected building from city data
  const selectedBuilding = useMemo((): CityBuilding | null => {
    if (!selectedBuildingId || !cityData?.buildings) return null;
    return cityData.buildings.find((b) => b.id === selectedBuildingId) ?? null;
  }, [selectedBuildingId, cityData?.buildings]);

  // Selected card
  const selectedCard = useMemo(() => {
    if (!selectedCardId || !playerCards) return null;
    return playerCards.find((pc) => pc.id === selectedCardId);
  }, [selectedCardId, playerCards]);

  // Placement preview info for 3D view
  const placementPreview = useMemo(() => {
    if (mode !== "place" || !selectedCard) return null;
    // Parse card effects to get building info
    let effects: { buildingId?: string };
    try {
      effects = JSON.parse(selectedCard.card.effects) as { buildingId?: string };
    } catch {
      return null;
    }
    if (!effects.buildingId) return null;
    // Use the card's icon/name + level 1 size
    const size = getBuildingSize(selectedCard.card.name, 1);
    return {
      name: selectedCard.card.name,
      icon: selectedCard.card.icon,
      radius: size.radius,
      visualW: size.visualW,
      visualH: size.visualH,
      height: size.height,
    };
  }, [mode, selectedCard]);

  // Upgrade radius warning
  const upgradeRadiusWarning = useMemo(() => {
    if (!selectedBuilding) return null;
    const willGrow = wouldRadiusGrow(selectedBuilding.name, selectedBuilding.level);
    if (!willGrow) return null;
    const nextSize = getBuildingSize(selectedBuilding.name, selectedBuilding.level + 1);
    return {
      currentRadius: selectedBuilding.radius,
      nextRadius: nextSize.radius,
    };
  }, [selectedBuilding]);

  // Handlers
  const handleGroundClick = (x: number, y: number) => {
    if (mode === "place" && selectedCard) {
      setPendingPosition({ x, y });
    }
  };

  const handleBuildingClick = (building: CityBuilding) => {
    if (mode === "view") {
      setSelectedBuildingId(building.id);
    }
  };

  const handlePlaceBuilding = () => {
    if (!selectedCardId || !pendingPosition) return;
    const card = playerCards?.find((pc) => pc.id === selectedCardId);
    if (!card) return;
    placeBuildingMutation.mutate({
      cardId: card.card.id,
      positionX: pendingPosition.x,
      positionY: pendingPosition.y,
    });
  };

  const handleExpandTerritory = () => {
    if (!selectedCardId) return;
    const card = playerCards?.find((pc) => pc.id === selectedCardId);
    if (!card) return;
    expandTerritoryMutation.mutate({ cardId: card.card.id });
  };

  const handleUpgrade = () => {
    if (!selectedBuilding) return;
    upgradeMutation.mutate({ buildingId: selectedBuilding.id });
  };

  const handleDemolish = () => {
    if (!selectedBuilding) return;
    if (confirm("确定要拆除这个建筑吗？")) {
      demolishMutation.mutate({ buildingId: selectedBuilding.id });
    }
  };

  // Uninitialized state
  if (!statusLoading && !status?.initialized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm font-mono">
        <div
          className="relative game-panel rounded-lg p-8 max-w-md text-center"
          style={{ boxShadow: "0 0 40px rgba(201,162,39,0.08), 0 0 80px rgba(201,162,39,0.04)" }}
        >
          {/* Decorative top border */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent" />

          {/* Castle icon */}
          <div className="text-6xl mb-4 opacity-80" aria-hidden="true" style={{ filter: "drop-shadow(0 0 12px rgba(201,162,39,0.3))" }}>
            🏰
          </div>

          <h2 className="text-2xl font-bold text-[#e0dcd0] mb-2 tracking-wide">建立内城</h2>
          <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-[#c9a227]/50 to-transparent mb-4" />

          <p className="text-[#888] mb-6 text-sm leading-relaxed">
            您还没有建立内城。内城是您的核心领地，可以建造各种建筑来增强实力。
          </p>

          {/* Feature preview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#0f1020]/80 border border-[#2a3a4a]/60 rounded p-3">
              <div className="text-xl mb-1" aria-hidden="true">🏗️</div>
              <div className="text-xs text-[#888]">建造建筑</div>
            </div>
            <div className="bg-[#0f1020]/80 border border-[#2a3a4a]/60 rounded p-3">
              <div className="text-xl mb-1" aria-hidden="true">📈</div>
              <div className="text-xs text-[#888]">资源产出</div>
            </div>
            <div className="bg-[#0f1020]/80 border border-[#2a3a4a]/60 rounded p-3">
              <div className="text-xl mb-1" aria-hidden="true">⚔️</div>
              <div className="text-xs text-[#888]">增强实力</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              className="px-6 py-3 bg-gradient-to-b from-[#ddb52f] to-[#c9a227] text-[#0a0a0c] font-bold rounded transition-all hover:from-[#e8c340] hover:to-[#ddb52f] hover:shadow-[0_0_16px_rgba(201,162,39,0.3)] disabled:opacity-50 disabled:hover:shadow-none"
            >
              {initializeMutation.isPending ? "建立中..." : "建立内城"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#1a1a25] border border-[#2a3a4a] text-[#888] rounded transition-colors hover:text-[#e0dcd0] hover:border-[#4a5a6a]"
            >
              取消
            </button>
          </div>

          {/* Decorative bottom border */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm font-mono">
        <div className="text-[#c9a227] animate-pulse tracking-widest">加载中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050810] font-mono">
      {/* Top bar - enhanced header */}
      <div className="relative border-b border-[#2a3a4a]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#c9a227]/5 via-[#0a0a15] to-[#c9a227]/5" />
        <div className="relative flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-lg opacity-70" aria-hidden="true">🏯</span>
              <h2 className="text-lg font-bold text-[#e0dcd0] tracking-wider">内城</h2>
            </div>
            {status && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0a0a15]/60 rounded border border-[#2a3a4a]/50">
                  <span className="text-[10px] opacity-60" aria-hidden="true">📐</span>
                  <span className="text-[#5a6a7a]">领地</span>
                  <span className="text-[#4a9] font-bold">
                    {(status.territoryWidth * 2).toFixed(1)} x {(status.territoryHeight * 2).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0a0a15]/60 rounded border border-[#2a3a4a]/50">
                  <span className="text-[10px] opacity-60" aria-hidden="true">🏠</span>
                  <span className="text-[#5a6a7a]">建筑</span>
                  <span className="text-[#59b] font-bold">{status.buildingCount}</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭内城"
            className="w-8 h-8 flex items-center justify-center rounded border border-[#2a3a4a] text-[#5a6a7a] hover:text-[#c9a227] hover:border-[#c9a227]/50 transition-colors text-sm"
          >
            ✕
          </button>
        </div>
        {/* Decorative separator */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/20 to-transparent" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* 3D view */}
        <div className="flex-1 relative">
          {cityData && (
            <InnerCity3D
              buildings={cityData.buildings}
              territory={cityData.territory}
              onGroundClick={handleGroundClick}
              onBuildingClick={handleBuildingClick}
              placementMode={mode === "place"}
              placementPreview={placementPreview}
              selectedBuildingId={selectedBuildingId}
            />
          )}

          {/* Mode indicator */}
          {mode !== "view" && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-[#0a0a15]/90 border border-[#c9a227]/60 rounded text-sm text-[#e0dcd0] backdrop-blur-sm transition-all"
              style={{ boxShadow: "0 0 20px rgba(201,162,39,0.1)" }}
            >
              <span className="mr-2 text-xs opacity-70">{mode === "place" ? "🏗️" : "🔄"}</span>
              {mode === "place" && (selectedCard ? "在领地内点击放置建筑" : "请先选择建筑卡")}
              {mode === "expand" && "选择扩张卡后确认扩张"}
            </div>
          )}

          {/* Pending position confirmation */}
          {mode === "place" && pendingPosition && selectedCard && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 bg-[#0a0a15]/95 border border-[#4a9]/60 rounded-lg flex items-center gap-4 backdrop-blur-sm"
              style={{ boxShadow: "0 0 20px rgba(68,170,153,0.1)" }}
            >
              <span className="text-sm text-[#e0dcd0]">
                <span className="text-[#4a9] mr-1">📍</span>
                放置到 ({pendingPosition.x.toFixed(1)}, {pendingPosition.y.toFixed(1)})?
              </span>
              <button
                onClick={handlePlaceBuilding}
                disabled={placeBuildingMutation.isPending}
                className="px-4 py-1.5 text-sm bg-[#4a9] text-[#0a0a0c] font-bold rounded transition-colors hover:bg-[#5ba] disabled:opacity-50"
              >
                {placeBuildingMutation.isPending ? "放置中..." : "确认"}
              </button>
              <button
                onClick={() => setPendingPosition(null)}
                className="px-4 py-1.5 text-sm bg-[#1a1a25] border border-[#2a3a4a] text-[#888] rounded transition-colors hover:text-[#e0dcd0]"
              >
                取消
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 bg-[#0a0a15] border-l border-[#2a3a4a] flex flex-col relative">
          {/* Panel decorative top border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#c9a227]/30 via-[#c9a227]/10 to-transparent" />

          {/* Panel header */}
          <div className="px-4 pt-4 pb-3">
            <div className="text-xs text-[#5a6a7a] tracking-widest uppercase mb-3">操作面板</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMode(mode === "place" ? "view" : "place");
                  setSelectedCardId(null);
                  setSelectedBuildingId(null);
                  setPendingPosition(null);
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold rounded border transition-all ${
                  mode === "place"
                    ? "bg-[#4a9]/15 border-[#4a9]/60 text-[#4a9] shadow-[0_0_8px_rgba(68,170,153,0.15)]"
                    : "bg-[#0f1020] border-[#2a3a4a] text-[#5a6a7a] hover:text-[#e0dcd0] hover:border-[#4a5a6a]"
                }`}
              >
                <span className="text-xs">🏗️</span>
                放置建筑
              </button>
              <button
                onClick={() => {
                  setMode(mode === "expand" ? "view" : "expand");
                  setSelectedCardId(null);
                  setSelectedBuildingId(null);
                  setPendingPosition(null);
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold rounded border transition-all ${
                  mode === "expand"
                    ? "bg-[#9b59b6]/15 border-[#9b59b6]/60 text-[#9b59b6] shadow-[0_0_8px_rgba(155,89,182,0.15)]"
                    : "bg-[#0f1020] border-[#2a3a4a] text-[#5a6a7a] hover:text-[#e0dcd0] hover:border-[#4a5a6a]"
                }`}
              >
                <span className="text-xs">🔄</span>
                扩张领地
              </button>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-[#2a3a4a] via-[#2a3a4a]/50 to-transparent" />

          {/* Card selection (placement mode) */}
          {mode === "place" && (
            <div className="p-4 border-b border-[#2a3a4a]/50">
              <h3 className="text-xs font-bold text-[#5a6a7a] tracking-wider uppercase mb-3">选择建筑卡</h3>
              {buildingCards.length === 0 ? (
                <div className="text-xs text-[#5a6a7a] text-center py-4 bg-[#0f1020]/50 rounded border border-[#2a3a4a]/30">
                  没有可用的建筑卡
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {buildingCards.map((pc) => (
                    <button
                      key={pc.id}
                      onClick={() => {
                        setSelectedCardId(pc.id);
                        setPendingPosition(null);
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded border transition-all ${
                        selectedCardId === pc.id
                          ? "bg-[#c9a227]/10 border-[#c9a227]/50 shadow-[0_0_8px_rgba(201,162,39,0.1)]"
                          : "bg-[#0f1020] border-[#2a3a4a]/40 hover:bg-[#151525] hover:border-[#3a4a5a]"
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{pc.card.icon}</span>
                      <div className="text-left flex-1 min-w-0">
                        <div
                          className="text-sm font-bold truncate"
                          style={{ color: getRarityColor(pc.card.rarity) }}
                        >
                          {pc.card.name}
                        </div>
                        <div className="text-xs text-[#5a6a7a]">
                          数量: <span className="text-[#888]">{pc.quantity}</span>
                        </div>
                      </div>
                      {selectedCardId === pc.id && (
                        <span className="text-[#c9a227] text-xs flex-shrink-0">●</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card selection (expand mode) */}
          {mode === "expand" && (
            <div className="p-4 border-b border-[#2a3a4a]/50">
              <h3 className="text-xs font-bold text-[#5a6a7a] tracking-wider uppercase mb-3">选择扩张卡</h3>
              {expansionCards.length === 0 ? (
                <div className="text-xs text-[#5a6a7a] text-center py-4 bg-[#0f1020]/50 rounded border border-[#2a3a4a]/30">
                  没有可用的扩张卡
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {expansionCards.map((pc) => (
                    <button
                      key={pc.id}
                      onClick={() => setSelectedCardId(pc.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded border transition-all ${
                        selectedCardId === pc.id
                          ? "bg-[#9b59b6]/10 border-[#9b59b6]/50 shadow-[0_0_8px_rgba(155,89,182,0.1)]"
                          : "bg-[#0f1020] border-[#2a3a4a]/40 hover:bg-[#151525] hover:border-[#3a4a5a]"
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{pc.card.icon}</span>
                      <div className="text-left flex-1 min-w-0">
                        <div
                          className="text-sm font-bold truncate"
                          style={{ color: getRarityColor(pc.card.rarity) }}
                        >
                          {pc.card.name}
                        </div>
                        <div className="text-xs text-[#5a6a7a]">
                          数量: <span className="text-[#888]">{pc.quantity}</span>
                        </div>
                      </div>
                      {selectedCardId === pc.id && (
                        <span className="text-[#9b59b6] text-xs flex-shrink-0">●</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedCard && (
                <button
                  onClick={handleExpandTerritory}
                  disabled={expandTerritoryMutation.isPending}
                  className="w-full mt-3 py-2.5 text-sm bg-gradient-to-b from-[#a66bc0] to-[#9b59b6] text-white font-bold rounded border border-[#9b59b6]/30 transition-all hover:from-[#b07cc8] hover:to-[#a66bc0] hover:shadow-[0_0_12px_rgba(155,89,182,0.2)] disabled:opacity-50 disabled:hover:shadow-none"
                >
                  {expandTerritoryMutation.isPending ? "扩张中..." : "确认扩张"}
                </button>
              )}
            </div>
          )}

          {/* Selected info area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedBuilding && mode === "view" ? (
              <div className="space-y-3">
                <div className="bg-[#0f1020] rounded-lg border border-[#2a3a4a]/60 overflow-hidden">
                  {/* Building header */}
                  <div className="relative px-4 py-4 border-b border-[#2a3a4a]/40">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#c9a227]/40 via-[#c9a227]/10 to-transparent" />
                    <div className="flex items-start gap-4">
                      <div
                        className="text-4xl p-2 rounded bg-[#0a0a15] border border-[#2a3a4a]/40"
                        style={{ filter: "drop-shadow(0 0 6px rgba(201,162,39,0.15))" }}
                      >
                        {selectedBuilding.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-[#c9a227] text-base">{selectedBuilding.name}</div>
                        <div className="text-xs text-[#5a6a7a] mt-0.5">等级 {selectedBuilding.level}</div>
                      </div>
                    </div>
                  </div>

                  {/* Building stats */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5a6a7a]">碰撞半径</span>
                      <span className="text-[#888]">{selectedBuilding.radius.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5a6a7a]">位置</span>
                      <span className="text-[#888]">
                        ({selectedBuilding.x.toFixed(1)}, {selectedBuilding.y.toFixed(1)})
                      </span>
                    </div>
                  </div>

                  {/* Upgrade radius warning */}
                  {upgradeRadiusWarning && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-[#e67e22]/10 border border-[#e67e22]/25 rounded text-xs">
                      <span className="text-[#e67e22]">
                        ⚠ 升级后碰撞半径将从 {upgradeRadiusWarning.currentRadius.toFixed(1)} 增大到{" "}
                        {upgradeRadiusWarning.nextRadius.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {upgradeMutation.error && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-[#e74c3c]/10 border border-[#e74c3c]/25 rounded text-xs text-[#e74c3c]">
                      {upgradeMutation.error.message}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={handleUpgrade}
                      disabled={upgradeMutation.isPending}
                      className="flex-1 py-2.5 text-sm font-bold rounded border transition-all bg-[#4a9eff]/10 border-[#4a9eff]/40 text-[#4a9eff] hover:bg-[#4a9eff]/20 hover:shadow-[0_0_10px_rgba(74,158,255,0.15)] disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      ⬆ 升级
                    </button>
                    <button
                      onClick={handleDemolish}
                      disabled={demolishMutation.isPending}
                      className="flex-1 py-2.5 text-sm font-bold rounded border transition-all bg-[#e74c3c]/8 border-[#e74c3c]/30 text-[#e74c3c]/80 hover:bg-[#e74c3c]/15 hover:text-[#e74c3c] disabled:opacity-50"
                    >
                      🗑 拆除
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-2xl mb-3 opacity-30" aria-hidden="true">
                  {mode === "view" ? "🏯" : mode === "place" ? "🏗️" : "🔄"}
                </div>
                <div className="text-xs text-[#5a6a7a] leading-relaxed">
                  {mode === "view"
                    ? "点击建筑查看详情"
                    : mode === "place"
                      ? selectedCard
                        ? "在领地内点击选择放置位置"
                        : "请先选择建筑卡"
                      : "选择扩张卡并确认"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InnerCityPanel;
