// 领地面板 - 建筑和资源管理
import { api } from "~/trpc/react";

export default function TerritoryPanel() {
  const { data: player, isLoading } = api.player.getStatus.useQuery();

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-[#888] py-8">加载中...</div>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const buildings = player.buildings;

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-[#c9a227] flex items-center gap-2">
            <span>🏰</span>
            <span>领地</span>
          </h2>
          <div className="text-sm text-[#888]">
            建筑数量: {buildings.length}
          </div>
        </div>

        {/* 领地概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <OverviewCard
            icon="🪙"
            label="金币"
            value={player.gold}
            color="#c9a227"
          />
          <OverviewCard
            icon="🪵"
            label="木材"
            value={player.wood}
            color="#8b5a2b"
          />
          <OverviewCard
            icon="🪨"
            label="石材"
            value={player.stone}
            color="#708090"
          />
          <OverviewCard
            icon="🌾"
            label="粮食"
            value={player.food}
            color="#daa520"
          />
        </div>

        {/* 建筑列表 */}
        {buildings.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#3d3529] text-[#888]">
            <div className="text-4xl mb-2">🏗️</div>
            <div>暂无建筑</div>
            <div className="text-sm mt-2">使用建筑卡来建造新建筑</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {buildings.map((pb) => {
              const building = pb.building;

              return (
                <div
                  key={pb.id}
                  className="border border-[#3d3529] bg-[#12110d] p-4 hover:border-[#c9a227] transition-colors cursor-pointer"
                >
                  {/* 图标 */}
                  <div className="text-4xl text-center mb-2">{building.icon}</div>

                  {/* 名称和等级 */}
                  <div className="text-center mb-2">
                    <div className="text-[#e0dcd0] font-medium">{building.name}</div>
                    <div className="text-xs text-[#888]">
                      Lv.{pb.level} / {building.maxLevel}
                    </div>
                  </div>

                  {/* 等级进度条 */}
                  <div className="h-1 bg-[#1a1a20] mb-2">
                    <div
                      className="h-full bg-[#c9a227]"
                      style={{ width: `${(pb.level / building.maxLevel) * 100}%` }}
                    />
                  </div>

                  {/* 类型 */}
                  <div className="text-xs text-center text-[#666]">
                    {building.slot}
                  </div>

                  {/* 角色分配 */}
                  {pb.assignedCharId && (
                    <div className="mt-2 text-xs text-center text-[#4a9eff]">
                      👤 已分配
                    </div>
                  )}
                </div>
              );
            })}

            {/* 添加建筑按钮 */}
            <div
              className="border border-dashed border-[#3d3529] bg-[#0a0a08] p-4 flex items-center justify-center min-h-[160px] hover:border-[#c9a227] transition-colors cursor-pointer"
              onClick={() => alert("使用建筑卡来建造新建筑")}
            >
              <div className="text-center text-[#3d3529] hover:text-[#c9a227]">
                <div className="text-3xl mb-1">+</div>
                <div className="text-xs">建造</div>
              </div>
            </div>
          </div>
        )}

        {/* 提示 */}
        <div className="mt-6 p-3 border border-[#3d3529] bg-[#0a0a08] text-sm text-[#666]">
          <strong className="text-[#888]">提示:</strong> 使用建筑卡来建造新建筑。
          升级建筑可以提高产出效率，分配工人可以增加产量。
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="border border-[#3d3529] bg-[#12110d] p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-[#888]">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
