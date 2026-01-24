// 建筑详情面板组件 - 使用 shadcn/ui

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface BuildingData {
  id: string; // 真实的数据库ID
  name: string;
  level: number;
  maxLevel: number;
  icon: string;
  status: string;
  slot: string;
  description: string;
  effects: Array<{ type: string; value: string }>;
  upgradeCost: { gold: number; wood: number; stone: number };
  dailyOutput: Record<string, number> | null;
  assignedCharId: string | null;
  assignedCharacter?: {
    id: string;
    name: string;
    portrait: string;
    class: string;
    level: number;
  } | null;
}

interface TileAttributes {
  fertility: number;
  minerals: number;
  danger: number;
  discovery?: string;
}

interface CharacterOption {
  id: string;
  name: string;
  portrait: string;
  class: string;
  level: number;
  status: string;
}

interface BuildingDetailPanelProps {
  building: BuildingData;
  tileAttributes?: TileAttributes;
  availableCharacters?: CharacterOption[];
  playerResources?: { gold: number; wood: number; stone: number };
  onClose: () => void;
  onUpgradeSuccess?: () => void;
  onAssignSuccess?: () => void;
}

export default function BuildingDetailPanel({
  building,
  tileAttributes,
  availableCharacters = [],
  playerResources,
  onClose,
  onUpgradeSuccess,
  onAssignSuccess,
}: BuildingDetailPanelProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const utils = api.useUtils();

  // 升级建筑 mutation
  const upgradeMutation = api.building.upgrade.useMutation({
    onSuccess: () => {
      setUpgradeError(null);
      void utils.player.getStatus.invalidate();
      void utils.building.getAll.invalidate();
      onUpgradeSuccess?.();
    },
    onError: (err) => {
      setUpgradeError(err.message);
    },
  });

  // 分配角色 mutation
  const assignMutation = api.building.assignCharacter.useMutation({
    onSuccess: () => {
      setAssignError(null);
      setShowAssignDialog(false);
      void utils.player.getStatus.invalidate();
      void utils.building.getAll.invalidate();
      onAssignSuccess?.();
    },
    onError: (err) => {
      setAssignError(err.message);
    },
  });

  const canUpgrade = building.level < building.maxLevel;
  const assignedCharacter = building.assignedCharacter;

  // 检查资源是否足够
  const hasEnoughResources = playerResources
    ? playerResources.gold >= building.upgradeCost.gold &&
      playerResources.wood >= building.upgradeCost.wood &&
      playerResources.stone >= building.upgradeCost.stone
    : true;

  const handleUpgrade = () => {
    setUpgradeError(null);
    upgradeMutation.mutate({ buildingId: building.id });
  };

  const handleAssignCharacter = (characterId: string | null) => {
    setAssignError(null);
    assignMutation.mutate({ buildingId: building.id, characterId });
  };

  // 可分配的角色（排除正在工作的）
  const idleCharacters = availableCharacters.filter(
    (c) => c.status === "idle" || c.id === building.assignedCharId
  );

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-lg max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 固定头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-[#151518] border-b border-[#2a2a30] p-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#1a1a20] border-2 border-[#3a3a40] flex items-center justify-center text-4xl">
                {building.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-bold text-lg text-[#e0dcd0]">{building.name}</DialogTitle>
                  <span className="text-xs px-2 py-0.5 bg-[#c9a227] text-[#000]">
                    Lv.{building.level}
                  </span>
                </div>
                <div className="text-sm text-[#888]">
                  {building.slot === "core" && "核心建筑"}
                  {building.slot === "production" && "生产设施"}
                  {building.slot === "military" && "军事设施"}
                  {building.slot === "commerce" && "商业设施"}
                  {building.slot === "special" && "特殊建筑"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={building.status} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        {/* 可滚动内容 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="text-[#e0dcd0]">
            {/* 描述 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <p className="text-sm text-[#888] leading-relaxed">{building.description}</p>
            </div>

            {/* 等级进度 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>建筑等级</SectionTitle>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#888]">进度</span>
                  <span className="text-xs text-[#c9a227]">{building.level}/{building.maxLevel}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: building.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 ${i < building.level ? "bg-[#c9a227]" : "bg-[#2a2a30]"}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 当前效果 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>当前效果</SectionTitle>
              <div className="mt-2 space-y-2">
                {building.effects.map((effect, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[#1a1a20]">
                    <span className="text-sm text-[#888]">{effect.type}</span>
                    <span className="text-sm text-[#4a9] font-bold">{effect.value}</span>
                  </div>
                ))}
              </div>

              {/* 每日产出 */}
              {(() => {
                const output = building.dailyOutput;
                if (!output || Object.keys(output).length === 0) return null;
                return (
                  <div className="mt-3 p-2 bg-[#1a1a20] border border-[#4a9]/30">
                    <div className="text-xs text-[#4a9] mb-1">📦 每日产出</div>
                    <div className="flex gap-4">
                      {Object.entries(output).map(([resource, amount]) => (
                        <span key={resource} className="text-sm">
                          {resource === "food" && "🍞"}
                          {resource === "wood" && "🪵"}
                          {resource === "stone" && "🪨"}
                          {resource === "gold" && "🪙"}
                          <span className="text-[#c9a227] ml-1">+{amount}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* 分配角色 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>分配角色</SectionTitle>
              <div className="mt-2">
                {assignError && (
                  <div className="mb-2 p-2 bg-red-900/30 border border-red-500/50 text-red-400 text-sm">
                    {assignError}
                  </div>
                )}
                {assignedCharacter ? (
                  <div className="flex items-center justify-between p-3 bg-[#1a1a20] border border-[#4a9]/30">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{assignedCharacter.portrait}</span>
                      <div>
                        <div className="font-bold text-sm">{assignedCharacter.name}</div>
                        <div className="text-xs text-[#888]">{assignedCharacter.class} · Lv.{assignedCharacter.level}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignCharacter(null)}
                      disabled={assignMutation.isPending}
                      className="text-xs px-2 py-1 border border-[#666] text-[#666] hover:border-[#c9a227] hover:text-[#c9a227] disabled:opacity-50"
                    >
                      {assignMutation.isPending ? "移除中..." : "移除"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAssignDialog(true)}
                    className="w-full p-3 border-2 border-dashed border-[#3a3a40] text-[#666] hover:border-[#c9a227] hover:text-[#c9a227]"
                  >
                    + 分配角色提升效率
                  </button>
                )}
              </div>
            </div>

            {/* 地块属性 */}
            {tileAttributes && (
              <div className="p-4 border-b border-[#2a2a30]">
                <SectionTitle>地块属性</SectionTitle>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <TileStatBlock
                    icon="🌱"
                    label="肥沃度"
                    value={tileAttributes.fertility}
                    max={5}
                    color="#4a9"
                  />
                  <TileStatBlock
                    icon="⛏️"
                    label="矿产"
                    value={tileAttributes.minerals}
                    max={5}
                    color="#888"
                  />
                  <TileStatBlock
                    icon="⚠️"
                    label="危险度"
                    value={tileAttributes.danger}
                    max={5}
                    color="#e74c3c"
                  />
                </div>
                {tileAttributes.discovery && (
                  <div className="mt-2 p-2 bg-[#1a1a20] border border-[#c9a227]/30">
                    <span className="text-xs text-[#c9a227]">✨ 发现: </span>
                    <span className="text-sm">{tileAttributes.discovery}</span>
                  </div>
                )}
              </div>
            )}

            {/* 升级信息 */}
            {canUpgrade && (
              <div className="p-4 border-b border-[#2a2a30]">
                <SectionTitle>升级到 Lv.{building.level + 1}</SectionTitle>
                {upgradeError && (
                  <div className="mt-2 p-2 bg-red-900/30 border border-red-500/50 text-red-400 text-sm">
                    {upgradeError}
                  </div>
                )}
                <div className="mt-2 space-y-2">
                  {/* 升级消耗 */}
                  <div className="flex items-center justify-between p-2 bg-[#1a1a20]">
                    <span className="text-sm text-[#888]">消耗</span>
                    <div className="flex gap-3">
                      {building.upgradeCost.gold > 0 && (
                        <span className="text-sm">
                          🪙 <span className={playerResources && playerResources.gold < building.upgradeCost.gold ? "text-red-400" : "text-[#c9a227]"}>
                            {building.upgradeCost.gold}
                          </span>
                        </span>
                      )}
                      {building.upgradeCost.wood > 0 && (
                        <span className="text-sm">
                          🪵 <span className={playerResources && playerResources.wood < building.upgradeCost.wood ? "text-red-400" : "text-[#8b6914]"}>
                            {building.upgradeCost.wood}
                          </span>
                        </span>
                      )}
                      {building.upgradeCost.stone > 0 && (
                        <span className="text-sm">
                          🪨 <span className={playerResources && playerResources.stone < building.upgradeCost.stone ? "text-red-400" : "text-[#888]"}>
                            {building.upgradeCost.stone}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 升级提示 */}
                  {!hasEnoughResources && (
                    <div className="p-2 bg-[#1a1a20] border border-red-500/30 text-red-400 text-xs">
                      资源不足，无法升级
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="p-4 flex gap-2">
              {canUpgrade ? (
                <button
                  onClick={handleUpgrade}
                  disabled={upgradeMutation.isPending || !hasEnoughResources}
                  className="flex-1 py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#c9a227]"
                >
                  {upgradeMutation.isPending ? "升级中..." : "升级建筑"}
                </button>
              ) : (
                <div className="flex-1 py-2 text-center text-[#666] bg-[#1a1a20]">
                  已达最高等级
                </div>
              )}
              <button className="flex-1 py-2 border border-[#666] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227]">
                拆除
              </button>
            </div>

            {/* 角色分配对话框 */}
            {showAssignDialog && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAssignDialog(false)}>
                <div className="bg-[#101014] border-2 border-[#c9a227] p-4 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[#c9a227] font-bold">选择角色</span>
                    <button onClick={() => setShowAssignDialog(false)} className="text-[#666] hover:text-[#c9a227]">✕</button>
                  </div>
                  {assignError && (
                    <div className="mb-3 p-2 bg-red-900/30 border border-red-500/50 text-red-400 text-sm">
                      {assignError}
                    </div>
                  )}
                  {idleCharacters.length === 0 ? (
                    <div className="text-center py-6 text-[#666]">
                      <div className="text-3xl mb-2">👤</div>
                      <div>没有可分配的角色</div>
                      <div className="text-xs mt-1">所有角色都在工作中</div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {idleCharacters.map((char) => (
                        <button
                          key={char.id}
                          onClick={() => handleAssignCharacter(char.id)}
                          disabled={assignMutation.isPending}
                          className="w-full flex items-center gap-3 p-3 bg-[#1a1a20] hover:bg-[#222228] disabled:opacity-50"
                        >
                          <span className="text-2xl">{char.portrait}</span>
                          <div className="flex-1 text-left">
                            <div className="font-bold text-sm">{char.name}</div>
                            <div className="text-xs text-[#888]">{char.class} · Lv.{char.level}</div>
                          </div>
                          {char.id === building.assignedCharId && (
                            <span className="text-xs text-[#4a9]">当前</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[#c9a227] text-sm font-bold flex items-center gap-2">
      <span className="text-[#3a3a40]">▸</span>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    idle: { bg: "#2a2a30", text: "#666", label: "空闲" },
    working: { bg: "#4a9", text: "#000", label: "运作中" },
    ready: { bg: "#c9a227", text: "#000", label: "就绪" },
    upgrading: { bg: "#9b59b6", text: "#000", label: "升级中" },
  };

  const style = styles[status] ?? styles.idle!;

  return (
    <span
      className="text-xs px-2 py-0.5"
      style={{ backgroundColor: style?.bg ?? "#2a2a30", color: style?.text ?? "#666" }}
    >
      {style?.label ?? "空闲"}
    </span>
  );
}

function TileStatBlock({ icon, label, value, max, color }: {
  icon: string;
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="bg-[#1a1a20] p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className="flex justify-center gap-0.5 mt-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2"
            style={{ backgroundColor: i < value ? color : "#2a2a30" }}
          />
        ))}
      </div>
    </div>
  );
}
