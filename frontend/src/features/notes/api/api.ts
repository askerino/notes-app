import { apiClient, requireData } from "@/api/client";
import type { Draft } from "@/features/notes/schemas/draftSchema";

export const api = {
  create: (draft: Draft) => requireData(apiClient.POST("/api/notes", { body: draft })),
  list: (query = "", offset = 0, limit = 20) =>
    requireData(
      apiClient.GET("/api/notes", {
        params: { query: { ...(query ? { q: query } : {}), offset, limit } },
      }),
    ),
  get: (id: string) => requireData(apiClient.GET("/api/notes/{id}", { params: { path: { id } } })),
  update: (id: string, draft: Draft) =>
    requireData(apiClient.PUT("/api/notes/{id}", { params: { path: { id } }, body: draft })),
  delete: async (id: string) => {
    await apiClient.DELETE("/api/notes/{id}", { params: { path: { id } } });
  },
};
