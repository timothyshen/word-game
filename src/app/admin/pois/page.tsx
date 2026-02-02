"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const POI_TYPES = [
  { value: "resource", label: "资源点" },
  { value: "garrison", label: "驻军点" },
  { value: "lair", label: "巢穴" },
  { value: "settlement", label: "定居点" },
  { value: "shrine", label: "神殿" },
  { value: "ruin", label: "遗迹" },
  { value: "caravan", label: "商队" },
];

interface PoiForm {
  id?: string;
  name: string;
  icon: string;
  type: string;
  positionX: number;
  positionY: number;
  difficulty: number;
  resourceType: string;
  resourceAmount: number;
  guardianLevel: number;
}

const emptyForm: PoiForm = {
  name: "",
  icon: "📍",
  type: "resource",
  positionX: 0,
  positionY: 0,
  difficulty: 1,
  resourceType: "",
  resourceAmount: 0,
  guardianLevel: 0,
};

export default function PoisPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingPoi, setEditingPoi] = useState<PoiForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: pois, isLoading } = api.admin.getPois.useQuery();

  const createMutation = api.admin.createPoi.useMutation({
    onSuccess: () => {
      void utils.admin.getPois.invalidate();
      setShowForm(false);
      setEditingPoi(null);
    },
  });

  const updateMutation = api.admin.updatePoi.useMutation({
    onSuccess: () => {
      void utils.admin.getPois.invalidate();
      setShowForm(false);
      setEditingPoi(null);
    },
  });

  const deleteMutation = api.admin.deletePoi.useMutation({
    onSuccess: () => {
      void utils.admin.getPois.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      icon: formData.get("icon") as string,
      type: formData.get("type") as "resource" | "garrison" | "lair" | "settlement" | "shrine" | "ruin" | "caravan",
      positionX: Number(formData.get("positionX")) || 0,
      positionY: Number(formData.get("positionY")) || 0,
      difficulty: Number(formData.get("difficulty")) || 0,
      resourceType: formData.get("resourceType") as string,
      resourceAmount: Number(formData.get("resourceAmount")) || 0,
      guardianLevel: Number(formData.get("guardianLevel")) || 0,
    };

    if (editingPoi?.id) {
      updateMutation.mutate({ id: editingPoi.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingPoi(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (poi: PoiForm) => {
    setEditingPoi(poi);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">外城兴趣点管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加兴趣点
        </button>
      </div>

      {/* 兴趣点列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">图标</th>
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">类型</th>
              <th className="text-left p-4 text-[#888] font-normal">坐标</th>
              <th className="text-left p-4 text-[#888] font-normal">难度</th>
              <th className="text-left p-4 text-[#888] font-normal">资源类型</th>
              <th className="text-left p-4 text-[#888] font-normal">守卫等级</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {pois?.map((poi) => {
              const poiType = POI_TYPES.find((t) => t.value === poi.type);

              return (
                <tr key={poi.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 text-2xl">{poi.icon}</td>
                  <td className="p-4 font-bold">{poi.name}</td>
                  <td className="p-4 text-[#888]">{poiType?.label ?? poi.type}</td>
                  <td className="p-4 text-[#888]">{poi.positionX},{poi.positionY}</td>
                  <td className="p-4 text-[#888]">{poi.difficulty}</td>
                  <td className="p-4 text-[#888]">{poi.resourceType || "-"}</td>
                  <td className="p-4 text-[#888]">{poi.guardianLevel}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm({ ...poi, resourceType: poi.resourceType ?? "" })}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(poi.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {pois?.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#888]">
                  暂无兴趣点，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingPoi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPoi.id ? "编辑兴趣点" : "添加兴趣点"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">名称</label>
                  <input
                    name="name"
                    defaultValue={editingPoi.name}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">图标 (emoji)</label>
                  <input
                    name="icon"
                    defaultValue={editingPoi.icon}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">类型</label>
                  <select
                    name="type"
                    defaultValue={editingPoi.type}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {POI_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">难度</label>
                  <input
                    name="difficulty"
                    type="number"
                    defaultValue={editingPoi.difficulty}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">X 坐标</label>
                  <input
                    name="positionX"
                    type="number"
                    defaultValue={editingPoi.positionX}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">Y 坐标</label>
                  <input
                    name="positionY"
                    type="number"
                    defaultValue={editingPoi.positionY}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">资源类型</label>
                  <input
                    name="resourceType"
                    defaultValue={editingPoi.resourceType}
                    placeholder="gold, wood, ..."
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">资源数量</label>
                  <input
                    name="resourceAmount"
                    type="number"
                    defaultValue={editingPoi.resourceAmount}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">守卫等级</label>
                <input
                  name="guardianLevel"
                  type="number"
                  defaultValue={editingPoi.guardianLevel}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
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
                    setEditingPoi(null);
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
            <p className="text-[#888] mb-6">确定要删除这个兴趣点吗？此操作无法撤销。</p>
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
