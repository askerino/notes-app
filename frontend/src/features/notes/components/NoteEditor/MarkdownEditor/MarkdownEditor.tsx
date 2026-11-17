import { Crepe } from "@milkdown/crepe";
import { codeBlockConfig } from "@milkdown/kit/component/code-block";
import { commandsCtx, editorViewCtx, editorViewOptionsCtx } from "@milkdown/kit/core";
import { type Ctx } from "@milkdown/kit/ctx";
import {
  clearTextInCurrentBlockCommand,
  codeBlockSchema,
  setBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { Selection, TextSelection, type Transaction } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";

import { hasModifierKey, isImeComposing } from "@/lib/keyboard";

import "./MarkdownEditor.css";
import { ensureLeadingEmptyParagraph, findFirstTextPos, isCaretAtDocStart } from "./caret";
import { codeMirrorTheme } from "./codeMirrorTheme";

// Copied from Crepe's built-in math item, since Crepe doesn't export its icons.
const functionsIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M7 19v-.808L13.096 12L7 5.808V5h10v1.25H9.102L14.727 12l-5.625 5.77H17V19z"
    />
  </svg>
`;

// Temporarily open the next math block in edit mode (used by $$ + Enter and the slash menu).
function openNextMathBlockForEditing(ctx: Ctx) {
  const config = ctx.get(codeBlockConfig.key);
  const originalPreviewOnlyByDefault = config.previewOnlyByDefault;
  config.previewOnlyByDefault = false;
  queueMicrotask(() => {
    if (originalPreviewOnlyByDefault === undefined) {
      delete config.previewOnlyByDefault;
    } else {
      config.previewOnlyByDefault = originalPreviewOnlyByDefault;
    }
  });
}

function isNavigateToTitleKey(view: EditorView, event: KeyboardEvent) {
  return (
    // The slash menu calls preventDefault on the keys it handles.
    !event.defaultPrevented &&
    !isImeComposing(event) &&
    !hasModifierKey(event) &&
    (event.key === "ArrowUp" || event.key === "ArrowLeft") &&
    isCaretAtDocStart(view.state)
  );
}

export type MarkdownEditorRef = {
  focusAtStart: () => void;
  insertParagraphAtStart: () => void;
};

export type MarkdownEditorProps = {
  ref?: Ref<MarkdownEditorRef>;
  value: string;
  onChange: (value: string) => void;
  onNavigateToTitle: () => void;
};

function EditorInstance({ ref, value, onChange, onNavigateToTitle }: MarkdownEditorProps) {
  const lastValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onNavigateToTitleRef = useRef(onNavigateToTitle);
  const ignoreNextMarkdownUpdateRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    onNavigateToTitleRef.current = onNavigateToTitle;
  }, [onChange, onNavigateToTitle]);

  // Subtle feedback when copying code: briefly brighten the copy button.
  useEffect(() => {
    const handleCopyClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(".copy-button");
      if (!button) {
        return;
      }
      button.classList.add("copy-feedback");
      window.setTimeout(() => button.classList.remove("copy-feedback"), 400);
    };

    document.addEventListener("click", handleCopyClick);
    return () => document.removeEventListener("click", handleCopyClick);
  }, []);

  const { get, loading } = useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: value,
      features: {
        [Crepe.Feature.AI]: false,
        [Crepe.Feature.TopBar]: false,
        [Crepe.Feature.ImageBlock]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: "「/」でブロックを挿入",
          mode: "block",
        },
        [Crepe.Feature.BlockEdit]: {
          textGroup: {
            label: "テキスト",
            text: { label: "本文" },
            h1: { label: "見出し1" },
            h2: { label: "見出し2" },
            h3: { label: "見出し3" },
            h4: { label: "見出し4" },
            h5: { label: "見出し5" },
            h6: { label: "見出し6" },
            quote: { label: "引用" },
            divider: { label: "区切り線" },
          },
          listGroup: {
            label: "リスト",
            bulletList: { label: "箇条書きリスト" },
            orderedList: { label: "番号付きリスト" },
            taskList: { label: "チェックリスト" },
          },
          advancedGroup: {
            label: "その他",
            image: null,
            table: { label: "表" },
            // Replaced by the custom item in buildMenu below.
            math: null,
            codeBlock: { label: "コード" },
          },
          buildMenu: (builder) => {
            // Crepe's built-in math item, but opens the block in edit mode and keeps the caret in it.
            builder.getGroup("advanced").addItem("math", {
              label: "数式",
              icon: functionsIcon,
              onRun: (ctx) => {
                openNextMathBlockForEditing(ctx);
                const commands = ctx.get(commandsCtx);
                commands.call(clearTextInCurrentBlockCommand.key);
                commands.call(setBlockTypeCommand.key, {
                  nodeType: codeBlockSchema.type(ctx),
                  attrs: { language: "LaTeX" },
                });
              },
            });
          },
        },
        [Crepe.Feature.Toolbar]: {
          boldLabel: "太字",
          italicLabel: "斜体",
          strikethroughLabel: "取り消し線",
          codeLabel: "インラインコード",
          latexLabel: "数式",
          linkLabel: "リンク",
        },
        [Crepe.Feature.LinkTooltip]: {
          inputPlaceholder: "URLを入力",
        },
        [Crepe.Feature.CodeMirror]: {
          theme: codeMirrorTheme,
          previewOnlyByDefault: true,
          searchPlaceholder: "言語を検索",
          noResultText: "該当する言語がありません。",
          copyText: "コピー",
        },
      },
    });

    crepe.editor.config((ctx) => {
      ctx.update(codeBlockConfig.key, (config) => ({
        ...config,
        previewToggleButton: (isPreviewOnlyMode) => (isPreviewOnlyMode ? "編集" : "閉じる"),
      }));
      ctx.update(editorViewOptionsCtx, (options) => ({
        ...options,
        attributes: {
          ...options.attributes,
          spellcheck: "false",
          "aria-label": "本文",
          // Setting aria-live="off" prevents code blocks from being rebuilt when a dialog opens.
          "aria-live": "off",
        },
        handleKeyDown: (view, event) => {
          if (isNavigateToTitleKey(view, event)) {
            onNavigateToTitleRef.current();
            return true;
          }
          if (
            event.key === "Enter" &&
            !isImeComposing(event) &&
            !hasModifierKey(event) &&
            view.state.selection.$from.parent.textContent === "$$"
          ) {
            openNextMathBlockForEditing(ctx);
          }
          return options.handleKeyDown?.(view, event) ?? false;
        },
      }));
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        lastValueRef.current = markdown;
        // Ignore the update triggered by replaceAll below.
        if (ignoreNextMarkdownUpdateRef.current) {
          ignoreNextMarkdownUpdateRef.current = false;
          return;
        }
        onChangeRef.current(markdown);
      });
    });

    return crepe;
  });

  // Crepe shows the slash menu from the block handle before positioning it.
  // The CSS hides the menu until its position is set, so clear the previous position while it is closed.
  // Also watch style changes, since the position can be set after the menu closes.
  useEffect(() => {
    const root = loading
      ? undefined
      : get()?.action((ctx) => ctx.get(editorViewCtx)).dom.parentElement;
    if (!root) {
      return;
    }
    const observer = new MutationObserver((mutations) => {
      for (const { target } of mutations) {
        if (
          target instanceof HTMLElement &&
          target.classList.contains("milkdown-slash-menu") &&
          target.dataset["show"] === "false" &&
          target.style.left !== ""
        ) {
          target.style.removeProperty("top");
          target.style.removeProperty("left");
        }
      }
    });
    observer.observe(root, { subtree: true, attributeFilter: ["data-show", "style"] });
    return () => observer.disconnect();
  }, [get, loading]);

  // Crepe only hides the slash menu when the editor state changes,
  // so clicking the editor's padding or outside the editor leaves it open.
  // Crepe doesn't export menuAPI, so get it by its name "menuAPICtx".
  useEffect(() => {
    const editor = loading ? undefined : get();
    const root = editor?.action((ctx) => ctx.get(editorViewCtx)).dom.parentElement;
    if (!editor || !root) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const menu = root.querySelector<HTMLElement>(".milkdown-slash-menu");
      if (
        menu?.dataset["show"] === "true" &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      ) {
        editor.action((ctx) => ctx.get<{ hide: () => void }, "menuAPICtx">("menuAPICtx").hide());
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [get, loading]);

  useEffect(() => {
    if (loading || value === lastValueRef.current) {
      return;
    }
    lastValueRef.current = value;
    ignoreNextMarkdownUpdateRef.current = true;
    get()?.action(replaceAll(value));
  }, [get, loading, value]);

  useImperativeHandle(ref, () => {
    function focusWith(update: (tr: Transaction) => Transaction) {
      const view = loading ? undefined : get()?.action((ctx) => ctx.get(editorViewCtx));
      if (!view) {
        return;
      }
      view.dispatch(update(view.state.tr).scrollIntoView());
      view.focus();
    }
    return {
      focusAtStart: () =>
        focusWith((tr) => {
          const pos = findFirstTextPos(tr.doc);
          return pos === null ? tr : tr.setSelection(TextSelection.create(tr.doc, pos));
        }),
      insertParagraphAtStart: () =>
        focusWith((tr) => {
          const updated = ensureLeadingEmptyParagraph(tr);
          return updated.setSelection(Selection.atStart(updated.doc));
        }),
    };
  }, [get, loading]);

  return <Milkdown />;
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <MilkdownProvider>
      <EditorInstance {...props} />
    </MilkdownProvider>
  );
}
