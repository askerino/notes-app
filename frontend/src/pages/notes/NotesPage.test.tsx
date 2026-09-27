import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import type { Draft } from "@/features/notes/schemas/draftSchema";
import { createNote, meetingNote, nonexistentNoteId, shoppingNote } from "@/test/fixtures/notes";
import { mockMatchMedia } from "@/test/mocks/matchMedia";
import { noteDb } from "@/test/mocks/noteDb";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/test-utils";

import { NotesPage } from "./NotesPage";

function stubApi() {
  const creates: Draft[] = [];
  const updates: { id: string; body: Draft }[] = [];
  const deletedIds: string[] = [];

  server.use(
    http.post("*/api/notes", async ({ request }) => {
      const draft = (await request.json()) as Draft;
      creates.push(draft);
      return HttpResponse.json(noteDb.create(draft), { status: 201 });
    }),
    http.put("*/api/notes/:id", async ({ request, params }) => {
      const id = String(params["id"]);
      const body = (await request.json()) as Draft;
      updates.push({ id, body });
      return HttpResponse.json(createNote({ id, ...body }));
    }),
    http.delete("*/api/notes/:id", ({ params }) => {
      deletedIds.push(String(params["id"]));
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return { creates, updates, deletedIds };
}

function renderNotesPage(route = "/notes") {
  return renderWithProviders(<NotesPage />, { route });
}

const openSidebarButton = () => screen.findByRole("button", { name: "ノート一覧を開く" });
const closeSidebarButton = () => screen.getByRole("button", { name: "ノート一覧を閉じる" });

const noteSidebar = () => screen.getByRole("complementary", { name: "ノート一覧" });
const searchInput = () => within(noteSidebar()).getByRole("textbox", { name: "ノートを検索" });
const createNoteButton = () => within(noteSidebar()).findByRole("button", { name: "新しいノート" });
const notesListButton = (name: string) => within(noteSidebar()).findByRole("button", { name });

const titleField = () => screen.findByRole("textbox", { name: "タイトル" });
const contentField = () => screen.findByRole("textbox", { name: "本文" });

const backButton = () => screen.getByRole("button", { name: "ノート一覧に戻る" });

// jsdom + resizable panel swallow the click, so focus and type instead.
async function typeIntoTitle(user: ReturnType<typeof userEvent.setup>, text: string) {
  const title = (await titleField()) as HTMLTextAreaElement;
  act(() => {
    title.focus();
    title.setSelectionRange(title.value.length, title.value.length);
  });
  await user.keyboard(text);
}

describe("NotesPage (desktop)", () => {
  describe("selecting a note", () => {
    it("prompts to select or create a note when none is selected", async () => {
      renderNotesPage("/notes");

      expect(
        await screen.findByText("ノートを選択するか、新しく作成してください。"),
      ).toBeInTheDocument();
    });

    it("opens the selected note in the editor when chosen from the list", async () => {
      const user = userEvent.setup();
      renderNotesPage("/notes");

      await user.click(await notesListButton(meetingNote.title));

      expect(await titleField()).toHaveValue(meetingNote.title);
      expect(await contentField()).toHaveValue(meetingNote.content);
      expect(await notesListButton(meetingNote.title)).toHaveAttribute("aria-current", "page");
    });

    it("shows a not-found message without a retry button when accessing a nonexistent note", async () => {
      renderNotesPage(`/notes/${nonexistentNoteId}`);

      expect(await screen.findByRole("alert")).toHaveTextContent("ノートが見つかりませんでした。");
      expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument();
    });

    it("shows an error message when loading the note fails, and recovers on retry", async () => {
      const user = userEvent.setup();
      server.use(
        http.get("*/api/notes/:id", () => new HttpResponse(null, { status: 500 }), { once: true }),
      );
      renderNotesPage(`/notes/${meetingNote.id}`);

      expect(await screen.findByRole("alert")).toHaveTextContent("ノートを読み込めませんでした。");
      await user.click(screen.getByRole("button", { name: "再試行" }));

      expect(await titleField()).toHaveValue(meetingNote.title);
    });

    it("keeps the search term when selecting a note during a search", async () => {
      const user = userEvent.setup();
      renderNotesPage("/notes?q=会議");

      await user.click(await notesListButton(meetingNote.title));

      expect(await titleField()).toHaveValue(meetingNote.title);
      expect(searchInput()).toHaveValue("会議");
    });
  });

  describe("create", () => {
    it("creates an empty note with the new-note button and opens it", async () => {
      const user = userEvent.setup();
      const { creates } = stubApi();
      renderNotesPage("/notes");

      await user.click(await createNoteButton());

      expect(await titleField()).toHaveValue("");
      expect(creates).toEqual([{ title: "", content: "" }]);
    });

    it("does not open the editor when note creation fails", async () => {
      const user = userEvent.setup();
      server.use(http.post("*/api/notes", () => new HttpResponse(null, { status: 500 })));
      renderNotesPage("/notes");

      await user.click(await createNoteButton());

      await waitFor(() =>
        expect(within(noteSidebar()).getByRole("button", { name: "新しいノート" })).toBeEnabled(),
      );
      expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument();
    });
  });

  describe("saving", () => {
    it("saves unsaved edits to the previous note before switching", async () => {
      const user = userEvent.setup();
      const { updates } = stubApi();
      renderNotesPage(`/notes/${meetingNote.id}`);
      await titleField();

      await typeIntoTitle(user, "！");
      await user.click(await notesListButton(shoppingNote.title));

      await waitFor(() =>
        expect(updates).toEqual([
          {
            id: meetingNote.id,
            body: { title: `${meetingNote.title}！`, content: meetingNote.content },
          },
        ]),
      );
    });

    it("does not leak unsaved edits between notes when switching", async () => {
      const user = userEvent.setup();
      renderNotesPage(`/notes/${meetingNote.id}`);
      await titleField();
      await user.click(await notesListButton(shoppingNote.title));
      await waitFor(() =>
        expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue(shoppingNote.title),
      );

      await user.click(await notesListButton(meetingNote.title));
      await waitFor(() =>
        expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue(meetingNote.title),
      );
      await typeIntoTitle(user, "！");
      await user.click(await notesListButton(shoppingNote.title));

      await waitFor(() =>
        expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue(shoppingNote.title),
      );
      expect(await contentField()).toHaveValue(shoppingNote.content);
    });
  });

  describe("delete", () => {
    it("deletes the note via the API and returns to the unselected state", async () => {
      const user = userEvent.setup();
      const { deletedIds } = stubApi();
      renderNotesPage(`/notes/${meetingNote.id}`);
      await titleField();

      await user.click(screen.getByRole("button", { name: "ノートを削除" }));
      await user.click(await screen.findByRole("button", { name: "削除する" }));

      expect(
        await screen.findByText("ノートを選択するか、新しく作成してください。"),
      ).toBeInTheDocument();
      expect(deletedIds).toEqual([meetingNote.id]);
    });
  });

  describe("sidebar", () => {
    it("shows the collapse button and not the back button", async () => {
      renderNotesPage(`/notes/${meetingNote.id}`);
      await titleField();

      expect(closeSidebarButton()).toBeInTheDocument();
    });

    it("closes the sidebar with the collapse button", async () => {
      const user = userEvent.setup();
      renderNotesPage(`/notes/${meetingNote.id}`);
      await titleField();

      await user.click(closeSidebarButton());

      expect(await openSidebarButton()).toBeInTheDocument();
    });

    it("opens collapsed next time if the collapsed state was saved", async () => {
      localStorage.setItem("sidebar-open", "false");

      renderNotesPage("/notes");

      expect(await openSidebarButton()).toBeInTheDocument();
    });
  });

  describe("keyboard shortcuts", () => {
    it("creates a new note with Ctrl+Alt+N", async () => {
      const user = userEvent.setup();
      const { creates } = stubApi();
      renderNotesPage("/notes");
      await createNoteButton();

      await user.keyboard("{Control>}{Alt>}n{/Alt}{/Control}");

      expect(await titleField()).toHaveValue("");
      expect(creates).toHaveLength(1);
    });

    it("toggles the sidebar with Ctrl+Backslash and persists the state", async () => {
      const user = userEvent.setup();
      renderNotesPage("/notes");
      await createNoteButton();

      expect(screen.queryByRole("button", { name: "ノート一覧を開く" })).not.toBeInTheDocument();

      await user.keyboard("{Control>}\\{/Control}");
      expect(await openSidebarButton()).toBeInTheDocument();
      expect(localStorage.getItem("sidebar-open")).toBe("false");

      await user.keyboard("{Control>}\\{/Control}");
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "ノート一覧を開く" })).not.toBeInTheDocument(),
      );
      expect(localStorage.getItem("sidebar-open")).toBe("true");
    });

    it("opens the sidebar and focuses the search input with Ctrl+K", async () => {
      const user = userEvent.setup();
      localStorage.setItem("sidebar-open", "false");
      renderNotesPage("/notes");
      await openSidebarButton();

      await user.keyboard("{Control>}k{/Control}");

      await waitFor(() => expect(searchInput()).toHaveFocus());
    });
  });
});

describe("NotesPage (mobile)", () => {
  it("shows only the list when no note is selected, and switches to the editor when one is chosen", async () => {
    mockMatchMedia({ isDesktop: false });
    const user = userEvent.setup();
    renderNotesPage("/notes");
    expect(await notesListButton(meetingNote.title)).toBeVisible();

    await user.click(await notesListButton(meetingNote.title));

    expect(await titleField()).toHaveValue(meetingNote.title);
    expect(backButton()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ノート一覧を閉じる" })).not.toBeInTheDocument();
  });

  it("returns to the list and keeps the search term with the editor's back button", async () => {
    mockMatchMedia({ isDesktop: false });
    const user = userEvent.setup();
    renderNotesPage(`/notes/${meetingNote.id}?q=会議`);
    await titleField();

    await user.click(backButton());

    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument(),
    );
    expect(searchInput()).toHaveValue("会議");
  });

  it("shows the list and editor side by side when the viewport becomes desktop", async () => {
    const setIsDesktop = mockMatchMedia({ isDesktop: false });
    renderNotesPage(`/notes/${meetingNote.id}`);
    await titleField();

    expect(backButton()).toBeInTheDocument();

    act(() => setIsDesktop(true));

    expect(await notesListButton(meetingNote.title)).toBeVisible();
    expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue(meetingNote.title);
  });
});
