import { vi } from "vitest";

import type { MarkdownEditorRef } from "@/features/notes/components/NoteEditor/MarkdownEditor/MarkdownEditor";

export const markdownEditorRef = {
  focusAtStart: vi.fn(),
  insertParagraphAtStart: vi.fn(),
} satisfies MarkdownEditorRef;
