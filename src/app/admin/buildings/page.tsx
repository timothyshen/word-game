"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { BuildingEffectEditor } from "~/components/admin/effect-editors";

const BUILDING_SLOTS = [
  { value: "core", label: "核心" },
  { value: "production", label: "生产" },
  { value: "military", label: "军事" },
  { value: "commerce", label: "商业" },
  { value: "special", label: "特殊" },
];

interface BuildingForm {
  id?: string;
  name: string;
  slot: string;
  icon: string;
  description: string;
  maxLevel: number;
  baseEffects: string;
}

const emptyForm: BuildingForm = {
  name: "",
  slot: "core",
  icon: "",
  description: "",
  maxLevel: 10,
  baseEffects: "{}",
};

export default function BuildingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: buildings, isLoading } = api.admin.getBuildings.useQuery();

  const createMutation = api.admin.createBuilding.useMutation({
    onSuccess: () => {
      void utils.admin.getBuildings.invalidate();
      setShowForm(false);
      setEditingBuilding(null);
    },
  });

  const updateMutation = api.admin.updateBuilding.useMutation({
    onSuccess: () => {
      void utils.admin.getBuildings.invalidate();
      setShowForm(false);
      setEditingBuilding(null);
    },
  });

  const deleteMutation = api.admin.deleteBuilding.useMutation({
    onSuccess: () => {
      void utils.admin.getBuildings.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      slot: formData.get("slot") as "core" | "production" | "military" | "commerce" | "special",
      icon: formData.get("icon") as string,
      description: formData.get("description") as string,
      maxLevel: Number(formData.get("maxLevel")),
      baseEffects: formData.get("baseEffects") as string,
    };

    if (editingBuilding?.id) {
      updateMutation.mutate({ id: editingBuilding.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingBuilding(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (building: BuildingForm) => {
    setEditingBuilding(building);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">建筑管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加建筑
        </button>
      </div>

      {/* 建筑列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">图标</th>
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">类型</th>
              <th className="text-left p-4 text-[#888] font-normal">最大等级</th>
              <th className="text-left p-4 text-[#888] font-normal">描述</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {buildings?.map((building) => {
              const slot = BUILDING_SLOTS.find((s) => s.value === building.slot);

              return (
                <tr key={building.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 text-2xl">{building.icon}</td>
                  <td className="p-4 font-bold">{building.name}</td>
                  <td className="p-4 text-[#888]">{slot?.label ?? building.slot}</td>
                  <td className="p-4 text-[#888]">{building.maxLevel}</td>
                  <td className="p-4 text-[#888] text-sm max-w-xs truncate">
                    {building.description}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm(building)}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(building.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {buildings?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#888]">
                  暂无建筑，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingBuilding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingBuilding.id ? "编辑建筑" : "添加建筑"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">名称</label>
                <input
                  name="name"
                  defaultValue={editingBuilding.name}
                  required
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">类型</label>
                  <select
                    name="slot"
                    defaultValue={editingBuilding.slot}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {BUILDING_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">最大等级</label>
                  <input
                    name="maxLevel"
                    type="number"
                    defaultValue={editingBuilding.maxLevel}
                    min={1}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">图标 (emoji)</label>
                <input
                  name="icon"
                  defaultValue={editingBuilding.icon}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={editingBuilding.description}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">基础效果</label>
                <BuildingEffectEditor name="baseEffects" defaultValue={editingBuilding.baseEffects} />
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
                    setEditingBuilding(null);
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
            <p className="text-[#888] mb-6">确定要删除这个建筑吗？此操作无法撤销。</p>
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
