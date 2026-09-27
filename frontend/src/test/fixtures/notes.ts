import type { Note } from "@/features/notes/types/note";

export function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    title: "タイトル",
    content: "本文",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export const meetingNote = createNote({
  id: "11111111-1111-1111-1111-111111111111",
  title: "会議メモ",
  content: "議題は来週の予定",
});

export const shoppingNote = createNote({
  id: "22222222-2222-2222-2222-222222222222",
  title: "買い物リスト",
  content: "牛乳とパン",
});

export const untitledNote = createNote({
  id: "33333333-3333-3333-3333-333333333333",
  title: "",
  content: "タイトルのないメモ",
});

export const sampleNotes: Note[] = [meetingNote, shoppingNote, untitledNote];

export const nonexistentNoteId = "00000000-0000-0000-0000-000000000000";
