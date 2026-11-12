import AxeBuilder from "@axe-core/playwright";
import { type Locator, type Page, test as base, expect } from "@playwright/test";

// Generates a unique title (e.g., "e2e-a1b2c3d4-test-note" for uniqueTitle("test-note")).
function uniqueTitle(label: string) {
  return `e2e-${crypto.randomUUID().slice(0, 8)}-${label}`;
}

type SeededNote = { id: string; title: string };

const test = base.extend<{
  seedNote: (label: string, content?: string) => Promise<SeededNote>;
}>({
  seedNote: async ({ request }, provide) => {
    const createdIds: string[] = [];

    await provide(async (label, content = "") => {
      const title = uniqueTitle(label);
      const response = await request.post("/api/notes", { data: { title, content } });
      expect(response.ok()).toBe(true);
      const { id } = (await response.json()) as { id: string };
      createdIds.push(id);
      return { id, title };
    });

    for (const id of createdIds) {
      const response = await request.delete(`/api/notes/${id}`);
      expect(response.ok()).toBe(true);
    }
  },
});

const noteSidebar = (page: Page) => page.getByRole("complementary", { name: "ノート一覧" });

test.describe("crud", () => {
  test("creates, edits, persists, and deletes a note", async ({ page }) => {
    const title = uniqueTitle("crud");
    const body = "本文";
    const sidebar = noteSidebar(page);

    await page.goto("/notes");

    // Create
    await sidebar.getByRole("button", { name: "新しいノート" }).click();
    await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}$/);

    // Edit
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        response.ok() &&
        (response.request().postData() ?? "").includes(title) &&
        (response.request().postData() ?? "").includes(body),
    );
    await page.getByLabel("タイトル").fill(title);
    await page.getByLabel("本文").click();
    await page.keyboard.type(body);
    await saved;

    await expect(sidebar.getByRole("button", { name: title })).toBeVisible();

    // Persistence
    await page.reload();
    await expect(page.getByLabel("タイトル")).toHaveValue(title);
    await expect(page.getByLabel("本文")).toContainText(body);

    // Delete
    await page.getByRole("button", { name: "ノートを削除" }).click();
    await page.getByRole("button", { name: "削除する" }).click();
    await expect(page).toHaveURL(/\/notes$/);
    await expect(sidebar.getByRole("button", { name: title })).toBeHidden();
  });
});

test.describe("search", () => {
  test("filters notes by keyword and reflects the search term in the URL", async ({
    page,
    seedNote,
  }) => {
    const alpha = await seedNote("alpha");
    const beta = await seedNote("beta");
    const sidebar = noteSidebar(page);

    await page.goto("/notes");
    await expect(sidebar.getByRole("button", { name: alpha.title })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: beta.title })).toBeVisible();

    await sidebar.getByRole("textbox", { name: "ノートを検索" }).fill(alpha.title);

    await expect(sidebar.getByRole("button", { name: alpha.title })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: beta.title })).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(alpha.title)}`));
  });

  test("applies the search term from the URL", async ({ page, seedNote }) => {
    const alpha = await seedNote("alpha");
    const beta = await seedNote("beta");
    const sidebar = noteSidebar(page);

    await page.goto(`/notes?q=${encodeURIComponent(alpha.title)}`);

    await expect(sidebar.getByRole("button", { name: alpha.title })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: beta.title })).toBeHidden();
    await expect(sidebar.getByRole("textbox", { name: "ノートを検索" })).toHaveValue(alpha.title);
  });
});

test.describe("markdown", () => {
  test("saves Markdown content and renders it after reload", async ({ page, seedNote }) => {
    const note = await seedNote("markdown");
    await page.goto(`/notes/${note.id}`);

    const editor = page.getByLabel("本文");
    await editor.click();
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        response.ok() &&
        (response.request().postData() ?? "").includes("箇条書き"),
    );
    await page.keyboard.type("# 見出し1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("- ");
    // Wait for the list item to render before typing.
    await expect(editor.getByRole("listitem")).toBeVisible();
    await page.keyboard.type("箇条書き");
    await saved;

    await page.reload();
    await expect(editor.getByRole("heading", { name: "見出し1", level: 1 })).toBeVisible();
    await expect(editor.getByRole("listitem")).toContainText("箇条書き");
  });
});

test.describe("keyboard navigation", () => {
  async function clickLineStart(locator: Locator) {
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error("The element to click is not visible.");
    }
    await locator.click({ position: { x: 1, y: box.height / 2 } });
  }

  // Retry until ProseMirror's asynchronous selection update takes effect.
  async function pressKeyUntilFocused(page: Page, key: string, target: Locator) {
    await expect(async () => {
      await page.keyboard.press(key);
      await expect(target).toBeFocused({ timeout: 200 });
    }).toPass({ timeout: 5_000 });
  }

  test("moves the caret from the end of the title to the start of the body", async ({
    page,
    seedNote,
  }) => {
    const note = await seedNote("nav-to-body", "本文");
    await page.goto(`/notes/${note.id}`);

    const title = page.getByLabel("タイトル");
    const editor = page.getByLabel("本文");
    await expect(editor).toContainText("本文");

    // ArrowDown
    await title.click();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await expect(title).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(editor).toBeFocused();

    // ArrowRight
    await title.click();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");
    await expect(editor).toBeFocused();
    await page.keyboard.type("先頭");
    await expect(editor.getByRole("paragraph")).toHaveText(["先頭本文"]);
    await expect(title).toHaveValue(note.title);
  });

  test("inserts a paragraph at the start of the body when Enter is pressed at the end of the title", async ({
    page,
    seedNote,
  }) => {
    const note = await seedNote("nav-enter", "本文");
    await page.goto(`/notes/${note.id}`);

    const title = page.getByLabel("タイトル");
    const editor = page.getByLabel("本文");
    const paragraphs = editor.getByRole("paragraph");
    await expect(editor).toContainText("本文");

    // Enter
    await title.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(editor).toBeFocused();
    await expect(paragraphs).toHaveText(["", "本文"]);

    // Enter again
    await title.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(editor).toBeFocused();
    await expect(paragraphs).toHaveText(["", "本文"]);

    await page.keyboard.type("先頭");
    await expect(paragraphs).toHaveText(["先頭", "本文"]);
    await expect(title).toHaveValue(note.title);
  });

  test("moves the caret from the start of the body to the end of the title", async ({
    page,
    seedNote,
  }) => {
    const note = await seedNote("nav-to-title", "1行目\n\n2行目");
    await page.goto(`/notes/${note.id}`);

    const title = page.getByLabel("タイトル");
    const editor = page.getByLabel("本文");
    const paragraphs = editor.getByRole("paragraph");
    await expect(editor).toContainText("2行目");

    // ArrowUp on the second line
    await clickLineStart(paragraphs.nth(1));
    await page.keyboard.type("下");
    await expect(paragraphs.nth(1)).toHaveText("下2行目");
    await page.keyboard.press("ArrowUp");
    await expect(editor).toBeFocused();

    // ArrowUp
    await clickLineStart(paragraphs.first());
    await pressKeyUntilFocused(page, "ArrowUp", title);
    await page.keyboard.type("上");
    await expect(title).toHaveValue(`${note.title}上`);

    // ArrowLeft
    await clickLineStart(paragraphs.first());
    await pressKeyUntilFocused(page, "ArrowLeft", title);
  });

  test("skips a leading code block when moving from the end of the title", async ({
    page,
    seedNote,
  }) => {
    const note = await seedNote("nav-code-block", "```js\nconst a = 1;\n```\n\n本文");
    await page.goto(`/notes/${note.id}`);

    const title = page.getByLabel("タイトル");
    const editor = page.getByLabel("本文");
    const paragraphs = editor.getByRole("paragraph");
    const codeBlocks = editor.getByRole("textbox");
    await expect(editor).toContainText("本文");

    // ArrowDown
    await title.click();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowDown");
    await expect(editor).toBeFocused();
    await page.keyboard.type("先頭");
    await expect(paragraphs).toHaveText(["先頭本文"]);

    // Enter
    await title.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(editor).toBeFocused();
    await page.keyboard.type("上");
    await expect(paragraphs).toHaveText(["上", "先頭本文"]);
    await expect(codeBlocks).toHaveCount(1);
  });

  test("moves the caret from the end of the title into a body that has only a code block", async ({
    page,
    seedNote,
  }) => {
    const note = await seedNote("nav-code-only", "```js\nconst a = 1;\n```");
    await page.goto(`/notes/${note.id}`);

    const title = page.getByLabel("タイトル");
    const editor = page.getByLabel("本文");
    const codeBlock = editor.getByRole("textbox");
    await expect(codeBlock).toHaveCount(1);

    await title.click();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowDown");
    await expect(codeBlock).toBeFocused();
  });
});

test.describe("errors", () => {
  test("shows an error for a nonexistent note URL", async ({ page }) => {
    await page.goto("/notes/00000000-0000-0000-0000-000000000000");

    await expect(page.getByRole("alert")).toHaveText("ノートが見つかりませんでした。");
    await expect(page.getByLabel("タイトル")).toBeHidden();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("opens a note and returns to the list with the back button", async ({ page, seedNote }) => {
    const note = await seedNote("mobile", "本文");
    const sidebar = noteSidebar(page);
    await page.goto("/notes");

    await expect(page.getByLabel("タイトル")).toBeHidden();
    await sidebar.getByRole("button", { name: note.title }).click();

    await expect(page.getByLabel("タイトル")).toHaveValue(note.title);
    await expect(page.getByLabel("本文")).toContainText("本文");

    await page.getByRole("button", { name: "ノート一覧に戻る" }).click();

    await expect(page.getByLabel("タイトル")).toBeHidden();
    await expect(sidebar.getByRole("button", { name: note.title })).toBeVisible();
  });
});

test.describe("accessibility", () => {
  async function expectNoViolations(page: Page) {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }

  test("has no accessibility violations on the note list screen (light theme)", async ({
    page,
    seedNote,
  }) => {
    const note = await seedNote("a11y-light");
    await page.goto("/notes");
    await expect(noteSidebar(page).getByRole("button", { name: note.title })).toBeVisible();

    await expectNoViolations(page);
  });

  test("has no accessibility violations on the note list screen (dark theme)", async ({
    page,
    seedNote,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const note = await seedNote("a11y-dark");
    await page.goto("/notes");
    await expect(noteSidebar(page).getByRole("button", { name: note.title })).toBeVisible();

    await expectNoViolations(page);
  });

  test("has no accessibility violations in the empty note list state", async ({ page }) => {
    await page.route(
      (url) => url.pathname === "/api/notes",
      (route) => route.fulfill({ json: { items: [], nextOffset: null } }),
    );
    await page.goto("/notes");
    await expect(page.getByText("ノートはまだありません。")).toBeVisible();

    await expectNoViolations(page);
  });

  test("has no accessibility violations on the editor screen", async ({ page, seedNote }) => {
    const note = await seedNote("a11y-editor", "本文");
    await page.goto(`/notes/${note.id}`);
    await expect(page.getByLabel("本文")).toContainText("本文");

    await expectNoViolations(page);
  });
});
