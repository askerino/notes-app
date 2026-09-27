import { FileText, PanelLeftOpen, RefreshCw } from "lucide-react";
import { useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { ApiError } from "@/api/errors";
import { StatePanel } from "@/components/common/StatePanel";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useNote } from "@/features/notes/api/queries";
import { NoteEditorSkeleton } from "@/features/notes/components/NoteEditor/NoteEditor";
import { NoteEditorSession } from "@/features/notes/components/NoteEditorSession";
import {
  NoteSidebar,
  type NoteSidebarRef,
} from "@/features/notes/components/NoteSidebar/NoteSidebar";
import { useCreateNote } from "@/features/notes/hooks/useCreateNote";
import { useKeyboardShortcuts } from "@/features/notes/hooks/useKeyboardShortcuts";
import { useSidebar } from "@/features/notes/hooks/useSidebar";
import { buildNotesPath } from "@/features/notes/lib/paths";
import { resolveEditorTarget } from "@/features/notes/types/editorState";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DESKTOP_QUERY } from "@/lib/mediaQueries";
import { shortcutLabel } from "@/lib/shortcuts";
import { showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function NotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const { noteId } = useParams();
  const noteQuery = useNote(noteId);
  const isNoteNotFound = noteQuery.error instanceof ApiError && noteQuery.error.status === 404;

  const editorTarget = resolveEditorTarget(noteId, noteQuery.data);
  const isNoteEditorVisible = editorTarget.kind !== "empty";

  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const sidebar = useSidebar(isDesktop);
  const { createNote, isCreating } = useCreateNote();

  const noteSidebarRef = useRef<NoteSidebarRef>(null);
  useKeyboardShortcuts({
    isDesktop,
    sidebar,
    onCreateNote: createNote,
    onFocusSearchInput: () => noteSidebarRef.current?.focusSearchInput(),
  });

  const sidebarContent = (
    <NoteSidebar
      ref={noteSidebarRef}
      isDesktop={isDesktop}
      onCollapse={sidebar.onClose}
      onCreateNote={createNote}
      isCreatingNote={isCreating}
    />
  );

  const editorContent = (
    <>
      {isDesktop && !sidebar.isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-3 z-10"
          onClick={sidebar.onOpen}
          title={`ノート一覧を開く (${shortcutLabel("\\")})`}
          aria-label="ノート一覧を開く"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}

      {noteQuery.isError ? (
        <StatePanel
          className="bg-background h-full"
          message={
            isNoteNotFound ? "ノートが見つかりませんでした。" : "ノートを読み込めませんでした。"
          }
          action={
            !isNoteNotFound && (
              <Button size="sm" variant="outline" onClick={() => void noteQuery.refetch()}>
                <RefreshCw className="size-4" />
                再試行
              </Button>
            )
          }
          role="alert"
        />
      ) : editorTarget.kind === "loading" ? (
        <div
          className="bg-background flex h-full min-h-0 flex-col"
          role="status"
          aria-label="ノートを読み込み中…"
        >
          <div className="h-14 shrink-0 border-b lg:h-16" />
          <NoteEditorSkeleton className="min-h-0 flex-1" />
        </div>
      ) : editorTarget.kind === "empty" ? (
        <StatePanel
          className="bg-background h-full"
          icon={FileText}
          message="ノートを選択するか、新しく作成してください。"
          action={
            <Button onClick={createNote} disabled={isCreating}>
              {isCreating ? "作成中…" : "新しいノート"}
            </Button>
          }
        />
      ) : (
        <NoteEditorSession
          key={editorTarget.noteId}
          loadedEditorTarget={editorTarget}
          onBack={isDesktop ? undefined : () => void navigate(buildNotesPath(query))}
          onDeleted={() => void navigate(buildNotesPath(query), { replace: true })}
          onSaveError={(error) => showToastError(error, "ノートを保存できませんでした。")}
        />
      )}
    </>
  );

  return (
    <main className="bg-background h-dvh overflow-hidden">
      {isDesktop ? (
        <ResizablePanelGroup
          id="notes-sidebar-layout"
          className="h-full"
          onLayoutChanged={sidebar.onLayoutChanged}
        >
          <ResizablePanel
            panelRef={sidebar.panelRef}
            id="notes-sidebar"
            className="min-h-0 border-r"
            defaultSize={sidebar.width}
            minSize={240}
            maxSize={480}
            collapsible
            collapsedSize={0}
            groupResizeBehavior="preserve-pixel-size"
            onResize={sidebar.onResize}
          >
            {sidebarContent}
          </ResizablePanel>
          <ResizableHandle withHandle className={cn(!sidebar.isOpen && "hidden")} />
          <ResizablePanel id="notes-editor" minSize={360}>
            <section className="relative h-full min-h-0">{editorContent}</section>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="grid h-full">
          <div className={cn("min-h-0 min-w-0 border-r", isNoteEditorVisible && "hidden")}>
            {sidebarContent}
          </div>
          <section className={cn("relative min-h-0 min-w-0", !isNoteEditorVisible && "hidden")}>
            {editorContent}
          </section>
        </div>
      )}
    </main>
  );
}
