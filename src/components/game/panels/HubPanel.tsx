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
        className="bg-[#0a0a15]/95 backdrop-blur-sm border border-[#2a3a4a] p-0 max-w-6xl h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl text-[#e0dcd0]">
              {title}
            </DialogTitle>
            <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl transition-colors">
              ✕
            </button>
          </div>
          <div className="h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent mt-2" />
        </DialogHeader>

        {/* 标签页导航 */}
        <div className="flex-shrink-0 flex border-b border-[#2a3a4a] bg-[#050810] overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[#c9a227] text-[#c9a227] bg-[#0a0a15]"
                  : "border-transparent text-[#5a6a7a] hover:text-[#e0dcd0] hover:bg-[#0a0a15]/50"
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
