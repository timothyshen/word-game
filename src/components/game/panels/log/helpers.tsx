// 记录Hub辅助组件

export function ScoreBar({ label, icon, score, total, color }: {
  label: string;
  icon: string;
  score: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (score / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 flex items-center gap-1 text-sm">
        <span>{icon}</span>
        <span className="text-[#888]">{label}</span>
      </div>
      <div className="flex-1 h-4 bg-[#1a1a20] relative">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-12 text-right text-sm" style={{ color }}>
        {score}
      </div>
    </div>
  );
}

// 行动类型标签
export const ACTION_LABELS: Record<string, string> = {
  build: "建造",
  explore: "探索",
  combat: "战斗",
  upgrade: "升级",
  production: "生产",
  recruit: "招募",
};
