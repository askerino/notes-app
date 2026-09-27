export function buildNotesPath(query: string = "") {
  const base = `/notes`;
  return query ? `${base}?q=${encodeURIComponent(query)}` : base;
}

export function buildNotePath(id: string, query: string = "") {
  const base = `/notes/${id}`;
  return query ? `${base}?q=${encodeURIComponent(query)}` : base;
}
