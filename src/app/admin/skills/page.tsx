"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { SkillEffectField, SkillLevelEditor } from "~/components/admin/effect-editors";

const SKILL_TYPES = [
  { value: "combat", label: "战斗" },
  { value: "production", label: "生产" },
  { value: "utility", label: "实用" },
];

interface SkillForm {
  id?: string;
  name: string;
  type: string;
  category: string;
  icon: string;
  description: string;
  cooldown: number;
  effects: string;
  levelData: string;
}

const emptyForm: SkillForm = {
  name: "",
  type: "combat",
  category: "",
  icon: "",
  description: "",
  cooldown: 0,
  effects: "{}",
  levelData: "[]",
};

export default function SkillsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: skills, isLoading } = api.admin.getSkills.useQuery();

  const createMutation = api.admin.createSkill.useMutation({
    onSuccess: () => {
      void utils.admin.getSkills.invalidate();
      setShowForm(false);
      setEditingSkill(null);
    },
  });

  const updateMutation = api.admin.updateSkill.useMutation({
    onSuccess: () => {
      void utils.admin.getSkills.invalidate();
      setShowForm(false);
      setEditingSkill(null);
    },
  });

  const deleteMutation = api.admin.deleteSkill.useMutation({
    onSuccess: () => {
      void utils.admin.getSkills.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as "combat" | "production" | "utility",
      category: formData.get("category") as string,
      icon: formData.get("icon") as string,
      description: formData.get("description") as string,
      cooldown: Number(formData.get("cooldown")) || 0,
      effects: formData.get("effects") as string,
      levelData: formData.get("levelData") as string,
    };

    if (editingSkill?.id) {
      updateMutation.mutate({ id: editingSkill.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingSkill(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (skill: SkillForm) => {
    setEditingSkill(skill);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">技能管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加技能
        </button>
      </div>

      {/* 技能列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">图标</th>
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">类型</th>
              <th className="text-left p-4 text-[#888] font-normal">分类</th>
              <th className="text-left p-4 text-[#888] font-normal">冷却</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {skills?.map((skill) => {
              const type = SKILL_TYPES.find((t) => t.value === skill.type);

              return (
                <tr key={skill.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 text-2xl">{skill.icon}</td>
                  <td className="p-4 font-bold">{skill.name}</td>
                  <td className="p-4 text-[#888]">{type?.label ?? skill.type}</td>
                  <td className="p-4 text-[#888]">{skill.category}</td>
                  <td className="p-4 text-[#888]">{skill.cooldown}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm(skill)}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(skill.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {skills?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#888]">
                  暂无技能，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSkill.id ? "编辑技能" : "添加技能"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">名称</label>
                  <input
                    name="name"
                    defaultValue={editingSkill.name}
                    required
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">图标 (emoji)</label>
                  <input
                    name="icon"
                    defaultValue={editingSkill.icon}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">类型</label>
                  <select
                    name="type"
                    defaultValue={editingSkill.type}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {SKILL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">分类</label>
                  <input
                    name="category"
                    defaultValue={editingSkill.category}
                    placeholder="如: sword, fire, crafting"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={editingSkill.description}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">冷却回合</label>
                <input
                  name="cooldown"
                  type="number"
                  defaultValue={editingSkill.cooldown}
                  min={0}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">效果</label>
                <SkillEffectField name="effects" defaultValue={editingSkill.effects} />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">等级数据</label>
                <SkillLevelEditor name="levelData" defaultValue={editingSkill.levelData} />
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
                    setEditingSkill(null);
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
            <p className="text-[#888] mb-6">确定要删除这个技能吗？此操作无法撤销。</p>
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
