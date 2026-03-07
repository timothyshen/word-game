"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface TemplateForm {
  id?: string;
  schemaId: string;
  name: string;
  data: string;
  icon: string;
  rarity: string;
  description: string;
}

const RARITIES = ["普通", "精良", "稀有", "史诗", "传说"];

const formatJson = (s: string): string => {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
};

const truncateJson = (s: string, max = 80): string => {
  const flat = s.replace(/\s+/g, " ");
  return flat.length > max ? flat.slice(0, max) + "..." : flat;
};

export default function EntitiesPage() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: games, isLoading: gamesLoading } = api.admin.getGames.useQuery();

  // Auto-select first game
  const activeGameId = selectedGameId ?? games?.[0]?.id ?? null;

  const { data: schemas } = api.admin.getSchemas.useQuery(
    { gameId: activeGameId! },
    { enabled: !!activeGameId },
  );

  const { data: templates } = api.admin.getTemplates.useQuery(
    { schemaId: expandedSchema! },
    { enabled: !!expandedSchema },
  );

  const createMutation = api.admin.createTemplate.useMutation({
    onSuccess: () => {
      if (expandedSchema) void utils.admin.getTemplates.invalidate({ schemaId: expandedSchema });
      void utils.admin.getSchemas.invalidate();
      setShowForm(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = api.admin.updateTemplate.useMutation({
    onSuccess: () => {
      if (expandedSchema) void utils.admin.getTemplates.invalidate({ schemaId: expandedSchema });
      void utils.admin.getSchemas.invalidate();
      setShowForm(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = api.admin.deleteTemplate.useMutation({
    onSuccess: () => {
      if (expandedSchema) void utils.admin.getTemplates.invalidate({ schemaId: expandedSchema });
      void utils.admin.getSchemas.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      schemaId: formData.get("schemaId") as string,
      name: formData.get("name") as string,
      data: formData.get("data") as string,
      icon: formData.get("icon") as string,
      rarity: formData.get("rarity") as string,
      description: formData.get("description") as string,
    };

    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = (schemaId: string) => {
    setEditingTemplate({
      schemaId,
      name: "",
      data: "{}",
      icon: "",
      rarity: "",
      description: "",
    });
    setShowForm(true);
  };

  const openEditForm = (tpl: {
    id: string;
    schemaId: string;
    name: string;
    data: string;
    icon: string;
    rarity: string | null;
    description: string;
  }) => {
    setEditingTemplate({
      id: tpl.id,
      schemaId: tpl.schemaId,
      name: tpl.name,
      data: tpl.data,
      icon: tpl.icon,
      rarity: tpl.rarity ?? "",
      description: tpl.description,
    });
    setShowForm(true);
  };

  if (gamesLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">实体管理</h1>
      </div>

      {/* Game selector */}
      {games && games.length > 1 && (
        <div className="mb-4">
          <label className="text-sm text-[#888] mr-2">游戏:</label>
          <select
            value={activeGameId ?? ""}
            onChange={(e) => {
              setSelectedGameId(e.target.value);
              setExpandedSchema(null);
            }}
            className="p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Current game info */}
      {games && activeGameId && (
        <div className="mb-4 text-sm text-[#888]">
          当前游戏: <span className="text-[#c9a227] font-bold">{games.find((g) => g.id === activeGameId)?.name}</span>
        </div>
      )}

      {/* Schema list */}
      <div className="space-y-3">
        {schemas?.map((schema) => {
          const isExpanded = expandedSchema === schema.id;
          let components: string[] = [];
          try {
            components = JSON.parse(schema.components) as string[];
          } catch { /* ignore */ }

          return (
            <div key={schema.id} className="bg-[#101014] border border-[#2a2a30]">
              {/* Schema header */}
              <button
                onClick={() => setExpandedSchema(isExpanded ? null : schema.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a20] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                  <div>
                    <span className="font-bold text-lg">{schema.name}</span>
                    <span className="ml-3 text-sm text-[#888]">
                      {schema._count.templates} 个模板
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {components.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-[#2a2a30] text-[#c9a227] text-xs rounded"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </button>

              {/* Templates table (expanded) */}
              {isExpanded && (
                <div className="border-t border-[#2a2a30]">
                  <div className="p-4 flex justify-between items-center border-b border-[#2a2a30] bg-[#0c0c10]">
                    <span className="text-sm text-[#888]">模板列表</span>
                    <button
                      onClick={() => openCreateForm(schema.id)}
                      className="px-3 py-1.5 bg-[#c9a227] text-[#08080a] font-bold text-sm hover:bg-[#ddb52f]"
                    >
                      + 添加模板
                    </button>
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a30]">
                        <th className="text-left p-3 text-[#888] font-normal text-sm">图标</th>
                        <th className="text-left p-3 text-[#888] font-normal text-sm">名称</th>
                        <th className="text-left p-3 text-[#888] font-normal text-sm">稀有度</th>
                        <th className="text-left p-3 text-[#888] font-normal text-sm">描述</th>
                        <th className="text-left p-3 text-[#888] font-normal text-sm">数据</th>
                        <th className="text-left p-3 text-[#888] font-normal text-sm">实体数</th>
                        <th className="text-left p-3 text-[#888] font-normal text-sm">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates?.map((tpl) => (
                        <tr key={tpl.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                          <td className="p-3 text-lg">{tpl.icon || "-"}</td>
                          <td className="p-3 font-bold">{tpl.name}</td>
                          <td className="p-3">
                            {tpl.rarity ? (
                              <span className="px-2 py-0.5 bg-[#2a2a30] text-xs rounded">
                                {tpl.rarity}
                              </span>
                            ) : (
                              <span className="text-[#666]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-[#888] text-sm max-w-xs truncate">
                            {tpl.description || "-"}
                          </td>
                          <td className="p-3 text-[#666] text-xs font-mono max-w-xs truncate">
                            {truncateJson(tpl.data)}
                          </td>
                          <td className="p-3 text-[#888] text-sm">{tpl._count.entities}</td>
                          <td className="p-3">
                            <button
                              onClick={() => openEditForm(tpl)}
                              className="text-[#4a9eff] hover:underline mr-3 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(tpl.id)}
                              className="text-[#e74c3c] hover:underline text-sm"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                      {templates?.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-[#888]">
                            暂无模板，点击上方按钮添加
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {schemas?.length === 0 && (
          <div className="bg-[#101014] border border-[#2a2a30] p-8 text-center text-[#888]">
            当前游戏没有定义任何 Schema
          </div>
        )}
      </div>

      {/* Create/Edit template dialog */}
      {showForm && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate.id ? "编辑模板" : "添加模板"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="schemaId" value={editingTemplate.schemaId} />

              <div>
                <label className="block text-sm text-[#888] mb-1">名称</label>
                <input
                  name="name"
                  defaultValue={editingTemplate.name}
                  required
                  placeholder="模板名称"
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">图标</label>
                  <input
                    name="icon"
                    defaultValue={editingTemplate.icon}
                    placeholder="例: ⚔️"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">稀有度</label>
                  <select
                    name="rarity"
                    defaultValue={editingTemplate.rarity}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    <option value="">无</option>
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <input
                  name="description"
                  defaultValue={editingTemplate.description}
                  placeholder="模板描述"
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">数据 (JSON)</label>
                <textarea
                  name="data"
                  defaultValue={formatJson(editingTemplate.data)}
                  rows={8}
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
                    setEditingTemplate(null);
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

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">确认删除</h2>
            <p className="text-[#888] mb-6">确定要删除这个模板吗？此操作无法撤销。</p>
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
