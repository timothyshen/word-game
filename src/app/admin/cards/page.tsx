"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const CARD_TYPES = [
  { value: "building", label: "建筑卡" },
  { value: "recruit", label: "招募卡" },
  { value: "skill", label: "技能卡" },
  { value: "enhance", label: "强化卡" },
  { value: "item", label: "道具卡" },
];

const RARITIES = [
  { value: "普通", label: "普通", color: "#888" },
  { value: "精良", label: "精良", color: "#4a9" },
  { value: "稀有", label: "稀有", color: "#9b59b6" },
  { value: "史诗", label: "史诗", color: "#e67e22" },
  { value: "传说", label: "传说", color: "#c9a227" },
];

interface CardForm {
  id?: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  icon: string;
  effects: string;
}

const emptyForm: CardForm = {
  name: "",
  type: "building",
  rarity: "普通",
  description: "",
  icon: "🃏",
  effects: "{}",
};

export default function CardsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CardForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: cards, isLoading } = api.admin.getCards.useQuery();

  const createMutation = api.admin.createCard.useMutation({
    onSuccess: () => {
      void utils.admin.getCards.invalidate();
      setShowForm(false);
      setEditingCard(null);
    },
  });

  const updateMutation = api.admin.updateCard.useMutation({
    onSuccess: () => {
      void utils.admin.getCards.invalidate();
      setShowForm(false);
      setEditingCard(null);
    },
  });

  const deleteMutation = api.admin.deleteCard.useMutation({
    onSuccess: () => {
      void utils.admin.getCards.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as "building" | "recruit" | "skill" | "enhance" | "item",
      rarity: formData.get("rarity") as "普通" | "精良" | "稀有" | "史诗" | "传说",
      description: formData.get("description") as string,
      icon: formData.get("icon") as string,
      effects: formData.get("effects") as string,
    };

    if (editingCard?.id) {
      updateMutation.mutate({ id: editingCard.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingCard(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (card: CardForm) => {
    setEditingCard(card);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">卡牌管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加卡牌
        </button>
      </div>

      {/* 卡牌列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">图标</th>
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">类型</th>
              <th className="text-left p-4 text-[#888] font-normal">稀有度</th>
              <th className="text-left p-4 text-[#888] font-normal">描述</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {cards?.map((card) => {
              const rarity = RARITIES.find((r) => r.value === card.rarity);
              const type = CARD_TYPES.find((t) => t.value === card.type);

              return (
                <tr key={card.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 text-2xl">{card.icon}</td>
                  <td className="p-4 font-bold">{card.name}</td>
                  <td className="p-4 text-[#888]">{type?.label ?? card.type}</td>
                  <td className="p-4">
                    <span style={{ color: rarity?.color }}>{card.rarity}</span>
                  </td>
                  <td className="p-4 text-[#888] text-sm max-w-xs truncate">
                    {card.description}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm(card)}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(card.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {cards?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#888]">
                  暂无卡牌，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCard.id ? "编辑卡牌" : "添加卡牌"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">名称</label>
                <input
                  name="name"
                  defaultValue={editingCard.name}
                  required
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">类型</label>
                  <select
                    name="type"
                    defaultValue={editingCard.type}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {CARD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">稀有度</label>
                  <select
                    name="rarity"
                    defaultValue={editingCard.rarity}
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
                <label className="block text-sm text-[#888] mb-1">图标 (emoji)</label>
                <input
                  name="icon"
                  defaultValue={editingCard.icon}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={editingCard.description}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">效果 (JSON)</label>
                <textarea
                  name="effects"
                  defaultValue={editingCard.effects}
                  rows={4}
                  placeholder='{"buildingId": "farm", "level": 1}'
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-[#666] mt-1">
                  建筑卡: {`{"buildingId": "xxx"}`} | 招募卡: {`{"characterId": "xxx"}`}
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
                    setEditingCard(null);
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
            <p className="text-[#888] mb-6">确定要删除这张卡牌吗？此操作无法撤销。</p>
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
