import { describe, expect, it } from "vitest";

import { isMacOS, shortcutLabel } from "./shortcuts";

describe("isMacOS", () => {
  it("returns true for macOS and iOS user agents", () => {
    expect(isMacOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")).toBe(
      true,
    );
    expect(isMacOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
  });

  it("returns false for other platforms", () => {
    expect(isMacOS("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
    expect(isMacOS("Mozilla/5.0 (X11; Linux x86_64)")).toBe(false);
    expect(isMacOS("")).toBe(false);
  });
});

describe("shortcutLabel", () => {
  describe("on macOS", () => {
    it("prepends the command key and replaces modifier names with symbols", () => {
      const macOsUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
      expect(shortcutLabel("\\", macOsUserAgent)).toBe("⌘\\");
      expect(shortcutLabel("Alt+N", macOsUserAgent)).toBe("⌘⌥N");
      expect(shortcutLabel("Shift+K", macOsUserAgent)).toBe("⌘⇧K");
      expect(shortcutLabel("Control+Alt+N", macOsUserAgent)).toBe("⌘⌃⌥N");
    });
  });

  describe("on Windows/Linux", () => {
    it("uses the Ctrl prefix and keeps key names as-is", () => {
      const windowsUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
      expect(shortcutLabel("\\", windowsUserAgent)).toBe("Ctrl+\\");
      expect(shortcutLabel("Alt+N", windowsUserAgent)).toBe("Ctrl+Alt+N");
    });
  });
});
