import { describe, expect, it } from "vitest";

import { toMarkdownFileName } from "./export";

describe("toMarkdownFileName", () => {
  it("uses the title as the file name", () => {
    expect(toMarkdownFileName("会議メモ")).toBe("会議メモ.md");
  });

  it("falls back to the untitled name when the title is empty or whitespace-only", () => {
    expect(toMarkdownFileName("")).toBe("無題.md");
    expect(toMarkdownFileName("   ")).toBe("無題.md");
  });

  it("replaces characters that are invalid in file names", () => {
    expect(toMarkdownFileName('a\\b/c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j.md");
    expect(toMarkdownFileName("a\tb")).toBe("a_b.md");
  });

  it("removes trailing dots and spaces", () => {
    expect(toMarkdownFileName("メモ. . ")).toBe("メモ.md");
    expect(toMarkdownFileName("...")).toBe("無題.md");
  });

  it("prefixes Windows reserved device names", () => {
    expect(toMarkdownFileName("CON")).toBe("_CON.md");
    expect(toMarkdownFileName("nul.txt")).toBe("_nul.txt.md");
    expect(toMarkdownFileName("COM1")).toBe("_COM1.md");
    expect(toMarkdownFileName("CONSOLE")).toBe("CONSOLE.md");
  });
});
