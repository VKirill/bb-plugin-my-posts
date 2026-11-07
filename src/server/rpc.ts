import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { type KickoffLocale, rpcContract } from "../shared/contract";
import type { SessionStarter } from "./sessions";
import type { Store } from "./store";

export type { SessionStarter };

export type ChangedPayload = { profileId?: string; postId?: string };

async function archiveHiddenThread(bb: BbPluginApi, threadId: string | null): Promise<void> {
  if (threadId === null || threadId === "") return;
  const archive = (bb.sdk.threads as { archive?: (args: { threadId: string }) => unknown }).archive;
  if (typeof archive !== "function") return;
  await archive({ threadId });
}

export function registerRpc(
  bb: BbPluginApi,
  store: Store,
  sessions: SessionStarter,
  changed: (payload: ChangedPayload) => void,
): void {
  bb.rpc.register(rpcContract, {
    profiles_list: () => ({ profiles: store.listProfiles() }),

    profile_get: ({ id }) => store.getProfile(id),

    profile_create: async ({ name, source, locale }) => {
      const kickoffLocale: KickoffLocale = locale ?? "en";
      const created = store.createProfile({ name, source, status: "building" });
      let styleThreadId: string;
      try {
        styleThreadId = await sessions.startProfileSession(created, kickoffLocale);
      } catch (cause) {
        try {
          store.deleteProfile(created.id);
        } catch (cleanup) {
          bb.log.warn(`MyPosts rollback failed: ${String(cleanup)}`);
        }
        throw cause;
      }
      const profile = store.updateProfile(created.id, { styleThreadId: styleThreadId === "" ? null : styleThreadId });
      changed({ profileId: profile.id });
      return profile;
    },

    profile_update: ({ id, name }) => {
      const profile = store.updateProfile(id, name === undefined ? {} : { name });
      changed({ profileId: profile.id });
      return profile;
    },

    profile_delete: async ({ id }) => {
      const profile = store.getProfile(id);
      const posts = store.listPosts(id);
      await archiveHiddenThread(bb, profile.styleThreadId);
      for (const post of posts) await archiveHiddenThread(bb, post.threadId);
      store.deleteProfile(id);
      changed({ profileId: id });
      return { id };
    },

    profile_rebuild: async ({ id, locale }) => {
      const old = store.getProfile(id);
      const kickoffLocale: KickoffLocale = locale ?? "en";
      const styleThreadId = await sessions.startProfileSession(old, kickoffLocale, "rebuild");
      const profile = store.updateProfile(id, {
        styleThreadId: styleThreadId === "" ? null : styleThreadId,
        status: "building",
      });
      try {
        await archiveHiddenThread(bb, old.styleThreadId);
      } catch (cause) {
        bb.log.warn(`MyPosts archive failed: ${String(cause)}`);
      }
      changed({ profileId: id });
      return profile;
    },

    posts_list: ({ profileId, platform }) => ({ posts: store.listPosts(profileId, platform) }),

    post_create: async ({ profileId, platform, kind, brief, locale }) => {
      const kickoffLocale: KickoffLocale = locale ?? "en";
      const title = brief === undefined || brief.trim() === "" ? "Untitled" : brief.trim().slice(0, 60);
      const created = store.createPost({
        profileId,
        platform,
        kind,
        title,
        status: "writing",
      });
      let threadId: string;
      try {
        threadId = await sessions.startPostSession(created, brief ?? null, kickoffLocale);
      } catch (cause) {
        try {
          store.deletePost(created.id);
        } catch (cleanup) {
          bb.log.warn(`MyPosts rollback failed: ${String(cleanup)}`);
        }
        throw cause;
      }
      const post = store.updatePost(created.id, { threadId: threadId === "" ? null : threadId });
      changed({ profileId: post.profileId, postId: post.id });
      return post;
    },

    post_get: ({ id }) => ({
      post: store.getPost(id),
      proposals: store.listProposals(id),
    }),

    post_update: ({ id, title, body, tweets, status }) => {
      const post = store.updatePost(id, {
        ...(title === undefined ? {} : { title }),
        ...(body === undefined ? {} : { body }),
        ...(tweets === undefined ? {} : { tweets }),
        ...(status === undefined ? {} : { status }),
      });
      changed({ profileId: post.profileId, postId: post.id });
      return post;
    },

    post_delete: async ({ id }) => {
      const post = store.getPost(id);
      await archiveHiddenThread(bb, post.threadId);
      store.deletePost(id);
      changed({ profileId: post.profileId, postId: id });
      return { id };
    },

    proposal_apply: ({ id }) => {
      const result = store.applyProposal(id);
      changed({ profileId: result.post.profileId, postId: result.post.id });
      return result;
    },

    proposal_reject: ({ id }) => {
      const proposal = store.setProposalStatus(id, "rejected");
      const post = store.getPost(proposal.postId);
      changed({ profileId: post.profileId, postId: post.id });
      return proposal;
    },

    chat_send: async ({ threadId, text }) => {
      await bb.sdk.threads.send({
        threadId,
        input: [{ type: "text", text, mentions: [] }],
        mode: "auto",
      });
      const post = store.postByThread(threadId);
      const profile = post === null ? store.profileByThread(threadId) : store.getProfile(post.profileId);
      changed({
        ...(profile === null ? {} : { profileId: profile.id }),
        ...(post === null ? {} : { postId: post.id }),
      });
      return { ok: true as const };
    },

    settings_get: () => store.getSettings(),

    settings_set: (patch) => {
      const settings = store.setSettings(patch);
      changed({});
      return settings;
    },
  });
}
