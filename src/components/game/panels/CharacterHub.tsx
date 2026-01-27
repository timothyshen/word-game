// 角色Hub - 整合角色管理相关功能

import { useState } from "react";
import HubPanel, { type HubTab } from "./HubPanel";
import {
  CharacterListTab,
  CharacterDetailTab,
  EquipmentTab,
  BreakthroughTab,
} from "./character";

interface CharacterHubProps {
  onClose: () => void;
  initialTab?: string;
  initialCharacterId?: string;
}

export default function CharacterHub({
  onClose,
  initialTab = "list",
  initialCharacterId,
}: CharacterHubProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    initialCharacterId ?? null
  );

  const tabs: HubTab[] = [
    {
      id: "list",
      label: "我的角色",
      icon: "👥",
      content: (
        <CharacterListTab
          onSelectCharacter={setSelectedCharacterId}
          selectedId={selectedCharacterId}
        />
      ),
    },
    {
      id: "detail",
      label: "角色详情",
      icon: "📊",
      content: <CharacterDetailTab characterId={selectedCharacterId} />,
    },
    {
      id: "equipment",
      label: "装备管理",
      icon: "🛡️",
      content: <EquipmentTab characterId={selectedCharacterId} />,
    },
    {
      id: "breakthrough",
      label: "职阶突破",
      icon: "⬆️",
      content: <BreakthroughTab characterId={selectedCharacterId} />,
    },
  ];

  return (
    <HubPanel
      title="角色管理"
      icon="👥"
      tabs={tabs}
      defaultTab={initialTab}
      onClose={onClose}
    />
  );
}
