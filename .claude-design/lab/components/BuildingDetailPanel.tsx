// 建筑详情面板组件 - 使用 shadcn/ui

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { buildingsData, charactersData } from "../data/fixtures";
import type { TileAttributes } from "../data/fixtures";

type Building = typeof buildingsData[0];

interface BuildingDetailPanelProps {
  building: Building;
  tileAttributes?: TileAttributes;
  onClose: () => void;
  onUpgrade?: () => void;
  onAssignCharacter?: () => void;
  onRemoveCharacter?: () => void;
}

export default function BuildingDetailPanel({
  building,
  tileAttributes,
  onClose,
  onUpgrade,
  onAssignCharacter,
  onRemoveCharacter,
}: BuildingDetailPanelProps) {
  const canUpgrade = building.level < building.maxLevel;
  const assignedCharacter = "assignedCharId" in building && building.assignedCharId
    ? charactersData.find(c => c.id === building.assignedCharId)
    : null;

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
              {building.dailyOutput && (
                <div className="mt-3 p-2 bg-[#1a1a20] border border-[#4a9]/30">
                  <div className="text-xs text-[#4a9] mb-1">📦 每日产出</div>
                  <div className="flex gap-4">
                    {Object.entries(building.dailyOutput).map(([resource, amount]) => (
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
              )}

              {/* 可锻造配方 */}
              {"recipes" in building && building.recipes && (
                <div className="mt-3 p-2 bg-[#1a1a20] border border-[#c9a227]/30">
                  <div className="text-xs text-[#c9a227] mb-1">🔨 可锻造</div>
                  <div className="flex flex-wrap gap-2">
                    {building.recipes.map((recipe, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-[#2a2a30]">{recipe}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 解锁世界 */}
              {"unlockedWorlds" in building && building.unlockedWorlds && (
                <div className="mt-3 p-2 bg-[#1a1a20] border border-[#9b59b6]/30">
                  <div className="text-xs text-[#9b59b6] mb-1">🌀 可前往世界</div>
                  <div className="flex flex-wrap gap-2">
                    {building.unlockedWorlds.map((world, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-[#2a2a30]">{world}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 分配角色 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>分配角色</SectionTitle>
              <div className="mt-2">
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
                      onClick={onRemoveCharacter}
                      className="text-xs px-2 py-1 border border-[#666] text-[#666] hover:border-[#c9a227] hover:text-[#c9a227]"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onAssignCharacter}
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
                <div className="mt-2 space-y-2">
                  {/* 升级消耗 */}
                  <div className="flex items-center justify-between p-2 bg-[#1a1a20]">
                    <span className="text-sm text-[#888]">消耗</span>
                    <div className="flex gap-3">
                      {"gold" in building.upgradeCost && building.upgradeCost.gold && (
                        <span className="text-sm">🪙 <span className="text-[#c9a227]">{building.upgradeCost.gold}</span></span>
                      )}
                      {"wood" in building.upgradeCost && building.upgradeCost.wood && (
                        <span className="text-sm">🪵 <span className="text-[#8b6914]">{building.upgradeCost.wood}</span></span>
                      )}
                      {"stone" in building.upgradeCost && building.upgradeCost.stone && (
                        <span className="text-sm">🪨 <span className="text-[#888]">{building.upgradeCost.stone}</span></span>
                      )}
                      {"crystals" in building.upgradeCost && building.upgradeCost.crystals && (
                        <span className="text-sm">💎 <span className="text-[#9b59b6]">{building.upgradeCost.crystals}</span></span>
                      )}
                    </div>
                  </div>
                  {/* 升级时间 */}
                  <div className="flex items-center justify-between p-2 bg-[#1a1a20]">
                    <span className="text-sm text-[#888]">时间</span>
                    <span className="text-sm text-[#c9a227]">⏱️ {building.upgradeTime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="p-4 flex gap-2">
              {canUpgrade ? (
                <button
                  onClick={onUpgrade}
                  className="flex-1 py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a]"
                >
                  升级建筑
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
