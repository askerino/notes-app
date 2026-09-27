import { useEffect, useEffectEvent } from "react";

import type { Sidebar } from "./useSidebar";

type UseKeyboardShortcutsOptions = {
  isDesktop: boolean;
  sidebar: Pick<Sidebar, "isOpen" | "onOpen" | "onToggle">;
  onCreateNote: () => void;
  onFocusSearchInput: () => void;
};

export function useKeyboardShortcuts({
  isDesktop,
  sidebar,
  onCreateNote,
  onFocusSearchInput,
}: UseKeyboardShortcutsOptions) {
  const handleKeydown = useEffectEvent((event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey) {
      return;
    }

    // Ctrl/Cmd + Alt + N: Create a new note
    if (event.altKey) {
      if (event.code === "KeyN") {
        event.preventDefault();
        onCreateNote();
      }
      return;
    }

    if (!isDesktop) {
      return;
    }

    // Ctrl/Cmd + K: Focus search input
    if (event.code === "KeyK") {
      event.preventDefault();
      if (sidebar.isOpen) {
        onFocusSearchInput();
      } else {
        sidebar.onOpen();
        requestAnimationFrame(onFocusSearchInput);
      }
      return;
    }

    // Ctrl/Cmd + Backslash: Toggle sidebar (supports Japanese keyboards)
    if (
      event.code === "Backslash" ||
      event.code === "IntlYen" ||
      event.key === "\\" ||
      event.key === "¥"
    ) {
      event.preventDefault();
      sidebar.onToggle();
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeydown(event);
    window.addEventListener("keydown", listener, { capture: true });
    return () => window.removeEventListener("keydown", listener, { capture: true });
  }, []);
}
