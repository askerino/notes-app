import { ArrowLeft, Download, RefreshCw, Trash2 } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  Suspense,
  lazy,
  useLayoutEffect,
  useRef,
} from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MarkdownEditor = lazy(() =>
  import("./MarkdownEditor/MarkdownEditor").then((module) => ({
    default: module.MarkdownEditor,
  })),
);

type Field = {
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
};

type NoteEditorProps = {
  onBack?: (() => void) | undefined;
  title: Field;
  content: Field;
  saveState: {
    isSaving: boolean;
    isError: boolean;
    onRetry: () => void;
  };
  onExport?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
};

export function NoteEditor(props: NoteEditorProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = titleRef.current;
    if (textarea) {
      textarea.style.height = "0";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [props.title.value]);

  function handleTitleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
    }
  }

  function handleTitleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    props.title.onChange(event.currentTarget.value.replace(/\r?\n/g, " "));
  }

  return (
    <article className="bg-background flex h-full min-h-0 flex-col" aria-label="ノートエディター">
      <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b px-3 sm:px-5 lg:h-16">
        {props.onBack && (
          <Button
            variant="ghost"
            size="icon-xl"
            className="col-start-1"
            onClick={props.onBack}
            aria-label="ノート一覧に戻る"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}

        <div className="col-start-2 flex min-w-0 items-center gap-2">
          {props.saveState.isError && (
            <div
              className="text-destructive flex min-w-0 items-center gap-1.5 text-sm"
              role="alert"
            >
              <span className="sr-only">保存に失敗しました</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={props.saveState.onRetry}
              >
                <RefreshCw className="size-3.5" />
                <span className="translate-y-px">再試行</span>
              </Button>
            </div>
          )}
        </div>

        <div className="col-start-3 flex items-center justify-end gap-1">
          {props.onExport && (
            <Button
              variant="ghost"
              size="icon-xl"
              className="text-muted-foreground shrink-0 lg:size-8"
              onClick={props.onExport}
              title="Markdown形式でエクスポート"
              aria-label="Markdown形式でエクスポート"
            >
              <Download className="size-5 lg:size-4" />
            </Button>
          )}
          {props.onDelete && (
            <Button
              variant="ghost"
              size="icon-xl"
              className="text-muted-foreground hover:text-destructive shrink-0 lg:size-8"
              disabled={props.saveState.isSaving}
              onClick={props.onDelete}
              title="ノートを削除"
              aria-label="ノートを削除"
            >
              <Trash2 className="size-5 lg:size-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {/* Title */}
        <div className="mx-auto w-full max-w-5xl px-5 pt-7 sm:px-10 sm:pt-14 lg:px-24">
          <textarea
            ref={titleRef}
            className="placeholder:text-muted-foreground block min-h-10 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-3xl leading-tight font-semibold tracking-tight outline-none focus-visible:ring-0 sm:text-4xl"
            value={props.title.value}
            rows={1}
            maxLength={100}
            spellCheck={false}
            onKeyDown={handleTitleKeyDown}
            onChange={handleTitleChange}
            placeholder="無題"
            aria-label="タイトル"
          />
          {props.title.error && (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {props.title.error}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="mx-auto w-full max-w-5xl">
          <Suspense
            fallback={
              <div className="mx-5 mt-2 space-y-3 sm:mx-10 lg:mx-24">
                <div className="mt-10 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            }
          >
            <MarkdownEditor value={props.content.value} onChange={props.content.onChange} />
          </Suspense>
          {props.content.error && (
            <p className="text-destructive px-5 pb-6 text-sm sm:px-10 lg:px-24" role="alert">
              {props.content.error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function NoteEditorSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("overflow-y-auto", className)}
      role="status"
      aria-label="エディターを読み込み中"
    >
      <div className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-10 sm:pt-14 lg:px-24">
        <Skeleton className="h-10 w-2/3 max-w-lg" />
        <div className="mt-10 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
