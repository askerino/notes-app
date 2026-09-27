import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { NoteEditor } from "@/features/notes/components/NoteEditor/NoteEditor";
import { useNoteEditorSession } from "@/features/notes/hooks/useNoteEditorSession";
import type { LoadedEditorTarget } from "@/features/notes/types/editorState";

type NoteEditorSessionProps = {
  loadedEditorTarget: LoadedEditorTarget;
  onBack?: (() => void) | undefined;
  onDeleted: () => void;
  onSaveError: (error: unknown) => void;
};

export function NoteEditorSession(props: NoteEditorSessionProps) {
  const session = useNoteEditorSession({
    loadedEditorTarget: props.loadedEditorTarget,
    onDeleted: props.onDeleted,
    onSaveError: props.onSaveError,
  });

  return (
    <>
      <NoteEditor
        onBack={props.onBack}
        title={session.title}
        content={session.content}
        saveState={session.saveState}
        onExport={session.onExport}
        onDelete={session.deleteDialog.open}
      />

      <ConfirmDialog
        open={session.deleteDialog.isOpen}
        onOpenChange={session.deleteDialog.onOpenChange}
        title="ノートを削除しますか？"
        description="この操作は取り消せません。保存していない変更も失われます。"
        confirmLabel={session.deleteDialog.isPending ? "削除中…" : "削除する"}
        onConfirm={session.deleteDialog.onConfirm}
        disabled={session.deleteDialog.isPending}
      />
    </>
  );
}
