import type { BbPluginApi, PluginAgentToolResult } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { postStatusSchema, proposalTargetSchema, tweetSchema } from "../shared/model";
import type { ChangedPayload } from "./rpc";
import { StoreError, type Store } from "./store";
import { fetchTelegramChannel, formatTelegramFetchPage, normaliseTelegramChannel } from "./telegram";

const TELEGRAM_FETCH_CACHE_MS = 15 * 60 * 1000;
const telegramFetchCache = new Map<
  string,
  { expiresAt: number; result: Awaited<ReturnType<typeof fetchTelegramChannel>> }
>();

async function cachedFetchTelegramChannel(channel: string, limit: number) {
  const key = `${normaliseTelegramChannel(channel)}:${limit}`;
  const now = Date.now();
  const hit = telegramFetchCache.get(key);
  if (hit !== undefined && hit.expiresAt > now) return hit.result;
  const result = await fetchTelegramChannel(channel, limit);
  telegramFetchCache.set(key, { expiresAt: now + TELEGRAM_FETCH_CACHE_MS, result });
  return result;
}

export const PROFILE_TOOLS = ["mp_profile_get", "mp_profile_save", "mp_fetch_telegram"] as const;
export const POST_TOOLS = ["mp_profile_get", "mp_post_get", "mp_post_write", "mp_propose_edit"] as const;

const fail = (text: string): PluginAgentToolResult => ({ content: [{ type: "text", text }], isError: true });

function requireProfileThread(store: Store, threadId: string, profileId: string) {
  const byThread = store.profileByThread(threadId);
  if (byThread !== null) {
    if (byThread.id !== profileId) throw new StoreError("This thread belongs to a different profile.");
    return byThread;
  }
  const byPost = store.postByThread(threadId);
  if (byPost !== null) {
    if (byPost.profileId !== profileId) throw new StoreError("This thread belongs to a different profile.");
    return store.getProfile(profileId);
  }
  const profile = store.getProfile(profileId);
  if (profile.styleThreadId !== null && profile.styleThreadId !== threadId) {
    throw new StoreError("This thread does not belong to that profile.");
  }
  return profile;
}

function requirePostThread(store: Store, threadId: string, postId: string) {
  const byThread = store.postByThread(threadId);
  if (byThread !== null) {
    if (byThread.id !== postId) throw new StoreError("This thread belongs to a different post.");
    return byThread;
  }
  const post = store.getPost(postId);
  if (post.threadId !== null && post.threadId !== threadId) {
    throw new StoreError("This thread does not belong to that post.");
  }
  return post;
}

export function registerTools(bb: BbPluginApi, store: Store, changed: (payload: ChangedPayload) => void): void {
  bb.agents.registerTool({
    name: "mp_profile_get",
    description: "Read a MyPosts style profile, including styleMd, metrics and traits.",
    presentation: { label: { pending: "Reading profile", completed: "Read profile" } },
    parameters: z.object({ profileId: z.string().min(1) }),
    execute({ profileId }, ctx) {
      try {
        const profile = requireProfileThread(store, ctx.threadId, profileId);
        return JSON.stringify(profile);
      } catch (error) {
        if (error instanceof StoreError) return fail(error.message);
        throw error;
      }
    },
  });

  bb.agents.registerTool({
    name: "mp_profile_save",
    description: "Save the finished style portrait into the MyPosts database.",
    presentation: { label: { pending: "Saving profile", completed: "Saved profile" } },
    parameters: z.object({
      profileId: z.string().min(1),
      styleMd: z.string(),
      metrics: z.record(z.string(), z.unknown()),
      traits: z.array(z.string()),
      lowData: z.boolean().optional(),
    }),
    execute({ profileId, styleMd, metrics, traits, lowData }, ctx) {
      try {
        requireProfileThread(store, ctx.threadId, profileId);
        const profile = store.updateProfile(profileId, {
          styleMd,
          metrics,
          traits,
          status: lowData === true ? "lowdata" : "ready",
        });
        changed({ profileId: profile.id });
        return `Saved profile ${profile.id} as ${profile.status}.`;
      } catch (error) {
        if (error instanceof StoreError) return fail(error.message);
        throw error;
      }
    },
  });

  bb.agents.registerTool({
    name: "mp_fetch_telegram",
    description: "Fetch public posts from a Telegram channel preview page (t.me/s).",
    presentation: { label: { pending: "Fetching Telegram", completed: "Fetched Telegram" } },
    parameters: z.object({
      channel: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional(),
      page: z.number().int().min(1).optional(),
    }),
    async execute({ channel, limit, page }) {
      try {
        const result = await cachedFetchTelegramChannel(channel, limit ?? 150);
        return formatTelegramFetchPage(result, page ?? 1);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "mp_post_get",
    description: "Read a MyPosts draft and its pending edit proposals.",
    presentation: { label: { pending: "Reading post", completed: "Read post" } },
    parameters: z.object({ postId: z.string().min(1) }),
    execute({ postId }, ctx) {
      try {
        const post = requirePostThread(store, ctx.threadId, postId);
        const proposals = store.listProposals(post.id).filter((proposal) => proposal.status === "pending");
        return JSON.stringify({ post, proposals });
      } catch (error) {
        if (error instanceof StoreError) return fail(error.message);
        throw error;
      }
    },
  });

  bb.agents.registerTool({
    name: "mp_post_write",
    description: "Write the first draft of a post (body or tweets). Later edits must use mp_propose_edit.",
    presentation: { label: { pending: "Writing post", completed: "Wrote post" } },
    parameters: z.object({
      postId: z.string().min(1),
      title: z.string().optional(),
      body: z.string().optional(),
      tweets: z.array(tweetSchema).optional(),
      status: postStatusSchema.optional(),
    }),
    execute({ postId, title, body, tweets, status }, ctx) {
      try {
        requirePostThread(store, ctx.threadId, postId);
        const post = store.updatePost(postId, {
          ...(title === undefined ? {} : { title }),
          ...(body === undefined ? {} : { body }),
          ...(tweets === undefined ? {} : { tweets }),
          ...(status === undefined ? {} : { status }),
        });
        changed({ profileId: post.profileId, postId: post.id });
        return JSON.stringify(post);
      } catch (error) {
        if (error instanceof StoreError) return fail(error.message);
        throw error;
      }
    },
  });

  bb.agents.registerTool({
    name: "mp_propose_edit",
    description: "Store a pending before/after edit. Put the returned ::mp-edit line in your reply.",
    presentation: { label: { pending: "Proposing edit", completed: "Proposed edit" } },
    parameters: z.object({
      postId: z.string().min(1),
      target: proposalTargetSchema,
      before: z.string(),
      after: z.string(),
      note: z.string().optional(),
    }),
    execute({ postId, target, before, after, note }, ctx) {
      try {
        const post = requirePostThread(store, ctx.threadId, postId);
        const proposal = store.addProposal({ postId: post.id, target, before, after, note });
        changed({ profileId: post.profileId, postId: post.id });
        return `Proposal stored. Put this line in your reply on its own line:\n::mp-edit{id="${proposal.id}"}`;
      } catch (error) {
        if (error instanceof StoreError) return fail(error.message);
        throw error;
      }
    },
  });
}
