import { fireEvent, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { createNote, meetingNote, shoppingNote } from "@/test/fixtures/notes";
import { noteDb } from "@/test/mocks/noteDb";
import { server } from "@/test/mocks/server";
import { renderWithProviders, sleep } from "@/test/test-utils";

import { NoteSidebar } from "./NoteSidebar";

const manyNotes = Array.from({ length: 25 }, (_, index) =>
  createNote({ title: `タイトル${index + 1}` }),
);

function stubApi() {
  const queries: string[] = [];
  server.use(
    http.get("*/api/notes", ({ request }) => {
      const query = new URL(request.url).searchParams.get("q") ?? "";
      queries.push(query);
      return HttpResponse.json(noteDb.list({ query }));
    }),
  );
  return queries;
}

function renderNoteSidebar({ route = "/notes", isDesktop = true, isCreatingNote = false } = {}) {
  const props = { isDesktop, onCollapse: vi.fn(), onCreateNote: vi.fn(), isCreatingNote };
  renderWithProviders(<NoteSidebar {...props} />, { route });
  return props;
}

const searchInput = () => screen.getByRole("textbox", { name: "ノートを検索" });

describe("NoteSidebar", () => {
  describe("search", () => {
    it("sends the search term to the API and shows the results", async () => {
      const user = userEvent.setup();
      const queries = stubApi();
      renderNoteSidebar();
      await screen.findByRole("button", { name: meetingNote.title });

      await user.type(searchInput(), "会議");
      await waitForElementToBeRemoved(() =>
        screen.queryByRole("button", { name: shoppingNote.title }),
      );

      expect(await screen.findByRole("button", { name: meetingNote.title })).toBeInTheDocument();
      expect(queries.at(-1)).toBe("会議");
    });

    it("shows a dedicated empty state when nothing matches the search", async () => {
      const user = userEvent.setup();
      stubApi();
      renderNoteSidebar();
      await screen.findByRole("button", { name: meetingNote.title });

      await user.type(searchInput(), "一致しないキーワード");

      expect(await screen.findByText("検索条件に一致するノートはありません。")).toBeInTheDocument();
    });

    it("refetches the list without a search term when the search is cleared", async () => {
      const user = userEvent.setup();
      const queries = stubApi();
      renderNoteSidebar({ route: "/notes?q=会議" });
      await screen.findByRole("button", { name: meetingNote.title });

      await user.click(screen.getByRole("button", { name: "検索をクリア" }));

      expect(await screen.findByRole("button", { name: shoppingNote.title })).toBeInTheDocument();
      expect(searchInput()).toHaveValue("");
      expect(queries.at(-1)).toBe("");
    });

    describe("IME composition", () => {
      it("does not search during composition, and searches once confirmed", async () => {
        const queries = stubApi();
        renderNoteSidebar();
        await screen.findByRole("button", { name: meetingNote.title });
        const search = searchInput();

        fireEvent.compositionStart(search);
        fireEvent.change(search, { target: { value: "かいぎ" } });
        await sleep(500);

        expect(search).toHaveValue("かいぎ");
        expect(queries).toEqual([""]);

        fireEvent.change(search, { target: { value: "会議" } });
        fireEvent.compositionEnd(search, { data: "会議" });

        await waitFor(() => expect(queries.at(-1)).toBe("会議"));
        expect(await screen.findByRole("button", { name: meetingNote.title })).toBeInTheDocument();
      });
    });
  });

  describe("create", () => {
    it.each([
      ["desktop", true],
      ["mobile", false],
    ])("creates a note with the new-note button at %s width", async (_name, isDesktop) => {
      const user = userEvent.setup();
      const { onCreateNote } = renderNoteSidebar({ isDesktop });

      await user.click(screen.getByRole("button", { name: "新しいノート" }));

      expect(onCreateNote).toHaveBeenCalledOnce();
    });

    it.each([
      ["desktop", true],
      ["mobile", false],
    ])(
      "disables the new-note button while a note is being created at %s width",
      (_name, isDesktop) => {
        renderNoteSidebar({ isDesktop, isCreatingNote: true });

        expect(screen.getByRole("button", { name: "新しいノート" })).toBeDisabled();
      },
    );
  });

  describe("notes list", () => {
    it("shows the notes list and labels empty-title notes as untitled", async () => {
      renderNoteSidebar();

      expect(await screen.findByRole("button", { name: meetingNote.title })).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: shoppingNote.title })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "無題" })).toBeInTheDocument();
    });

    it("marks the note matching the URL ID as selected", async () => {
      renderNoteSidebar({ route: `/notes/${meetingNote.id}` });

      expect(await screen.findByRole("button", { name: meetingNote.title })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByRole("button", { name: shoppingNote.title })).not.toHaveAttribute(
        "aria-current",
      );
    });

    it("shows the empty state when there are no notes", async () => {
      noteDb.reset([]);

      renderNoteSidebar();

      expect(await screen.findByText("ノートはまだありません。")).toBeInTheDocument();
    });

    describe("pagination", () => {
      it("does not show the load-more button when everything fits on one page", async () => {
        renderNoteSidebar();

        await screen.findByRole("button", { name: meetingNote.title });

        expect(screen.queryByRole("button", { name: "さらに読み込む" })).not.toBeInTheDocument();
      });

      it("appends the next page with the load-more button, which disappears once everything is loaded", async () => {
        const user = userEvent.setup();
        noteDb.reset(manyNotes);
        renderNoteSidebar();

        expect(await screen.findByRole("button", { name: "タイトル1" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "タイトル21" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "さらに読み込む" }));

        expect(await screen.findByRole("button", { name: "タイトル25" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "タイトル1" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "さらに読み込む" })).not.toBeInTheDocument();
      });

      it("keeps the existing list when loading more fails, and loads the rest on retry", async () => {
        const user = userEvent.setup();
        noteDb.reset(manyNotes);
        renderNoteSidebar();
        await screen.findByRole("button", { name: "タイトル1" });

        server.use(
          http.get("*/api/notes", () => new HttpResponse(null, { status: 500 }), { once: true }),
        );
        await user.click(screen.getByRole("button", { name: "さらに読み込む" }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "タイトル1" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "再試行" }));

        expect(await screen.findByRole("button", { name: "タイトル25" })).toBeInTheDocument();
      });
    });

    describe("error handling", () => {
      it("shows an error when loading fails, and recovers with retry", async () => {
        const user = userEvent.setup();
        server.use(
          http.get("*/api/notes", () => new HttpResponse(null, { status: 500 }), { once: true }),
        );
        renderNoteSidebar();

        expect(await screen.findByRole("alert")).toHaveTextContent(
          "ノートを読み込めませんでした。",
        );

        await user.click(screen.getByRole("button", { name: "再試行" }));

        expect(await screen.findByRole("button", { name: meetingNote.title })).toBeInTheDocument();
      });
    });
  });

  describe("mobile layout", () => {
    it("shows a single new-note button and the theme selector in the header", () => {
      renderNoteSidebar({ isDesktop: false });

      expect(screen.getAllByRole("button", { name: "新しいノート" })).toHaveLength(1);
      expect(screen.getByRole("button", { name: /^テーマ：/ })).toBeInTheDocument();
    });

    it("does not show the collapse button", () => {
      renderNoteSidebar({ isDesktop: false });

      expect(screen.queryByRole("button", { name: "ノート一覧を閉じる" })).not.toBeInTheDocument();
    });
  });
});
