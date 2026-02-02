"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CharacterTraitEditor } from "~/components/admin/effect-editors";

const BASE_CLASSES = [
  { value: "战士", label: "战士" },
  { value: "农夫", label: "农夫" },
  { value: "工匠", label: "工匠" },
  { value: "学者", label: "学者" },
  { value: "法师", label: "法师" },
  { value: "盗贼", label: "盗贼" },
];

const RARITIES = [
  { value: "普通", label: "普通", color: "#888" },
  { value: "精良", label: "精良", color: "#4a9" },
  { value: "精英", label: "精英", color: "#59b" },
  { value: "稀有", label: "稀有", color: "#9b59b6" },
  { value: "史诗", label: "史诗", color: "#e67e22" },
  { value: "传说", label: "传说", color: "#c9a227" },
];

interface CharacterForm {
  id?: string;
  name: string;
  baseClass: string;
  rarity: string;
  portrait: string;
  description: string;
  story: string | null;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseLuck: number;
  baseHp: number;
  baseMp: number;
  traits: string;
}

const emptyForm: CharacterForm = {
  name: "",
  baseClass: "战士",
  rarity: "普通",
  portrait: "",
  description: "",
  story: null,
  baseAttack: 10,
  baseDefense: 10,
  baseSpeed: 10,
  baseLuck: 10,
  baseHp: 100,
  baseMp: 50,
  traits: "[]",
};

export default function CharactersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: characters, isLoading } = api.admin.getCharacters.useQuery();

  const createMutation = api.admin.createCharacter.useMutation({
    onSuccess: () => {
      void utils.admin.getCharacters.invalidate();
      setShowForm(false);
      setEditingCharacter(null);
    },
  });

  const updateMutation = api.admin.updateCharacter.useMutation({
    onSuccess: () => {
      void utils.admin.getCharacters.invalidate();
      setShowForm(false);
      setEditingCharacter(null);
    },
  });

  const deleteMutation = api.admin.deleteCharacter.useMutation({
    onSuccess: () => {
      void utils.admin.getCharacters.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      baseClass: formData.get("baseClass") as string,
      rarity: formData.get("rarity") as "普通" | "精良" | "精英" | "稀有" | "史诗" | "传说",
      portrait: formData.get("portrait") as string,
      description: formData.get("description") as string,
      story: (formData.get("story") as string) || undefined,
      baseAttack: Number(formData.get("baseAttack")),
      baseDefense: Number(formData.get("baseDefense")),
      baseSpeed: Number(formData.get("baseSpeed")),
      baseLuck: Number(formData.get("baseLuck")),
      baseHp: Number(formData.get("baseHp")),
      baseMp: Number(formData.get("baseMp")),
      traits: formData.get("traits") as string,
    };

    if (editingCharacter?.id) {
      updateMutation.mutate({ id: editingCharacter.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingCharacter(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (character: CharacterForm) => {
    setEditingCharacter(character);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">角色管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加角色
        </button>
      </div>

      {/* 角色列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">头像</th>
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">职业</th>
              <th className="text-left p-4 text-[#888] font-normal">稀有度</th>
              <th className="text-left p-4 text-[#888] font-normal">生命</th>
              <th className="text-left p-4 text-[#888] font-normal">攻击</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {characters?.map((character) => {
              const rarity = RARITIES.find((r) => r.value === character.rarity);
              const baseClass = BASE_CLASSES.find((c) => c.value === character.baseClass);

              return (
                <tr key={character.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 text-2xl">{character.portrait}</td>
                  <td className="p-4 font-bold">{character.name}</td>
                  <td className="p-4 text-[#888]">{baseClass?.label ?? character.baseClass}</td>
                  <td className="p-4">
                    <span style={{ color: rarity?.color }}>{character.rarity}</span>
                  </td>
                  <td className="p-4 text-[#888]">{character.baseHp}</td>
                  <td className="p-4 text-[#888]">{character.baseAttack}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm(character)}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(character.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {characters?.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#888]">
                  暂无角色，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingCharacter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCharacter.id ? "编辑角色" : "添加角色"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">名称</label>
                  <input
                    name="name"
                    defaultValue={editingCharacter.name}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">头像 (emoji)</label>
                  <input
                    name="portrait"
                    defaultValue={editingCharacter.portrait}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">职业</label>
                  <select
                    name="baseClass"
                    defaultValue={editingCharacter.baseClass}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {BASE_CLASSES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">稀有度</label>
                  <select
                    name="rarity"
                    defaultValue={editingCharacter.rarity}
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
                  defaultValue={editingCharacter.description}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">背景故事 (可选)</label>
                <textarea
                  name="story"
                  defaultValue={editingCharacter.story ?? ""}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">攻击</label>
                  <input
                    name="baseAttack"
                    type="number"
                    defaultValue={editingCharacter.baseAttack}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">防御</label>
                  <input
                    name="baseDefense"
                    type="number"
                    defaultValue={editingCharacter.baseDefense}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">速度</label>
                  <input
                    name="baseSpeed"
                    type="number"
                    defaultValue={editingCharacter.baseSpeed}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">幸运</label>
                  <input
                    name="baseLuck"
                    type="number"
                    defaultValue={editingCharacter.baseLuck}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">生命值</label>
                  <input
                    name="baseHp"
                    type="number"
                    defaultValue={editingCharacter.baseHp}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">法力值</label>
                  <input
                    name="baseMp"
                    type="number"
                    defaultValue={editingCharacter.baseMp}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">特性</label>
                <CharacterTraitEditor name="traits" defaultValue={editingCharacter.traits} />
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
                    setEditingCharacter(null);
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
            <p className="text-[#888] mb-6">确定要删除这个角色吗？此操作无法撤销。</p>
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
