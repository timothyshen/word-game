// 玩家状态HUD - 显示体力、资源、当日分数
import { api } from "~/utils/api";

interface PlayerHUDProps {
  onSettlement?: () => void;
}

export default function PlayerHUD({ onSettlement }: PlayerHUDProps) {
  const { data: player, isLoading, error } = api.player.getOrCreate.useQuery();
  const { data: settlement } = api.settlement.checkSettlement.useQuery(undefined, {
    enabled: !!player,
  });

  if (isLoading) {
    return (
      <div className="h-14 bg-[#12110d] border-b border-[#3d3529] flex items-center justify-center">
        <span className="text-[#888] text-sm">加载玩家数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-14 bg-[#12110d] border-b border-[#3d3529] flex items-center justify-center">
        <span className="text-[#ff4444] text-sm">
          错误: {error.message}
        </span>
      </div>
    );
  }

  if (!player) return null;

  // 计算体力恢复时间
  const staminaPercent = (player.stamina / player.maxStamina) * 100;
  const minutesToFull = player.stamina < player.maxStamina
    ? Math.ceil((player.maxStamina - player.stamina) / player.staminaPerMin)
    : 0;

  return (
    <div className="bg-[#12110d] border-b border-[#3d3529] px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* 左侧：玩家信息 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#c9a227] text-lg">👤</span>
            <span className="text-[#e0dcd0] font-medium">{player.name}</span>
            <span className="text-xs text-[#888] border border-[#3d3529] px-1">
              {player.tier}阶
            </span>
          </div>

          {/* 体力条 */}
          <div className="flex items-center gap-2">
            <span className="text-[#4a9eff]">⚡</span>
            <div className="w-24 h-2 bg-[#1a1a20] border border-[#3d3529] relative">
              <div
                className="absolute inset-y-0 left-0 bg-[#4a9eff]"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
            <span className="text-xs text-[#888]">
              {player.stamina}/{player.maxStamina}
              {minutesToFull > 0 && (
                <span className="text-[#666] ml-1">({minutesToFull}分)</span>
              )}
            </span>
          </div>
        </div>

        {/* 中间：资源 */}
        <div className="flex items-center gap-4 text-sm">
          <ResourceItem icon="🪙" value={player.gold} label="金币" color="#c9a227" />
          <ResourceItem icon="🪵" value={player.wood} label="木材" color="#8b5a2b" />
          <ResourceItem icon="🪨" value={player.stone} label="石材" color="#708090" />
          <ResourceItem icon="🌾" value={player.food} label="粮食" color="#daa520" />
          <ResourceItem icon="💎" value={player.crystals} label="水晶" color="#9966cc" />
        </div>

        {/* 右侧：当日分数 & 结算 */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-[#888]">第{player.currentGameDay}日</div>
            <div className="flex items-center gap-1">
              <span className="text-[#c9a227]">★</span>
              <span className="text-[#e0dcd0]">{player.currentDayScore}</span>
              <span className="text-xs text-[#666]">分</span>
            </div>
          </div>

          {settlement?.needsSettlement && (
            <button
              onClick={onSettlement}
              className="px-3 py-1 bg-[#c9a227] text-[#0a0a08] text-sm font-medium hover:bg-[#ddb52f] animate-pulse"
            >
              结算 ({settlement.pendingDays}日)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceItem({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span>{icon}</span>
      <span style={{ color }}>{value.toLocaleString()}</span>
    </div>
  );
}
