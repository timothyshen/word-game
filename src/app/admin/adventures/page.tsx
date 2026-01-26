"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const ADVENTURE_TYPES = [
  { value: "resource", label: "资源点", icon: "💎" },
  { value: "monster", label: "怪物遭遇", icon: "👹" },
  { value: "treasure", label: "宝箱", icon: "📦" },
  { value: "merchant", label: "商人", icon: "🧙" },
  { value: "trap", label: "陷阱", icon: "⚠️" },
  { value: "special", label: "特殊事件", icon: "✨" },
];

type AdventureType = "resource" | "monster" | "treasure" | "merchant" | "trap" | "special";

interface AdventureForm {
  id?: string;
  name: string;
  type: AdventureType;
  minLevel: number;
  maxLevel: number | null;
  worldId: string | null;
  weight: number;
  isActive: boolean;
  title: string;
  description: string;
  icon: string;
  optionsJson: string;
  rewardsJson: string | null;
  monsterJson: string | null;
}

const emptyForm: AdventureForm = {
  name: "",
  type: "resource",
  minLevel: 1,
  maxLevel: null,
  worldId: "",
  weight: 100,
  isActive: true,
  title: "",
  description: "",
  icon: "❓",
  optionsJson: "[]",
  rewardsJson: "{}",
  monsterJson: "{}",
};

export default function AdventuresPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAdventure, setEditingAdventure] = useState<AdventureForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");

  const utils = api.useUtils();

  const { data: adventures, isLoading } = api.admin.getAdventures.useQuery();

  const createMutation = api.admin.createAdventure.useMutation({
    onSuccess: () => {
      void utils.admin.getAdventures.invalidate();
      setShowForm(false);
      setEditingAdventure(null);
    },
  });

  const updateMutation = api.admin.updateAdventure.useMutation({
    onSuccess: () => {
      void utils.admin.getAdventures.invalidate();
      setShowForm(false);
      setEditingAdventure(null);
    },
  });

  const deleteMutation = api.admin.deleteAdventure.useMutation({
    onSuccess: () => {
      void utils.admin.getAdventures.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as AdventureType,
      minLevel: parseInt(formData.get("minLevel") as string) || 1,
      maxLevel: formData.get("maxLevel") ? parseInt(formData.get("maxLevel") as string) : undefined,
      worldId: (formData.get("worldId") as string) || undefined,
      weight: parseInt(formData.get("weight") as string) || 100,
      isActive: formData.get("isActive") === "on",
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      icon: formData.get("icon") as string,
      optionsJson: formData.get("optionsJson") as string,
      rewardsJson: (formData.get("rewardsJson") as string) || undefined,
      monsterJson: (formData.get("monsterJson") as string) || undefined,
    };

    if (editingAdventure?.id) {
      updateMutation.mutate({ id: editingAdventure.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingAdventure(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (adventure: {
    id: string;
    name: string;
    type: string;
    minLevel: number;
    maxLevel: number | null;
    worldId: string | null;
    weight: number;
    isActive: boolean;
    title: string;
    description: string;
    icon: string;
    optionsJson: string;
    rewardsJson: string | null;
    monsterJson: string | null;
  }) => {
    setEditingAdventure({
      ...adventure,
      type: adventure.type as AdventureType,
    });
    setShowForm(true);
  };

  const filteredAdventures = adventures?.filter(
    (a) => !filterType || a.type === filterType
  );

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">奇遇管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad]"
        >
          + 添加奇遇
        </button>
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterType("")}
          className={`px-3 py-1 text-sm ${
            !filterType
              ? "bg-[#9b59b6] text-white"
              : "bg-[#2a2a30] text-[#888] hover:bg-[#3a3a40]"
          }`}
        >
          全部
        </button>
        {ADVENTURE_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`px-3 py-1 text-sm ${
              filterType === t.value
                ? "bg-[#9b59b6] text-white"
                : "bg-[#2a2a30] text-[#888] hover:bg-[#3a3a40]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 奇遇列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">图标</th>
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">类型</th>
              <th className="text-left p-4 text-[#888] font-normal">等级</th>
              <th className="text-left p-4 text-[#888] font-normal">权重</th>
              <th className="text-left p-4 text-[#888] font-normal">状态</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdventures?.map((adventure) => {
              const typeInfo = ADVENTURE_TYPES.find((t) => t.value === adventure.type);

              return (
                <tr key={adventure.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 text-2xl">{adventure.icon}</td>
                  <td className="p-4">
                    <div className="font-bold">{adventure.title}</div>
                    <div className="text-sm text-[#666]">{adventure.name}</div>
                  </td>
                  <td className="p-4 text-[#888]">
                    {typeInfo?.icon} {typeInfo?.label ?? adventure.type}
                  </td>
                  <td className="p-4 text-[#888]">
                    Lv.{adventure.minLevel}
                    {adventure.maxLevel ? `-${adventure.maxLevel}` : "+"}
                  </td>
                  <td className="p-4 text-[#888]">{adventure.weight}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs ${
                        adventure.isActive
                          ? "bg-[#4a9]/20 text-[#4a9]"
                          : "bg-[#888]/20 text-[#888]"
                      }`}
                    >
                      {adventure.isActive ? "启用" : "禁用"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm(adventure)}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(adventure.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredAdventures?.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#888]">
                  暂无奇遇，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingAdventure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingAdventure.id ? "编辑奇遇" : "添加奇遇"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">唯一标识 (name)</label>
                  <input
                    name="name"
                    defaultValue={editingAdventure.name}
                    required
                    placeholder="如: resource_gold_mine"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">显示标题</label>
                  <input
                    name="title"
                    defaultValue={editingAdventure.title}
                    required
                    placeholder="如: 发现金矿"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">类型</label>
                  <select
                    name="type"
                    defaultValue={editingAdventure.type}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  >
                    {ADVENTURE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">图标</label>
                  <input
                    name="icon"
                    defaultValue={editingAdventure.icon}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editingAdventure.isActive}
                      className="w-4 h-4"
                    />
                    <span>启用</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={editingAdventure.description}
                  rows={2}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">最低等级</label>
                  <input
                    type="number"
                    name="minLevel"
                    defaultValue={editingAdventure.minLevel}
                    min={1}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">最高等级</label>
                  <input
                    type="number"
                    name="maxLevel"
                    defaultValue={editingAdventure.maxLevel ?? ""}
                    placeholder="无限制"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">权重</label>
                  <input
                    type="number"
                    name="weight"
                    defaultValue={editingAdventure.weight}
                    min={1}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">限定世界</label>
                  <input
                    name="worldId"
                    defaultValue={editingAdventure.worldId ?? ""}
                    placeholder="留空=全部"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">选项配置 (JSON数组)</label>
                <textarea
                  name="optionsJson"
                  defaultValue={editingAdventure.optionsJson}
                  rows={4}
                  placeholder='[{"text": "开采", "action": "collect", "rewards": {"gold": 100}}]'
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-[#666] mt-1">
                  每个选项: {`{"text": "按钮文字", "action": "动作类型", "rewards": {...}}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">奖励配置 (JSON)</label>
                  <textarea
                    name="rewardsJson"
                    defaultValue={editingAdventure.rewardsJson ?? "{}"}
                    rows={3}
                    placeholder='{"gold": 100, "items": ["item_1"]}'
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none resize-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">怪物配置 (JSON)</label>
                  <textarea
                    name="monsterJson"
                    defaultValue={editingAdventure.monsterJson ?? "{}"}
                    rows={3}
                    placeholder='{"id": "wolf", "level": 5, "hp": 100}'
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#9b59b6] outline-none resize-none font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad] disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAdventure(null);
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
            <p className="text-[#888] mb-6">确定要删除这个奇遇事件吗？此操作无法撤销。</p>
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
