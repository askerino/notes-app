import { useImperativeHandle } from "react";

import type { MarkdownEditorProps } from "@/features/notes/components/NoteEditor/MarkdownEditor/MarkdownEditor";

import { markdownEditorRef } from "./markdownEditorRef";

export function MarkdownEditor({ ref, value, onChange }: MarkdownEditorProps) {
  useImperativeHandle(ref, () => markdownEditorRef, []);

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      aria-label="本文"
    />
  );
}
