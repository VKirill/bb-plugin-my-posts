import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  corpusPages,
  decodeEntities,
  fetchTelegramChannel,
  formatTelegramFetchPage,
  parseTelegramPageStats,
} from "../../src/server/telegram";
import { MIGRATIONS, Store } from "../../src/server/store";
import { registerTools } from "../../src/server/tools";
import Database from "better-sqlite3";

const serviceFixture = readFileSync(
  new URL("../fixtures/telegram/service-and-ads.html", import.meta.url),
  "utf8",
);

describe("decodeEntities", () => {
  it("decodes numeric and named entities", () => {
    expect(decodeEntities("Хорошего отдыха вам&#33;")).toBe("Хорошего отдыха вам!");
    expect(decodeEntities("&#x2014;")).toBe("—");
    expect(decodeEntities("Line two &amp; more")).toBe("Line two & more");
  });
});

describe("parseTelegramPageStats", () => {
  it("skips service messages and counts skippedService", () => {
    const stats = parseTelegramPageStats(serviceFixture);
    expect(stats.messages).toEqual([{ id: "sample_channel/23", text: "Clean public note" }]);
    expect(stats.skippedService).toBe(2);
    expect(stats.skippedAds).toBe(1);
    expect(stats.skippedForwards).toBe(0);
  });
});

function stubChannelFetch(html: string): Parameters<typeof fetchTelegramChannel>[2] {
  return async (url) => {
    if (String(url).includes("before=")) {
      return { ok: true, text: async () => "<html><body></body></html>" };
    }
    return { ok: true, text: async () => html };
  };
}

describe("fetchTelegramChannel", () => {
  it("excludes ad posts from returned posts and counts skippedAds", async () => {
    const result = await fetchTelegramChannel("@sample_channel", 10, stubChannelFetch(serviceFixture));
    expect(result.posts).toEqual([{ id: "sample_channel/23", text: "Clean public note" }]);
    expect(result.skippedAds).toBe(1);
    expect(result.skippedService).toBe(2);
  });
});

describe("corpusPages", () => {
  it("splits only on the corpus separator and round-trips the full text", () => {
    const a = "a".repeat(40_000);
    const b = "b".repeat(40_000);
    const text = `${a}\n\n---\n\n${b}`;
    const pages = corpusPages(text, 60_000);
    expect(pages).toEqual([a, b]);
    expect(pages.join("\n\n---\n\n")).toBe(text);
  });

  it("keeps an oversized single post on its own page", () => {
    const huge = "z".repeat(70_000);
    const small = "tail";
    const text = `${huge}\n\n---\n\n${small}`;
    const pages = corpusPages(text, 60_000);
    expect(pages).toEqual([huge, small]);
    expect(pages.join("\n\n---\n\n")).toBe(text);
  });
});

describe("formatTelegramFetchPage", () => {
  it("heads each page and asks for the next page when needed", () => {
    const body = `${"x".repeat(50_000)}\n\n---\n\n${"y".repeat(50_000)}`;
    const result = {
      posts: [{ id: "c/1", text: "x" }, { id: "c/2", text: "y" }],
      text: body,
      skippedForwards: 1,
      skippedAds: 2,
      skippedService: 3,
    };
    const page1 = formatTelegramFetchPage(result, 1, 60_000);
    expect(page1).toMatch(
      /^Fetched 2 posts \(1 forwarded, 2 ads, 3 service skipped\)\. Page 1 of 2\./u,
    );
    expect(page1).toContain("Call mp_fetch_telegram again with the same channel and limit and page=2.");
    const page2 = formatTelegramFetchPage(result, 2, 60_000);
    expect(page2).toMatch(/Page 2 of 2\./u);
    expect(page2).not.toContain("page=3");
  });
});

function makeStore(): Store {
  const db = new Database(":memory:");
  for (const sql of MIGRATIONS) db.exec(sql);
  return new Store(db);
}

describe("mp_fetch_telegram tool", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let tools: Map<string, { execute: (args: never) => Promise<unknown> }>;

  beforeEach(() => {
    fetchMock = vi.fn(stubChannelFetch(serviceFixture));
    vi.stubGlobal("fetch", fetchMock);
    tools = new Map();
    registerTools(
      {
        agents: {
          registerTool: (tool: { name: string; execute: (args: never) => Promise<unknown> }) => {
            tools.set(tool.name, tool);
          },
        },
      } as never,
      makeStore(),
      () => {},
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses the in-memory fetch for later pages", async () => {
    const tool = tools.get("mp_fetch_telegram")!;
    const channel = `@cache_test_${Date.now()}`;
    const page1 = (await tool.execute({ channel, limit: 10, page: 1 } as never)) as string;
    expect(page1).toMatch(/Page 1 of 1\./u);
    expect(page1).toContain("Clean public note");
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);
    const page1Again = (await tool.execute({ channel, limit: 10, page: 1 } as never)) as string;
    expect(page1Again).toContain("Clean public note");
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });
});
