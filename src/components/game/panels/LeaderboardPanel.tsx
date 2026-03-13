"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";

interface LeaderboardPanelProps {
  onClose: () => void;
}

const RANK_COLORS: Record<number, string> = {
  1: "#c9a227", // gold
  2: "#a8a8a8", // silver
  3: "#cd7f32", // bronze
};

export default function LeaderboardPanel({ onClose }: LeaderboardPanelProps) {
  const { data: leaderboard, isLoading } = api.leaderboard.getWeeklyLeaderboard.useQuery();
  const { data: myRank } = api.leaderboard.getPlayerRank.useQuery();

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#0a0a15]/95 backdrop-blur-sm border border-[#2a3a4a] p-0 max-w-lg flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="flex-shrink-0 game-panel-header p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl text-[#c9a227]">
              周榜排行
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-[#5a6a7a] hover:text-[#c9a227] text-xl transition-colors"
            >
              ✕
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-center text-[#5a6a7a] py-8">加载中...</p>
          ) : !leaderboard?.length ? (
            <p className="text-center text-[#5a6a7a] py-8">本周暂无排行数据</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#5a6a7a] border-b border-[#2a3a4a]">
                  <th className="py-2 px-2 text-left w-12">排名</th>
                  <th className="py-2 px-2 text-left">玩家</th>
                  <th className="py-2 px-2 text-right">周积分</th>
                  <th className="py-2 px-2 text-center">均评</th>
                  <th className="py-2 px-2 text-right">连续</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const rankColor = RANK_COLORS[rank] ?? "#e0dcd0";
                  const isMyRow = myRank && myRank.rank === rank;

                  return (
                    <tr
                      key={index}
                      className={`border-b border-[#2a3a4a]/50 transition-colors ${
                        isMyRow
                          ? "bg-[#c9a227]/10"
                          : "hover:bg-[#1a1a25]"
                      }`}
                    >
                      <td
                        className="py-2.5 px-2 font-bold"
                        style={{ color: rankColor }}
                      >
                        {rank <= 3 ? ["", "1st", "2nd", "3rd"][rank] : `${rank}`}
                      </td>
                      <td className="py-2.5 px-2 text-[#e0dcd0]">
                        {entry.username}
                        {isMyRow && (
                          <span className="ml-1.5 text-xs text-[#c9a227]">(你)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right text-[#c9a227] font-medium">
                        {entry.totalScore.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center text-[#e0dcd0]">
                        {entry.averageGrade}
                      </td>
                      <td className="py-2.5 px-2 text-right text-[#e67e22]">
                        {entry.streakDays}日
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Current player summary */}
          {myRank && (
            <div className="mt-4 p-3 bg-[#0a0a15] border border-[#2a3a4a] rounded text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#5a6a7a]">你的排名</span>
                <span className="text-[#c9a227] font-bold">
                  第 {myRank.rank} 名 / {myRank.totalPlayers} 人
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[#5a6a7a]">本周积分</span>
                <span className="text-[#e0dcd0]">{myRank.totalScore.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
