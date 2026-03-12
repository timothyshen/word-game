// 经济发展面板组件 - 使用真实 API 数据

import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { SectionTitle } from "./character/helpers";

interface EconomyPanelProps {
  onClose: () => void;
}

export default function EconomyPanel({ onClose }: EconomyPanelProps) {
  // 获取玩家数据（包含资源）
  const { data: player, isLoading: playerLoading } = api.player.getStatus.useQuery();

  // 获取每日产出
  const { data: dailyOutput, isLoading: outputLoading } = api.building.calculateDailyOutput.useQuery();

  // 获取所有建筑
  const { data: buildings } = api.building.getAll.useQuery();

  const isLoading = playerLoading || outputLoading;

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-8">
          <div className="text-center font-display text-[#c9a227] text-lg mb-2">经济发展</div>
          <div className="text-center text-[#5a6a7a] font-game-serif">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const totalOutput = dailyOutput?.totalOutput ?? { gold: 0, wood: 0, stone: 0, food: 0, crystals: 0 };
  const consumption = dailyOutput?.consumption ?? { food: 0 };
  const netOutput = dailyOutput?.netOutput ?? { gold: 0, wood: 0, stone: 0, food: 0, crystals: 0 };
  const breakdown = dailyOutput?.breakdown ?? [];

  // 生产设施（有产出的建筑）
  const productionFacilities = breakdown.filter(b => Object.keys(b.output).length > 0);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 max-w-4xl max-h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 固定头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] p-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-[#5a6a7a]">领地资源与生产管理</div>
              <DialogTitle className="font-display text-2xl mt-1 text-[#e0dcd0]">经济发展</DialogTitle>
            </div>
            <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
          </div>
          <div className="mt-3 h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent" />
        </DialogHeader>

        {/* 可滚动内容 */}
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
          <div className="text-[#e0dcd0]">
            {/* 当前资源 */}
            <div className="p-4 border-b border-[#2a3a4a]/30">
              <SectionTitle>当前资源</SectionTitle>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                <ResourceBlock icon="🪙" label="金币" value={player?.gold ?? 0} color="#c9a227" />
                <ResourceBlock icon="🪵" label="木材" value={player?.wood ?? 0} color="#8b6914" />
                <ResourceBlock icon="🪨" label="石材" value={player?.stone ?? 0} color="#888" />
                <ResourceBlock icon="🍞" label="粮食" value={player?.food ?? 0} color="#4a9" />
                <ResourceBlock icon="💎" label="水晶" value={player?.crystals ?? 0} color="#9b59b6" />
              </div>
            </div>

            {/* 日产出统计 */}
            <div className="p-4 border-b border-[#2a3a4a]/30">
              <SectionTitle>日产出统计</SectionTitle>
              <div className="mt-2 space-y-2">
                {/* 收入 */}
                <div className="p-3 bg-[#0d1020]/60 border-l-2 border-[#4a9]">
                  <div className="text-xs text-[#4a9] mb-2">收入</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    <IncomeItem icon="🪙" value={totalOutput.gold ?? 0} />
                    <IncomeItem icon="🪵" value={totalOutput.wood ?? 0} />
                    <IncomeItem icon="🪨" value={totalOutput.stone ?? 0} />
                    <IncomeItem icon="🍞" value={totalOutput.food ?? 0} />
                    <IncomeItem icon="💎" value={totalOutput.crystals ?? 0} />
                  </div>
                </div>

                {/* 支出 */}
                <div className="p-3 bg-[#0d1020]/60 border-l-2 border-[#e74c3c]">
                  <div className="text-xs text-[#e74c3c] mb-2">支出</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    <ExpenseItem icon="🪙" value={0} />
                    <ExpenseItem icon="🪵" value={0} />
                    <ExpenseItem icon="🪨" value={0} />
                    <ExpenseItem icon="🍞" value={consumption.food ?? 0} />
                    <ExpenseItem icon="💎" value={0} />
                  </div>
                  <div className="text-xs text-[#666] mt-1">
                    人口消耗: {player?.characters.length ?? 0} 人 × 5 粮食/日
                  </div>
                </div>

                {/* 净收入 */}
                <div className="p-3 bg-[#0d1020]/60 border-l-2 border-[#c9a227]">
                  <div className="text-xs text-[#c9a227] mb-2">💰 净收入</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    <NetItem icon="🪙" value={netOutput.gold ?? 0} />
                    <NetItem icon="🪵" value={netOutput.wood ?? 0} />
                    <NetItem icon="🪨" value={netOutput.stone ?? 0} />
                    <NetItem icon="🍞" value={netOutput.food ?? 0} />
                    <NetItem icon="💎" value={netOutput.crystals ?? 0} />
                  </div>
                </div>
              </div>
            </div>

            {/* 生产设施 */}
            <div className="p-4 border-b border-[#2a3a4a]/30">
              <SectionTitle>生产设施</SectionTitle>
              <div className="mt-2 space-y-2">
                {productionFacilities.length === 0 ? (
                  <div className="text-center text-[#666] py-4">暂无生产设施</div>
                ) : (
                  productionFacilities.map((facility, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#0d1020]/60">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#050810] flex items-center justify-center text-lg">
                          {facility.icon ?? "🏠"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{facility.buildingName}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-[#c9a227] text-[#000]">
                              Lv.{facility.level}
                            </span>
                          </div>
                          <div className="text-xs text-[#888] mt-0.5">
                            {facility.hasWorker ? (
                              <span className="text-[#4a9]">👤 已分配工人 (+50%)</span>
                            ) : (
                              <span className="text-[#666]">未分配工人</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#4a9] font-bold">
                          {Object.entries(facility.output).map(([res, amt]) => (
                            <span key={res} className="mr-2">
                              {res === "food" && "🍞"}
                              {res === "wood" && "🪵"}
                              {res === "stone" && "🪨"}
                              {res === "gold" && "🪙"}
                              +{amt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 所有建筑 */}
            <div className="p-4 border-b border-[#2a3a4a]/30">
              <SectionTitle>所有建筑 ({buildings?.length ?? 0})</SectionTitle>
              <div className="mt-2 space-y-2">
                {buildings?.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2 bg-[#0d1020]/60 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{b.building.icon}</span>
                      <span>{b.building.name}</span>
                      <span className="text-xs text-[#c9a227]">Lv.{b.level}</span>
                    </div>
                    <span className={`text-xs ${b.assignedCharId ? "text-[#4a9]" : "text-[#666]"}`}>
                      {b.assignedCharId ? "运作中" : "空闲"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-4">
              <button
                onClick={onClose}
                className="w-full py-2 border border-[#2a3a4a] text-[#5a6a7a] hover:border-[#c9a227]/40 hover:text-[#c9a227]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ResourceBlock = memo(function ResourceBlock({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#0d1020]/60 p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className="font-bold" style={{ color }}>{value.toLocaleString()}</div>
    </div>
  );
});

const IncomeItem = memo(function IncomeItem({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="text-center">
      <span className="text-sm">{icon}</span>
      <div className="text-xs text-[#4a9]">{value > 0 ? `+${value}` : "-"}</div>
    </div>
  );
});

const ExpenseItem = memo(function ExpenseItem({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="text-center">
      <span className="text-sm">{icon}</span>
      <div className="text-xs text-[#e74c3c]">{value > 0 ? `-${value}` : "-"}</div>
    </div>
  );
});

const NetItem = memo(function NetItem({ icon, value }: { icon: string; value: number }) {
  const color = value > 0 ? "#4a9" : value < 0 ? "#e74c3c" : "#888";
  const prefix = value > 0 ? "+" : "";
  return (
    <div className="text-center">
      <span className="text-sm">{icon}</span>
      <div className="text-xs font-bold" style={{ color }}>
        {value !== 0 ? `${prefix}${value}` : "-"}
      </div>
    </div>
  );
});
