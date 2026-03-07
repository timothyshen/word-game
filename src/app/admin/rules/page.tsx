"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";

const RULE_TYPES = [
  { value: "formula", label: "公式" },
  { value: "condition", label: "条件" },
  { value: "weighted_random", label: "加权随机" },
  { value: "config", label: "配置" },
];

interface RuleForm {
  id?: string;
  name: string;
  category: string;
  ruleType: string;
  definition: string;
  description: string;
}

const emptyForm: RuleForm = {
  name: "",
  category: "",
  ruleType: "config",
  definition: "{}",
  description: "",
};

export default function RulesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: rules, isLoading } = api.admin.getRules.useQuery();

  const categories = useMemo(() => {
    if (!rules) return [];
    const cats = [...new Set(rules.map((r) => r.category))];
    return cats.sort();
  }, [rules]);

  const filteredRules = useMemo(() => {
    if (!rules) return [];
    if (!activeCategory) return rules;
    return rules.filter((r) => r.category === activeCategory);
  }, [rules, activeCategory]);

  const createMutation = api.admin.createRule.useMutation({
    onSuccess: () => {
      void utils.admin.getRules.invalidate();
      setShowForm(false);
      setEditingRule(null);
    },
  });

  const updateMutation = api.admin.updateRule.useMutation({
    onSuccess: () => {
      void utils.admin.getRules.invalidate();
      setShowForm(false);
      setEditingRule(null);
    },
  });

  const deleteMutation = api.admin.deleteRule.useMutation({
    onSuccess: () => {
      void utils.admin.getRules.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      ruleType: formData.get("ruleType") as "formula" | "condition" | "weighted_random" | "config",
      definition: formData.get("definition") as string,
      description: formData.get("description") as string,
    };

    if (editingRule?.id) {
      updateMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateForm = () => {
    setEditingRule(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (rule: RuleForm) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const formatDefinition = (def: string): string => {
    try {
      return JSON.stringify(JSON.parse(def), null, 2);
    } catch {
      return def;
    }
  };

  const truncateDefinition = (def: string, maxLen = 60): string => {
    const flat = def.replace(/\s+/g, " ");
    return flat.length > maxLen ? flat.slice(0, maxLen) + "..." : flat;
  };

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">规则管理</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f]"
        >
          + 添加规则
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 text-sm border transition-colors ${
            activeCategory === null
              ? "bg-[#c9a227]/20 border-[#c9a227] text-[#c9a227]"
              : "border-[#2a2a30] text-[#888] hover:bg-[#1a1a20] hover:text-[#e0dcd0]"
          }`}
        >
          全部 ({rules?.length ?? 0})
        </button>
        {categories.map((cat) => {
          const count = rules?.filter((r) => r.category === cat).length ?? 0;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-sm border transition-colors ${
                activeCategory === cat
                  ? "bg-[#c9a227]/20 border-[#c9a227] text-[#c9a227]"
                  : "border-[#2a2a30] text-[#888] hover:bg-[#1a1a20] hover:text-[#e0dcd0]"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Rules table */}
      <div className="bg-[#101014] border border-[#2a2a30]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a30]">
              <th className="text-left p-4 text-[#888] font-normal">名称</th>
              <th className="text-left p-4 text-[#888] font-normal">分类</th>
              <th className="text-left p-4 text-[#888] font-normal">类型</th>
              <th className="text-left p-4 text-[#888] font-normal">描述</th>
              <th className="text-left p-4 text-[#888] font-normal">定义</th>
              <th className="text-left p-4 text-[#888] font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((rule) => {
              const ruleType = RULE_TYPES.find((t) => t.value === rule.ruleType);

              return (
                <tr key={rule.id} className="border-b border-[#2a2a30] hover:bg-[#1a1a20]">
                  <td className="p-4 font-bold font-mono text-sm">{rule.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-[#2a2a30] text-[#c9a227] text-xs rounded">
                      {rule.category}
                    </span>
                  </td>
                  <td className="p-4 text-[#888] text-sm">{ruleType?.label ?? rule.ruleType}</td>
                  <td className="p-4 text-[#888] text-sm max-w-xs truncate">
                    {rule.description || "-"}
                  </td>
                  <td className="p-4 text-[#666] text-xs font-mono max-w-xs truncate">
                    {truncateDefinition(rule.definition)}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditForm(rule)}
                      className="text-[#4a9eff] hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(rule.id)}
                      className="text-[#e74c3c] hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredRules.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#888]">
                  {activeCategory ? `分类 "${activeCategory}" 下暂无规则` : "暂无规则，点击上方按钮添加"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit form dialog */}
      {showForm && editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingRule.id ? "编辑规则" : "添加规则"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">名称 (唯一标识)</label>
                <input
                  name="name"
                  defaultValue={editingRule.name}
                  required
                  placeholder="例: stamina_recovery"
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">分类</label>
                  <input
                    name="category"
                    defaultValue={editingRule.category}
                    required
                    placeholder="例: player, combat, economy"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">规则类型</label>
                  <select
                    name="ruleType"
                    defaultValue={editingRule.ruleType}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  >
                    {RULE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <input
                  name="description"
                  defaultValue={editingRule.description}
                  placeholder="规则说明"
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">定义 (JSON)</label>
                <textarea
                  name="definition"
                  defaultValue={formatDefinition(editingRule.definition)}
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
                    setEditingRule(null);
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
            <p className="text-[#888] mb-6">确定要删除这条规则吗？此操作无法撤销。</p>
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
