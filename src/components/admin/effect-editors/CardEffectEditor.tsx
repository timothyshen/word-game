"use client";

import { useState } from "react";
import type { CardEffect, StatKey } from "~/shared/effects";
import { StatModifierEditor } from "./StatModifierEditor";
import { inputCls, selectCls } from "./shared";

const CARD_EFFECT_TYPES = [
  { value: "building", label: "建筑" },
  { value: "recruit", label: "招募" },
  { value: "skill", label: "技能" },
  { value: "heal", label: "治疗" },
  { value: "buff", label: "增益" },
  { value: "escape", label: "逃脱" },
  { value: "enhance", label: "强化" },
  { value: "exp", label: "经验" },
  { value: "expansion", label: "扩张" },
  { value: "unlock", label: "解锁" },
];

function defaultEffect(type: string): CardEffect {
  switch (type) {
    case "building": return { type: "building", buildingId: "" };
    case "recruit": return { type: "recruit", characterId: "" };
    case "skill": return { type: "skill", skillId: "" };
    case "heal": return { type: "heal", healType: "hp", amount: 50 };
    case "buff": return { type: "buff", modifiers: [{ stat: "attack" as StatKey, value: 10, type: "flat" }], duration: 3 };
    case "escape": return { type: "escape", successRate: 1.0 };
    case "enhance": return { type: "enhance", targetType: "equipment", amount: 1 };
    case "exp": return { type: "exp", amount: 100 };
    case "expansion": return { type: "expansion", amount: 1 };
    case "unlock": return { type: "unlock", flagName: "" };
    default: return { type: "heal", healType: "hp", amount: 50 };
  }
}

export function CardEffectEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [effect, setEffect] = useState<CardEffect | null>(() => {
    try {
      const p = JSON.parse(defaultValue) as Record<string, unknown>;
      if (p && typeof p.type === "string") return p as unknown as CardEffect;
      return null;
    } catch { return null; }
  });

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={effect ? JSON.stringify(effect) : "{}"} />
      <select value={effect?.type ?? ""} onChange={e => setEffect(e.target.value ? defaultEffect(e.target.value) : null)} className={selectCls + " w-full"}>
        <option value="">选择效果类型</option>
        {CARD_EFFECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {effect?.type === "building" && (
        <input value={effect.buildingId} onChange={e => setEffect({ ...effect, buildingId: e.target.value })} placeholder="建筑模板ID" className={inputCls} />
      )}
      {effect?.type === "recruit" && (
        <input value={effect.characterId} onChange={e => setEffect({ ...effect, characterId: e.target.value })} placeholder="角色模板ID" className={inputCls} />
      )}
      {effect?.type === "skill" && (
        <input value={effect.skillId} onChange={e => setEffect({ ...effect, skillId: e.target.value })} placeholder="技能模板ID" className={inputCls} />
      )}
      {effect?.type === "heal" && (
        <div className="flex gap-2">
          <select value={effect.healType} onChange={e => setEffect({ ...effect, healType: e.target.value as "hp" | "mp" })} className={selectCls}>
            <option value="hp">HP</option>
            <option value="mp">MP</option>
          </select>
          <input type="number" value={effect.amount} onChange={e => setEffect({ ...effect, amount: Number(e.target.value) })} placeholder="恢复量" className={inputCls + " flex-1"} />
        </div>
      )}
      {effect?.type === "buff" && (
        <div className="space-y-2">
          <StatModifierEditor value={effect.modifiers} onChange={mods => setEffect({ ...effect, modifiers: mods })} />
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[#888]">持续回合:</span>
            <input type="number" value={effect.duration} onChange={e => setEffect({ ...effect, duration: Number(e.target.value) })} className={inputCls + " w-20"} min={1} />
          </div>
        </div>
      )}
      {effect?.type === "escape" && (
        <input type="number" value={effect.successRate} onChange={e => setEffect({ ...effect, successRate: Number(e.target.value) })} placeholder="成功率 (0-1)" step="0.1" min={0} max={1} className={inputCls} />
      )}
      {effect?.type === "enhance" && (
        <div className="flex gap-2">
          <select value={effect.targetType} onChange={e => setEffect({ ...effect, targetType: e.target.value as "equipment" | "skill" })} className={selectCls}>
            <option value="equipment">装备</option>
            <option value="skill">技能</option>
          </select>
          <input type="number" value={effect.amount} onChange={e => setEffect({ ...effect, amount: Number(e.target.value) })} placeholder="强化等级" className={inputCls + " flex-1"} min={1} />
        </div>
      )}
      {effect?.type === "exp" && (
        <input type="number" value={effect.amount} onChange={e => setEffect({ ...effect, amount: Number(e.target.value) })} placeholder="经验值" className={inputCls} />
      )}
      {effect?.type === "expansion" && (
        <input type="number" value={effect.amount} onChange={e => setEffect({ ...effect, amount: Number(e.target.value) })} placeholder="扩张量" className={inputCls} min={1} />
      )}
      {effect?.type === "unlock" && (
        <input value={effect.flagName} onChange={e => setEffect({ ...effect, flagName: e.target.value })} placeholder="解锁标记名" className={inputCls} />
      )}
    </div>
  );
}
