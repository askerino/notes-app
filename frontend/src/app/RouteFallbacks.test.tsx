import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { RouteErrorFallback } from "./RouteFallbacks";

function silenceConsoleError() {
  vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("RouteErrorFallback", () => {
  it("shows a could-not-display message on an unexpected error", async () => {
    silenceConsoleError();
    const router = createMemoryRouter([
      {
        path: "/",
        loader: () => {
          throw new Error("error");
        },
        element: <div />,
        ErrorBoundary: RouteErrorFallback,
      },
    ]);

    render(<RouterProvider router={router} />);
    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "画面を表示できませんでした。時間をおいてから、もう一度お試しください。",
    );
    expect(alert).not.toHaveTextContent("ページが見つかりません。URLを確認してください。");
  });

  it("shows a not-found message on a 404", async () => {
    silenceConsoleError();
    const router = createMemoryRouter([
      {
        path: "/",
        loader: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw new Response("", { status: 404 });
        },
        element: <div />,
        ErrorBoundary: RouteErrorFallback,
      },
    ]);

    render(<RouterProvider router={router} />);
    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("ページが見つかりません。URLを確認してください。");
    expect(alert).not.toHaveTextContent(
      "画面を表示できませんでした。時間をおいてから、もう一度お試しください。",
    );
  });
});
