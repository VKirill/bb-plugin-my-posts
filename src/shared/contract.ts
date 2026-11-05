import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  platformSchema,
  postKindSchema,
  postSchema,
  postStatusSchema,
  profileSchema,
  proposalSchema,
  settingsSchema,
  tweetSchema,
} from "./model";

export const MP_CHANGED = "my-posts:changed";

export const rpcContract = defineRpcContract({
  profiles_list: {
    input: z.null(),
    output: z.object({ profiles: z.array(profileSchema) }),
  },
  profile_get: {
    input: z.object({ id: z.string().min(1) }),
    output: profileSchema,
  },
  profile_create: {
    input: z.object({
      name: z.string().trim().min(1).max(120),
      source: z.string().max(4000).optional(),
    }),
    output: profileSchema,
  },
  profile_update: {
    input: z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(120).optional(),
    }),
    output: profileSchema,
  },
  profile_delete: {
    input: z.object({ id: z.string().min(1) }),
    output: z.object({ id: z.string() }),
  },
  posts_list: {
    input: z.object({
      profileId: z.string().min(1),
      platform: platformSchema.optional(),
    }),
    output: z.object({ posts: z.array(postSchema) }),
  },
  post_create: {
    input: z.object({
      profileId: z.string().min(1),
      platform: platformSchema,
      kind: postKindSchema.optional(),
      brief: z.string().max(8000).optional(),
    }),
    output: postSchema,
  },
  post_get: {
    input: z.object({ id: z.string().min(1) }),
    output: z.object({
      post: postSchema,
      proposals: z.array(proposalSchema),
    }),
  },
  post_update: {
    input: z.object({
      id: z.string().min(1),
      title: z.string().max(500).optional(),
      body: z.string().max(200_000).optional(),
      tweets: z.array(tweetSchema).optional(),
      status: postStatusSchema.optional(),
    }),
    output: postSchema,
  },
  proposal_apply: {
    input: z.object({ id: z.string().min(1) }),
    output: z.object({
      post: postSchema,
      proposal: proposalSchema,
    }),
  },
  proposal_reject: {
    input: z.object({ id: z.string().min(1) }),
    output: proposalSchema,
  },
  chat_send: {
    input: z.object({
      threadId: z.string().min(1),
      text: z.string().min(1).max(32_000),
    }),
    output: z.object({ ok: z.literal(true) }),
  },
  settings_get: {
    input: z.null(),
    output: settingsSchema,
  },
  settings_set: {
    input: z.object({
      providerId: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
      projectId: z.string().nullable().optional(),
    }),
    output: settingsSchema,
  },
});

export type RpcContract = typeof rpcContract;
