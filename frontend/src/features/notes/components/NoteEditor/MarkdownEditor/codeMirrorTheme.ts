import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

const baseTheme = EditorView.theme({
  "&": {
    color: "var(--crepe-color-on-surface)",
  },
  ".cm-content": {
    caretColor: "var(--crepe-color-primary)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--crepe-color-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--crepe-color-selected)",
  },
});

const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.typeName, t.typeOperator], color: "var(--cm-syntax-keyword)" },
  {
    tag: [t.variableName, t.attributeName, t.number, t.operator],
    color: "var(--cm-syntax-variable)",
  },
  {
    tag: [t.string, t.meta, t.regexp, t.url, t.escape, t.link],
    color: "var(--cm-syntax-string)",
  },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "var(--cm-syntax-atom)" },
  { tag: [t.comment, t.bracket], color: "var(--cm-syntax-comment)" },

  { tag: [t.standard(t.tagName), t.tagName], color: "var(--cm-syntax-tag)" },
  { tag: [t.className, t.propertyName], color: "var(--cm-syntax-class)" },
  { tag: [t.name, t.quote], color: "var(--cm-syntax-name)" },

  { tag: [t.heading, t.strong], color: "var(--cm-syntax-heading)", fontWeight: "bold" },
  { tag: t.emphasis, color: "var(--cm-syntax-heading)", fontStyle: "italic" },
  {
    tag: t.deleted,
    color: "var(--cm-syntax-deleted)",
    backgroundColor: "var(--cm-syntax-deleted-bg)",
  },
  { tag: t.link, textDecoration: "underline" },
  { tag: t.strikethrough, textDecoration: "line-through" },

  { tag: t.invalid, color: "var(--cm-syntax-invalid)" },
]);

export const codeMirrorTheme = [baseTheme, syntaxHighlighting(highlightStyle)];
