// 野外面板 - 冒险和探索
import { api } from "~/trpc/react";

export default function WildernessPanel() {
  const { data: player } = api.player.getStatus.useQuery();

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-[#c9a227] flex items-center gap-2">
            <span>🌲</span>
            <span>野外</span>
          </h2>
          {player && (
            <div className="text-sm text-[#888]">
              体力: <span className="text-[#4a9eff]">{player.stamina}</span> / {player.maxStamina}
            </div>
          )}
        </div>

        {/* 野外地图区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 探索区域 */}
          <AreaCard
            icon="🌲"
            name="密林深处"
            description="充满危险与机遇的原始森林"
            difficulty="普通"
            staminaCost={10}
            rewards={["木材", "草药", "野兽"]}
            onExplore={() => alert("探索功能开发中")}
          />

          <AreaCard
            icon="⛰️"
            name="矿山遗迹"
            description="废弃的古老矿山，或许藏有宝藏"
            difficulty="困难"
            staminaCost={15}
            rewards={["矿石", "宝石", "古物"]}
            onExplore={() => alert("探索功能开发中")}
          />

          <AreaCard
            icon="🏚️"
            name="荒废村落"
            description="被遗弃的村庄，传闻有鬼魂出没"
            difficulty="危险"
            staminaCost={20}
            rewards={["遗物", "招募令", "稀有材料"]}
            onExplore={() => alert("探索功能开发中")}
          />
        </div>

        {/* 特殊事件 */}
        <div className="mb-6">
          <h3 className="text-lg text-[#c9a227] mb-3">限时事件</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EventCard
              icon="👹"
              name="野外BOSS"
              description="强大的怪物出现在野外！"
              status="可挑战"
              reward="稀有卡牌"
              onAction={() => alert("BOSS战斗开发中")}
            />

            <EventCard
              icon="🏪"
              name="流浪商人"
              description="神秘商人正在售卖稀有物品"
              status="已刷新"
              reward="特殊道具"
              onAction={() => alert("商人交易开发中")}
            />
          </div>
        </div>

        {/* 卡牌祭坛 */}
        <div className="border border-[#3d3529] bg-[#12110d] p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">🎴</div>
            <div>
              <h3 className="text-lg text-[#c9a227]">卡牌祭坛</h3>
              <p className="text-sm text-[#888]">抽取、合成、献祭卡牌的神秘场所</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => alert("抽卡功能开发中")}
              className="py-3 bg-[#1a1a20] border border-[#3d3529] text-[#e0dcd0] hover:border-[#c9a227] transition-colors"
            >
              🎲 抽取
            </button>
            <button
              onClick={() => alert("合成功能开发中")}
              className="py-3 bg-[#1a1a20] border border-[#3d3529] text-[#e0dcd0] hover:border-[#c9a227] transition-colors"
            >
              🔮 合成
            </button>
            <button
              onClick={() => alert("献祭功能开发中")}
              className="py-3 bg-[#1a1a20] border border-[#3d3529] text-[#e0dcd0] hover:border-[#c9a227] transition-colors"
            >
              🔥 献祭
            </button>
          </div>
        </div>

        {/* 提示 */}
        <div className="mt-6 p-3 border border-[#3d3529] bg-[#0a0a08] text-sm text-[#666]">
          <strong className="text-[#888]">提示:</strong> 探索野外需要消耗体力。
          体力会随时间自动恢复。不同区域有不同的难度和奖励。
        </div>
      </div>
    </div>
  );
}

function AreaCard({
  icon,
  name,
  description,
  difficulty,
  staminaCost,
  rewards,
  onExplore,
}: {
  icon: string;
  name: string;
  description: string;
  difficulty: string;
  staminaCost: number;
  rewards: string[];
  onExplore: () => void;
}) {
  const difficultyColors: Record<string, string> = {
    普通: "#4a9eff",
    困难: "#ff9900",
    危险: "#ff4444",
  };

  return (
    <div className="border border-[#3d3529] bg-[#12110d] p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <h4 className="text-[#e0dcd0] font-medium">{name}</h4>
          <div
            className="text-xs"
            style={{ color: difficultyColors[difficulty] }}
          >
            {difficulty}
          </div>
        </div>
      </div>

      <p className="text-sm text-[#888] mb-3">{description}</p>

      <div className="text-xs text-[#666] mb-3">
        可能获得: {rewards.join("、")}
      </div>

      <button
        onClick={onExplore}
        className="w-full py-2 bg-[#1a1a20] border border-[#3d3529] text-sm hover:border-[#c9a227] transition-colors"
      >
        探索 (⚡{staminaCost})
      </button>
    </div>
  );
}

function EventCard({
  icon,
  name,
  description,
  status,
  reward,
  onAction,
}: {
  icon: string;
  name: string;
  description: string;
  status: string;
  reward: string;
  onAction: () => void;
}) {
  return (
    <div className="border border-[#c9a227]/50 bg-[#1a1510] p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-[#c9a227] font-medium">{name}</span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-[#c9a227]/20 text-[#c9a227]">
          {status}
        </span>
      </div>

      <p className="text-sm text-[#888] mb-2">{description}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#666]">奖励: {reward}</span>
        <button
          onClick={onAction}
          className="px-3 py-1 bg-[#c9a227] text-[#0a0a08] text-sm hover:bg-[#ddb52f]"
        >
          前往
        </button>
      </div>
    </div>
  );
}
