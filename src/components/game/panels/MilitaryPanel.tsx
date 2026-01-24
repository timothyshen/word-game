// 军事面板组件 - 使用 shadcn/ui

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { militaryData } from "~/data/fixtures";

interface MilitaryPanelProps {
  onClose: () => void;
  onFormation?: () => void;
  onTrainSoldiers?: () => void;
  onExpedition?: () => void;
  onDefense?: () => void;
}

export default function MilitaryPanel({
  onClose,
  onFormation,
  onTrainSoldiers,
  onExpedition,
  onDefense,
}: MilitaryPanelProps) {
  const {
    totalPower,
    defensePower,
    morale,
    availableCharacters,
    workingCharacters,
    soldiers,
    maxSoldiers,
    reserveSoldiers,
    militaryFacilities,
    unbuiltFacilities,
    threats,
  } = militaryData;

  const threatColors: Record<string, string> = {
    low: "#4a9",
    medium: "#c9a227",
    high: "#e67e22",
    critical: "#e74c3c",
  };

  const threatLabels: Record<string, string> = {
    low: "安全",
    medium: "中等",
    high: "警戒",
    critical: "危急",
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 固定头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-[#151518] border-b border-[#2a2a30] p-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#e74c3c] flex items-center justify-center text-3xl">
                ⚔️
              </div>
              <div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">军事总览</DialogTitle>
                <div className="text-sm text-[#888]">战斗力量与防御部署</div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        {/* 可滚动内容 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="text-[#e0dcd0]">
            {/* 战斗力评估 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>战斗力评估</SectionTitle>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <PowerBlock icon="⚔️" label="总战力" value={totalPower} color="#e74c3c" />
                <PowerBlock icon="🛡️" label="防御力" value={defensePower} color="#59b" />
                <div className="bg-[#1a1a20] p-3 text-center">
                  <div className="text-lg">💪</div>
                  <div className="text-xs text-[#888]">士气</div>
                  <div className="mt-1">
                    <div className="h-2 bg-[#2a2a30] mx-auto w-16">
                      <div
                        className="h-full bg-[#4a9]"
                        style={{ width: `${morale}%` }}
                      />
                    </div>
                    <div className="text-xs text-[#4a9] mt-1">{morale}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 兵力配置 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>兵力配置</SectionTitle>

              {/* 可用角色 */}
              <div className="mt-2">
                <div className="text-xs text-[#888] mb-2">可用角色 ({availableCharacters.length}/{availableCharacters.length + workingCharacters.length})</div>
                <div className="space-y-2">
                  {availableCharacters.map((char) => (
                    <div key={char.id} className="flex items-center justify-between p-2 bg-[#1a1a20] border-l-2 border-[#4a9]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg">
                          {char.class === "战士" && "⚔️"}
                          {char.class === "学者" && "📖"}
                          {char.class === "农夫" && "👨‍🌾"}
                          {char.class === "工匠" && "🔨"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{char.name}</span>
                            <span className="text-xs text-[#888]">{char.class} Lv.{char.level}</span>
                          </div>
                          <div className="text-xs text-[#666]">
                            攻击 <span className="text-[#e74c3c]">{char.attack}</span> /
                            防御 <span className="text-[#59b]">{char.defense}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-[#4a9] text-[#000]">待命</span>
                    </div>
                  ))}

                  {workingCharacters.map((char) => (
                    <div key={char.id} className="flex items-center justify-between p-2 bg-[#1a1a20] border-l-2 border-[#666]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg opacity-50">
                          {char.class === "战士" && "⚔️"}
                          {char.class === "学者" && "📖"}
                          {char.class === "农夫" && "👨‍🌾"}
                          {char.class === "工匠" && "🔨"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#666]">{char.name}</span>
                            <span className="text-xs text-[#555]">{char.class} Lv.{char.level}</span>
                          </div>
                          <div className="text-xs text-[#555]">
                            🔧 {char.workingAt}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-[#2a2a30] text-[#666]">工作中</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 驻防士兵 */}
              <div className="mt-4">
                <div className="text-xs text-[#888] mb-2">驻防部队</div>
                <div className="p-3 bg-[#1a1a20]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏰</span>
                      <span className="text-sm">士兵</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#c9a227] font-bold">{soldiers}</span>
                      <span className="text-[#888]">/{maxSoldiers}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#2a2a30] mt-2">
                    <div
                      className="h-full bg-[#c9a227]"
                      style={{ width: `${(soldiers / maxSoldiers) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-[#666]">
                    <span>预备兵: {reserveSoldiers}</span>
                    <span>总兵力: {soldiers + reserveSoldiers}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 军事设施 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>军事设施</SectionTitle>
              <div className="mt-2 space-y-2">
                {militaryFacilities.map((facility, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a20]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg">
                        {facility.name === "兵营" && "🏠"}
                        {facility.name === "训练场" && "🎯"}
                        {facility.name === "城墙" && "🧱"}
                      </div>
                      <div>
                        <span className="font-bold text-sm">{facility.name}</span>
                        <span className="text-xs px-1.5 py-0.5 ml-2 bg-[#c9a227] text-[#000]">
                          Lv.{facility.level}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {facility.effects.map((effect, j) => (
                        <div key={j} className="text-xs text-[#4a9]">{effect}</div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 未建造设施 */}
                {unbuiltFacilities.map((name, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a20] border border-dashed border-[#3a3a40]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg text-[#555]">
                        {name === "训练场" && "🎯"}
                        {name === "城墙" && "🧱"}
                      </div>
                      <span className="text-sm text-[#666]">{name}</span>
                    </div>
                    <span className="text-xs text-[#666]">未建造</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 威胁情报 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>威胁情报</SectionTitle>
              <div className="mt-2">
                {/* 安全等级 */}
                <div className="flex items-center justify-between p-3 bg-[#1a1a20]">
                  <span className="text-sm text-[#888]">领地安全</span>
                  <span
                    className="text-sm font-bold px-2 py-0.5"
                    style={{
                      backgroundColor: threatColors[threats.level],
                      color: "#000"
                    }}
                  >
                    {threatLabels[threats.level]}
                  </span>
                </div>

                {/* 周边威胁 */}
                <div className="mt-2 space-y-2">
                  {threats.nearby.map((threat, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#1a1a20] border-l-2 border-[#e67e22]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">⚠️</span>
                        <span className="text-sm">{threat.name}</span>
                      </div>
                      <div className="text-xs text-[#888]">
                        <span className="text-[#c9a227]">{threat.direction}</span>
                        <span className="mx-1">·</span>
                        <span>{threat.distance}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 预计入侵 */}
                {threats.nextInvasion && (
                  <div className="mt-2 p-3 bg-[#1a1a20] border border-[#e74c3c]/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🚨</span>
                        <span className="text-sm text-[#e74c3c]">预计入侵</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-[#e74c3c] text-[#000] font-bold">
                        {threats.nextInvasion.daysUntil}日后
                      </span>
                    </div>
                    <div className="text-sm text-[#888] mt-1">
                      威胁: {threats.nextInvasion.type}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-4 grid grid-cols-2 gap-2">
              <button
                onClick={onFormation}
                className="py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a]"
              >
                编队
              </button>
              <button
                onClick={onTrainSoldiers}
                className="py-2 border border-[#4a9] text-[#4a9] hover:bg-[#4a9] hover:text-[#08080a]"
              >
                训练士兵
              </button>
              <button
                onClick={onExpedition}
                className="py-2 border border-[#e74c3c] text-[#e74c3c] hover:bg-[#e74c3c] hover:text-[#08080a]"
              >
                出征
              </button>
              <button
                onClick={onDefense}
                className="py-2 border border-[#59b] text-[#59b] hover:bg-[#59b] hover:text-[#08080a]"
              >
                防御部署
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

function PowerBlock({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#1a1a20] p-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
