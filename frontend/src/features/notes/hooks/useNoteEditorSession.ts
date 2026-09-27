import { useEffect, useEffectEvent, useState } from "react";
import { z } from "zod";

import { useDeleteNoteMutation, useUpdateNoteMutation } from "@/features/notes/api/queries";
import { exportMarkdown } from "@/features/notes/lib/export";
import { type Draft, draftSchema } from "@/features/notes/schemas/draftSchema";
import type { LoadedEditorTarget } from "@/features/notes/types/editorState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { showToast, showToastError } from "@/lib/toast";

const SAVE_DEBOUNCE_MS = 2_000;

function isSameDraft(a: Draft, b: Draft) {
  return a.title === b.title && a.content === b.content;
}

type UseNoteEditorSessionOptions = {
  loadedEditorTarget: LoadedEditorTarget;
  onDeleted: () => void;
  onSaveError: (error: unknown) => void;
};

export function useNoteEditorSession(options: UseNoteEditorSessionOptions) {
  const updateMutation = useUpdateNoteMutation();
  const deleteMutation = useDeleteNoteMutation();

  const shouldBlockSave = deleteMutation.isPending || deleteMutation.isSuccess;

  const loadedDraft = {
    title: options.loadedEditorTarget.note.title,
    content: options.loadedEditorTarget.note.content,
  };

  const [draft, setDraft] = useState<Draft>({
    title: options.loadedEditorTarget.note.title,
    content: options.loadedEditorTarget.note.content,
  });
  function updateField(field: keyof Draft, value: string) {
    setDraft((current) => (current[field] === value ? current : { ...current, [field]: value }));
  }

  const validation = draftSchema.safeParse(draft);
  const fieldErrors = validation.success ? {} : z.flattenError(validation.error).fieldErrors;

  // Autosave
  const debouncedDraft = useDebouncedValue(draft, SAVE_DEBOUNCE_MS);

  function save(draft: Draft) {
    updateMutation.mutate(
      { id: options.loadedEditorTarget.noteId, draft: draft },
      { onError: options.onSaveError },
    );
  }

  const autoSave = useEffectEvent(() => {
    if (
      !validation.success ||
      debouncedDraft !== draft ||
      updateMutation.isPending ||
      shouldBlockSave
    ) {
      return;
    }
    if (isSameDraft(validation.data, loadedDraft)) {
      return;
    }
    if (updateMutation.isError && isSameDraft(updateMutation.variables.draft, validation.data)) {
      return;
    }
    save(validation.data);
  });

  useEffect(() => {
    autoSave();
  }, [options.loadedEditorTarget.note, debouncedDraft, updateMutation.isPending, shouldBlockSave]);

  function onRetry() {
    if (validation.success) {
      save(validation.data);
    }
  }

  // Save unsaved changes on unmount.
  const saveOnLeave = useEffectEvent(() => {
    if (!validation.success || isSameDraft(validation.data, loadedDraft) || shouldBlockSave) {
      return;
    }
    if (updateMutation.isPending && isSameDraft(updateMutation.variables.draft, validation.data)) {
      return;
    }
    updateMutation
      .mutateAsync({ id: options.loadedEditorTarget.noteId, draft: validation.data })
      .catch(options.onSaveError);
  });
  useEffect(() => () => saveOnLeave(), []);

  // Warn before leaving the page with unsaved changes.
  const isSaved = validation.success && isSameDraft(validation.data, loadedDraft);
  const hasUnsavedChanges = !isSaved && !shouldBlockSave;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function onExport() {
    exportMarkdown(draft.title, draft.content);
  }

  // Delete DialogBox
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  function onConfirm() {
    deleteMutation.mutate(options.loadedEditorTarget.noteId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        showToast("ノートを削除しました。");
        options.onDeleted();
      },
      onError: (error) => showToastError(error, "ノートを削除できませんでした。"),
    });
  }

  return {
    title: {
      value: draft.title,
      error: fieldErrors.title?.[0],
      onChange: (value: string) => updateField("title", value),
    },
    content: {
      value: draft.content,
      error: fieldErrors.content?.[0],
      onChange: (value: string) => updateField("content", value),
    },
    saveState: {
      isSaving: updateMutation.isPending,
      isError: updateMutation.isError,
      onRetry,
    },
    onExport,
    deleteDialog: {
      isOpen: isDeleteDialogOpen,
      open: () => setIsDeleteDialogOpen(true),
      onOpenChange: setIsDeleteDialogOpen,
      onConfirm,
      isPending: deleteMutation.isPending,
    },
  };
}
