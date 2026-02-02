"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { RewardField, ConditionField, StoryChoiceEditor } from "~/components/admin/effect-editors";

interface ChapterForm {
  id?: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
  rewardsJson: string;
  unlockJson: string;
}

interface NodeForm {
  id?: string;
  chapterId: string;
  nodeId: string;
  title: string;
  content: string;
  speaker?: string;
  speakerIcon?: string;
  order: number;
  nextNodeId?: string;
  choicesJson?: string;
  rewardsJson?: string;
}

const emptyChapter: ChapterForm = {
  title: "",
  description: "",
  order: 0,
  isActive: true,
  rewardsJson: '{"gold": 100, "exp": 50}',
  unlockJson: "{}",
};

const emptyNode: NodeForm = {
  chapterId: "",
  nodeId: "",
  title: "",
  content: "",
  order: 0,
};

export default function StoriesPage() {
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterForm | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState<NodeForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "chapter" | "node"; id: string } | null>(null);

  const utils = api.useUtils();

  const { data: chapters, isLoading } = api.admin.getStoryChapters.useQuery();

  // Chapter mutations
  const createChapterMutation = api.admin.createStoryChapter.useMutation({
    onSuccess: () => {
      void utils.admin.getStoryChapters.invalidate();
      setShowChapterForm(false);
      setEditingChapter(null);
    },
  });

  const updateChapterMutation = api.admin.updateStoryChapter.useMutation({
    onSuccess: () => {
      void utils.admin.getStoryChapters.invalidate();
      setShowChapterForm(false);
      setEditingChapter(null);
    },
  });

  const deleteChapterMutation = api.admin.deleteStoryChapter.useMutation({
    onSuccess: () => {
      void utils.admin.getStoryChapters.invalidate();
      setDeleteConfirm(null);
      if (selectedChapterId === deleteConfirm?.id) {
        setSelectedChapterId(null);
      }
    },
  });

  // Node mutations
  const createNodeMutation = api.admin.createStoryNode.useMutation({
    onSuccess: () => {
      void utils.admin.getStoryChapters.invalidate();
      setShowNodeForm(false);
      setEditingNode(null);
    },
  });

  const updateNodeMutation = api.admin.updateStoryNode.useMutation({
    onSuccess: () => {
      void utils.admin.getStoryChapters.invalidate();
      setShowNodeForm(false);
      setEditingNode(null);
    },
  });

  const deleteNodeMutation = api.admin.deleteStoryNode.useMutation({
    onSuccess: () => {
      void utils.admin.getStoryChapters.invalidate();
      setDeleteConfirm(null);
    },
  });

  const handleChapterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      order: parseInt(formData.get("order") as string) || 0,
      isActive: formData.get("isActive") === "on",
      rewardsJson: formData.get("rewardsJson") as string,
      unlockJson: formData.get("unlockJson") as string,
    };

    if (editingChapter?.id) {
      updateChapterMutation.mutate({ id: editingChapter.id, ...data });
    } else {
      createChapterMutation.mutate(data);
    }
  };

  const handleNodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      chapterId: formData.get("chapterId") as string,
      nodeId: formData.get("nodeId") as string,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      speaker: (formData.get("speaker") as string) || undefined,
      speakerIcon: (formData.get("speakerIcon") as string) || undefined,
      order: parseInt(formData.get("order") as string) || 0,
      nextNodeId: (formData.get("nextNodeId") as string) || undefined,
      choicesJson: (formData.get("choicesJson") as string) || undefined,
      rewardsJson: (formData.get("rewardsJson") as string) || undefined,
    };

    if (editingNode?.id) {
      updateNodeMutation.mutate({ id: editingNode.id, ...data });
    } else {
      createNodeMutation.mutate(data);
    }
  };

  const selectedChapter = chapters?.find((c) => c.id === selectedChapterId);

  if (isLoading) {
    return <div className="text-[#888]">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">剧情管理</h1>
        <button
          onClick={() => {
            setEditingChapter(emptyChapter);
            setShowChapterForm(true);
          }}
          className="px-4 py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba]"
        >
          + 添加章节
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 章节列表 */}
        <div className="col-span-1">
          <h2 className="text-lg font-bold mb-3">章节列表</h2>
          <div className="space-y-2">
            {chapters?.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => setSelectedChapterId(chapter.id)}
                className={`p-4 border cursor-pointer transition-colors ${
                  selectedChapterId === chapter.id
                    ? "border-[#4a9] bg-[#4a9]/10"
                    : "border-[#2a2a30] bg-[#101014] hover:border-[#3a3a40]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{chapter.title}</div>
                    <div className="text-sm text-[#888]">
                      {chapter.nodes.length} 个节点
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!chapter.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-[#666]/20 text-[#666]">
                        停用
                      </span>
                    )}
                    <span className="text-xs text-[#888]">#{chapter.order}</span>
                  </div>
                </div>
                <div className="text-xs text-[#666] mt-2 truncate">
                  {chapter.description}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChapter({
                        id: chapter.id,
                        title: chapter.title,
                        description: chapter.description,
                        order: chapter.order,
                        isActive: chapter.isActive,
                        rewardsJson: chapter.rewardsJson,
                        unlockJson: chapter.unlockJson,
                      });
                      setShowChapterForm(true);
                    }}
                    className="text-xs text-[#4a9eff] hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ type: "chapter", id: chapter.id });
                    }}
                    className="text-xs text-[#e74c3c] hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {chapters?.length === 0 && (
              <div className="p-4 text-center text-[#888] bg-[#101014] border border-[#2a2a30]">
                暂无章节
              </div>
            )}
          </div>
        </div>

        {/* 节点列表 */}
        <div className="col-span-2">
          {selectedChapter ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">
                  {selectedChapter.title} - 节点列表
                </h2>
                <button
                  onClick={() => {
                    setEditingNode({
                      ...emptyNode,
                      chapterId: selectedChapter.id,
                      order: selectedChapter.nodes.length,
                    });
                    setShowNodeForm(true);
                  }}
                  className="px-3 py-1 bg-[#c9a227] text-[#08080a] text-sm font-bold hover:bg-[#ddb52f]"
                >
                  + 添加节点
                </button>
              </div>

              <div className="bg-[#101014] border border-[#2a2a30]">
                {selectedChapter.nodes.length === 0 ? (
                  <div className="p-8 text-center text-[#888]">
                    暂无节点，点击上方按钮添加
                  </div>
                ) : (
                  <div className="divide-y divide-[#2a2a30]">
                    {selectedChapter.nodes.map((node, index) => (
                      <div key={node.id} className="p-4 hover:bg-[#1a1a20]">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-1.5 py-0.5 bg-[#2a2a30] text-[#888]">
                                {index + 1}
                              </span>
                              <span className="font-bold">{node.title}</span>
                              <span className="text-xs text-[#666]">
                                ({node.nodeId})
                              </span>
                            </div>
                            {node.speaker && (
                              <div className="text-sm text-[#4a9] mt-1">
                                {node.speakerIcon} {node.speaker}
                              </div>
                            )}
                            <div className="text-sm text-[#888] mt-2 line-clamp-2">
                              {node.content}
                            </div>
                            <div className="flex gap-3 mt-2 text-xs text-[#666]">
                              {node.nextNodeId && (
                                <span>下一节点: {node.nextNodeId}</span>
                              )}
                              {node.choicesJson && (
                                <span className="text-[#c9a227]">有选项</span>
                              )}
                              {node.rewardsJson && (
                                <span className="text-[#4a9]">有奖励</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => {
                                setEditingNode({
                                  id: node.id,
                                  chapterId: node.chapterId,
                                  nodeId: node.nodeId,
                                  title: node.title,
                                  content: node.content,
                                  speaker: node.speaker ?? undefined,
                                  speakerIcon: node.speakerIcon ?? undefined,
                                  order: node.order,
                                  nextNodeId: node.nextNodeId ?? undefined,
                                  choicesJson: node.choicesJson ?? undefined,
                                  rewardsJson: node.rewardsJson ?? undefined,
                                });
                                setShowNodeForm(true);
                              }}
                              className="text-xs text-[#4a9eff] hover:underline"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({ type: "node", id: node.id })
                              }
                              className="text-xs text-[#e74c3c] hover:underline"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 bg-[#101014] border border-[#2a2a30]">
              <div className="text-[#888]">选择一个章节查看节点</div>
            </div>
          )}
        </div>
      </div>

      {/* 章节表单弹窗 */}
      {showChapterForm && editingChapter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingChapter.id ? "编辑章节" : "添加章节"}
            </h2>

            <form onSubmit={handleChapterSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">标题</label>
                <input
                  name="title"
                  defaultValue={editingChapter.title}
                  required
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={editingChapter.description}
                  rows={3}
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">排序</label>
                  <input
                    name="order"
                    type="number"
                    defaultValue={editingChapter.order}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      name="isActive"
                      type="checkbox"
                      defaultChecked={editingChapter.isActive}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">启用</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">
                  完成奖励
                </label>
                <RewardField name="rewardsJson" defaultValue={editingChapter.rewardsJson} />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">
                  解锁条件
                </label>
                <ConditionField name="unlockJson" defaultValue={editingChapter.unlockJson} />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createChapterMutation.isPending || updateChapterMutation.isPending}
                  className="flex-1 py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba] disabled:opacity-50"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChapterForm(false);
                    setEditingChapter(null);
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

      {/* 节点表单弹窗 */}
      {showNodeForm && editingNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101014] border border-[#2a2a30] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingNode.id ? "编辑节点" : "添加节点"}
            </h2>

            <form onSubmit={handleNodeSubmit} className="space-y-4">
              <input type="hidden" name="chapterId" value={editingNode.chapterId} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">
                    节点ID (用于跳转)
                  </label>
                  <input
                    name="nodeId"
                    defaultValue={editingNode.nodeId}
                    required
                    placeholder="如: prologue_1"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">排序</label>
                  <input
                    name="order"
                    type="number"
                    defaultValue={editingNode.order}
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">标题</label>
                <input
                  name="title"
                  defaultValue={editingNode.title}
                  required
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">说话者</label>
                  <input
                    name="speaker"
                    defaultValue={editingNode.speaker}
                    placeholder="如: 神秘老人"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">
                    说话者图标
                  </label>
                  <input
                    name="speakerIcon"
                    defaultValue={editingNode.speakerIcon}
                    placeholder="如: 👴"
                    className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">内容</label>
                <textarea
                  name="content"
                  defaultValue={editingNode.content}
                  rows={5}
                  required
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">
                  下一节点ID (无选项时使用)
                </label>
                <input
                  name="nextNodeId"
                  defaultValue={editingNode.nextNodeId}
                  placeholder="如: prologue_2"
                  className="w-full p-2 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">
                  选项 (与下一节点二选一)
                </label>
                <StoryChoiceEditor name="choicesJson" defaultValue={editingNode.choicesJson ?? "[]"} />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">
                  节点奖励
                </label>
                <RewardField name="rewardsJson" defaultValue={editingNode.rewardsJson ?? "[]"} />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createNodeMutation.isPending || updateNodeMutation.isPending}
                  className="flex-1 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNodeForm(false);
                    setEditingNode(null);
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
            <p className="text-[#888] mb-6">
              {deleteConfirm.type === "chapter"
                ? "删除章节将同时删除其下所有节点，确定要继续吗？"
                : "确定要删除这个节点吗？"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (deleteConfirm.type === "chapter") {
                    deleteChapterMutation.mutate({ id: deleteConfirm.id });
                  } else {
                    deleteNodeMutation.mutate({ id: deleteConfirm.id });
                  }
                }}
                disabled={deleteChapterMutation.isPending || deleteNodeMutation.isPending}
                className="flex-1 py-2 bg-[#e74c3c] text-white font-bold hover:bg-[#c0392b] disabled:opacity-50"
              >
                确认删除
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
