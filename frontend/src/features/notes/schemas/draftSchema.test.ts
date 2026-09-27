import { describe, expect, it } from "vitest";

import { draftSchema } from "./draftSchema";

describe("draftSchema", () => {
  it("allows empty title and content", () => {
    expect(draftSchema.safeParse({ title: "", content: "" }).success).toBe(true);
  });

  describe("title", () => {
    it("trims whitespace", () => {
      expect(draftSchema.parse({ title: " タイトル ", content: "" }).title).toBe("タイトル");
    });

    it("allows up to 100 characters", () => {
      expect(draftSchema.safeParse({ title: "あ".repeat(100), content: "" }).success).toBe(true);
    });

    it("rejects more than 100 characters", () => {
      expect(draftSchema.safeParse({ title: "あ".repeat(101), content: "" }).success).toBe(false);
    });
  });

  describe("content", () => {
    it("allows up to 100,000 characters", () => {
      expect(draftSchema.safeParse({ title: "", content: "あ".repeat(100_000) }).success).toBe(
        true,
      );
    });

    it("rejects more than 100,000 characters", () => {
      expect(draftSchema.safeParse({ title: "", content: "あ".repeat(100_001) }).success).toBe(
        false,
      );
    });
  });
});
