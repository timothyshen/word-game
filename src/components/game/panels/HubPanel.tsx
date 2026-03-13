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
        className="bg-[#0a0a15]/95 backdrop-blur-sm border border-[var(--game-border-accent)] p-0 max-w-6xl h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[var(--game-border-accent)] p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl text-[var(--game-text)]">
              {title}
            </DialogTitle>
            <button onClick={onClose} className="text-[var(--game-text-subtle)] hover:text-[var(--game-gold)] transition-colors" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent mt-2" />
        </DialogHeader>

        {/* 标签页导航 */}
        <div className="flex-shrink-0 flex border-b border-[var(--game-border-accent)] bg-[#050810] overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[var(--game-gold)] text-[var(--game-gold)] bg-[#0a0a15]"
                  : "border-transparent text-[var(--game-text-subtle)] hover:text-[var(--game-text)] hover:bg-[#0a0a15]/50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div key={activeTab} className="flex-1 min-h-0 overflow-hidden tab-content-enter">
          {currentTab?.content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
