import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/features/notes/api/api";
import type { Draft } from "@/features/notes/schemas/draftSchema";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (query: string) => [...noteKeys.lists(), query] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

export function useNotes(rawQuery: string, delay = 300) {
  const debouncedQuery = useDebouncedValue(rawQuery, delay);

  return useInfiniteQuery({
    queryKey: noteKeys.list(debouncedQuery),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.list(debouncedQuery, pageParam),
    getNextPageParam: (page) => (page.nextOffset === null ? undefined : Number(page.nextOffset)),
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

export function useNote(id?: string) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ""),
    queryFn: id ? () => api.get(id) : skipToken,
  });
}

export function useCreateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.create({ title: "", content: "" }),
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(note.id), note);
      void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useUpdateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    scope: { id: "update-note" },
    mutationFn: ({ id, draft }: { id: string; draft: Draft }) => api.update(id, draft),
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(note.id), note);
      void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useDeleteNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.delete,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}
