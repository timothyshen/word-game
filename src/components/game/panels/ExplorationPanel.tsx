// 城外探索面板组件

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface ExplorationPanelProps {
  playerStamina: number;
  onClose: () => void;
}

// 事件选项类型
interface EventOption {
  text: string;
  action: string;
  cost?: { stamina?: number };
  requirement?: { stat?: string; minValue?: number };
}

// 事件类型
interface ExplorationEvent {
  type: string;
  title: string;
  description: string;
  options: EventOption[];
  rewards?: Record<string, unknown>;
  monster?: {
    name: string;
    level: number;
    hp: number;
    attack: number;
    defense: number;
  };
}

export default function ExplorationPanel({
  playerStamina,
  onClose,
}: ExplorationPanelProps) {
  const [selectedWorld] = useState("main");
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentEvent, setCurrentEvent] = useState<ExplorationEvent | null>(null);
  const [eventResult, setEventResult] = useState<string | null>(null);

  const utils = api.useUtils();

  // 获取已探索区域
  const { data: exploredAreas, isLoading: areasLoading } = api.exploration.getExploredAreas.useQuery({
    worldId: selectedWorld,
  });

  // 获取野外设施
  const { data: facilities } = api.exploration.getWildernessFacilities.useQuery({
    worldId: selectedWorld,
  });

  // 探索新区域
  const exploreMutation = api.exploration.exploreArea.useMutation({
    onSuccess: (data) => {
      void utils.exploration.getExploredAreas.invalidate();
      void utils.exploration.getWildernessFacilities.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedPosition(null);
      setEventResult(`成功探索了 ${data.areaName}！发现了新区域。${data.facilityFound ? `还发现了一个${data.facilityFound.type}设施！` : ""}`);
    },
    onError: (err) => {
      setEventResult(`探索失败: ${err.message}`);
    },
  });

  // 触发区域事件
  const triggerEventMutation = api.exploration.triggerEvent.useMutation({
    onSuccess: (data) => {
      void utils.player.getStatus.invalidate();
      setCurrentEvent(data.event as ExplorationEvent);
    },
    onError: (err) => {
      setEventResult(`遭遇事件失败: ${err.message}`);
    },
  });

  // 处理事件选择
  const handleEventMutation = api.exploration.handleEventChoice.useMutation({
    onSuccess: (data) => {
      void utils.player.getStatus.invalidate();
      setCurrentEvent(null);

      let resultText = data.message;
      if (data.rewards) {
        const rewardTexts = Object.entries(data.rewards)
          .filter(([, v]) => typeof v === "number" && v > 0)
          .map(([k, v]) => `${k}: +${v}`);
        if (rewardTexts.length > 0) {
          resultText += ` 获得: ${rewardTexts.join(", ")}`;
        }
      }
      setEventResult(resultText);
    },
    onError: (err) => {
      setEventResult(`操作失败: ${err.message}`);
    },
  });

  // 使用野外设施
  const useFacilityMutation = api.exploration.useFacility.useMutation({
    onSuccess: (data) => {
      void utils.player.getStatus.invalidate();
      void utils.exploration.getWildernessFacilities.invalidate();
      // Construct message from result
      let message = "使用了设施";
      if (data.collected) {
        message = `成功采集了 ${data.amount} ${data.resourceType === "wood" ? "木材" : data.resourceType === "stone" ? "石材" : data.resourceType === "gold" ? "金币" : data.resourceType === "food" ? "粮食" : data.resourceType}`;
      }
      if (typeof data.remainingUses === "number") {
        message += `（剩余 ${data.remainingUses} 次）`;
      }
      setEventResult(message);
    },
    onError: (err) => {
      setEventResult(`使用设施失败: ${err.message}`);
    },
  });

  // 生成地图网格
  const mapSize = 7;
  const mapOffset = Math.floor(mapSize / 2);
  type FacilityType = NonNullable<typeof facilities>[number] | null;
  const mapGrid: Array<{ x: number; y: number; explored: boolean; facility: FacilityType }> = [];

  for (let y = -mapOffset; y <= mapOffset; y++) {
    for (let x = -mapOffset; x <= mapOffset; x++) {
      const explored = exploredAreas?.some(a => a.positionX === x && a.positionY === y) ?? false;
      const facility = facilities?.find(f => f.positionX === x && f.positionY === y) ?? null;
      mapGrid.push({ x, y, explored, facility });
    }
  }

  // 检查是否可以探索（必须与已探索区域相邻或是起点）
  const canExplore = (x: number, y: number): boolean => {
    if (x === 0 && y === 0) return true; // 起点
    const adjacent = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];
    // 主城 (0,0) 视为已探索，允许探索相邻格子
    return adjacent.some(pos =>
      (pos.x === 0 && pos.y === 0) ||
      exploredAreas?.some(a => a.positionX === pos.x && a.positionY === pos.y)
    );
  };

  const handleExplore = () => {
    if (!selectedPosition) return;
    exploreMutation.mutate({
      worldId: selectedWorld,
      positionX: selectedPosition.x,
      positionY: selectedPosition.y,
    });
  };

  const handleTriggerEvent = (x: number, y: number) => {
    triggerEventMutation.mutate({
      worldId: selectedWorld,
      positionX: x,
      positionY: y,
    });
  };

  const handleEventChoice = (action: string) => {
    if (!currentEvent) return;
    handleEventMutation.mutate({
      eventType: currentEvent.type,
      action,
      eventData: JSON.stringify(currentEvent),
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-4xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-[#151518] border-b border-[#2a2a30] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🗺️</span>
              <div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">城外探索</DialogTitle>
                <div className="text-sm text-[#888]">
                  探索未知区域，发现资源和遭遇事件
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#4a9eff]">⚡</span>
                <span className="text-sm">
                  <span className="text-[#4a9eff] font-bold">{playerStamina}</span>
                  <span className="text-[#666]"> 体力</span>
                </span>
              </div>
              <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* 左侧 - 地图 */}
          <div className="flex-1 p-4 border-r border-[#2a2a30]">
            <div className="text-[#c9a227] text-sm font-bold mb-3">
              <span className="text-[#3a3a40]">▸</span> 探索地图
            </div>

            {areasLoading ? (
              <div className="flex items-center justify-center h-64">
                <span className="text-[#666] animate-pulse">加载中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* 地图网格 */}
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${mapSize}, 1fr)` }}
                >
                  {mapGrid.map((cell, idx) => {
                    const isCenter = cell.x === 0 && cell.y === 0;
                    const isExplored = cell.explored || isCenter;
                    const isSelected = selectedPosition?.x === cell.x && selectedPosition?.y === cell.y;
                    const canExploreThis = !isExplored && canExplore(cell.x, cell.y);

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedPosition({ x: cell.x, y: cell.y });
                          setEventResult(null);
                          setCurrentEvent(null);
                        }}
                        className={`
                          w-12 h-12 flex items-center justify-center text-lg
                          transition-colors border
                          ${isSelected ? "border-[#c9a227] bg-[#c9a227]/20" : "border-[#2a2a30]"}
                          ${isCenter ? "bg-[#c9a227] text-[#08080a]" : ""}
                          ${isExplored && !isCenter ? "bg-[#1a3a1a]" : ""}
                          ${!isExplored && canExploreThis ? "bg-[#2a2a30] hover:bg-[#3a3a40]" : ""}
                          ${!isExplored && !canExploreThis ? "bg-[#151518] opacity-50" : ""}
                          ${cell.facility ? "ring-2 ring-[#9b59b6]" : ""}
                        `}
                        disabled={!isExplored && !canExploreThis}
                      >
                        {isCenter && "🏰"}
                        {!isCenter && cell.facility && (
                          cell.facility.type === "resource" ? "📦" :
                          cell.facility.type === "monster" ? "👹" :
                          cell.facility.type === "merchant" ? "🏪" :
                          cell.facility.type === "altar" ? "🗿" :
                          cell.facility.type === "portal" ? "🌀" : "❓"
                        )}
                        {!isCenter && isExplored && !cell.facility && "🌲"}
                        {!isExplored && canExploreThis && "❓"}
                      </button>
                    );
                  })}
                </div>

                {/* 图例 */}
                <div className="flex gap-4 mt-4 text-xs text-[#888]">
                  <span>🏰 主城</span>
                  <span>🌲 已探索</span>
                  <span>❓ 可探索</span>
                  <span className="text-[#9b59b6]">◯ 设施</span>
                </div>
              </div>
            )}
          </div>

          {/* 右侧 - 详情 */}
          <ScrollArea className="w-80 flex-shrink-0">
            <div className="p-4 text-[#e0dcd0]">
              {/* 结果消息 */}
              {eventResult && (
                <div className="mb-4 p-3 bg-[#1a3a1a] border border-[#4a9]/30 text-sm">
                  <span className="text-[#4a9]">✨</span> {eventResult}
                </div>
              )}

              {/* 当前事件 */}
              {currentEvent && (
                <div className="mb-4">
                  <div className="text-[#c9a227] text-sm font-bold mb-2">
                    <span className="text-[#3a3a40]">▸</span> {currentEvent.title}
                  </div>
                  <p className="text-sm text-[#888] mb-3">{currentEvent.description}</p>

                  {/* 怪物信息 */}
                  {currentEvent.monster && (
                    <div className="mb-3 p-2 bg-[#1a1a20] border border-red-500/30">
                      <div className="flex items-center gap-2 text-sm">
                        <span>👹</span>
                        <span className="text-red-400">{currentEvent.monster.name}</span>
                        <span className="text-[#666]">Lv.{currentEvent.monster.level}</span>
                      </div>
                      <div className="text-xs text-[#666] mt-1">
                        HP: {currentEvent.monster.hp} | ATK: {currentEvent.monster.attack} | DEF: {currentEvent.monster.defense}
                      </div>
                    </div>
                  )}

                  {/* 选项 */}
                  <div className="space-y-2">
                    {currentEvent.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleEventChoice(opt.action)}
                        disabled={handleEventMutation.isPending}
                        className="w-full p-2 text-left bg-[#1a1a20] hover:bg-[#222228] border border-[#2a2a30] text-sm disabled:opacity-50"
                      >
                        {opt.text}
                        {opt.cost?.stamina && (
                          <span className="text-[#4a9eff] ml-2">⚡-{opt.cost.stamina}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 选中位置信息 */}
              {selectedPosition && !currentEvent && (
                <div>
                  <div className="text-[#c9a227] text-sm font-bold mb-2">
                    <span className="text-[#3a3a40]">▸</span> 位置 ({selectedPosition.x}, {selectedPosition.y})
                  </div>

                  {(() => {
                    const isCenter = selectedPosition.x === 0 && selectedPosition.y === 0;
                    const explored = exploredAreas?.find(
                      a => a.positionX === selectedPosition.x && a.positionY === selectedPosition.y
                    );
                    const facility = facilities?.find(
                      f => f.positionX === selectedPosition.x && f.positionY === selectedPosition.y
                    );

                    if (isCenter) {
                      return (
                        <div className="text-sm text-[#888]">
                          <p>🏰 这里是你的主城</p>
                          <p className="mt-2">从这里出发，探索周围的未知区域吧！</p>
                        </div>
                      );
                    }

                    if (explored) {
                      return (
                        <div>
                          <div className="p-2 bg-[#1a3a1a] border border-[#4a9]/30 mb-3">
                            <div className="text-sm font-bold">{explored.name}</div>
                            <div className="text-xs text-[#888]">已探索</div>
                          </div>

                          {facility && (
                            <div className="p-2 bg-[#1a1a20] border border-[#9b59b6]/30 mb-3">
                              <div className="text-sm">
                                {facility.type === "resource" && "📦 资源点"}
                                {facility.type === "monster" && "👹 怪物巢穴"}
                                {facility.type === "merchant" && "🏪 流浪商人"}
                                {facility.type === "altar" && "🗿 祭坛"}
                                {facility.type === "portal" && "🌀 传送门"}
                              </div>
                              <div className="text-xs text-[#888]">
                                {facility.name}
                                {(facility.data as { level?: number }).level && (
                                  <span className="ml-2">等级: {(facility.data as { level?: number }).level}</span>
                                )}
                              </div>
                              {facility.type === "altar" && !(facility.data as { isDefeated?: boolean }).isDefeated && (
                                <div className="text-xs text-[#e74c3c] mt-1">⚔️ 需要击败守护者</div>
                              )}
                              {facility.type === "portal" && !(facility.data as { isDefeated?: boolean }).isDefeated && (
                                <div className="text-xs text-[#e74c3c] mt-1">⚔️ 需要击败守护者才能使用</div>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            <button
                              onClick={() => handleTriggerEvent(selectedPosition.x, selectedPosition.y)}
                              disabled={triggerEventMutation.isPending || playerStamina < 5}
                              className="w-full py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a] disabled:opacity-50 text-sm"
                            >
                              {triggerEventMutation.isPending ? "探索中..." : "再次探索 (⚡5)"}
                            </button>

                            {facility && (
                              <button
                                onClick={() => useFacilityMutation.mutate({ facilityId: facility.id })}
                                disabled={useFacilityMutation.isPending}
                                className="w-full py-2 border border-[#9b59b6] text-[#9b59b6] hover:bg-[#9b59b6] hover:text-[#08080a] disabled:opacity-50 text-sm"
                              >
                                {useFacilityMutation.isPending ? "使用中..." : "使用设施"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // 未探索
                    const canExploreThis = canExplore(selectedPosition.x, selectedPosition.y);
                    return (
                      <div>
                        <div className="p-2 bg-[#2a2a30] border border-[#3a3a40] mb-3">
                          <div className="text-sm text-[#888]">未探索区域</div>
                          <div className="text-xs text-[#666]">
                            距离主城: {Math.sqrt(selectedPosition.x ** 2 + selectedPosition.y ** 2).toFixed(1)}
                          </div>
                        </div>

                        {canExploreThis ? (
                          <div>
                            <div className="text-xs text-[#888] mb-2">
                              消耗: <span className="text-[#4a9eff]">⚡15 体力</span>
                            </div>
                            <button
                              onClick={handleExplore}
                              disabled={exploreMutation.isPending || playerStamina < 15}
                              className="w-full py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a] disabled:opacity-50"
                            >
                              {exploreMutation.isPending ? "探索中..." : playerStamina < 15 ? "体力不足" : "开始探索"}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-[#666]">
                            需要先探索相邻区域
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 未选中时的提示 */}
              {!selectedPosition && !currentEvent && (
                <div className="text-center py-8 text-[#666]">
                  <div className="text-3xl mb-2">🗺️</div>
                  <p className="text-sm">点击地图上的格子查看详情</p>
                  <p className="text-xs mt-1">从主城出发，逐步探索周围区域</p>
                </div>
              )}

              {/* 已发现设施列表 */}
              {facilities && facilities.length > 0 && !currentEvent && (
                <div className="mt-6 pt-4 border-t border-[#2a2a30]">
                  <div className="text-[#c9a227] text-sm font-bold mb-2">
                    <span className="text-[#3a3a40]">▸</span> 已发现设施
                  </div>
                  <div className="space-y-2">
                    {facilities.map((f) => (
                      <div
                        key={f.id}
                        className="p-2 bg-[#1a1a20] border border-[#2a2a30] text-sm cursor-pointer hover:border-[#9b59b6]"
                        onClick={() => {
                          setSelectedPosition({ x: f.positionX, y: f.positionY });
                          setEventResult(null);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            {f.type === "resource" && "📦"}
                            {f.type === "monster" && "👹"}
                            {f.type === "merchant" && "🏪"}
                            {f.type === "altar" && "🗿"}
                            {f.type === "portal" && "🌀"}
                            <span className="ml-1">{f.name}</span>
                          </span>
                          <span className="text-xs text-[#666]">
                            ({f.positionX}, {f.positionY})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
