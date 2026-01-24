// 经济发展面板组件 - 使用 shadcn/ui

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { economyData, resourcesData } from "~/data/fixtures";

interface EconomyPanelProps {
  onClose: () => void;
  onBuildFacility?: () => void;
  onAssignWorker?: () => void;
  onViewHistory?: () => void;
}

export default function EconomyPanel({
  onClose,
  onBuildFacility,
  onAssignWorker,
  onViewHistory,
}: EconomyPanelProps) {
  const { dailyIncome, dailyExpense, netIncome, productionFacilities, weeklyTrend } = economyData;

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
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#4a9] flex items-center justify-center text-3xl">
                📊
              </div>
              <div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">经济发展</DialogTitle>
                <div className="text-sm text-[#888]">领地资源与生产管理</div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        {/* 可滚动内容 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="text-[#e0dcd0]">
            {/* 当前资源 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>当前资源</SectionTitle>
              <div className="grid grid-cols-5 gap-2 mt-2">
                <ResourceBlock icon="🪙" label="金币" value={resourcesData.gold} color="#c9a227" />
                <ResourceBlock icon="🪵" label="木材" value={resourcesData.wood} color="#8b6914" />
                <ResourceBlock icon="🪨" label="石材" value={resourcesData.stone} color="#888" />
                <ResourceBlock icon="🍞" label="粮食" value={resourcesData.food} color="#4a9" />
                <ResourceBlock icon="💎" label="水晶" value={resourcesData.crystals} color="#9b59b6" />
              </div>
            </div>

            {/* 日产出统计 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>日产出统计</SectionTitle>
              <div className="mt-2 space-y-2">
                {/* 收入 */}
                <div className="p-3 bg-[#1a1a20] border-l-2 border-[#4a9]">
                  <div className="text-xs text-[#4a9] mb-2">📈 收入</div>
                  <div className="grid grid-cols-5 gap-2">
                    <IncomeItem icon="🪙" value={dailyIncome.gold} />
                    <IncomeItem icon="🪵" value={dailyIncome.wood} />
                    <IncomeItem icon="🪨" value={dailyIncome.stone} />
                    <IncomeItem icon="🍞" value={dailyIncome.food} />
                    <IncomeItem icon="💎" value={dailyIncome.crystals} />
                  </div>
                </div>

                {/* 支出 */}
                <div className="p-3 bg-[#1a1a20] border-l-2 border-[#e74c3c]">
                  <div className="text-xs text-[#e74c3c] mb-2">📉 支出</div>
                  <div className="grid grid-cols-5 gap-2">
                    <ExpenseItem icon="🪙" value={dailyExpense.gold} />
                    <ExpenseItem icon="🪵" value={dailyExpense.wood} />
                    <ExpenseItem icon="🪨" value={dailyExpense.stone} />
                    <ExpenseItem icon="🍞" value={dailyExpense.food} />
                    <ExpenseItem icon="💎" value={dailyExpense.crystals} />
                  </div>
                </div>

                {/* 净收入 */}
                <div className="p-3 bg-[#1a1a20] border-l-2 border-[#c9a227]">
                  <div className="text-xs text-[#c9a227] mb-2">💰 净收入</div>
                  <div className="grid grid-cols-5 gap-2">
                    <NetItem icon="🪙" value={netIncome.gold} />
                    <NetItem icon="🪵" value={netIncome.wood} />
                    <NetItem icon="🪨" value={netIncome.stone} />
                    <NetItem icon="🍞" value={netIncome.food} />
                    <NetItem icon="💎" value={netIncome.crystals} />
                  </div>
                </div>
              </div>
            </div>

            {/* 生产设施 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>生产设施</SectionTitle>
              <div className="mt-2 space-y-2">
                {productionFacilities.map((facility, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a20]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg">
                        {facility.name === "农田" && "🌾"}
                        {facility.name === "矿场" && "⛏️"}
                        {facility.name === "伐木场" && "🪓"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{facility.name}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-[#c9a227] text-[#000]">
                            Lv.{facility.level}
                          </span>
                        </div>
                        <div className="text-xs text-[#888] mt-0.5">
                          {facility.assignedChar ? (
                            <span className="text-[#4a9]">👤 {facility.assignedChar}</span>
                          ) : (
                            <span className="text-[#666]">未分配</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-[#4a9] font-bold">{facility.output}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7日趋势 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>7日趋势</SectionTitle>
              <div className="mt-3">
                {/* 简易文字图表 */}
                <div className="bg-[#1a1a20] p-3">
                  <div className="text-xs text-[#888] mb-2">🪙 金币</div>
                  <div className="flex items-end gap-1 h-16">
                    {weeklyTrend.map((day, i) => {
                      const maxGold = Math.max(...weeklyTrend.map(d => d.gold));
                      const heightPercent = (day.gold / maxGold) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-[#c9a227] min-h-[4px]"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <div className="text-[10px] text-[#666] mt-1">D{day.day}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#1a1a20] p-3 mt-2">
                  <div className="text-xs text-[#888] mb-2">🍞 粮食</div>
                  <div className="flex items-end gap-1 h-16">
                    {weeklyTrend.map((day, i) => {
                      const maxFood = Math.max(...weeklyTrend.map(d => d.food));
                      const heightPercent = (day.food / maxFood) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-[#4a9] min-h-[4px]"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <div className="text-[10px] text-[#666] mt-1">D{day.day}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-4 flex gap-2">
              <button
                onClick={onBuildFacility}
                className="flex-1 py-2 border border-[#4a9] text-[#4a9] hover:bg-[#4a9] hover:text-[#08080a]"
              >
                建造设施
              </button>
              <button
                onClick={onAssignWorker}
                className="flex-1 py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a]"
              >
                分配工人
              </button>
              <button
                onClick={onViewHistory}
                className="flex-1 py-2 border border-[#666] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227]"
              >
                交易记录
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

function ResourceBlock({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#1a1a20] p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className="font-bold" style={{ color }}>{value.toLocaleString()}</div>
    </div>
  );
}

function IncomeItem({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="text-center">
      <span className="text-sm">{icon}</span>
      <div className="text-xs text-[#4a9]">{value > 0 ? `+${value}` : "-"}</div>
    </div>
  );
}

function ExpenseItem({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="text-center">
      <span className="text-sm">{icon}</span>
      <div className="text-xs text-[#e74c3c]">{value > 0 ? `-${value}` : "-"}</div>
    </div>
  );
}

function NetItem({ icon, value }: { icon: string; value: number }) {
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
}
