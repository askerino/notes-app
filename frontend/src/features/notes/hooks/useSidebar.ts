import { useEffect, useEffectEvent } from "react";
import type { Layout, LayoutChangedMeta, PanelSize } from "react-resizable-panels";
import { usePanelRef } from "react-resizable-panels";

import { useLocalStorageState } from "@/hooks/useLocalStorageState";

const OPEN_KEY = "sidebar-open";
const WIDTH_KEY = "sidebar-width";

const DEFAULT_WIDTH = 320;

export type Sidebar = ReturnType<typeof useSidebar>;

export function useSidebar(isDesktop: boolean) {
  const panelRef = usePanelRef();

  const [isOpen, setIsOpen] = useLocalStorageState(OPEN_KEY, true);
  const [width, setWidth] = useLocalStorageState(WIDTH_KEY, DEFAULT_WIDTH);

  function onOpen() {
    setIsOpen(true);
  }
  function onClose() {
    setIsOpen(false);
  }
  function onToggle() {
    setIsOpen((open) => !open);
  }

  // Sync isOpen when the panel is collapsed by dragging.
  function onResize(size: PanelSize) {
    setIsOpen(size.inPixels > 0);
  }

  function onLayoutChanged(_layout: Layout, meta: LayoutChangedMeta) {
    if (!meta.isUserInteraction) {
      return;
    }
    const size = panelRef.current?.getSize();
    if (size && size.inPixels > 0) {
      setWidth(Math.round(size.inPixels));
    }
  }

  const expandPanel = useEffectEvent(() => {
    panelRef.current?.expand();
    panelRef.current?.resize(width);
  });

  useEffect(() => {
    if (!isDesktop) {
      return;
    }
    if (isOpen) {
      expandPanel();
    } else {
      panelRef.current?.collapse();
    }
  }, [isDesktop, panelRef, isOpen]);

  return {
    panelRef,

    isOpen,
    onOpen,
    onClose,
    onToggle,

    width,
    onResize,
    onLayoutChanged,
  };
}
