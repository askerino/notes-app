import { Navigate, type RouteObject, createBrowserRouter } from "react-router";

import { RouteErrorFallback, RouteLoadingFallback } from "@/app/RouteFallbacks";

const notesRoute = async () => {
  const module = await import("@/pages/notes/NotesPage");
  return { Component: module.NotesPage };
};

export const routes: RouteObject[] = [
  {
    ErrorBoundary: RouteErrorFallback,
    HydrateFallback: RouteLoadingFallback,
    children: [
      { index: true, element: <Navigate replace to="/notes" /> },
      { path: "notes", lazy: notesRoute },
      { path: "notes/:noteId", lazy: notesRoute },
    ],
  },
];

export const router = createBrowserRouter(routes);
