// 军事面板组件 - 使用真实 API 数据

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface MilitaryPanelProps {
  onClose: () => void;
}

export default function MilitaryPanel({ onClose }: MilitaryPanelProps) {
  // 获取玩家数据（包含角色和建筑）
  const { data: player, isLoading } = api.player.getStatus.useQuery();

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#c9a227] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const characters = player?.characters ?? [];
  const buildings = player?.buildings ?? [];

  // 计算战斗力
  const availableCharacters = characters.filter(c => c.status === "idle");
  const workingCharacters = characters.filter(c => c.status === "working");

  const totalAttack = characters.reduce((sum, c) => sum + c.attack, 0);
  const totalDefense = characters.reduce((sum, c) => sum + c.defense, 0);
  const totalPower = totalAttack + totalDefense;

  // 军事建筑
  const militaryBuildings = buildings.filter(b => b.building.slot === "military");

  // 计算平均士气（基于角色HP百分比）
  const avgHpPercent = characters.length > 0
    ? characters.reduce((sum, c) => sum + (c.hp / c.maxHp) * 100, 0) / characters.length
    : 100;

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
                <PowerBlock icon="🛡️" label="防御力" value={totalDefense} color="#59b" />
                <div className="bg-[#1a1a20] p-3 text-center">
                  <div className="text-lg">💪</div>
                  <div className="text-xs text-[#888]">士气</div>
                  <div className="mt-1">
                    <div className="h-2 bg-[#2a2a30] mx-auto w-16">
                      <div
                        className="h-full bg-[#4a9]"
                        style={{ width: `${avgHpPercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-[#4a9] mt-1">{Math.round(avgHpPercent)}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 兵力配置 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>兵力配置</SectionTitle>

              {/* 可用角色 */}
              <div className="mt-2">
                <div className="text-xs text-[#888] mb-2">
                  角色 ({availableCharacters.length} 待命 / {workingCharacters.length} 工作中)
                </div>

                {characters.length === 0 ? (
                  <div className="text-center text-[#666] py-4">暂无角色</div>
                ) : (
                  <div className="space-y-2">
                    {availableCharacters.map((char) => (
                      <div key={char.id} className="flex items-center justify-between p-2 bg-[#1a1a20] border-l-2 border-[#4a9]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg">
                            {char.character.portrait}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{char.character.name}</span>
                              <span className="text-xs text-[#888]">{char.character.baseClass} Lv.{char.level}</span>
                            </div>
                            <div className="text-xs text-[#666]">
                              攻击 <span className="text-[#e74c3c]">{char.attack}</span> /
                              防御 <span className="text-[#59b]">{char.defense}</span> /
                              HP <span className="text-[#4a9]">{char.hp}/{char.maxHp}</span>
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
                            {char.character.portrait}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#666]">{char.character.name}</span>
                              <span className="text-xs text-[#555]">{char.character.baseClass} Lv.{char.level}</span>
                            </div>
                            <div className="text-xs text-[#555]">
                              🔧 {char.workingAt ?? "工作中"}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-[#2a2a30] text-[#666]">工作中</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 军事设施 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>军事设施</SectionTitle>
              <div className="mt-2 space-y-2">
                {militaryBuildings.length === 0 ? (
                  <div className="text-center text-[#666] py-4">暂无军事设施</div>
                ) : (
                  militaryBuildings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-[#1a1a20]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg">
                          {b.building.icon}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-white">{b.building.name}</span>
                          <span className="text-xs px-1.5 py-0.5 ml-2 bg-[#c9a227] text-[#000]">
                            Lv.{b.level}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-[#888]">
                        {b.building.description}
                      </div>
                    </div>
                  ))
                )}

                {/* 未建造提示 */}
                {militaryBuildings.length === 0 && (
                  <div className="p-3 bg-[#1a1a20] border border-dashed border-[#3a3a40] text-center">
                    <span className="text-sm text-[#666]">使用建筑卡建造兵营等军事设施</span>
                  </div>
                )}
              </div>
            </div>

            {/* 威胁情报 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>威胁情报</SectionTitle>
              <div className="mt-2">
                {/* 安全等级 */}
                <div className="flex items-center justify-between p-3 bg-[#1a1a20]">
                  <span className="text-sm text-[#888]">领地安全</span>
                  <span className="text-sm font-bold px-2 py-0.5 bg-[#4a9] text-[#000]">
                    {totalPower >= 100 ? "安全" : totalPower >= 50 ? "中等" : "警戒"}
                  </span>
                </div>

                {/* 战力提示 */}
                <div className="mt-2 p-3 bg-[#1a1a20] text-sm text-[#888]">
                  <div className="flex items-center gap-2">
                    <span>💡</span>
                    <span>
                      {totalPower < 50
                        ? "战力较低，建议招募更多角色"
                        : totalPower < 100
                        ? "战力中等，可以尝试探索城外"
                        : "战力充足，可以挑战更强的敌人"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-4">
              <button
                onClick={onClose}
                className="w-full py-2 border border-[#666] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227]"
              >
                关闭
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
