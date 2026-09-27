const UNTITLED_FILE_NAME = "無題";

// eslint-disable-next-line no-control-regex
const INVALID_FILE_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
const WINDOWS_RESERVED_FILE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

export function toMarkdownFileName(title: string) {
  let name = title
    .replace(INVALID_FILE_NAME_CHARS, "_")
    .trim()
    .replace(/[. ]+$/, "");

  if (!name) {
    name = UNTITLED_FILE_NAME;
  }
  if (WINDOWS_RESERVED_FILE_NAME.test(name)) {
    name = `_${name}`;
  }

  return `${name}.md`;
}

export function exportMarkdown(title: string, content: string) {
  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = toMarkdownFileName(title);
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}
