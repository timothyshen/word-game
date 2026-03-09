// 游戏面板状态管理 hook - 统一管理所有 hub/panel 的打开关闭状态

import { useState, useEffect, useCallback } from "react";

interface PanelState {
  // Hub 状态
  showCharacterHub: boolean;
  characterHubTab: string;
  selectedCharacterId: string | null;
  showInventoryHub: boolean;
  inventoryHubTab: string;
  showAdventureHub: boolean;
  adventureHubTab: string;
  showProgressHub: boolean;
  progressHubTab: string;
  showLogHub: boolean;
  logHubTab: string;
  // 独立面板
  showEconomyPanel: boolean;
  showCombatPanel: boolean;
  combatLevel: number;
  showInnerCityPanel: boolean;
  // UI 状态
  showHUD: boolean;
  showMenu: boolean;
  showGuidancePanel: boolean;
}

export function useGamePanels() {
  // Hub 弹窗状态
  const [showCharacterHub, setShowCharacterHub] = useState(false);
  const [characterHubTab, setCharacterHubTab] = useState("list");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const [showInventoryHub, setShowInventoryHub] = useState(false);
  const [inventoryHubTab, setInventoryHubTab] = useState("backpack");

  const [showAdventureHub, setShowAdventureHub] = useState(false);
  const [adventureHubTab, setAdventureHubTab] = useState("boss");

  const [showProgressHub, setShowProgressHub] = useState(false);
  const [progressHubTab, setProgressHubTab] = useState("profession");

  const [showLogHub, setShowLogHub] = useState(false);
  const [logHubTab, setLogHubTab] = useState("settlement");

  // 独立面板
  const [showEconomyPanel, setShowEconomyPanel] = useState(false);
  const [showCombatPanel, setShowCombatPanel] = useState(false);
  const [combatLevel, setCombatLevel] = useState(1);
  const [showInnerCityPanel, setShowInnerCityPanel] = useState(false);

  // UI 状态
  const [showHUD, setShowHUD] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showGuidancePanel, setShowGuidancePanel] = useState(false);

  const anyPanelOpen =
    showCharacterHub || showInventoryHub || showAdventureHub ||
    showProgressHub || showLogHub || showEconomyPanel ||
    showCombatPanel || showInnerCityPanel || showGuidancePanel;

  // ESC 键打开/关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (anyPanelOpen) return; // 让面板自己处理 ESC
        setShowMenu((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anyPanelOpen]);

  // Hub 打开快捷方法
  const openCharacterHub = useCallback((tab = "list", characterId?: string) => {
    setCharacterHubTab(tab);
    if (characterId) setSelectedCharacterId(characterId);
    setShowCharacterHub(true);
  }, []);

  const openInventoryHub = useCallback((tab = "backpack") => {
    setInventoryHubTab(tab);
    setShowInventoryHub(true);
  }, []);

  const openAdventureHub = useCallback((tab = "boss") => {
    setAdventureHubTab(tab);
    setShowAdventureHub(true);
  }, []);

  const openProgressHub = useCallback((tab = "profession") => {
    setProgressHubTab(tab);
    setShowProgressHub(true);
  }, []);

  const openLogHub = useCallback((tab = "settlement") => {
    setLogHubTab(tab);
    setShowLogHub(true);
  }, []);

  const openCombat = useCallback((level = 1) => {
    setCombatLevel(level);
    setShowCombatPanel(true);
  }, []);

  const openInnerCity = useCallback(() => {
    setShowInnerCityPanel(true);
  }, []);

  // HintBar action handler
  const handleHintAction = useCallback((action: string, onLevelUp: () => void) => {
    if (action === "levelUp") {
      onLevelUp();
      return;
    }
    const [hub, tab] = action.split(":");
    switch (hub) {
      case "logHub": openLogHub(tab ?? "settlement"); break;
      case "adventureHub": openAdventureHub(tab ?? "boss"); break;
      case "inventoryHub": openInventoryHub(tab ?? "backpack"); break;
      case "progressHub": openProgressHub(tab ?? "profession"); break;
      case "characterHub": openCharacterHub(tab ?? "list"); break;
      case "innerCity": openInnerCity(); break;
      case "combat": openCombat(1); break;
    }
  }, [openLogHub, openAdventureHub, openInventoryHub, openProgressHub, openCharacterHub, openInnerCity, openCombat]);

  return {
    // Hub 状态
    showCharacterHub, setShowCharacterHub, characterHubTab, selectedCharacterId,
    showInventoryHub, setShowInventoryHub, inventoryHubTab,
    showAdventureHub, setShowAdventureHub, adventureHubTab,
    showProgressHub, setShowProgressHub, progressHubTab,
    showLogHub, setShowLogHub, logHubTab,
    // 独立面板
    showEconomyPanel, setShowEconomyPanel,
    showCombatPanel, setShowCombatPanel, combatLevel, setCombatLevel,
    showInnerCityPanel, setShowInnerCityPanel,
    // UI 状态
    showHUD, setShowHUD,
    showMenu, setShowMenu,
    showGuidancePanel, setShowGuidancePanel,
    // 快捷方法
    openCharacterHub, openInventoryHub, openAdventureHub,
    openProgressHub, openLogHub, openCombat, openInnerCity,
    handleHintAction,
  };
}
