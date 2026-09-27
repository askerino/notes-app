import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

type Options = Parameters<typeof useKeyboardShortcuts>[0];

function setup(overrides: { isDesktop?: boolean; isSidebarOpen?: boolean } = {}) {
  const callbacks = {
    onOpen: vi.fn(),
    onToggle: vi.fn(),
    onCreateNote: vi.fn(),
    onFocusSearchInput: vi.fn(),
  };
  const options: Options = {
    isDesktop: overrides.isDesktop ?? true,
    sidebar: {
      isOpen: overrides.isSidebarOpen ?? true,
      onOpen: callbacks.onOpen,
      onToggle: callbacks.onToggle,
    },
    onCreateNote: callbacks.onCreateNote,
    onFocusSearchInput: callbacks.onFocusSearchInput,
  };
  const { unmount } = renderHook(() => useKeyboardShortcuts(options));
  return { ...callbacks, unmount };
}

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
  return { defaultPrevented: event.defaultPrevented };
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    // Run requestAnimationFrame callbacks immediately.
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  it("does not react after unmount", () => {
    const { onCreateNote, unmount } = setup();
    unmount();

    press({ code: "KeyN", ctrlKey: true, altKey: true });

    expect(onCreateNote).not.toHaveBeenCalled();
  });

  it("reads the latest isDesktop value after re-rendering", () => {
    const sidebar = { isOpen: true, onOpen: vi.fn(), onToggle: vi.fn() };
    const onFocusSearchInput = vi.fn();
    const { rerender } = renderHook(
      ({ isDesktop }) =>
        useKeyboardShortcuts({ isDesktop, sidebar, onCreateNote: vi.fn(), onFocusSearchInput }),
      { initialProps: { isDesktop: false } },
    );

    press({ code: "KeyK", ctrlKey: true });
    expect(onFocusSearchInput).not.toHaveBeenCalled();

    rerender({ isDesktop: true });
    press({ code: "KeyK", ctrlKey: true });
    expect(onFocusSearchInput).toHaveBeenCalledOnce();
  });

  describe("Ctrl/Cmd + Alt + N (create a new note)", () => {
    it.each([
      ["Ctrl", { ctrlKey: true }],
      ["Cmd", { metaKey: true }],
    ])("creates a note and prevents the default action with %s+Alt+N", (_name, modifier) => {
      const { onCreateNote } = setup();

      const { defaultPrevented } = press({ code: "KeyN", ...modifier, altKey: true });

      expect(onCreateNote).toHaveBeenCalledOnce();
      expect(defaultPrevented).toBe(true);
    });

    it("creates a note at mobile width", () => {
      const { onCreateNote } = setup({ isDesktop: false });

      press({ code: "KeyN", ctrlKey: true, altKey: true });

      expect(onCreateNote).toHaveBeenCalledOnce();
    });

    it("does not react to Ctrl+N without Alt", () => {
      const { onCreateNote } = setup();

      const { defaultPrevented } = press({ code: "KeyN", ctrlKey: true });

      expect(onCreateNote).not.toHaveBeenCalled();
      expect(defaultPrevented).toBe(false);
    });

    it("does not react to Alt+N without Ctrl", () => {
      const { onCreateNote } = setup();

      press({ code: "KeyN", altKey: true });

      expect(onCreateNote).not.toHaveBeenCalled();
    });

    it("does not react to Ctrl+Alt+N with Shift", () => {
      const { onCreateNote } = setup();

      press({ code: "KeyN", ctrlKey: true, altKey: true, shiftKey: true });

      expect(onCreateNote).not.toHaveBeenCalled();
    });
  });

  describe("Ctrl/Cmd + K (focus the search input)", () => {
    it("focuses the search input when the sidebar is open", () => {
      const { onOpen, onFocusSearchInput } = setup({ isSidebarOpen: true });

      const { defaultPrevented } = press({ code: "KeyK", ctrlKey: true });

      expect(onOpen).not.toHaveBeenCalled();
      expect(onFocusSearchInput).toHaveBeenCalledOnce();
      expect(defaultPrevented).toBe(true);
    });

    it("opens the sidebar and then focuses the search input when it is closed", () => {
      const { onFocusSearchInput, onOpen } = setup({ isSidebarOpen: false });

      press({ code: "KeyK", ctrlKey: true });

      expect(onOpen).toHaveBeenCalledOnce();
      expect(onFocusSearchInput).toHaveBeenCalledOnce();
    });

    it("does not react at mobile width", () => {
      const { onOpen, onFocusSearchInput } = setup({ isDesktop: false });

      const { defaultPrevented } = press({ code: "KeyK", ctrlKey: true });

      expect(onOpen).not.toHaveBeenCalled();
      expect(onFocusSearchInput).not.toHaveBeenCalled();
      expect(defaultPrevented).toBe(false);
    });
  });

  describe("Ctrl/Cmd + Backslash (toggle the sidebar)", () => {
    it.each([
      ["Backslash code", { code: "Backslash", key: "" }],
      ["IntlYen code", { code: "IntlYen", key: "" }],
      ["backslash key", { code: "", key: "\\" }],
      ["yen sign key", { code: "", key: "¥" }],
    ])("toggles the sidebar when %s is pressed", (_name, keydownInit) => {
      const { onToggle } = setup();

      const { defaultPrevented } = press({ ...keydownInit, ctrlKey: true });

      expect(onToggle).toHaveBeenCalledOnce();
      expect(defaultPrevented).toBe(true);
    });

    it("does not react at mobile width", () => {
      const { onToggle } = setup({ isDesktop: false });

      press({ code: "Backslash", key: "\\", ctrlKey: true });

      expect(onToggle).not.toHaveBeenCalled();
    });

    it("does not react to a backslash without Ctrl/Cmd", () => {
      const { onToggle } = setup();

      const { defaultPrevented } = press({ code: "Backslash", key: "\\" });

      expect(onToggle).not.toHaveBeenCalled();
      expect(defaultPrevented).toBe(false);
    });
  });
});
