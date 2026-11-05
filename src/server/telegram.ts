export type TelegramMessage = { id: string; text: string };

export type TelegramFetch = (
  input: string,
) => Promise<{ ok: boolean; status?: number; text: () => Promise<string> }>;

export type TelegramChannelFetch = {
  posts: TelegramMessage[];
  text: string;
  skippedForwards: number;
  skippedAds: number;
  skippedService: number;
};

const ASK_EXPORT =
  "This Telegram channel is private or unknown. Ask the user for a Telegram Desktop JSON export and save it in the thread working storage.";

const CORPUS_SEPARATOR = "\n\n---\n\n";

const AD_MARKER = /\berid\s*[:：]?\s*[A-Za-z0-9]{6,}/iu;

export function normaliseTelegramChannel(channel: string): string {
  let name = channel.trim();
  name = name.replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//iu, "");
  name = name.replace(/^s\//u, "");
  name = name.replace(/^@/u, "");
  const slash = name.indexOf("/");
  if (slash !== -1) name = name.slice(0, slash);
  name = name.replace(/\?.*$/u, "");
  return name;
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/gu, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/gu, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&nbsp;/gu, " ")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&amp;/gu, "&");
}

function htmlToText(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/giu, "\n").replace(/<\/p>/giu, "\n");
  return decodeEntities(withBreaks.replace(/<[^>]+>/gu, "")).trim();
}

function messageNumericId(id: string): number {
  const slash = id.lastIndexOf("/");
  const raw = slash === -1 ? id : id.slice(slash + 1);
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

interface OpenTag {
  id: string;
  start: number;
  tag: string;
}

function collectMessageOpens(html: string): OpenTag[] {
  const opens: OpenTag[] = [];
  const tagRe = /<div\b[^>]*>/giu;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[0];
    if (!/\btgme_widget_message\b/u.test(tag)) continue;
    const post = /\bdata-post="([^"]+)"/u.exec(tag);
    if (post === null) continue;
    opens.push({ id: post[1]!, start: match.index, tag });
  }
  return opens;
}

function isServiceMessageBlock(openTag: string, text: string): boolean {
  if (/\bservice_message\b/u.test(openTag)) return true;
  if (text === "Live stream started") return true;
  if (text.startsWith("Live stream finished")) return true;
  if (text.startsWith("Video chat started") || text.startsWith("Video chat ended")) return true;
  return false;
}

function isAdMessage(text: string): boolean {
  return AD_MARKER.test(text);
}

export function parseTelegramPage(html: string): TelegramMessage[] {
  return parseTelegramPageStats(html).messages;
}

export function parseTelegramPageStats(html: string): {
  messages: TelegramMessage[];
  skippedForwards: number;
  skippedAds: number;
  skippedService: number;
} {
  const opens = collectMessageOpens(html);
  const messages: TelegramMessage[] = [];
  let skippedForwards = 0;
  let skippedAds = 0;
  let skippedService = 0;
  for (let i = 0; i < opens.length; i++) {
    const open = opens[i]!;
    const end = i + 1 < opens.length ? opens[i + 1]!.start : html.length;
    const block = html.slice(open.start, end);
    if (/\btgme_widget_message_forwarded_from\b/u.test(block)) {
      skippedForwards += 1;
      continue;
    }
    const textMatch = /<div\b[^>]*\btgme_widget_message_text\b[^>]*>([\s\S]*?)<\/div>/iu.exec(block);
    if (textMatch === null) continue;
    const text = htmlToText(textMatch[1]!);
    if (text === "") continue;
    if (isServiceMessageBlock(open.tag, text)) {
      skippedService += 1;
      continue;
    }
    if (isAdMessage(text)) {
      skippedAds += 1;
      continue;
    }
    messages.push({ id: open.id, text });
  }
  return { messages, skippedForwards, skippedAds, skippedService };
}

export function corpusPages(text: string, maxChars: number): string[] {
  if (maxChars < 1) throw new Error("maxChars must be at least 1.");
  if (text === "") return [""];
  const posts = text.split(CORPUS_SEPARATOR);
  const pages: string[] = [];
  let bucket: string[] = [];
  let bucketLen = 0;

  const flush = () => {
    if (bucket.length === 0) return;
    pages.push(bucket.join(CORPUS_SEPARATOR));
    bucket = [];
    bucketLen = 0;
  };

  for (const post of posts) {
    if (post.length > maxChars) {
      flush();
      pages.push(post);
      continue;
    }
    const extra = bucket.length === 0 ? post.length : CORPUS_SEPARATOR.length + post.length;
    if (bucketLen + extra > maxChars) {
      flush();
      bucket.push(post);
      bucketLen = post.length;
    } else {
      bucket.push(post);
      bucketLen += extra;
    }
  }
  flush();
  return pages;
}

export function formatTelegramFetchPage(result: TelegramChannelFetch, page: number, maxChars = 60_000): string {
  const pages = corpusPages(result.text, maxChars);
  const k = pages.length;
  const i = Math.min(Math.max(page, 1), k);
  const header = `Fetched ${result.posts.length} posts (${result.skippedForwards} forwarded, ${result.skippedAds} ads, ${result.skippedService} service skipped). Page ${i} of ${k}.`;
  const parts = [header];
  if (i < k) {
    parts.push(`Call mp_fetch_telegram again with the same channel and limit and page=${i + 1}.`);
  }
  parts.push(pages[i - 1] ?? "");
  return parts.join("\n\n");
}

export async function fetchTelegramChannel(
  channel: string,
  limit: number,
  fetchImpl: TelegramFetch = globalThis.fetch,
): Promise<TelegramChannelFetch> {
  const name = normaliseTelegramChannel(channel);
  if (name === "") throw new Error(ASK_EXPORT);
  const cap = Math.min(Math.max(limit, 0), 500);
  const posts: TelegramMessage[] = [];
  const seen = new Set<string>();
  let skippedForwards = 0;
  let skippedAds = 0;
  let skippedService = 0;
  let before: number | undefined;
  let pages = 0;
  while (posts.length < cap && pages < 40) {
    pages += 1;
    const url =
      before === undefined ? `https://t.me/s/${name}` : `https://t.me/s/${name}?before=${before}`;
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(ASK_EXPORT);
    const html = await response.text();
    const page = parseTelegramPageStats(html);
    skippedForwards += page.skippedForwards;
    skippedAds += page.skippedAds;
    skippedService += page.skippedService;
    let added = 0;
    for (const message of page.messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      posts.push(message);
      added += 1;
      if (posts.length >= cap) break;
    }
    if (page.messages.length === 0 && pages === 1) throw new Error(ASK_EXPORT);
    if (added === 0) break;
    const smallest = Math.min(...page.messages.map((message) => messageNumericId(message.id)));
    if (!Number.isFinite(smallest) || smallest === before) break;
    before = smallest;
  }
  const clipped = posts.slice(0, cap);
  return {
    posts: clipped,
    text: clipped.map((post) => post.text).join(CORPUS_SEPARATOR),
    skippedForwards,
    skippedAds,
    skippedService,
  };
}
