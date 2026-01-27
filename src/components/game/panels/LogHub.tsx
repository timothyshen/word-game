// 记录Hub - 整合结算、行动历史、战斗历史

import HubPanel, { type HubTab } from "./HubPanel";
import {
  SettlementTab,
  ActionHistoryTab,
  CombatHistoryTab,
} from "./log";

interface LogHubProps {
  onClose: () => void;
  initialTab?: string;
  onResumeCombat?: (combatId: string) => void;
}

export default function LogHub({
  onClose,
  initialTab = "settlement",
  onResumeCombat,
}: LogHubProps) {
  const tabs: HubTab[] = [
    {
      id: "settlement",
      label: "今日结算",
      icon: "🎴",
      content: <SettlementTab />,
    },
    {
      id: "action",
      label: "行动记录",
      icon: "📋",
      content: <ActionHistoryTab />,
    },
    {
      id: "combat",
      label: "战斗历史",
      icon: "📖",
      content: <CombatHistoryTab onResumeCombat={onResumeCombat} />,
    },
  ];

  return (
    <HubPanel
      title="记录系统"
      icon="📜"
      tabs={tabs}
      defaultTab={initialTab}
      onClose={onClose}
    />
  );
}
