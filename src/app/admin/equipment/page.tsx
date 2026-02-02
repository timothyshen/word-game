"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const EQUIPMENT_SLOTS = [
  { value: "mainHand", label: "主手" },
  { value: "offHand", label: "副手" },
  { value: "helmet", label: "头盔" },
  { value: "chest", label: "胸甲" },
  { value: "belt", label: "腰带" },
  { value: "gloves", label: "手套" },
  { value: "pants", label: "腿甲" },
  { value: "boots", label: "鞋子" },
  { value: "necklace", label: "项链" },
  { value: "ring1", label: "戒指1" },
  { value: "ring2", label: "戒指2" },
];

const RARITIES = [
  { value: "普通", label: "普通", color: "#888" },
  { value: "精良", label: "精良", color: "#4a9" },
  { value: "稀有", label: "稀有", color: "#9b59b6" },
  { value: "史诗", label: "史诗", color: "#e67e22" },
  { value: "传说", label: "传说", color: "#c9a227" },
];

interface EquipmentForm {
  id?: string;
  name: string;
  slot: string;
  rarity: string;
  icon: string;
  description: string;
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  luckBonus: number;
  hpBonus: number;
  mpBonus: number;
  specialEffects: string;
  requiredLevel: number;
}

const emptyForm: EquipmentForm = {
  name: "",
  slot: "mainHand",
  rarity: "普通",
  icon: "",
  description: "",
  attackBonus: 0,
  defenseBonus: 0,
  speedBonus: 0,
  luckBonus: 0,
  hpBonus: 0,
  mpBonus: 0,
  specialEffects: "{}",
  requiredLevel: 1,
};

export default function EquipmentPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: equipments, isLoading } = api.admin.getEquipments.useQuery();

  const createMutation = api.admin.createEquipment.useMutation({
    onSuccess: () => {
      void utils.admin.getEquipments.invalidate();
      setShowForm(false);
      setEditingEquipment(null);
    },
  });

  const updateMutation = api.admin.updateEquipment.useMutation({
    onSuccess: () => {
      void utils.admin.getEquipments.invalidate();
      setShowForm(false);
      setEditingEquipment(null);
    },
  });

  const deleteMutation = api.admin.deleteEquipment.useMutation({
    onSuccess: () => {
      void utils.admin.getEquipments.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      slot: formData.get("slot") as "mainHand" | "offHand" | "helmet" | "chest" | "belt" | "gloves" | "pants" | "boots" | "necklace" | "ring1" | "ring2",
      rarity: formData.get("rarity") as "普通" | "精良" | "稀有" | "史诗" | "传说",
      icon: formData.get("icon") as string,
      description: formData.get("description") as string,
      attackBonus: Number(formData.get("attackBonus")) || 0,
      defenseBonus: Number(formData.get("defenseBonus")) || 0,
      speedBonus: Number(formData.get("speedBonus")) || 0,
      luckBonus: Number(formData.get("luckBonus")) || 0,
      hpBonus: Number(formData.get("hpBonus")) || 0,
      mpBonus: Number(formData.get("mpBonus")) || 0,
      specialEffects: formData.get("specialEffects") as string,
      requiredLevel: Number(formData.get("requiredLevel")) || 1,
    };

    if (editingEquipment?.id) {
      updateMutation.mutate({ id: editingEquipment.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingEquipment(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (equipment: EquipmentForm) => {
    setEditingEquipment(equipment);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">装备管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加装备
        </button>
      </div>

      {/* 装备列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">图标</th>
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">部位</th>
              <th className="text-left p-4 text-[#888] font-normal">稀有度</th>
              <th className="text-left p-4 text-[#888] font-normal">等级要求</th>
              <th className="text-left p-4 text-[#888] font-normal">攻击</th>
              <th className="text-left p-4 text-[#888] font-normal">防御</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {equipments?.map((equipment) => {
              const rarity = RARITIES.find((r) => r.value === equipment.rarity);
              const slot = EQUIPMENT_SLOTS.find((s) => s.value === equipment.slot);

              return (
                <tr key={equipment.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 text-2xl">{equipment.icon}</td>
                  <td className="p-4 font-bold">{equipment.name}</td>
                  <td className="p-4 text-[#888]">{slot?.label ?? equipment.slot}</td>
                  <td className="p-4">
                    <span style={{ color: rarity?.color }}>{equipment.rarity}</span>
                  </td>
                  <td className="p-4 text-[#888]">{equipment.requiredLevel}</td>
                  <td className="p-4 text-[#888]">{equipment.attackBonus}</td>
                  <td className="p-4 text-[#888]">{equipment.defenseBonus}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm({ ...equipment, specialEffects: equipment.specialEffects ?? "" })}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(equipment.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {equipments?.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#888]">
                  暂无装备，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingEquipment.id ? "编辑装备" : "添加装备"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">名称</label>
                  <input
                    name="name"
                    defaultValue={editingEquipment.name}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">图标 (emoji)</label>
                  <input
                    name="icon"
                    defaultValue={editingEquipment.icon}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">部位</label>
                  <select
                    name="slot"
                    defaultValue={editingEquipment.slot}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {EQUIPMENT_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">稀有度</label>
                  <select
                    name="rarity"
                    defaultValue={editingEquipment.rarity}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {RARITIES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={editingEquipment.description}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">攻击加成</label>
                  <input
                    name="attackBonus"
                    type="number"
                    defaultValue={editingEquipment.attackBonus}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">防御加成</label>
                  <input
                    name="defenseBonus"
                    type="number"
                    defaultValue={editingEquipment.defenseBonus}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">速度加成</label>
                  <input
                    name="speedBonus"
                    type="number"
                    defaultValue={editingEquipment.speedBonus}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">幸运加成</label>
                  <input
                    name="luckBonus"
                    type="number"
                    defaultValue={editingEquipment.luckBonus}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">生命加成</label>
                  <input
                    name="hpBonus"
                    type="number"
                    defaultValue={editingEquipment.hpBonus}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">魔力加成</label>
                  <input
                    name="mpBonus"
                    type="number"
                    defaultValue={editingEquipment.mpBonus}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">等级要求</label>
                <input
                  name="requiredLevel"
                  type="number"
                  defaultValue={editingEquipment.requiredLevel}
                  min={1}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">特殊效果 (JSON)</label>
                <textarea
                  name="specialEffects"
                  defaultValue={editingEquipment.specialEffects}
                  rows={4}
                  placeholder='{"critRate": 0.1, "lifesteal": 0.05}'
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-[#666] mt-1">
                  可选，装备的特殊效果JSON数据
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEquipment(null);
                  }}
                  className="flex-1 py-2 bg-[#2a2a30] text-[#888] hover:bg-[#3a3a40]"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">确认删除</h2>
            <p className="text-[#888] mb-6">确定要删除这件装备吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate({ id: deleteConfirm })}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 bg-[#e74c3c] text-white font-bold hover:bg-[#c0392b] disabled:opacity-50"
              >
                {deleteMutation.isPending ? "删除中..." : "确认删除"}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-[#2a2a30] text-[#888] hover:bg-[#3a3a40]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
