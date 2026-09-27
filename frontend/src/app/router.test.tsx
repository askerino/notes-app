import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { Providers } from "@/app/Providers";
import { meetingNote } from "@/test/fixtures/notes";

import { routes } from "./router";

function renderWithProviders(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const view = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { router, ...view };
}

const noteSidebar = () => screen.findByRole("complementary", { name: "ノート一覧" });

describe("router", () => {
  beforeAll(async () => {
    await import("@/pages/notes/NotesPage");
  }, 30_000);

  it("redirects / to /notes", async () => {
    const { router } = renderWithProviders("/");

    await noteSidebar();

    expect(router.state.location.pathname).toBe("/notes");
  });

  it("shows the notes list at /notes", async () => {
    renderWithProviders("/notes");

    const sidebar = await noteSidebar();

    expect(
      await within(sidebar).findByRole("button", { name: meetingNote.title }),
    ).toBeInTheDocument();
  });

  it("shows the note details at /notes/:noteId", async () => {
    renderWithProviders(`/notes/${meetingNote.id}`);

    expect(await screen.findByRole("textbox", { name: "タイトル" })).toHaveValue(meetingNote.title);
  });

  it("shows the not-found message for unknown URLs", async () => {
    renderWithProviders("/no-such-page");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ページが見つかりません。URLを確認してください。",
    );
  });

  it("navigates back to /notes with the return button on the 404 page", async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders("/no-such-page");

    await user.click(await screen.findByRole("button", { name: "ノート一覧へ戻る" }));
    await noteSidebar();

    await waitFor(() => expect(router.state.location.pathname).toBe("/notes"));
  });
});
