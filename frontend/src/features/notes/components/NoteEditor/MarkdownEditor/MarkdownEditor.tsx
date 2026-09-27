import { Crepe } from "@milkdown/crepe";
import { codeBlockConfig } from "@milkdown/kit/component/code-block";
import { editorViewOptionsCtx } from "@milkdown/kit/core";
import { type Ctx } from "@milkdown/kit/ctx";
import { replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { useEffect, useRef } from "react";

import "./MarkdownEditor.css";
import { codeMirrorTheme } from "./codeMirrorTheme";

// Temporarily open the block in edit mode after $$ + Enter.
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

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function EditorInstance({ value, onChange }: MarkdownEditorProps) {
  const lastValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const ignoreNextMarkdownUpdateRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
            math: { label: "数式" },
            codeBlock: { label: "コード" },
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
          if (
            event.key === "Enter" &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.altKey &&
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

  useEffect(() => {
    if (loading || value === lastValueRef.current) {
      return;
    }
    lastValueRef.current = value;
    ignoreNextMarkdownUpdateRef.current = true;
    get()?.action(replaceAll(value));
  }, [get, loading, value]);

  return <Milkdown />;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <MilkdownProvider>
      <EditorInstance value={value} onChange={onChange} />
    </MilkdownProvider>
  );
}
