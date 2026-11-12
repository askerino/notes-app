import { type Node as ProseMirrorNode, Schema } from "@milkdown/kit/prose/model";
import { EditorState, TextSelection } from "@milkdown/kit/prose/state";
import { describe, expect, it } from "vitest";

import {
  ensureLeadingEmptyParagraph,
  findFirstTextPos,
  findTextPosAtDocStart,
  isCaretAtDocStart,
} from "./caret";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*", toDOM: () => ["p", 0] },
    blockquote: { group: "block", content: "block+", toDOM: () => ["blockquote", 0] },
    code_block: {
      group: "block",
      content: "text*",
      code: true,
      toDOM: () => ["pre", ["code", 0]],
    },
    horizontal_rule: { group: "block", toDOM: () => ["hr"] },
    text: {},
  },
});

describe("findTextPosAtDocStart", () => {
  it("returns the start of the first paragraph", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("abc")]),
      schema.node("paragraph", null, [schema.text("def")]),
    ]);
    expect(findTextPosAtDocStart(doc)).toBe(1);
  });

  it("returns the start of a paragraph inside a blockquote", () => {
    const doc = schema.node("doc", null, [
      schema.node("blockquote", null, [schema.node("paragraph", null, [schema.text("abc")])]),
    ]);
    expect(findTextPosAtDocStart(doc)).toBe(2);
  });

  it("returns null for a leading divider", () => {
    const doc = schema.node("doc", null, [
      schema.node("horizontal_rule"),
      schema.node("paragraph", null, [schema.text("abc")]),
    ]);
    expect(findTextPosAtDocStart(doc)).toBeNull();
  });

  it("returns null for a leading code block", () => {
    const doc = schema.node("doc", null, [
      schema.node("code_block", null, [schema.text("const a = 1;")]),
      schema.node("paragraph", null, [schema.text("abc")]),
    ]);
    expect(findTextPosAtDocStart(doc)).toBeNull();
  });

  it("returns null for a code block inside a blockquote", () => {
    const doc = schema.node("doc", null, [
      schema.node("blockquote", null, [schema.node("code_block", null, [schema.text("x")])]),
    ]);
    expect(findTextPosAtDocStart(doc)).toBeNull();
  });
});

describe("findFirstTextPos", () => {
  it("returns the start of the first paragraph", () => {
    const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("abc")])]);
    expect(findFirstTextPos(doc)).toBe(1);
  });

  it("skips a leading divider", () => {
    const doc = schema.node("doc", null, [
      schema.node("horizontal_rule"),
      schema.node("paragraph", null, [schema.text("abc")]),
    ]);
    expect(findFirstTextPos(doc)).toBe(2);
  });

  it("skips a leading code block", () => {
    const doc = schema.node("doc", null, [
      schema.node("code_block", null, [schema.text("x")]),
      schema.node("paragraph", null, [schema.text("abc")]),
    ]);
    expect(findFirstTextPos(doc)).toBe(4);
  });

  it("returns null when the doc has only code blocks", () => {
    const doc = schema.node("doc", null, [schema.node("code_block", null, [schema.text("x")])]);
    expect(findFirstTextPos(doc)).toBeNull();
  });
});

describe("isCaretAtDocStart", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text("abc")]),
    schema.node("paragraph", null, [schema.text("def")]),
  ]);

  function stateWith(anchor: number, head = anchor) {
    return EditorState.create({ doc, selection: TextSelection.create(doc, anchor, head) });
  }

  it("is true for a caret at the start of the first paragraph", () => {
    expect(isCaretAtDocStart(stateWith(1))).toBe(true);
  });

  it("is false for a caret later in the first paragraph", () => {
    expect(isCaretAtDocStart(stateWith(2))).toBe(false);
  });

  it("is false for a range that starts at the doc start", () => {
    expect(isCaretAtDocStart(stateWith(1, 3))).toBe(false);
  });

  it("is false when the doc starts with a code block", () => {
    const codeDoc = schema.node("doc", null, [schema.node("code_block", null, [schema.text("x")])]);
    const state = EditorState.create({
      doc: codeDoc,
      selection: TextSelection.create(codeDoc, 1),
    });
    expect(isCaretAtDocStart(state)).toBe(false);
  });
});

describe("ensureLeadingEmptyParagraph", () => {
  function run(doc: ProseMirrorNode) {
    return ensureLeadingEmptyParagraph(EditorState.create({ doc }).tr).doc;
  }

  it("inserts an empty paragraph before the first paragraph", () => {
    const doc = run(
      schema.node("doc", null, [schema.node("paragraph", null, [schema.text("abc")])]),
    );
    expect(doc.toString()).toBe('doc(paragraph, paragraph("abc"))');
  });

  it("inserts an empty paragraph before a leading code block", () => {
    const doc = run(
      schema.node("doc", null, [schema.node("code_block", null, [schema.text("x")])]),
    );
    expect(doc.toString()).toBe('doc(paragraph, code_block("x"))');
  });

  it("reuses an empty paragraph at the start", () => {
    const doc = run(
      schema.node("doc", null, [
        schema.node("paragraph"),
        schema.node("paragraph", null, [schema.text("abc")]),
      ]),
    );
    expect(doc.toString()).toBe('doc(paragraph, paragraph("abc"))');
  });
});
