"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface ArmyPanelProps {
  onClose: () => void;
  onStartCombat?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  infantry: "步兵",
  archer: "弓兵",
  cavalry: "骑兵",
  mage: "法师",
  siege: "攻城",
};

const CATEGORY_ICONS: Record<string, string> = {
  infantry: "🗡️",
  archer: "🏹",
  cavalry: "🐴",
  mage: "🔮",
  siege: "💣",
};

const CATEGORY_COLORS: Record<string, string> = {
  infantry: "#e74c3c",
  archer: "#44aa99",
  cavalry: "#e67e22",
  mage: "#9b59b6",
  siege: "#4a9eff",
};

const TIER_STARS = (tier: number) => "★".repeat(tier) + "☆".repeat(Math.max(0, 5 - tier));

interface TroopType {
  id: string;
  name: string;
  category: string;
  tier: number;
  attack: number;
  defense: number;
  hp: number;
  speed: number;
  cost: { gold: number; food: number };
  requiredBuilding?: string;
  unlocked: boolean;
}

interface OwnedTroop {
  troopTypeId: string;
  count: number;
}

interface FormationSlot {
  slotIndex: number;
  troopTypeId: string | null;
  count: number;
  heroEntityId: string | null;
  heroName?: string;
}

export default function ArmyPanel({ onClose, onStartCombat }: ArmyPanelProps) {
  const [tab, setTab] = useState<"barracks" | "formation">("barracks");
  const [recruitQuantity, setRecruitQuantity] = useState<Record<string, number>>({});

  // API calls (type assertions for not-yet-existing endpoints)
  const { data: troopTypes, isLoading: troopsLoading } =
    (api as unknown as { army: { getTroopTypes: { useQuery: () => { data: TroopType[] | undefined; isLoading: boolean } } } }).army.getTroopTypes.useQuery();
  const { data: myTroops, isLoading: myTroopsLoading } =
    (api as unknown as { army: { getMyTroops: { useQuery: () => { data: OwnedTroop[] | undefined; isLoading: boolean } } } }).army.getMyTroops.useQuery();
  const { data: formation, isLoading: formationLoading } =
    (api as unknown as { army: { getFormation: { useQuery: () => { data: FormationSlot[] | undefined; isLoading: boolean } } } }).army.getFormation.useQuery();

  const utils = api.useUtils();

  const recruitMutation =
    (api as unknown as { army: { recruit: { useMutation: (opts: { onSuccess: () => void }) => { mutate: (args: { troopTypeId: string; quantity: number }) => void; isPending: boolean } } } }).army.recruit.useMutation({
      onSuccess: () => {
        void (utils as unknown as { army: { getMyTroops: { invalidate: () => Promise<void> } } }).army.getMyTroops.invalidate();
      },
    });

  const setFormationMutation =
    (api as unknown as { army: { setFormation: { useMutation: (opts: { onSuccess: () => void }) => { mutate: (args: { slots: FormationSlot[] }) => void; isPending: boolean } } } }).army.setFormation.useMutation({
      onSuccess: () => {
        void (utils as unknown as { army: { getFormation: { invalidate: () => Promise<void> } } }).army.getFormation.invalidate();
      },
    });

  const isLoading = troopsLoading || myTroopsLoading || formationLoading;

  const getOwnedCount = (troopTypeId: string): number => {
    return myTroops?.find((t) => t.troopTypeId === troopTypeId)?.count ?? 0;
  };

  const getRecruitQty = (troopTypeId: string): number => {
    return recruitQuantity[troopTypeId] ?? 1;
  };

  const setRecruitQty = (troopTypeId: string, qty: number) => {
    setRecruitQuantity((prev) => ({ ...prev, [troopTypeId]: Math.max(1, qty) }));
  };

  const handleRecruit = (troopTypeId: string) => {
    recruitMutation.mutate({ troopTypeId, quantity: getRecruitQty(troopTypeId) });
  };

  const groupedTroops = (troopTypes ?? []).reduce<Record<string, TroopType[]>>((acc, t) => {
    const cat = t.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(t);
    return acc;
  }, {});

  // Formation helpers
  const [localFormation, setLocalFormation] = useState<FormationSlot[]>([]);
  const activeFormation = localFormation.length > 0 ? localFormation : (formation ?? [
    { slotIndex: 0, troopTypeId: null, count: 0, heroEntityId: null },
    { slotIndex: 1, troopTypeId: null, count: 0, heroEntityId: null },
    { slotIndex: 2, troopTypeId: null, count: 0, heroEntityId: null },
  ]);

  const totalPower = activeFormation.reduce((sum, slot) => {
    if (!slot.troopTypeId) return sum;
    const tt = troopTypes?.find((t) => t.id === slot.troopTypeId);
    if (!tt) return sum;
    return sum + (tt.attack + tt.defense) * slot.count;
  }, 0);

  const handleSlotChange = (slotIndex: number, field: string, value: string | number) => {
    const newFormation = activeFormation.map((s) => {
      if (s.slotIndex !== slotIndex) return { ...s };
      return { ...s, [field]: value };
    });
    setLocalFormation(newFormation);
  };

  const handleSaveFormation = () => {
    setFormationMutation.mutate({ slots: activeFormation });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-3xl mx-4 flex flex-col bg-[#0a0a15]/95 border border-[#2a3a4a] max-h-[90vh]">

        {/* Header with tabs */}
        <div
          className="px-4 py-3 border-b border-[#2a3a4a] flex items-center justify-between"
          style={{ background: "linear-gradient(180deg, rgba(201,162,39,0.08) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-4">
            <h2 className="font-display text-xl text-[var(--game-gold)]">军团管理</h2>
            <div className="flex gap-1">
              {(["barracks", "formation"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 text-sm transition-colors ${
                    tab === t
                      ? "bg-[var(--game-gold)]/15 border border-[var(--game-gold)] text-[var(--game-gold)]"
                      : "border border-[#2a3a4a] text-[var(--game-text-muted)] hover:text-[var(--game-text)]"
                  }`}
                >
                  {t === "barracks" ? "兵营" : "编队"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5a6a7a] hover:text-[var(--game-gold)] text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {isLoading ? (
            <div className="p-8 text-center text-[var(--game-text-muted)]">加载中...</div>
          ) : tab === "barracks" ? (
            <BarracksTab
              groupedTroops={groupedTroops}
              getOwnedCount={getOwnedCount}
              getRecruitQty={getRecruitQty}
              setRecruitQty={setRecruitQty}
              onRecruit={handleRecruit}
              isRecruiting={recruitMutation.isPending}
            />
          ) : (
            <FormationTab
              formation={activeFormation}
              troopTypes={troopTypes ?? []}
              myTroops={myTroops ?? []}
              totalPower={totalPower}
              onSlotChange={handleSlotChange}
              onSave={handleSaveFormation}
              isSaving={setFormationMutation.isPending}
              onStartCombat={onStartCombat}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Barracks Tab ──

function BarracksTab({
  groupedTroops,
  getOwnedCount,
  getRecruitQty,
  setRecruitQty,
  onRecruit,
  isRecruiting,
}: {
  groupedTroops: Record<string, TroopType[]>;
  getOwnedCount: (id: string) => number;
  getRecruitQty: (id: string) => number;
  setRecruitQty: (id: string, qty: number) => void;
  onRecruit: (id: string) => void;
  isRecruiting: boolean;
}) {
  const categories = ["infantry", "archer", "cavalry", "mage", "siege"];

  return (
    <div className="p-4 space-y-6">
      {categories.map((cat) => {
        const troops = groupedTroops[cat];
        if (!troops || troops.length === 0) return null;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
              <span
                className="text-sm font-bold tracking-wider uppercase"
                style={{ color: CATEGORY_COLORS[cat] }}
              >
                {CATEGORY_LABELS[cat]}
              </span>
              <div className="flex-1 h-px bg-[#2a3a4a]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {troops.map((troop) => (
                <TroopCard
                  key={troop.id}
                  troop={troop}
                  owned={getOwnedCount(troop.id)}
                  recruitQty={getRecruitQty(troop.id)}
                  onQtyChange={(qty) => setRecruitQty(troop.id, qty)}
                  onRecruit={() => onRecruit(troop.id)}
                  isRecruiting={isRecruiting}
                />
              ))}
            </div>
          </div>
        );
      })}
      {Object.keys(groupedTroops).length === 0 && (
        <div className="text-center text-[var(--game-text-dim)] py-8">
          暂无可用兵种
        </div>
      )}
    </div>
  );
}

function TroopCard({
  troop,
  owned,
  recruitQty,
  onQtyChange,
  onRecruit,
  isRecruiting,
}: {
  troop: TroopType;
  owned: number;
  recruitQty: number;
  onQtyChange: (qty: number) => void;
  onRecruit: () => void;
  isRecruiting: boolean;
}) {
  const isLocked = !troop.unlocked;

  return (
    <div
      className={`p-3 border transition-all ${
        isLocked
          ? "border-[#1a1a20] bg-[#0a0a10]/50 opacity-50"
          : "border-[#2a3a4a] bg-[#0a0a15] hover:border-[#3a4a5a]"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{CATEGORY_ICONS[troop.category]}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--game-text)]">{troop.name}</span>
              {isLocked && <span className="text-xs text-[var(--game-red)]">🔒</span>}
            </div>
            <div className="text-xs" style={{ color: CATEGORY_COLORS[troop.category] ?? "var(--game-text-dim)" }}>
              {TIER_STARS(troop.tier)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--game-text-dim)]">拥有</div>
          <div className="text-sm font-bold text-[var(--game-gold)]">{owned}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1 mb-2 text-xs">
        <div className="text-center">
          <div className="text-[var(--game-text-dim)]">攻击</div>
          <div className="text-[var(--game-red)]">{troop.attack}</div>
        </div>
        <div className="text-center">
          <div className="text-[var(--game-text-dim)]">防御</div>
          <div className="text-[var(--game-blue)]">{troop.defense}</div>
        </div>
        <div className="text-center">
          <div className="text-[var(--game-text-dim)]">生命</div>
          <div className="text-[var(--game-green)]">{troop.hp}</div>
        </div>
        <div className="text-center">
          <div className="text-[var(--game-text-dim)]">速度</div>
          <div className="text-[var(--game-text)]">{troop.speed}</div>
        </div>
      </div>

      {/* Recruit controls */}
      {!isLocked && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#2a3a4a]/50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onQtyChange(recruitQty - 1)}
              className="w-6 h-6 border border-[#2a3a4a] text-[var(--game-text-muted)] hover:border-[var(--game-gold)] hover:text-[var(--game-gold)] flex items-center justify-center text-xs"
            >
              -
            </button>
            <span className="w-8 text-center text-sm text-[var(--game-text)]">{recruitQty}</span>
            <button
              onClick={() => onQtyChange(recruitQty + 1)}
              className="w-6 h-6 border border-[#2a3a4a] text-[var(--game-text-muted)] hover:border-[var(--game-gold)] hover:text-[var(--game-gold)] flex items-center justify-center text-xs"
            >
              +
            </button>
          </div>
          <div className="flex-1 text-xs text-[var(--game-text-dim)]">
            <span className="text-[var(--game-gold)]">🪙{troop.cost.gold * recruitQty}</span>
            {" "}
            <span className="text-[#e67e22]">🍞{troop.cost.food * recruitQty}</span>
          </div>
          <button
            onClick={onRecruit}
            disabled={isRecruiting}
            className="px-3 py-1 text-xs border border-[var(--game-gold)] text-[var(--game-gold)] hover:bg-[var(--game-gold)]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            招募
          </button>
        </div>
      )}

      {isLocked && troop.requiredBuilding && (
        <div className="text-xs text-[var(--game-text-dim)] mt-2 pt-2 border-t border-[#2a3a4a]/50">
          需要建筑: {troop.requiredBuilding}
        </div>
      )}
    </div>
  );
}

// ── Formation Tab ──

function FormationTab({
  formation,
  troopTypes,
  myTroops,
  totalPower,
  onSlotChange,
  onSave,
  isSaving,
  onStartCombat,
}: {
  formation: FormationSlot[];
  troopTypes: TroopType[];
  myTroops: OwnedTroop[];
  totalPower: number;
  onSlotChange: (slotIndex: number, field: string, value: string | number) => void;
  onSave: () => void;
  isSaving: boolean;
  onStartCombat?: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Total power */}
      <div className="flex items-center justify-between px-3 py-2 border border-[#2a3a4a] bg-[#050810]/80">
        <span className="text-xs text-[var(--game-text-dim)] tracking-wider uppercase">军团总战力</span>
        <span className="font-display text-xl text-[var(--game-gold)]">{totalPower.toLocaleString()}</span>
      </div>

      {/* Army slots */}
      <div className="space-y-3">
        {formation.map((slot) => (
          <FormationSlotCard
            key={slot.slotIndex}
            slot={slot}
            troopTypes={troopTypes}
            myTroops={myTroops}
            onSlotChange={onSlotChange}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 py-3 bg-[var(--game-gold)] text-[#0a0a08] font-bold hover:bg-[#ddb52f] disabled:opacity-50 transition-colors"
        >
          {isSaving ? "保存中..." : "保存编队"}
        </button>
        {onStartCombat && (
          <button
            onClick={onStartCombat}
            className="flex-1 py-3 border border-[var(--game-red)] text-[var(--game-red)] font-bold hover:bg-[var(--game-red)]/10 transition-colors"
          >
            出征
          </button>
        )}
      </div>
    </div>
  );
}

function FormationSlotCard({
  slot,
  troopTypes,
  myTroops,
  onSlotChange,
}: {
  slot: FormationSlot;
  troopTypes: TroopType[];
  myTroops: OwnedTroop[];
  onSlotChange: (slotIndex: number, field: string, value: string | number) => void;
}) {
  const selectedTroop = troopTypes.find((t) => t.id === slot.troopTypeId);
  const maxCount = myTroops.find((t) => t.troopTypeId === slot.troopTypeId)?.count ?? 0;

  return (
    <div className="p-3 border border-[#2a3a4a] bg-[#0a0a15]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-[#1a1a20] border border-[#2a3a4a] flex items-center justify-center text-lg rounded">
          {slot.slotIndex + 1}
        </div>
        <div className="text-sm font-bold text-[var(--game-text)]">
          第{slot.slotIndex + 1}编队
        </div>
        {slot.heroName && (
          <span className="text-xs text-[var(--game-gold)] ml-auto">
            统帅: {slot.heroName}
          </span>
        )}
      </div>

      {/* Troop type selector */}
      <div className="flex items-center gap-3 mb-2">
        <label className="text-xs text-[var(--game-text-dim)] w-12">兵种</label>
        <select
          value={slot.troopTypeId ?? ""}
          onChange={(e) => onSlotChange(slot.slotIndex, "troopTypeId", e.target.value || "")}
          className="flex-1 bg-[#0a0a15] border border-[#2a3a4a] text-[var(--game-text)] text-sm px-2 py-1.5 focus:border-[var(--game-gold)] outline-none"
        >
          <option value="">-- 选择兵种 --</option>
          {troopTypes.filter((t) => t.unlocked).map((t) => (
            <option key={t.id} value={t.id}>
              {CATEGORY_LABELS[t.category]} - {t.name} ({TIER_STARS(t.tier)})
            </option>
          ))}
        </select>
      </div>

      {/* Count slider */}
      {selectedTroop && (
        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--game-text-dim)] w-12">数量</label>
          <input
            type="range"
            min={0}
            max={maxCount}
            value={slot.count}
            onChange={(e) => onSlotChange(slot.slotIndex, "count", parseInt(e.target.value))}
            className="flex-1 accent-[var(--game-gold)]"
          />
          <span className="text-sm text-[var(--game-text)] w-16 text-right">
            {slot.count}/{maxCount}
          </span>
        </div>
      )}

      {/* Selected troop stats preview */}
      {selectedTroop && (
        <div className="flex gap-4 mt-2 pt-2 border-t border-[#2a3a4a]/50 text-xs text-[var(--game-text-dim)]">
          <span>
            {CATEGORY_ICONS[selectedTroop.category]} {selectedTroop.name}
          </span>
          <span className="text-[var(--game-red)]">攻{selectedTroop.attack}</span>
          <span className="text-[var(--game-blue)]">防{selectedTroop.defense}</span>
          <span className="ml-auto text-[var(--game-gold)]">
            战力: {(selectedTroop.attack + selectedTroop.defense) * slot.count}
          </span>
        </div>
      )}
    </div>
  );
}
