"use client";

import { useState } from "react";
import type { SkillEffect, StatKey } from "~/shared/effects";
import { StatModifierEditor } from "./StatModifierEditor";
import { selectCls, inputCls, removeBtnCls, addBtnCls } from "./shared";

const EFFECT_TYPES = [
  { value: "damage", label: "伤害" },
  { value: "heal", label: "治疗" },
  { value: "buff", label: "增益/减益" },
  { value: "flee", label: "逃跑" },
  { value: "special", label: "特殊" },
];

function defaultSkillEffect(type: string): SkillEffect {
  switch (type) {
    case "damage": return { type: "damage", damageType: "physical", multiplier: 1.5 };
    case "heal": return { type: "heal", healType: "hp", target: "self", amount: 30 };
    case "buff": return { type: "buff", target: "self", modifiers: [{ stat: "attack" as StatKey, value: 10, type: "flat" }], duration: 3 };
    case "flee": return { type: "flee", successRate: 0.5 };
    case "special": return { type: "special", action: "", params: {} };
    default: return { type: "damage", damageType: "physical", multiplier: 1.0 };
  }
}

interface Props {
  value: SkillEffect[];
  onChange: (effects: SkillEffect[]) => void;
}

export function SkillEffectEditor({ value, onChange }: Props) {
  const update = (idx: number, eff: SkillEffect) => {
    const next = [...value];
    next[idx] = eff;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.map((eff, i) => (
        <div key={i} className="border border-[#2a2a30] p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <select value={eff.type} onChange={e => update(i, defaultSkillEffect(e.target.value))} className={selectCls + " flex-1"}>
              {EFFECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className={removeBtnCls}>×</button>
          </div>

          {eff.type === "damage" && (
            <div className="flex gap-2">
              <select value={eff.damageType} onChange={e => update(i, { ...eff, damageType: e.target.value as "physical" | "magic" })} className={selectCls}>
                <option value="physical">物理</option>
                <option value="magic">魔法</option>
              </select>
              <input type="number" value={eff.multiplier} onChange={e => update(i, { ...eff, multiplier: Number(e.target.value) })} placeholder="倍率" step="0.1" className={inputCls + " w-24"} />
              <input value={eff.element ?? ""} onChange={e => update(i, { ...eff, element: e.target.value || undefined })} placeholder="元素(可选)" className={inputCls + " flex-1"} />
            </div>
          )}
          {eff.type === "heal" && (
            <div className="flex gap-2">
              <select value={eff.healType} onChange={e => update(i, { ...eff, healType: e.target.value as "hp" | "mp" })} className={selectCls}>
                <option value="hp">HP</option>
                <option value="mp">MP</option>
              </select>
              <select value={eff.target} onChange={e => update(i, { ...eff, target: e.target.value as "self" | "ally" })} className={selectCls}>
                <option value="self">自身</option>
                <option value="ally">队友</option>
              </select>
              <input type="number" value={eff.amount} onChange={e => update(i, { ...eff, amount: Number(e.target.value) })} className={inputCls + " w-20"} />
            </div>
          )}
          {eff.type === "buff" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select value={eff.target} onChange={e => update(i, { ...eff, target: e.target.value as "self" | "enemy" })} className={selectCls}>
                  <option value="self">自身</option>
                  <option value="enemy">敌人</option>
                </select>
                <span className="text-xs text-[#888] self-center">持续:</span>
                <input type="number" value={eff.duration} onChange={e => update(i, { ...eff, duration: Number(e.target.value) })} className={inputCls + " w-16"} min={1} />
              </div>
              <StatModifierEditor value={eff.modifiers} onChange={mods => update(i, { ...eff, modifiers: mods })} />
            </div>
          )}
          {eff.type === "flee" && (
            <input type="number" value={eff.successRate} onChange={e => update(i, { ...eff, successRate: Number(e.target.value) })} placeholder="成功率 (0-1)" step="0.1" min={0} max={1} className={inputCls} />
          )}
          {eff.type === "special" && (
            <div className="flex gap-2">
              <input value={eff.action} onChange={e => update(i, { ...eff, action: e.target.value })} placeholder="动作名" className={inputCls + " flex-1"} />
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, defaultSkillEffect("damage")])} className={addBtnCls}>+ 添加效果</button>
    </div>
  );
}

export function SkillEffectField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [items, setItems] = useState<SkillEffect[]>(() => {
    try { return JSON.parse(defaultValue) as SkillEffect[]; } catch { return []; }
  });
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <SkillEffectEditor value={items} onChange={setItems} />
    </div>
  );
}
