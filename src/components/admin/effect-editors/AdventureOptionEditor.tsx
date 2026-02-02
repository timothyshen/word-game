"use client";

import { useState } from "react";
import type { AdventureOption, AdventureOutcome, StatKey } from "~/shared/effects";
import { ConditionEditor } from "./ConditionEditor";
import { RewardEditor } from "./RewardEditor";
import { STAT_OPTIONS, inputCls, selectCls, removeBtnCls, addBtnCls } from "./shared";

const defaultOutcome: AdventureOutcome = { weight: 100, description: "" };

export function AdventureOptionEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [options, setOptions] = useState<AdventureOption[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue) as unknown[];
      if (!Array.isArray(parsed)) return [];
      // Handle legacy format: { text, action, cost?, requirement? }
      return parsed.map((o: unknown) => {
        const item = o as Record<string, unknown>;
        return {
          text: (item.text as string) ?? "",
          action: (item.action as string) ?? "",
          conditions: (item.conditions as AdventureOption["conditions"]) ?? undefined,
          cost: (item.cost as AdventureOption["cost"]) ?? undefined,
          outcomes: (item.outcomes as AdventureOutcome[]) ?? [{ ...defaultOutcome }],
        };
      }) as AdventureOption[];
    } catch { return []; }
  });

  const updateOption = (idx: number, opt: AdventureOption) => {
    const next = [...options];
    next[idx] = opt;
    setOptions(next);
  };

  const updateOutcome = (optIdx: number, outIdx: number, outcome: AdventureOutcome) => {
    const opt = options[optIdx]!;
    const outcomes = [...opt.outcomes];
    outcomes[outIdx] = outcome;
    updateOption(optIdx, { ...opt, outcomes });
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(options)} />
      {options.map((opt, oi) => (
        <div key={oi} className="border border-[#2a2a30] p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input value={opt.text} onChange={e => updateOption(oi, { ...opt, text: e.target.value })} placeholder="选项文本" className={inputCls + " flex-1"} />
            <input value={opt.action} onChange={e => updateOption(oi, { ...opt, action: e.target.value })} placeholder="动作ID" className={inputCls + " w-32"} />
            <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== oi))} className={removeBtnCls}>×</button>
          </div>

          <details className="text-sm">
            <summary className="text-[#888] cursor-pointer text-xs">条件与费用</summary>
            <div className="mt-2 space-y-2 pl-2 border-l border-[#2a2a30]">
              <div>
                <label className="block text-xs text-[#666] mb-1">条件</label>
                <ConditionEditor value={opt.conditions ?? []} onChange={conds => updateOption(oi, { ...opt, conditions: conds.length > 0 ? conds : undefined })} />
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">费用</label>
                {(opt.cost ?? []).map((c, ci) => (
                  <div key={ci} className="flex gap-2 items-center mb-1">
                    <select value={c.stat} onChange={e => {
                      const costs = [...(opt.cost ?? [])];
                      costs[ci] = { ...c, stat: e.target.value as StatKey };
                      updateOption(oi, { ...opt, cost: costs });
                    }} className={selectCls + " flex-1"}>
                      {STAT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <input type="number" value={c.amount} onChange={e => {
                      const costs = [...(opt.cost ?? [])];
                      costs[ci] = { ...c, amount: Number(e.target.value) };
                      updateOption(oi, { ...opt, cost: costs });
                    }} className={inputCls + " w-20"} />
                    <button type="button" onClick={() => {
                      const costs = (opt.cost ?? []).filter((_, j) => j !== ci);
                      updateOption(oi, { ...opt, cost: costs.length > 0 ? costs : undefined });
                    }} className={removeBtnCls}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => updateOption(oi, { ...opt, cost: [...(opt.cost ?? []), { stat: "hp" as StatKey, amount: 10 }] })} className={addBtnCls}>+ 添加费用</button>
              </div>
            </div>
          </details>

          {/* Outcomes */}
          <div>
            <label className="block text-xs text-[#888] mb-1">结果 (按权重随机)</label>
            {opt.outcomes.map((out, outIdx) => (
              <div key={outIdx} className="border border-[#1a1a20] p-2 mb-2 space-y-2 bg-[#0c0c10]">
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-[#666]">权重</span>
                  <input type="number" value={out.weight} onChange={e => updateOutcome(oi, outIdx, { ...out, weight: Number(e.target.value) })} className={inputCls + " w-16"} min={1} />
                  <input value={out.description} onChange={e => updateOutcome(oi, outIdx, { ...out, description: e.target.value })} placeholder="描述" className={inputCls + " flex-1"} />
                  <button type="button" onClick={() => {
                    const outcomes = opt.outcomes.filter((_, j) => j !== outIdx);
                    updateOption(oi, { ...opt, outcomes: outcomes.length > 0 ? outcomes : [{ ...defaultOutcome }] });
                  }} className={removeBtnCls}>×</button>
                </div>
                <details className="text-xs">
                  <summary className="text-[#666] cursor-pointer">奖励与伤害</summary>
                  <div className="mt-1 space-y-1 pl-2">
                    <RewardEditor value={out.rewards ?? []} onChange={rewards => updateOutcome(oi, outIdx, { ...out, rewards: rewards.length > 0 ? rewards : undefined })} />
                    <div className="flex gap-2 items-center">
                      <span className="text-[#666]">伤害:</span>
                      <input type="number" value={out.damage ?? 0} onChange={e => updateOutcome(oi, outIdx, { ...out, damage: Number(e.target.value) || undefined })} className={inputCls + " w-20"} />
                    </div>
                  </div>
                </details>
              </div>
            ))}
            <button type="button" onClick={() => updateOption(oi, { ...opt, outcomes: [...opt.outcomes, { ...defaultOutcome }] })} className={addBtnCls}>+ 添加结果</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setOptions([...options, { text: "", action: "", outcomes: [{ ...defaultOutcome }] }])} className={addBtnCls}>+ 添加选项</button>
    </div>
  );
}
