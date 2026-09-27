import type { Draft } from "@/features/notes/schemas/draftSchema";
import type { Note, NotePage } from "@/features/notes/types/note";

import { createNote, sampleNotes } from "../fixtures/notes";

let notes: Note[] = [];

export const noteDb = {
  create(draft: Draft): Note {
    const note = createNote(draft);
    notes.unshift(note);
    return note;
  },

  list({
    query = "",
    offset = 0,
    limit = 20,
  }: { query?: string; offset?: number; limit?: number } = {}): NotePage {
    const trimmed = query.trim();
    const matched = trimmed
      ? notes.filter((note) => note.title.includes(trimmed) || note.content.includes(trimmed))
      : notes;
    const items = matched.slice(offset, offset + limit);
    const nextOffset = offset + limit < matched.length ? offset + limit : null;
    return { items: items.map(({ id, title }) => ({ id, title })), nextOffset };
  },

  get(id: string): Note | undefined {
    return notes.find((note) => note.id === id);
  },

  update(id: string, draft: Draft): Note | undefined {
    const index = notes.findIndex((note) => note.id === id);
    if (index === -1) {
      return undefined;
    }
    const updated = { ...notes[index]!, ...draft };
    notes[index] = updated;
    return updated;
  },

  delete(id: string) {
    notes = notes.filter((note) => note.id !== id);
  },

  reset(initial: Note[] = sampleNotes) {
    notes = initial.map((note) => ({ ...note }));
  },
};

noteDb.reset();
