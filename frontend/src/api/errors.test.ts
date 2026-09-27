import { describe, expect, it } from "vitest";

import { ApiError, toApiError } from "./errors";

function problemResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

describe("toApiError", () => {
  it("joins all validation messages with newlines", async () => {
    const response = problemResponse(
      {
        title: "エラーのタイトル",
        errors: { title: ["エラー1"], content: ["エラー2", "エラー3"] },
      },
      400,
    );

    const error = await toApiError(response);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe("エラー1\nエラー2\nエラー3");
  });

  it("falls back to detail, then title, when there are no validation errors", async () => {
    expect(
      (
        await toApiError(
          problemResponse({ title: "エラーのタイトル", detail: "エラーの詳細" }, 409),
        )
      ).message,
    ).toBe("エラーの詳細");
    expect((await toApiError(problemResponse({ title: "エラーのタイトル" }, 409))).message).toBe(
      "エラーのタイトル",
    );
  });

  it("uses a not-found message when the response is 404", async () => {
    const error = await toApiError(new Response("not json", { status: 404 }));

    expect(error.status).toBe(404);
    expect(error.message).toBe("指定のリソースが見つかりませんでした。");
  });

  it("uses a generic message when the body is unreadable", async () => {
    const error = await toApiError(new Response(null, { status: 500 }));

    expect(error.status).toBe(500);
    expect(error.message).toBe("通信に失敗しました。");
  });
});
