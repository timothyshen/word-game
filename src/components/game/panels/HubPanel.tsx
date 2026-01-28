// 通用Hub组件 - 带标签页支持的弹窗容器

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

export interface HubTab {
  id: string;
  label: string;
  icon: string;
  content: React.ReactNode;
}

interface HubPanelProps {
  title: string;
  icon: string;
  tabs: HubTab[];
  defaultTab?: string;
  onClose: () => void;
}

export default function HubPanel({
  title,
  icon,
  tabs,
  defaultTab,
  onClose,
}: HubPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "");

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-6xl h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-[#1a1810] to-[#101014] border-b border-[#c9a227]/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#c9a227] flex items-center justify-center text-3xl">
                {icon}
              </div>
              <div>
                <div className="text-[#c9a227] text-xs uppercase tracking-wider">Hub</div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                  {title}
                </DialogTitle>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">
              ✕
            </button>
          </div>
        </DialogHeader>

        {/* 标签页导航 */}
        <div className="flex-shrink-0 flex border-b border-[#2a2a30] bg-[#0a0a0c] overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[#c9a227] text-[#c9a227] bg-[#1a1810]"
                  : "border-transparent text-[#888] hover:text-[#e0dcd0] hover:bg-[#151518]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {currentTab?.content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
