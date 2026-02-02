"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface ProfessionForm {
  id?: string;
  name: string;
  description: string;
  bonuses: string;
  unlockConditions: string;
}

const emptyForm: ProfessionForm = {
  name: "",
  description: "",
  bonuses: "{}",
  unlockConditions: "{}",
};

export default function ProfessionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingProfession, setEditingProfession] = useState<ProfessionForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: professions, isLoading } = api.admin.getProfessions.useQuery();

  const createMutation = api.admin.createProfession.useMutation({
    onSuccess: () => {
      void utils.admin.getProfessions.invalidate();
      setShowForm(false);
      setEditingProfession(null);
    },
  });

  const updateMutation = api.admin.updateProfession.useMutation({
    onSuccess: () => {
      void utils.admin.getProfessions.invalidate();
      setShowForm(false);
      setEditingProfession(null);
    },
  });

  const deleteMutation = api.admin.deleteProfession.useMutation({
    onSuccess: () => {
      void utils.admin.getProfessions.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      bonuses: formData.get("bonuses") as string,
      unlockConditions: formData.get("unlockConditions") as string,
    };

    if (editingProfession?.id) {
      updateMutation.mutate({ id: editingProfession.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingProfession(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (profession: ProfessionForm) => {
    setEditingProfession(profession);
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">职业管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加职业
        </button>
      </div>

      {/* 职业列表 */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">描述</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {professions?.map((profession) => (
              <tr key={profession.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                <td className="p-4 font-bold">{profession.name}</td>
                <td className="p-4 text-[#888] text-sm max-w-xs truncate">
                  {profession.description}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => openEditForm(profession)}
                    className="text-[#4a9eff] hover:underline mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(profession.id)}
                    className="text-[#e74c3c] hover:underline"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {professions?.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-[#888]">
                  暂无职业，点击上方按钮添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑表单弹窗 */}
      {showForm && editingProfession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProfession.id ? "编辑职业" : "添加职业"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">名称</label>
                <input
                  name="name"
                  defaultValue={editingProfession.name}
                  required
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={editingProfession.description}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">加成 (JSON)</label>
                <textarea
                  name="bonuses"
                  defaultValue={editingProfession.bonuses}
                  rows={4}
                  placeholder='{"attackBoost": 0.2, "critRate": 0.05}'
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">解锁条件 (JSON)</label>
                <textarea
                  name="unlockConditions"
                  defaultValue={editingProfession.unlockConditions}
                  rows={4}
                  placeholder='{"requiredSkills": [{"category": "sword", "minLevel": 3}]}'
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none font-mono text-sm"
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
                    setEditingProfession(null);
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
            <p className="text-[#888] mb-6">确定要删除这个职业吗？此操作无法撤销。</p>
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
