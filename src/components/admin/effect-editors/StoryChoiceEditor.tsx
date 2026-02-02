"use client";

import { useState } from "react";
import type { StoryChoice } from "~/shared/effects";
import { ConditionEditor } from "./ConditionEditor";
import { RewardEditor } from "./RewardEditor";
import { inputCls, removeBtnCls, addBtnCls } from "./shared";

export function StoryChoiceEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [choices, setChoices] = useState<StoryChoice[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue) as unknown[];
      if (!Array.isArray(parsed)) return [];
      // Handle legacy format: { text, nextNode, requirements?, rewards? }
      return parsed.map((c: unknown) => {
        const item = c as Record<string, unknown>;
        return {
          text: (item.text as string) ?? "",
          nextNodeId: (item.nextNodeId as string) ?? (item.nextNode as string) ?? "",
          conditions: (item.conditions as StoryChoice["conditions"]) ?? undefined,
          rewards: (item.rewards as StoryChoice["rewards"]) ?? undefined,
        };
      }) as StoryChoice[];
    } catch { return []; }
  });

  const update = (idx: number, choice: StoryChoice) => {
    const next = [...choices];
    next[idx] = choice;
    setChoices(next);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(choices)} />
      {choices.map((c, i) => (
        <div key={i} className="border border-[#2a2a30] p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input value={c.text} onChange={e => update(i, { ...c, text: e.target.value })} placeholder="选项文本" className={inputCls + " flex-1"} />
            <input value={c.nextNodeId} onChange={e => update(i, { ...c, nextNodeId: e.target.value })} placeholder="下一节点ID" className={inputCls + " w-40"} />
            <button type="button" onClick={() => setChoices(choices.filter((_, j) => j !== i))} className={removeBtnCls}>×</button>
          </div>
          <details className="text-sm">
            <summary className="text-[#888] cursor-pointer text-xs">条件与奖励 (可选)</summary>
            <div className="mt-2 space-y-2 pl-2 border-l border-[#2a2a30]">
              <div>
                <label className="block text-xs text-[#666] mb-1">条件</label>
                <ConditionEditor value={c.conditions ?? []} onChange={conds => update(i, { ...c, conditions: conds.length > 0 ? conds : undefined })} />
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">奖励</label>
                <RewardEditor value={c.rewards ?? []} onChange={rewards => update(i, { ...c, rewards: rewards.length > 0 ? rewards : undefined })} />
              </div>
            </div>
          </details>
        </div>
      ))}
      <button type="button" onClick={() => setChoices([...choices, { text: "", nextNodeId: "" }])} className={addBtnCls}>+ 添加选项</button>
    </div>
  );
}
