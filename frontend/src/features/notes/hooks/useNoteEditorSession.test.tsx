import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { noteKeys } from "@/features/notes/api/queries";
import { exportMarkdown } from "@/features/notes/lib/export";
import { showToast, showToastError } from "@/lib/toast";
import { meetingNote } from "@/test/fixtures/notes";
import { server } from "@/test/mocks/server";

import { useNoteEditorSession } from "./useNoteEditorSession";

vi.mock("@/lib/toast");
vi.mock("@/features/notes/lib/export");

function setup() {
  const callbacks = { onDeleted: vi.fn(), onSaveError: vi.fn() };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () =>
      useNoteEditorSession({
        loadedEditorTarget: { kind: "loaded", noteId: meetingNote.id, note: meetingNote },
        ...callbacks,
      }),
    { wrapper },
  );
  return { ...callbacks, queryClient, ...view };
}

describe("useNoteEditorSession", () => {
  it("initializes inputs, save state, and delete dialog", () => {
    const { result } = setup();

    expect(result.current.title).toMatchObject({ value: meetingNote.title, error: undefined });
    expect(result.current.content).toMatchObject({ value: meetingNote.content, error: undefined });
    expect(result.current.saveState).toMatchObject({ isSaving: false, isError: false });
    expect(result.current.deleteDialog.isOpen).toBe(false);
  });

  describe("validation", () => {
    it("validates title length and clears the error when fixed", () => {
      const { result } = setup();

      act(() => result.current.title.onChange("あ".repeat(101)));
      expect(result.current.title.error).toBe("タイトルは100文字以内で入力してください。");
      expect(result.current.content.error).toBeUndefined();

      act(() => result.current.title.onChange("タイトル"));
      expect(result.current.title.error).toBeUndefined();
    });

    it("validates content length and clears the error when fixed", () => {
      const { result } = setup();

      act(() => result.current.content.onChange("あ".repeat(100_001)));
      expect(result.current.content.error).toBe("本文は100,000文字以内で入力してください。");
      expect(result.current.title.error).toBeUndefined();

      act(() => result.current.content.onChange("本文"));
      expect(result.current.content.error).toBeUndefined();
    });
  });

  describe("saving", () => {
    it("does not retry saving when the input is invalid", () => {
      const onPut = vi.fn();
      server.use(http.put("*/api/notes/:id", onPut));
      const { result } = setup();

      act(() => result.current.content.onChange("あ".repeat(100_001)));
      act(() => result.current.saveState.onRetry());

      expect(onPut).not.toHaveBeenCalled();
    });

    it("sets isError and calls onSaveError when autosave fails", async () => {
      server.use(http.put("*/api/notes/:id", () => new HttpResponse(null, { status: 500 })));
      const { result, onSaveError } = setup();

      act(() => result.current.title.onChange(`${meetingNote.title}！`));

      await waitFor(() => expect(result.current.saveState.isError).toBe(true), { timeout: 3_000 });
      expect(onSaveError).toHaveBeenCalledOnce();
    });
  });

  describe("leaving the page", () => {
    function dispatchBeforeUnload() {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event;
    }

    it("does not warn when there are no unsaved changes", () => {
      setup();

      expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    });

    it("warns while there are unsaved changes and stops once they are reverted", () => {
      const { result } = setup();

      act(() => result.current.content.onChange("未保存の本文"));
      expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

      act(() => result.current.content.onChange(meetingNote.content));
      expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    });

    it("warns when the input is invalid and cannot be saved", () => {
      const { result } = setup();

      act(() => result.current.title.onChange("あ".repeat(101)));

      expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
    });
  });

  describe("export", () => {
    it("exports the edited title and content as Markdown", () => {
      const { result } = setup();

      act(() => result.current.content.onChange("# 見出し"));
      act(() => result.current.onExport());

      expect(exportMarkdown).toHaveBeenCalledWith(meetingNote.title, "# 見出し");
    });
  });

  describe("delete dialog", () => {
    it("calls onDeleted, closes the dialog, and shows a toast when deletion succeeds", async () => {
      const { result, onDeleted } = setup();

      act(() => {
        result.current.deleteDialog.open();
        result.current.deleteDialog.onConfirm();
      });

      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
      expect(result.current.deleteDialog.isOpen).toBe(false);
      expect(showToast).toHaveBeenCalledWith("ノートを削除しました。");
    });

    it("removes the deleted note from the detail cache", async () => {
      const { result, onDeleted, queryClient } = setup();
      queryClient.setQueryData(noteKeys.detail(meetingNote.id), meetingNote);

      act(() => result.current.deleteDialog.onConfirm());

      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
      expect(queryClient.getQueryData(noteKeys.detail(meetingNote.id))).toBeUndefined();
    });

    it("keeps the dialog open and shows an error toast when deletion fails", async () => {
      server.use(http.delete("*/api/notes/:id", () => new HttpResponse(null, { status: 500 })));
      const { result, onDeleted } = setup();

      act(() => {
        result.current.deleteDialog.open();
        result.current.deleteDialog.onConfirm();
      });

      await waitFor(() => expect(showToastError).toHaveBeenCalledOnce());
      expect(showToastError).toHaveBeenCalledWith(
        expect.anything(),
        "ノートを削除できませんでした。",
      );
      expect(result.current.deleteDialog.isOpen).toBe(true);
      expect(result.current.deleteDialog.isPending).toBe(false);
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });
});
