import { useNavigate } from "react-router";

import { useCreateNoteMutation } from "@/features/notes/api/queries";
import { buildNotePath } from "@/features/notes/lib/paths";
import { showToastError } from "@/lib/toast";

export function useCreateNote() {
  const navigate = useNavigate();
  const createMutation = useCreateNoteMutation();

  function createNote() {
    if (createMutation.isPending) {
      return;
    }

    createMutation.mutate(undefined, {
      onSuccess: (note) => void navigate(buildNotePath(note.id)),
      onError: (error) => showToastError(error, "ノートを作成できませんでした。"),
    });
  }

  return {
    createNote,
    isCreating: createMutation.isPending,
  };
}
