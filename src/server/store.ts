import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  DEFAULT_SETTINGS,
  emptyTweet,
  type Platform,
  type Post,
  type PostKind,
  type PostStatus,
  type Profile,
  type ProfileStatus,
  type Proposal,
  type ProposalStatus,
  type ProposalTarget,
  type Settings,
  type Tweet,
} from "../shared/model";
import { platformDef } from "../shared/platforms";

export const MIGRATIONS: string[] = [
  `CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    style_md TEXT NOT NULL DEFAULT '',
    metrics TEXT NOT NULL DEFAULT '{}',
    traits TEXT NOT NULL DEFAULT '[]',
    style_thread_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    tweets TEXT NOT NULL DEFAULT '[]',
    thread_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX posts_profile ON posts (profile_id)`,
  `CREATE INDEX posts_thread ON posts (thread_id)`,
  `CREATE TABLE proposals (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    target TEXT NOT NULL,
    before TEXT NOT NULL,
    after TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX proposals_post ON proposals (post_id)`,
  `CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

export class StoreError extends Error {}

const now = () => new Date().toISOString();

function newId(prefix: "prf_" | "pst_" | "prp_"): string {
  return `${prefix}${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

interface ProfileRow {
  id: string;
  name: string;
  source: string;
  status: string;
  style_md: string;
  metrics: string;
  traits: string;
  style_thread_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PostRow {
  id: string;
  profile_id: string;
  platform: string;
  kind: string;
  title: string;
  status: string;
  body: string;
  tweets: string;
  thread_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProposalRow {
  id: string;
  post_id: string;
  target: string;
  before: string;
  after: string;
  note: string;
  status: string;
  created_at: string;
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  source: row.source,
  status: row.status as ProfileStatus,
  styleMd: row.style_md,
  metrics: JSON.parse(row.metrics) as Record<string, unknown>,
  traits: JSON.parse(row.traits) as string[],
  styleThreadId: row.style_thread_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPost = (row: PostRow): Post => ({
  id: row.id,
  profileId: row.profile_id,
  platform: row.platform as Platform,
  kind: row.kind as PostKind,
  title: row.title,
  status: row.status as PostStatus,
  body: row.body,
  tweets: JSON.parse(row.tweets) as Tweet[],
  threadId: row.thread_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toProposal = (row: ProposalRow): Proposal => ({
  id: row.id,
  postId: row.post_id,
  target: JSON.parse(row.target) as ProposalTarget,
  before: row.before,
  after: row.after,
  note: row.note,
  status: row.status as ProposalStatus,
  createdAt: row.created_at,
});

function applyRuStale(previous: Tweet[], next: Tweet[]): Tweet[] {
  return next.map((tweet, index) => {
    const old = previous[index];
    if (old === undefined) return { en: tweet.en, ru: tweet.ru, ruStale: tweet.ruStale };
    if (tweet.ru !== old.ru) return { en: tweet.en, ru: tweet.ru, ruStale: false };
    if (tweet.en !== old.en) return { en: tweet.en, ru: tweet.ru, ruStale: true };
    return { en: tweet.en, ru: tweet.ru, ruStale: old.ruStale };
  });
}

function replaceFirst(haystack: string, before: string, after: string): string {
  const index = haystack.indexOf(before);
  if (index === -1) throw new Error("The text this edit targets is no longer in the post");
  return haystack.slice(0, index) + after + haystack.slice(index + before.length);
}

export class Store {
  constructor(private readonly db: Database.Database) {}

  listProfiles(): Profile[] {
    const rows = this.db.prepare("SELECT * FROM profiles ORDER BY updated_at DESC").all() as ProfileRow[];
    return rows.map(toProfile);
  }

  getProfile(id: string): Profile {
    const row = this.db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as ProfileRow | undefined;
    if (row === undefined) throw new StoreError(`No profile "${id}".`);
    return toProfile(row);
  }

  createProfile(input: { name: string; source?: string; status?: ProfileStatus }): Profile {
    const id = newId("prf_");
    const at = now();
    this.db
      .prepare(
        `INSERT INTO profiles (id, name, source, status, style_md, metrics, traits, style_thread_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', '{}', '[]', NULL, ?, ?)`,
      )
      .run(id, input.name, input.source ?? "", input.status ?? "building", at, at);
    return this.getProfile(id);
  }

  updateProfile(
    id: string,
    patch: Partial<Pick<Profile, "name" | "status" | "styleMd" | "metrics" | "traits" | "styleThreadId" | "source">>,
  ): Profile {
    const current = this.getProfile(id);
    const next: Profile = { ...current, ...patch };
    this.db
      .prepare(
        `UPDATE profiles SET name = ?, source = ?, status = ?, style_md = ?, metrics = ?, traits = ?, style_thread_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.name,
        next.source,
        next.status,
        next.styleMd,
        JSON.stringify(next.metrics),
        JSON.stringify(next.traits),
        next.styleThreadId,
        now(),
        id,
      );
    return this.getProfile(id);
  }

  deleteProfile(id: string): void {
    this.getProfile(id);
    const run = this.db.transaction(() => {
      const posts = this.db.prepare("SELECT id FROM posts WHERE profile_id = ?").all(id) as Array<{ id: string }>;
      for (const post of posts) {
        this.db.prepare("DELETE FROM proposals WHERE post_id = ?").run(post.id);
      }
      this.db.prepare("DELETE FROM posts WHERE profile_id = ?").run(id);
      this.db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
    });
    run();
  }

  deletePost(id: string): void {
    this.getPost(id);
    const run = this.db.transaction(() => {
      this.db.prepare("DELETE FROM proposals WHERE post_id = ?").run(id);
      this.db.prepare("DELETE FROM posts WHERE id = ?").run(id);
    });
    run();
  }

  listPosts(profileId: string, platform?: Platform): Post[] {
    this.getProfile(profileId);
    const rows =
      platform === undefined
        ? (this.db.prepare("SELECT * FROM posts WHERE profile_id = ? ORDER BY updated_at DESC").all(profileId) as PostRow[])
        : (this.db
            .prepare("SELECT * FROM posts WHERE profile_id = ? AND platform = ? ORDER BY updated_at DESC")
            .all(profileId, platform) as PostRow[]);
    return rows.map(toPost);
  }

  getPost(id: string): Post {
    const row = this.db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as PostRow | undefined;
    if (row === undefined) throw new StoreError(`No post "${id}".`);
    return toPost(row);
  }

  createPost(input: {
    profileId: string;
    platform: Platform;
    kind?: PostKind;
    title: string;
    status?: PostStatus;
    body?: string;
  }): Post {
    this.getProfile(input.profileId);
    const def = platformDef(input.platform);
    const kind = input.kind ?? def.kinds[0];
    const tweets = def.perTweet ? [emptyTweet()] : [];
    const id = newId("pst_");
    const at = now();
    this.db
      .prepare(
        `INSERT INTO posts (id, profile_id, platform, kind, title, status, body, tweets, thread_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(id, input.profileId, input.platform, kind, input.title, input.status ?? "draft", input.body ?? "", JSON.stringify(tweets), at, at);
    return this.getPost(id);
  }

  updatePost(
    id: string,
    patch: Partial<Pick<Post, "title" | "body" | "tweets" | "status" | "threadId" | "kind">>,
  ): Post {
    const current = this.getPost(id);
    const tweets = patch.tweets === undefined ? current.tweets : applyRuStale(current.tweets, patch.tweets);
    const next: Post = { ...current, ...patch, tweets };
    this.db
      .prepare(
        `UPDATE posts SET title = ?, status = ?, body = ?, tweets = ?, thread_id = ?, kind = ?, updated_at = ? WHERE id = ?`,
      )
      .run(next.title, next.status, next.body, JSON.stringify(next.tweets), next.threadId, next.kind, now(), id);
    return this.getPost(id);
  }

  postByThread(threadId: string): Post | null {
    const row = this.db.prepare("SELECT * FROM posts WHERE thread_id = ?").get(threadId) as PostRow | undefined;
    return row === undefined ? null : toPost(row);
  }

  profileByThread(threadId: string): Profile | null {
    const row = this.db.prepare("SELECT * FROM profiles WHERE style_thread_id = ?").get(threadId) as ProfileRow | undefined;
    return row === undefined ? null : toProfile(row);
  }

  addProposal(input: {
    postId: string;
    target: ProposalTarget;
    before: string;
    after: string;
    note?: string;
  }): Proposal {
    this.getPost(input.postId);
    const id = newId("prp_");
    const at = now();
    this.db
      .prepare(
        `INSERT INTO proposals (id, post_id, target, before, after, note, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(id, input.postId, JSON.stringify(input.target), input.before, input.after, input.note ?? "", at);
    return this.getProposal(id);
  }

  getProposal(id: string): Proposal {
    const row = this.db.prepare("SELECT * FROM proposals WHERE id = ?").get(id) as ProposalRow | undefined;
    if (row === undefined) throw new StoreError(`No proposal "${id}".`);
    return toProposal(row);
  }

  listProposals(postId: string): Proposal[] {
    const rows = this.db
      .prepare("SELECT * FROM proposals WHERE post_id = ? ORDER BY created_at")
      .all(postId) as ProposalRow[];
    return rows.map(toProposal);
  }

  setProposalStatus(id: string, status: ProposalStatus): Proposal {
    this.getProposal(id);
    this.db.prepare("UPDATE proposals SET status = ? WHERE id = ?").run(status, id);
    return this.getProposal(id);
  }

  applyProposal(id: string): { post: Post; proposal: Proposal } {
    const proposal = this.getProposal(id);
    const post = this.getPost(proposal.postId);
    const run = this.db.transaction(() => {
      if (proposal.target.kind === "body") {
        const body = replaceFirst(post.body, proposal.before, proposal.after);
        this.updatePost(post.id, { body });
      } else {
        const target = proposal.target;
        const tweet = post.tweets[target.index];
        if (tweet === undefined) {
          throw new Error("The text this edit targets is no longer in the post");
        }
        const lang = target.lang;
        const next = post.tweets.map((item, index) =>
          index === target.index ? { ...item, [lang]: replaceFirst(item[lang], proposal.before, proposal.after) } : item,
        );
        this.updatePost(post.id, { tweets: next });
      }
      this.setProposalStatus(id, "applied");
      return { post: this.getPost(post.id), proposal: this.getProposal(id) };
    });
    return run();
  }

  getSettings(): Settings {
    const rows = this.db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const projectRaw = map.get("projectId");
    const languageRaw = map.get("language");
    const language =
      languageRaw === "auto" || languageRaw === "ru" || languageRaw === "en"
        ? languageRaw
        : DEFAULT_SETTINGS.language;
    return {
      providerId: map.get("providerId") ?? DEFAULT_SETTINGS.providerId,
      model: map.get("model") ?? DEFAULT_SETTINGS.model,
      projectId: projectRaw === undefined ? DEFAULT_SETTINGS.projectId : (JSON.parse(projectRaw) as string | null),
      language,
    };
  }

  setSettings(patch: Partial<Settings>): Settings {
    const next = { ...this.getSettings(), ...patch };
    const upsert = this.db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    );
    upsert.run("providerId", next.providerId);
    upsert.run("model", next.model);
    upsert.run("projectId", JSON.stringify(next.projectId));
    upsert.run("language", next.language);
    return this.getSettings();
  }
}
