"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { InnerCity3D } from "../InnerCity3D";

interface InnerCityPanelProps {
  playerId: string;
  onClose: () => void;
}

type PanelMode = "view" | "place" | "expand" | "upgrade";

// 适配API返回的建筑类型
interface GridBuilding {
  id: string;
  x: number;
  y: number;
  level: number;
  templateId: string;
  name: string;
  icon: string;
  slot: string;
}

export function InnerCityPanel({ onClose }: InnerCityPanelProps) {
  const [mode, setMode] = useState<PanelMode>("view");
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const utils = api.useUtils();

  // 获取内城状态
  const { data: status, isLoading: statusLoading } = api.innerCity.getStatus.useQuery();

  // 获取网格数据
  const { data: gridData } = api.innerCity.getGrid.useQuery();

  // 获取可放置位置
  const { data: availableData } = api.innerCity.getAvailable.useQuery(
    undefined,
    { enabled: mode === "place" }
  );

  // 获取可扩张位置
  const { data: expandableData } = api.innerCity.getExpandable.useQuery(
    undefined,
    { enabled: mode === "expand" }
  );

  // 获取玩家卡牌
  const { data: playerCards } = api.card.getAll.useQuery();

  // 筛选建筑卡和扩张卡
  const buildingCards = useMemo(() => {
    if (!playerCards) return [];
    return playerCards.filter((pc) => pc.card.type === "building");
  }, [playerCards]);

  const expansionCards = useMemo(() => {
    if (!playerCards) return [];
    return playerCards.filter((pc) => pc.card.type === "expansion");
  }, [playerCards]);

  // 初始化内城
  const initializeMutation = api.innerCity.initialize.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
    },
  });

  // 放置建筑
  const placeBuildingMutation = api.innerCity.placeBuilding.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      void utils.card.invalidate();
      setMode("view");
      setSelectedPosition(null);
      setSelectedCardId(null);
    },
  });

  // 扩张面积
  const expandAreaMutation = api.innerCity.expandArea.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      void utils.card.invalidate();
      setMode("view");
      setSelectedPosition(null);
      setSelectedCardId(null);
    },
  });

  // 升级建筑
  const upgradeMutation = api.innerCity.upgradeBuilding.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      setSelectedPosition(null);
    },
  });

  // 拆除建筑
  const demolishMutation = api.innerCity.demolish.useMutation({
    onSuccess: () => {
      void utils.innerCity.invalidate();
      setSelectedPosition(null);
    },
  });

  // 处理格子点击
  const handleTileClick = (x: number, y: number) => {
    setSelectedPosition({ x, y });
  };

  // 处理建筑点击
  const handleBuildingClick = (building: { positionX: number; positionY: number }) => {
    setSelectedPosition({ x: building.positionX, y: building.positionY });
  };

  // 执行放置建筑
  const handlePlaceBuilding = () => {
    if (!selectedCardId || !selectedPosition) return;
    const card = playerCards?.find((pc) => pc.id === selectedCardId);
    if (!card) return;
    placeBuildingMutation.mutate({
      cardId: card.card.id,
      positionX: selectedPosition.x,
      positionY: selectedPosition.y,
    });
  };

  // 执行扩张
  const handleExpandArea = () => {
    if (!selectedCardId || !selectedPosition) return;
    const card = playerCards?.find((pc) => pc.id === selectedCardId);
    if (!card) return;
    expandAreaMutation.mutate({
      cardId: card.card.id,
      positions: [{ x: selectedPosition.x, y: selectedPosition.y }],
    });
  };

  // 执行升级
  const handleUpgrade = () => {
    if (!selectedPosition || !gridData?.buildings) return;
    const building = gridData.buildings.find(
      (b) => b.x === selectedPosition.x && b.y === selectedPosition.y
    );
    if (!building) return;
    upgradeMutation.mutate({
      buildingId: building.id,
    });
  };

  // 执行拆除
  const handleDemolish = () => {
    if (!selectedPosition || !gridData?.buildings) return;
    const building = gridData.buildings.find(
      (b) => b.x === selectedPosition.x && b.y === selectedPosition.y
    );
    if (!building) return;
    if (confirm("确定要拆除这个建筑吗？")) {
      demolishMutation.mutate({
        buildingId: building.id,
      });
    }
  };

  // 获取选中位置的建筑
  const selectedBuilding = useMemo((): GridBuilding | null => {
    if (!selectedPosition || !gridData?.buildings) return null;
    return gridData.buildings.find(
      (b) => b.x === selectedPosition.x && b.y === selectedPosition.y
    ) ?? null;
  }, [selectedPosition, gridData?.buildings]);

  // 获取选中的卡牌
  const selectedCard = useMemo(() => {
    if (!selectedCardId || !playerCards) return null;
    return playerCards.find((pc) => pc.id === selectedCardId);
  }, [selectedCardId, playerCards]);

  // 转换tiles格式给InnerCity3D
  const tiles3D = useMemo(() => {
    if (!gridData?.tiles) return [];
    return gridData.tiles.map((t, i) => ({
      id: `tile-${i}`,
      positionX: t.x,
      positionY: t.y,
      unlocked: t.unlocked,
    }));
  }, [gridData?.tiles]);

  // 转换buildings格式给InnerCity3D
  const buildings3D = useMemo(() => {
    if (!gridData?.buildings) return [];
    return gridData.buildings.map((b) => ({
      id: b.id,
      templateId: b.templateId,
      positionX: b.x,
      positionY: b.y,
      level: b.level,
      template: {
        id: b.templateId,
        name: b.name,
        icon: b.icon,
      },
    }));
  }, [gridData?.buildings]);

  // 如果未初始化
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
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a20] border-b border-[#2a2a30]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-[#c9a227]">内城</h2>
          {status && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#888]">
                网格: <span className="text-[#4a9]">{status.gridRadius * 2 + 1}x{status.gridRadius * 2 + 1}</span>
              </span>
              <span className="text-[#888]">
                建筑: <span className="text-[#59b]">{status.buildingCount}</span>
              </span>
              <span className="text-[#888]">
                空间: <span className="text-[#e67e22]">{status.spaceUsed}/{status.spaceCapacity}</span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[#666] hover:text-[#c9a227] text-xl"
        >
          ✕
        </button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex">
        {/* 3D 视图 */}
        <div className="flex-1 relative">
          {gridData && (
            <InnerCity3D
              tiles={tiles3D}
              buildings={buildings3D}
              gridRadius={status?.gridRadius ?? 1}
              onTileClick={handleTileClick}
              onBuildingClick={handleBuildingClick}
              placementMode={mode === "place"}
              selectedPosition={selectedPosition}
              expandablePositions={mode === "expand" ? expandableData?.expandable : []}
              previewBuilding={
                mode === "place" && selectedCard
                  ? { height: 0.4, icon: selectedCard.card.icon }
                  : undefined
              }
            />
          )}

          {/* 模式指示 */}
          {mode !== "view" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#1a1a20]/90 border border-[#c9a227] rounded text-sm">
              {mode === "place" && "点击绿色格子放置建筑"}
              {mode === "expand" && "点击紫色边框格子扩张"}
              {mode === "upgrade" && "选择要升级的建筑"}
            </div>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="w-80 bg-[#1a1a20] border-l border-[#2a2a30] flex flex-col">
          {/* 操作按钮 */}
          <div className="p-4 border-b border-[#2a2a30]">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMode(mode === "place" ? "view" : "place");
                  setSelectedCardId(null);
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

          {/* 卡牌选择（放置模式） */}
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
                      onClick={() => setSelectedCardId(pc.id)}
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

          {/* 卡牌选择（扩张模式） */}
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
            </div>
          )}

          {/* 选中信息 */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedPosition && (
              <div className="space-y-4">
                <div className="text-xs text-[#666]">
                  位置: ({selectedPosition.x}, {selectedPosition.y})
                </div>

                {selectedBuilding ? (
                  <div className="bg-[#2a2a30] rounded p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{selectedBuilding.icon}</span>
                      <div>
                        <div className="font-bold text-[#c9a227]">
                          {selectedBuilding.name}
                        </div>
                        <div className="text-sm text-[#888]">
                          等级 {selectedBuilding.level}
                        </div>
                      </div>
                    </div>
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
                ) : mode === "place" && selectedCard ? (
                  <div className="bg-[#2a2a30] rounded p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{selectedCard.card.icon}</span>
                      <div>
                        <div className="font-bold text-[#4a9]">
                          {selectedCard.card.name}
                        </div>
                        <div className="text-sm text-[#888]">准备放置</div>
                      </div>
                    </div>
                    <button
                      onClick={handlePlaceBuilding}
                      disabled={placeBuildingMutation.isPending}
                      className="w-full py-2 text-sm bg-[#4a9] text-[#0a0a0c] font-bold hover:bg-[#5ba] disabled:opacity-50"
                    >
                      {placeBuildingMutation.isPending ? "放置中..." : "确认放置"}
                    </button>
                  </div>
                ) : mode === "expand" && selectedCard ? (
                  <div className="bg-[#2a2a30] rounded p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{selectedCard.card.icon}</span>
                      <div>
                        <div className="font-bold text-[#9b59b6]">
                          {selectedCard.card.name}
                        </div>
                        <div className="text-sm text-[#888]">准备扩张</div>
                      </div>
                    </div>
                    <button
                      onClick={handleExpandArea}
                      disabled={expandAreaMutation.isPending}
                      className="w-full py-2 text-sm bg-[#9b59b6] text-white font-bold hover:bg-[#a66bc0] disabled:opacity-50"
                    >
                      {expandAreaMutation.isPending ? "扩张中..." : "确认扩张"}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-[#666]">
                    {mode === "place"
                      ? "请先选择建筑卡"
                      : mode === "expand"
                      ? "请先选择扩张卡"
                      : "空地"}
                  </div>
                )}
              </div>
            )}

            {!selectedPosition && (
              <div className="text-sm text-[#666] text-center py-8">
                点击格子或建筑查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InnerCityPanel;
