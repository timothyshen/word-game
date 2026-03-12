"use client";

// 技能树面板 - 展示角色的3分支技能树
// 依赖: api.skillTree.getTree / learnSkill / upgradeSkill (skillTree router 可能尚未注册)

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface SkillTreePanelProps {
  characterId: string;
  characterName: string;
  onClose: () => void;
}

interface SkillNodeData {
  skillId: string;
  skillName: string;
  icon: string;
  learned: boolean;
  level: number;
  maxLevel: number;
  canLearn: boolean;
  canUpgrade: boolean;
  mpCost: number;
  description: string;
  position: number;
}

interface BranchData {
  branchId: string;
  branchName: string;
  branchIcon: string;
  skills: SkillNodeData[];
}

interface SkillTreeData {
  characterId: string;
  professionName: string;
  availablePoints: number;
  branches: BranchData[];
}

export default function SkillTreePanel({
  characterId,
  characterName,
  onClose,
}: SkillTreePanelProps) {
  const [confirmSkillId, setConfirmSkillId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"learn" | "upgrade" | null>(null);

  const utils = api.useUtils();

  // 获取技能树数据
  const { data: tree, isLoading } = api.skillTree.getTree.useQuery(
    { characterId },
  ) as { data: SkillTreeData | undefined; isLoading: boolean };

  // 学习技能
  const learnMutation = api.skillTree.learnSkill.useMutation({
    onSuccess: () => {
      setConfirmSkillId(null);
      setConfirmAction(null);
      void utils.skillTree.getTree.invalidate({ characterId });
    },
  });

  // 升级技能
  const upgradeMutation = api.skillTree.upgradeSkill.useMutation({
    onSuccess: () => {
      setConfirmSkillId(null);
      setConfirmAction(null);
      void utils.skillTree.getTree.invalidate({ characterId });
    },
  });

  const handleSkillClick = (skill: SkillNodeData) => {
    if (skill.learned && skill.canUpgrade) {
      setConfirmSkillId(skill.skillId);
      setConfirmAction("upgrade");
    } else if (!skill.learned && skill.canLearn) {
      setConfirmSkillId(skill.skillId);
      setConfirmAction("learn");
    }
  };

  const handleConfirm = () => {
    if (!confirmSkillId || !confirmAction) return;
    if (confirmAction === "learn") {
      learnMutation.mutate({ characterId, skillId: confirmSkillId });
    } else {
      upgradeMutation.mutate({ characterId, skillId: confirmSkillId });
    }
  };

  const handleCancel = () => {
    setConfirmSkillId(null);
    setConfirmAction(null);
  };

  const isPending = learnMutation.isPending || upgradeMutation.isPending;
  const error = learnMutation.error ?? upgradeMutation.error;

  // 找到确认中的技能信息
  const confirmSkill = confirmSkillId
    ? tree?.branches.flatMap((b) => b.skills).find((s) => s.skillId === confirmSkillId)
    : null;

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="game-panel p-8">
          <div className="text-center text-[#888]">加载技能树...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!tree) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="game-panel p-8">
          <div className="text-center text-[#e74c3c]">无法加载技能树</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="game-panel p-0 max-w-2xl h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="font-display font-bold text-lg text-[#e0dcd0]">
                {characterName} - 技能树
              </DialogTitle>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[#888]">{tree.professionName}</span>
                <span className="text-sm text-[#c9a227]">
                  可用技能点: <span className="font-bold">{tree.availablePoints}</span>
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#5a6a7a] hover:text-[#c9a227] text-xl"
            >
              ✕
            </button>
          </div>
        </DialogHeader>

        {/* 技能树主体 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full [&_[data-slot=scroll-area-scrollbar]]:hidden">
            <div className="p-4">
              {/* 3列分支布局 */}
              <div className="grid grid-cols-3 gap-4">
                {tree.branches.map((branch) => (
                  <div key={branch.branchId} className="flex flex-col items-center">
                    {/* 分支标题 */}
                    <div className="text-center mb-4">
                      <div className="text-2xl">{branch.branchIcon}</div>
                      <div className="text-sm font-bold text-[#c9a227] mt-1">
                        {branch.branchName}
                      </div>
                    </div>

                    {/* 技能节点 */}
                    <div className="flex flex-col items-center gap-0">
                      {branch.skills
                        .sort((a, b) => a.position - b.position)
                        .map((skill, idx) => (
                          <div key={skill.skillId} className="flex flex-col items-center">
                            {/* 连接线（非第一个节点） */}
                            {idx > 0 && (
                              <div className="w-px h-6 mx-auto bg-[var(--game-border-warm)]" />
                            )}
                            <SkillNode
                              skill={skill}
                              onLearn={() => handleSkillClick(skill)}
                              onUpgrade={() => handleSkillClick(skill)}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-3 bg-[#3a1a1a] text-sm text-[#e74c3c] text-center">
                  {error.message}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 确认对话框 */}
        {confirmSkill && confirmAction && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm">
            <div className="w-72 game-panel rounded-lg p-5">
              <div className="text-center">
                <div className="text-3xl mb-2">{confirmSkill.icon}</div>
                <div className="font-display font-bold text-[#e0dcd0]">
                  {confirmSkill.skillName}
                </div>
                <div className="text-xs text-[#888] mt-1">{confirmSkill.description}</div>
                <div className="text-xs text-[#4a9eff] mt-1">
                  MP消耗: {confirmSkill.mpCost}
                </div>
                <div className="mt-3 text-sm text-[#c9a227]">
                  {confirmAction === "learn"
                    ? "消耗 1 技能点学习此技能？"
                    : `升级到 Lv.${confirmSkill.level + 1}？`}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="flex-1 py-2 border border-[#2a3a4a] text-[#888] hover:border-[#e0dcd0] hover:text-[#e0dcd0] text-sm disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex-1 py-2 bg-[#c9a227] text-[#08080a] font-bold text-sm hover:bg-[#ddb52f] disabled:opacity-50"
                >
                  {isPending ? "..." : "确认"}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SkillNode({
  skill,
  onLearn,
  onUpgrade,
}: {
  skill: SkillNodeData;
  onLearn: () => void;
  onUpgrade: () => void;
}) {
  const isLocked = !skill.learned && !skill.canLearn;
  const isLearnable = !skill.learned && skill.canLearn;
  const isLearned = skill.learned;

  const handleClick = () => {
    if (isLearnable) onLearn();
    else if (isLearned && skill.canUpgrade) onUpgrade();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLocked}
      className={`
        relative w-20 h-24 flex flex-col items-center justify-center gap-1 rounded-lg
        border-2 transition-all duration-300
        ${isLearned
          ? "border-[#c9a227] bg-[#c9a227]/10 hover:bg-[#c9a227]/20 cursor-pointer"
          : isLearnable
            ? "border-dashed border-[#4a9eff] bg-[#4a9eff]/5 hover:bg-[#4a9eff]/15 cursor-pointer animate-pulse-subtle"
            : "border-[#2a3a4a] bg-[#050810]/60 opacity-40 cursor-not-allowed"
        }
      `}
      title={`${skill.skillName}\n${skill.description}\nMP: ${skill.mpCost}`}
    >
      {/* 图标 */}
      <span className={`text-2xl ${isLocked ? "grayscale" : ""}`}>
        {skill.icon}
      </span>

      {/* 名称 */}
      <span
        className={`text-[10px] leading-tight text-center px-1 truncate w-full ${
          isLearned ? "text-[#e0dcd0]" : isLearnable ? "text-[#4a9eff]" : "text-[#666]"
        }`}
      >
        {skill.skillName}
      </span>

      {/* 等级 / MP消耗 */}
      <span
        className={`text-[9px] ${
          isLearned ? "text-[#c9a227]" : "text-[#666]"
        }`}
      >
        {isLearned ? `Lv.${skill.level}` : `MP ${skill.mpCost}`}
      </span>

      {/* 可升级指示器 */}
      {isLearned && skill.canUpgrade && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c9a227] rounded-full animate-ping" />
      )}
    </button>
  );
}
