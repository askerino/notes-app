import { FilePlus2, LoaderCircle, PanelLeftClose, RefreshCw, Search, X } from "lucide-react";
import { type Ref, useImperativeHandle } from "react";
import { useNavigate, useParams } from "react-router";

import { StatePanel } from "@/components/common/StatePanel";
import { BrandHeader } from "@/components/layout/BrandHeader";
import { ThemeSelector } from "@/components/layout/ThemeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotes } from "@/features/notes/api/queries";
import { buildNotePath } from "@/features/notes/lib/paths";
import { shortcutLabel } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

import { useSearch } from "./useSearch";

export type NoteSidebarRef = {
  focusSearchInput: () => void;
};

type NoteSidebarProps = {
  ref?: Ref<NoteSidebarRef>;
  isDesktop: boolean;
  onCollapse: () => void;
  onCreateNote: () => void;
  isCreatingNote: boolean;
};

export function NoteSidebar({ ref, ...props }: NoteSidebarProps) {
  const navigate = useNavigate();
  const { noteId: selectedNoteId } = useParams();

  const { inputRef, ...search } = useSearch();
  // Expose search input focus method to parent components
  useImperativeHandle(ref, () => ({ focusSearchInput: search.focus }), [search.focus]);

  const notesQuery = useNotes(search.query);
  const notes = notesQuery.data ?? [];

  return (
    <aside className="bg-sidebar flex h-full min-h-0 flex-col" aria-label="ノート一覧">
      <BrandHeader>
        {props.isDesktop ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={props.onCollapse}
            title={`ノート一覧を閉じる (${shortcutLabel("\\")})`}
            aria-label="ノート一覧を閉じる"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <ThemeSelector iconOnly />
            <Button
              variant="ghost"
              size="icon-xl"
              onClick={props.onCreateNote}
              disabled={props.isCreatingNote}
              aria-label="新しいノート"
            >
              {props.isCreatingNote ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <FilePlus2 className="size-5" />
              )}
            </Button>
          </div>
        )}
      </BrandHeader>

      <div className="shrink-0 space-y-3 border-b p-3">
        <div className="relative">
          <Search
            className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            ref={inputRef}
            className="bg-background h-9 border pr-10 pl-9 select-none"
            value={search.inputValue}
            maxLength={100}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => search.onInputChange(event.target.value)}
            onCompositionStart={search.onCompositionStart}
            onCompositionEnd={(event) => search.onCompositionEnd(event.currentTarget.value)}
            placeholder="ノートを検索"
            title={`ノートを検索 (${shortcutLabel("K")})`}
            aria-label="ノートを検索"
          />
          {search.inputValue && (
            <Button
              variant="ghost"
              size="icon-lg"
              className="absolute top-1/2 right-0.5 -translate-y-1/2 lg:size-8"
              onClick={search.clear}
              aria-label="検索をクリア"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {props.isDesktop && (
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={props.onCreateNote}
            disabled={props.isCreatingNote}
            title={`新しいノート (${shortcutLabel("Alt+N")})`}
          >
            {props.isCreatingNote ? (
              <LoaderCircle className="mr-1 size-4 animate-spin" />
            ) : (
              <FilePlus2 className="mr-1 size-4" />
            )}
            新しいノート
          </Button>
        )}
      </div>

      <div className="scrollbar-modern min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {notesQuery.isPending ? (
          <StatePanel className="h-full min-h-56" icon={LoaderCircle} isLoading={true} />
        ) : notesQuery.isError && notes.length === 0 ? (
          <StatePanel
            className="h-full min-h-56 px-6"
            message="ノートを読み込めませんでした。"
            action={
              <Button size="sm" variant="outline" onClick={() => void notesQuery.refetch()}>
                <RefreshCw className="size-4" />
                再試行
              </Button>
            }
            role="alert"
          />
        ) : notes.length === 0 ? (
          <StatePanel
            className="h-full min-h-56 px-6"
            message={
              search.query ? "検索条件に一致するノートはありません。" : "ノートはまだありません。"
            }
          />
        ) : (
          <>
            <ul className="px-3 py-3">
              {notes.map((note) => (
                <li key={note.id}>
                  <button
                    className={cn(
                      "hover:bg-muted/80 focus-visible:bg-muted focus-visible:ring-brand/50 dark:hover:bg-muted/50 w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
                      note.id === selectedNoteId &&
                        "bg-brand/10 hover:bg-brand/15 dark:bg-brand/15 dark:hover:bg-brand/20",
                    )}
                    type="button"
                    onClick={() => void navigate(buildNotePath(note.id, search.query))}
                    aria-current={note.id === selectedNoteId ? "page" : undefined}
                  >
                    <strong className="block truncate text-sm font-medium">
                      {note.title || "無題"}
                    </strong>
                  </button>
                </li>
              ))}
            </ul>

            {notesQuery.isError ? (
              <div className="space-y-2 px-3 pb-3" role="alert">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void notesQuery.fetchNextPage()}
                >
                  <RefreshCw className="size-4" />
                  再試行
                </Button>
              </div>
            ) : (
              notesQuery.hasNextPage && (
                <div className="mb-3 px-3 pb-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={notesQuery.isFetchingNextPage}
                    onClick={() => void notesQuery.fetchNextPage()}
                  >
                    {notesQuery.isFetchingNextPage ? "読み込み中…" : "さらに読み込む"}
                  </Button>
                </div>
              )
            )}
          </>
        )}
      </div>

      {props.isDesktop && (
        <div className="shrink-0 border-t p-3">
          <ThemeSelector />
        </div>
      )}
    </aside>
  );
}
