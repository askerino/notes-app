import type { Note } from "@/features/notes/types/note";

export type EditorTarget =
  | { kind: "empty" }
  | { kind: "loading"; noteId: string }
  | { kind: "loaded"; noteId: string; note: Note };

export type LoadedEditorTarget = Extract<EditorTarget, { kind: "loaded" }>;

export function resolveEditorTarget(
  noteId: string | undefined,
  note: Note | undefined,
): EditorTarget {
  if (!noteId) {
    return { kind: "empty" };
  }
  return note ? { kind: "loaded", noteId, note } : { kind: "loading", noteId };
}
