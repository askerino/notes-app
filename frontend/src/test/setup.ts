import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

import { mockMatchMedia } from "./mocks/matchMedia";
import { noteDb } from "./mocks/noteDb";
import { server } from "./mocks/server";

vi.mock(
  "@/features/notes/components/NoteEditor/MarkdownEditor/MarkdownEditor",
  () => import("@/test/mocks/MarkdownEditor"),
);

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  mockMatchMedia({ isDesktop: true });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  server.resetHandlers();
  noteDb.reset();
});

afterAll(() => server.close());
