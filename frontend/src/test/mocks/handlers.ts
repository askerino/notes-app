import { HttpResponse, http } from "msw";

import type { Draft } from "@/features/notes/schemas/draftSchema";

import { noteDb } from "./noteDb";

const notFound = () => HttpResponse.json({ title: "Not Found", status: 404 }, { status: 404 });

export const handlers = [
  http.post("*/api/notes", async ({ request }) => {
    const draft = (await request.json()) as Draft;
    return HttpResponse.json(noteDb.create(draft), { status: 201 });
  }),

  http.get("*/api/notes", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return HttpResponse.json(noteDb.list({ query, offset, limit }));
  }),

  http.get("*/api/notes/:id", ({ params }) => {
    const note = noteDb.get(String(params["id"]));
    return note ? HttpResponse.json(note) : notFound();
  }),

  http.put("*/api/notes/:id", async ({ params, request }) => {
    const draft = (await request.json()) as Draft;
    const note = noteDb.update(String(params["id"]), draft);
    return note ? HttpResponse.json(note) : notFound();
  }),

  http.delete("*/api/notes/:id", ({ params }) => {
    noteDb.delete(String(params["id"]));
    return new HttpResponse(null, { status: 204 });
  }),
];
