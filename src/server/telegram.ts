export type TelegramMessage = { id: string; text: string };

export type TelegramFetch = (
  input: string,
) => Promise<{ ok: boolean; status?: number; text: () => Promise<string> }>;

const ASK_EXPORT =
  "This Telegram channel is private or unknown. Ask the user for a Telegram Desktop JSON export and save it in the thread working storage.";

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

function decodeEntities(text: string): string {
  return text
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
    opens.push({ id: post[1]!, start: match.index });
  }
  return opens;
}

export function parseTelegramPage(html: string): TelegramMessage[] {
  return parseTelegramPageStats(html).messages;
}

export function parseTelegramPageStats(html: string): { messages: TelegramMessage[]; skippedForwards: number } {
  const opens = collectMessageOpens(html);
  const messages: TelegramMessage[] = [];
  let skippedForwards = 0;
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
    messages.push({ id: open.id, text });
  }
  return { messages, skippedForwards };
}

export async function fetchTelegramChannel(
  channel: string,
  limit: number,
  fetchImpl: TelegramFetch = globalThis.fetch,
): Promise<{ posts: TelegramMessage[]; text: string; skippedForwards: number }> {
  const name = normaliseTelegramChannel(channel);
  if (name === "") throw new Error(ASK_EXPORT);
  const cap = Math.min(Math.max(limit, 0), 500);
  const posts: TelegramMessage[] = [];
  const seen = new Set<string>();
  let skippedForwards = 0;
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
    text: clipped.map((post) => post.text).join("\n\n---\n\n"),
    skippedForwards,
  };
}
