import type { Node as ProseMirrorNode } from "@milkdown/kit/prose/model";
import type { EditorState, Transaction } from "@milkdown/kit/prose/state";

// Code blocks are textblocks too, but CodeMirror handles their caret.
function isPlainTextblock(node: ProseMirrorNode) {
  return node.isTextblock && !node.type.spec.code;
}

export function findTextPosAtDocStart(doc: ProseMirrorNode): number | null {
  let node = doc.firstChild;
  let pos = 1;
  while (node && !node.isTextblock && !node.isAtom) {
    node = node.firstChild;
    pos += 1;
  }
  return node && isPlainTextblock(node) ? pos : null;
}

export function findFirstTextPos(doc: ProseMirrorNode): number | null {
  let target: number | null = null;
  doc.descendants((node, pos) => {
    if (target !== null) {
      return false;
    }
    if (isPlainTextblock(node)) {
      target = pos + 1;
    }
    return !node.isTextblock;
  });
  return target;
}

export function isCaretAtDocStart(state: EditorState): boolean {
  const { selection } = state;
  return selection.empty && selection.from === findTextPosAtDocStart(state.doc);
}

export function ensureLeadingEmptyParagraph(tr: Transaction): Transaction {
  const { paragraph } = tr.doc.type.schema.nodes;
  const firstChild = tr.doc.firstChild;
  if (!paragraph || (firstChild?.type === paragraph && firstChild.content.size === 0)) {
    return tr;
  }
  return tr.insert(0, paragraph.create());
}
