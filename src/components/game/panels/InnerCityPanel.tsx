"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { InnerCity3D, type CityBuilding } from "../InnerCity3D";
import { getBuildingSize, wouldRadiusGrow } from "~/shared/building-radius";

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-[#1a1a20] border border-[#c9a227] rounded-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-[#c9a227] mb-4">内城建设</h2>
          <p className="text-[#888] mb-6">
            您还没有建立内城。内城是您的核心领地，可以建造各种建筑来增强实力。
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              className="px-6 py-3 bg-[#c9a227] text-[#0a0a0c] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
            >
              {initializeMutation.isPending ? "建立中..." : "建立内城"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-[#c9a227]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0c]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a20] border-b border-[#2a2a30]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-[#c9a227]">内城</h2>
          {status && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#888]">
                领地: <span className="text-[#4a9]">
                  {(status.territoryWidth * 2).toFixed(1)} x {(status.territoryHeight * 2).toFixed(1)}
                </span>
              </span>
              <span className="text-[#888]">
                建筑: <span className="text-[#59b]">{status.buildingCount}</span>
              </span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">
          ✕
        </button>
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#1a1a20]/90 border border-[#c9a227] rounded text-sm">
              {mode === "place" && (selectedCard ? "在领地内点击放置建筑" : "请先选择建筑卡")}
              {mode === "expand" && "选择扩张卡后确认扩张"}
            </div>
          )}

          {/* Pending position confirmation */}
          {mode === "place" && pendingPosition && selectedCard && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 bg-[#1a1a20]/95 border border-[#4a9] rounded flex items-center gap-4">
              <span className="text-sm text-[#e0dcd0]">
                放置到 ({pendingPosition.x.toFixed(1)}, {pendingPosition.y.toFixed(1)})?
              </span>
              <button
                onClick={handlePlaceBuilding}
                disabled={placeBuildingMutation.isPending}
                className="px-4 py-1 text-sm bg-[#4a9] text-[#0a0a0c] font-bold hover:bg-[#5ba] disabled:opacity-50"
              >
                {placeBuildingMutation.isPending ? "放置中..." : "确认"}
              </button>
              <button
                onClick={() => setPendingPosition(null)}
                className="px-4 py-1 text-sm bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]"
              >
                取消
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 bg-[#1a1a20] border-l border-[#2a2a30] flex flex-col">
          {/* Action buttons */}
          <div className="p-4 border-b border-[#2a2a30]">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMode(mode === "place" ? "view" : "place");
                  setSelectedCardId(null);
                  setSelectedBuildingId(null);
                  setPendingPosition(null);
                }}
                className={`px-4 py-2 text-sm font-bold transition-colors ${
                  mode === "place"
                    ? "bg-[#4a9] text-[#0a0a0c]"
                    : "bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]"
                }`}
              >
                放置建筑
              </button>
              <button
                onClick={() => {
                  setMode(mode === "expand" ? "view" : "expand");
                  setSelectedCardId(null);
                  setSelectedBuildingId(null);
                  setPendingPosition(null);
                }}
                className={`px-4 py-2 text-sm font-bold transition-colors ${
                  mode === "expand"
                    ? "bg-[#9b59b6] text-white"
                    : "bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]"
                }`}
              >
                扩张领地
              </button>
            </div>
          </div>

          {/* Card selection (placement mode) */}
          {mode === "place" && (
            <div className="p-4 border-b border-[#2a2a30]">
              <h3 className="text-sm font-bold text-[#888] mb-3">选择建筑卡</h3>
              {buildingCards.length === 0 ? (
                <p className="text-xs text-[#666]">没有可用的建筑卡</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {buildingCards.map((pc) => (
                    <button
                      key={pc.id}
                      onClick={() => {
                        setSelectedCardId(pc.id);
                        setPendingPosition(null);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${
                        selectedCardId === pc.id
                          ? "bg-[#c9a227]/20 border border-[#c9a227]"
                          : "bg-[#2a2a30] hover:bg-[#3a3a40]"
                      }`}
                    >
                      <span className="text-2xl">{pc.card.icon}</span>
                      <div className="text-left">
                        <div className="text-sm font-bold">{pc.card.name}</div>
                        <div className="text-xs text-[#888]">数量: {pc.quantity}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card selection (expand mode) */}
          {mode === "expand" && (
            <div className="p-4 border-b border-[#2a2a30]">
              <h3 className="text-sm font-bold text-[#888] mb-3">选择扩张卡</h3>
              {expansionCards.length === 0 ? (
                <p className="text-xs text-[#666]">没有可用的扩张卡</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {expansionCards.map((pc) => (
                    <button
                      key={pc.id}
                      onClick={() => setSelectedCardId(pc.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${
                        selectedCardId === pc.id
                          ? "bg-[#9b59b6]/20 border border-[#9b59b6]"
                          : "bg-[#2a2a30] hover:bg-[#3a3a40]"
                      }`}
                    >
                      <span className="text-2xl">{pc.card.icon}</span>
                      <div className="text-left">
                        <div className="text-sm font-bold">{pc.card.name}</div>
                        <div className="text-xs text-[#888]">数量: {pc.quantity}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedCard && (
                <button
                  onClick={handleExpandTerritory}
                  disabled={expandTerritoryMutation.isPending}
                  className="w-full mt-3 py-2 text-sm bg-[#9b59b6] text-white font-bold hover:bg-[#a66bc0] disabled:opacity-50"
                >
                  {expandTerritoryMutation.isPending ? "扩张中..." : "确认扩张"}
                </button>
              )}
            </div>
          )}

          {/* Selected info area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedBuilding && mode === "view" ? (
              <div className="space-y-4">
                <div className="bg-[#2a2a30] rounded p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{selectedBuilding.icon}</span>
                    <div>
                      <div className="font-bold text-[#c9a227]">{selectedBuilding.name}</div>
                      <div className="text-sm text-[#888]">等级 {selectedBuilding.level}</div>
                      <div className="text-xs text-[#666] mt-1">
                        碰撞半径 {selectedBuilding.radius.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* Upgrade radius warning */}
                  {upgradeRadiusWarning && (
                    <div className="mb-3 px-3 py-2 bg-[#e67e22]/10 border border-[#e67e22]/30 rounded text-xs">
                      <span className="text-[#e67e22]">
                        升级后碰撞半径将从 {upgradeRadiusWarning.currentRadius.toFixed(1)} 增大到{" "}
                        {upgradeRadiusWarning.nextRadius.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {upgradeMutation.error && (
                    <div className="mb-3 px-3 py-2 bg-[#e74c3c]/10 border border-[#e74c3c]/30 rounded text-xs text-[#e74c3c]">
                      {upgradeMutation.error.message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleUpgrade}
                      disabled={upgradeMutation.isPending}
                      className="flex-1 py-2 text-sm bg-[#4a9eff] text-white font-bold hover:bg-[#5ab0ff] disabled:opacity-50"
                    >
                      升级
                    </button>
                    <button
                      onClick={handleDemolish}
                      disabled={demolishMutation.isPending}
                      className="flex-1 py-2 text-sm bg-[#e74c3c] text-white font-bold hover:bg-[#f05545] disabled:opacity-50"
                    >
                      拆除
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#666] text-center py-8">
                {mode === "view"
                  ? "点击建筑查看详情"
                  : mode === "place"
                    ? selectedCard
                      ? "在领地内点击选择放置位置"
                      : "请先选择建筑卡"
                    : "选择扩张卡并确认"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InnerCityPanel;
