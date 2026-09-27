import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { Draft } from "@/features/notes/schemas/draftSchema";
import type { Note } from "@/features/notes/types/note";
import { createNote, meetingNote } from "@/test/fixtures/notes";
import { server } from "@/test/mocks/server";
import { renderWithProviders, sleep } from "@/test/test-utils";

import { NoteEditorSession } from "./NoteEditorSession";

const SAVE_DEBOUNCE_MS = 1_000;

function setupFakeTimers() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return {
    user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
    advance: (ms: number) => vi.advanceTimersByTimeAsync(ms),
  };
}

function stubApi({ updateStatus = 200, deleteStatus = 204 } = {}) {
  const updates: { id: string; body: Draft }[] = [];
  const deletedIds: string[] = [];
  server.use(
    http.put("*/api/notes/:id", async ({ params, request }) => {
      const id = String(params["id"]);
      const body = (await request.json()) as Draft;
      updates.push({ id, body });
      return updateStatus === 200
        ? HttpResponse.json(createNote({ id, ...body }))
        : new HttpResponse(null, { status: updateStatus });
    }),
    http.delete("*/api/notes/:id", ({ params }) => {
      deletedIds.push(String(params["id"]));
      return new HttpResponse(null, { status: deleteStatus });
    }),
  );
  return { updates, deletedIds };
}

function renderNoteEditorSession() {
  const props = { onBack: vi.fn(), onDeleted: vi.fn(), onSaveError: vi.fn() };
  const sessionFor = (current: Note) => (
    <NoteEditorSession
      loadedEditorTarget={{ kind: "loaded", noteId: meetingNote.id, note: current }}
      {...props}
    />
  );
  const view = renderWithProviders(sessionFor(meetingNote));
  return { ...props, ...view };
}

describe("NoteEditorSession", () => {
  it("shows the note's title and content", async () => {
    renderNoteEditorSession();

    expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue(meetingNote.title);
    expect(await screen.findByRole("textbox", { name: "本文" })).toHaveValue(meetingNote.content);
  });

  describe("title", () => {
    it("does not insert a line break when Enter is pressed", async () => {
      const user = userEvent.setup();
      renderNoteEditorSession();

      const title = screen.getByRole("textbox", { name: "タイトル" });
      await user.type(title, "{Enter}");

      expect(title).toHaveValue(meetingNote.title);
    });

    it("replaces pasted line breaks with spaces", async () => {
      const user = userEvent.setup();
      renderNoteEditorSession();

      const title = screen.getByRole("textbox", { name: "タイトル" });
      await user.clear(title);
      await user.paste("タイトル1\nタイトル2\r\nタイトル3");

      expect(title).toHaveValue("タイトル1 タイトル2 タイトル3");
    });
  });

  describe("validation", () => {
    it("shows an error and does not save when the title exceeds the limit", async () => {
      const { advance } = setupFakeTimers();
      const { updates } = stubApi();
      renderNoteEditorSession();

      fireEvent.change(screen.getByRole("textbox", { name: "タイトル" }), {
        target: { value: "あ".repeat(101) },
      });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "タイトルは100文字以内で入力してください。",
      );

      await advance(SAVE_DEBOUNCE_MS * 2);
      expect(updates).toHaveLength(0);
    });

    it("shows an error and does not save when the content exceeds the limit", async () => {
      const { advance } = setupFakeTimers();
      const { updates } = stubApi();
      renderNoteEditorSession();

      fireEvent.change(await screen.findByRole("textbox", { name: "本文" }), {
        target: { value: "あ".repeat(100_001) },
      });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "本文は100,000文字以内で入力してください。",
      );

      await advance(SAVE_DEBOUNCE_MS * 2);
      expect(updates).toHaveLength(0);
    });

    it("does not save on unmount when the title exceeds the limit", async () => {
      const { updates } = stubApi();
      const { unmount } = renderNoteEditorSession();

      fireEvent.change(screen.getByRole("textbox", { name: "タイトル" }), {
        target: { value: "あ".repeat(101) },
      });
      unmount();
      await sleep(100);

      expect(updates).toHaveLength(0);
    });

    it("does not save on unmount when the content exceeds the limit", async () => {
      const { updates } = stubApi();
      const { unmount } = renderNoteEditorSession();

      fireEvent.change(await screen.findByRole("textbox", { name: "本文" }), {
        target: { value: "あ".repeat(100_001) },
      });
      unmount();
      await sleep(100);

      expect(updates).toHaveLength(0);
    });
  });

  describe("autosave", () => {
    it("saves changes after the debounce delay", async () => {
      const { user, advance } = setupFakeTimers();
      const { updates } = stubApi();
      renderNoteEditorSession();

      await user.type(screen.getByRole("textbox", { name: "タイトル" }), "！");
      await advance(SAVE_DEBOUNCE_MS - 100);
      expect(updates).toHaveLength(0);

      await advance(200);
      await waitFor(() =>
        expect(updates).toEqual([
          {
            id: meetingNote.id,
            body: { title: `${meetingNote.title}！`, content: meetingNote.content },
          },
        ]),
      );
    });

    it("saves only the final content once after consecutive edits", async () => {
      const { user, advance } = setupFakeTimers();
      const { updates } = stubApi();
      renderNoteEditorSession();

      const title = screen.getByRole("textbox", { name: "タイトル" });
      await user.type(title, "！");
      await advance(SAVE_DEBOUNCE_MS - 100);
      await user.type(title, "？");
      await advance(SAVE_DEBOUNCE_MS - 100);
      expect(updates).toHaveLength(0);

      await advance(200);
      await waitFor(() => expect(updates).toHaveLength(1));
      expect(updates[0]?.body.title).toBe(`${meetingNote.title}！？`);
    });

    it("does not save when nothing changed", async () => {
      const { advance } = setupFakeTimers();
      const { updates } = stubApi();
      renderNoteEditorSession();

      await advance(SAVE_DEBOUNCE_MS * 2);

      expect(updates).toHaveLength(0);
    });

    it("does not save when edited back to the original content", async () => {
      const { user, advance } = setupFakeTimers();
      const { updates } = stubApi();
      renderNoteEditorSession();

      const title = screen.getByRole("textbox", { name: "タイトル" });
      await user.type(title, "！");
      await user.type(title, "{Backspace}");
      await advance(SAVE_DEBOUNCE_MS * 2);

      expect(updates).toHaveLength(0);
    });

    it("saves unsaved changes on unmount", async () => {
      const user = userEvent.setup();
      const { updates } = stubApi();
      const { unmount } = renderNoteEditorSession();

      await user.type(screen.getByRole("textbox", { name: "タイトル" }), "！");
      unmount();

      await waitFor(() => expect(updates).toHaveLength(1));
      expect(updates[0]?.body).toEqual({
        title: `${meetingNote.title}！`,
        content: meetingNote.content,
      });
    });

    it("waits for an in-flight autosave before saving on unmount", async () => {
      const { user, advance } = setupFakeTimers();
      const titles: string[] = [];
      let resolveFirstSave = () => {};
      const firstSaveResolved = new Promise<void>((resolve) => (resolveFirstSave = resolve));
      server.use(
        http.put("*/api/notes/:id", async ({ params, request }) => {
          const body = (await request.json()) as Draft;
          titles.push(body.title);
          if (titles.length === 1) {
            await firstSaveResolved;
          }
          return HttpResponse.json(createNote({ id: String(params["id"]), ...body }));
        }),
      );
      const { unmount } = renderNoteEditorSession();

      const title = screen.getByRole("textbox", { name: "タイトル" });
      await user.type(title, "！");
      await advance(SAVE_DEBOUNCE_MS + 100);
      await waitFor(() => expect(titles).toEqual([`${meetingNote.title}！`]));

      await user.type(title, "？");
      unmount();
      await advance(100);
      expect(titles).toEqual([`${meetingNote.title}！`]);

      resolveFirstSave();
      await waitFor(() =>
        expect(titles).toEqual([`${meetingNote.title}！`, `${meetingNote.title}！？`]),
      );
    });
  });

  describe("save failure", () => {
    it("notifies onSaveError and does not automatically resend the same content", async () => {
      const user = userEvent.setup();
      const api = stubApi({ updateStatus: 500 });
      const { onSaveError } = renderNoteEditorSession();

      await user.type(screen.getByRole("textbox", { name: "タイトル" }), "！");
      await waitFor(() => expect(onSaveError).toHaveBeenCalledOnce(), { timeout: 3_000 });

      await sleep(SAVE_DEBOUNCE_MS * 2);
      expect(api.updates).toHaveLength(1);
    });

    it("saves the same content again on retry and clears the error on success", async () => {
      const user = userEvent.setup();
      stubApi({ updateStatus: 500 });
      renderNoteEditorSession();

      await user.type(screen.getByRole("textbox", { name: "タイトル" }), "！");
      expect(await screen.findByRole("alert", undefined, { timeout: 3_000 })).toHaveTextContent(
        "保存に失敗しました",
      );

      const recoveredApi = stubApi();
      await user.click(screen.getByRole("button", { name: "再試行" }));
      await waitFor(() => expect(recoveredApi.updates).toHaveLength(1));
      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    });

    it("saves the updated content again when it changes after a failed save", async () => {
      const { user, advance } = setupFakeTimers();
      const failingApi = stubApi({ updateStatus: 500 });
      renderNoteEditorSession();

      const title = screen.getByRole("textbox", { name: "タイトル" });
      await user.type(title, "！");
      await advance(SAVE_DEBOUNCE_MS + 100);
      await waitFor(() => expect(failingApi.updates).toHaveLength(1));

      const recoveredApi = stubApi();
      await user.type(title, "？");
      await advance(SAVE_DEBOUNCE_MS + 100);
      await waitFor(() => expect(recoveredApi.updates).toHaveLength(1));
      expect(recoveredApi.updates[0]?.body.title).toBe(`${meetingNote.title}！？`);
    });

    it("notifies onSaveError when saving on unmount fails", async () => {
      const user = userEvent.setup();
      stubApi({ updateStatus: 500 });
      const { unmount, onSaveError } = renderNoteEditorSession();

      await user.type(screen.getByRole("textbox", { name: "タイトル" }), "！");
      unmount();

      await waitFor(() => expect(onSaveError).toHaveBeenCalledOnce());
    });
  });

  describe("delete", () => {
    it("does not delete when cancelled in the confirmation dialog", async () => {
      const user = userEvent.setup();
      const { deletedIds } = stubApi();
      const { onDeleted } = renderNoteEditorSession();

      await user.click(screen.getByRole("button", { name: "ノートを削除" }));
      expect(await screen.findByText("ノートを削除しますか？")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      await waitFor(() =>
        expect(screen.queryByText("ノートを削除しますか？")).not.toBeInTheDocument(),
      );
      expect(deletedIds).toHaveLength(0);
      expect(onDeleted).not.toHaveBeenCalled();
    });

    it("deletes and calls onDeleted when confirmed in the dialog", async () => {
      const user = userEvent.setup();
      const { deletedIds } = stubApi();
      const { onDeleted } = renderNoteEditorSession();

      await user.click(screen.getByRole("button", { name: "ノートを削除" }));
      await user.click(await screen.findByRole("button", { name: "削除する" }));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
      expect(deletedIds).toEqual([meetingNote.id]);
    });

    it("does not save after deletion even with unsaved edits", async () => {
      const user = userEvent.setup();
      const api = stubApi();
      const { onDeleted, unmount } = renderNoteEditorSession();

      await user.type(screen.getByRole("textbox", { name: "タイトル" }), "！");
      await user.click(screen.getByRole("button", { name: "ノートを削除" }));
      await user.click(await screen.findByRole("button", { name: "削除する" }));
      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());

      await sleep(SAVE_DEBOUNCE_MS * 2);
      unmount();
      await sleep(100);
      expect(api.deletedIds).toEqual([meetingNote.id]);
      expect(api.updates).toHaveLength(0);
    });
  });
});
