import { describe, expect, it } from "vitest";

import { meetingNote } from "@/test/fixtures/notes";

import { resolveEditorTarget } from "./editorState";

describe("resolveEditorTarget", () => {
  it("resolves to empty state when no note ID is provided", () => {
    expect(resolveEditorTarget(undefined, undefined)).toEqual({ kind: "empty" });
  });

  it("resolves to loading state when only a note ID is provided", () => {
    expect(resolveEditorTarget(meetingNote.id, undefined)).toEqual({
      kind: "loading",
      noteId: meetingNote.id,
    });
  });

  it("resolves to loaded state when both a note ID and data are provided", () => {
    expect(resolveEditorTarget(meetingNote.id, meetingNote)).toEqual({
      kind: "loaded",
      noteId: meetingNote.id,
      note: meetingNote,
    });
  });
});
