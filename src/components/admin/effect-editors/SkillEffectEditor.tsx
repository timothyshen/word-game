"use client";

import { useState } from "react";
import type { SkillEffect, StatKey } from "~/shared/effects";
import { StatModifierEditor } from "./StatModifierEditor";
import { selectCls, inputCls, removeBtnCls, addBtnCls, paramBtnCls } from "./shared";

const PARAM_KEYS = [
  { value: "percentage", label: "概率 (%)" },
  { value: "amount", label: "数量" },
  { value: "duration", label: "持续回合" },
];

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
  const items = value ?? [];
  const update = (idx: number, eff: SkillEffect) => {
    const next = [...items];
    next[idx] = eff;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((eff, i) => (
        <div key={i} className="border border-[#2a2a30] p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <select value={eff.type} onChange={e => update(i, defaultSkillEffect(e.target.value))} className={selectCls + " flex-1"}>
              {EFFECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className={removeBtnCls}>×</button>
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
            <div className="flex gap-2 items-center">
              <select value={eff.healType} onChange={e => update(i, { ...eff, healType: e.target.value as "hp" | "mp" })} className={selectCls}>
                <option value="hp">HP</option>
                <option value="mp">MP</option>
              </select>
              <select value={eff.target} onChange={e => update(i, { ...eff, target: e.target.value as "self" | "ally" })} className={selectCls}>
                <option value="self">自身</option>
                <option value="ally">队友</option>
              </select>
              <input type="number" value={eff.amount} onChange={e => update(i, { ...eff, amount: Number(e.target.value) })} step={eff.isPercent ? 0.05 : 1} min={0} max={eff.isPercent ? 1 : undefined} className={inputCls + " w-20"} />
              {eff.isPercent && <span className="text-xs text-[#888] shrink-0">{(eff.amount * 100).toFixed(0)}%</span>}
              <label className="flex items-center gap-1 text-xs text-[#888] shrink-0 cursor-pointer">
                <input type="checkbox" checked={!!eff.isPercent} onChange={e => update(i, { ...eff, isPercent: e.target.checked || undefined, amount: e.target.checked ? 0.3 : 30 })} className="accent-[#c9a227]" />
                百分比
              </label>
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
            <div className="space-y-2">
              <input value={eff.action} onChange={e => update(i, { ...eff, action: e.target.value })} placeholder="动作名 (如: qualityBoost, productionBoost, identify)" className={inputCls} />
              <div className="space-y-1">
                <span className="text-xs text-[#666]">参数</span>
                {Object.entries(eff.params).map(([key, val]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <select value={PARAM_KEYS.some(p => p.value === key) ? key : "__custom"} onChange={e => {
                      const newKey = e.target.value === "__custom" ? key : e.target.value;
                      if (newKey === key) return;
                      const { [key]: _, ...rest } = eff.params;
                      update(i, { ...eff, params: { ...rest, [newKey]: val } });
                    }} className={selectCls + " w-28"}>
                      {PARAM_KEYS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      {!PARAM_KEYS.some(p => p.value === key) && <option value="__custom">{key || "自定义"}</option>}
                    </select>
                    {!PARAM_KEYS.some(p => p.value === key) && (
                      <input value={key} onChange={e => {
                        const { [key]: _, ...rest } = eff.params;
                        update(i, { ...eff, params: { ...rest, [e.target.value]: val } });
                      }} placeholder="自定义键名" className={inputCls + " w-24"} />
                    )}
                    <input type="number" value={val} onChange={e => {
                      update(i, { ...eff, params: { ...eff.params, [key]: Number(e.target.value) } });
                    }} step={key === "percentage" ? 0.05 : "any"} min={key === "percentage" ? 0 : undefined} max={key === "percentage" ? 1 : undefined} className={inputCls + " w-24"} />
                    {key === "percentage" && <span className="text-xs text-[#888] self-center">{(val * 100).toFixed(0)}%</span>}
                    <button type="button" onClick={() => {
                      const { [key]: _, ...rest } = eff.params;
                      update(i, { ...eff, params: rest });
                    }} className={removeBtnCls}>×</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { if (!("percentage" in eff.params)) update(i, { ...eff, params: { ...eff.params, percentage: 0.2 } }); }} className={paramBtnCls} disabled={"percentage" in eff.params}>+ 概率 (percentage)</button>
                  <button type="button" onClick={() => { if (!("amount" in eff.params)) update(i, { ...eff, params: { ...eff.params, amount: 0 } }); }} className={paramBtnCls} disabled={"amount" in eff.params}>+ 数量 (amount)</button>
                  <button type="button" onClick={() => update(i, { ...eff, params: { ...eff.params, [`param${Object.keys(eff.params).length}`]: 0 } })} className={paramBtnCls}>+ 自定义</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, defaultSkillEffect("damage")])} className={addBtnCls}>+ 添加效果</button>
    </div>
  );
}

export function SkillEffectField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [items, setItems] = useState<SkillEffect[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue);
      return Array.isArray(parsed) ? parsed as SkillEffect[] : [];
    } catch { return []; }
  });
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <SkillEffectEditor value={items} onChange={setItems} />
    </div>
  );
}
