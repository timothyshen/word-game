"use client";

import { useState } from "react";
import type { CharacterTrait } from "~/shared/effects";
import { StatModifierEditor } from "./StatModifierEditor";
import { inputCls, removeBtnCls, addBtnCls } from "./shared";

export function CharacterTraitEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [traits, setTraits] = useState<CharacterTrait[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue) as unknown;
      if (Array.isArray(parsed)) {
        // Handle legacy string[] format: ["勇猛", "忠诚"]
        if (parsed.length > 0 && typeof parsed[0] === "string") {
          return (parsed as string[]).map(name => ({ name, modifiers: [] }));
        }
        return parsed as CharacterTrait[];
      }
      return [];
    } catch { return []; }
  });

  const update = (idx: number, trait: CharacterTrait) => {
    const next = [...traits];
    next[idx] = trait;
    setTraits(next);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(traits)} />
      {traits.map((trait, i) => (
        <div key={i} className="border border-[#2a2a30] p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input value={trait.name} onChange={e => update(i, { ...trait, name: e.target.value })} placeholder="特性名称" className={inputCls + " flex-1"} />
            <button type="button" onClick={() => setTraits(traits.filter((_, j) => j !== i))} className={removeBtnCls}>×</button>
          </div>
          <div className="text-xs text-[#888] mb-1">属性修改</div>
          <StatModifierEditor value={trait.modifiers} onChange={mods => update(i, { ...trait, modifiers: mods })} />
        </div>
      ))}
      <button type="button" onClick={() => setTraits([...traits, { name: "", modifiers: [] }])} className={addBtnCls}>+ 添加特性</button>
    </div>
  );
}
