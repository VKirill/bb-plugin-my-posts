import { ThreadChat, useBbNavigate } from "@get-bb/plugin-sdk/app";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Locale, Post, Tweet } from "../../shared/model";
import { errorText, useMpRpc, usePost, usePosts, useProfile } from "../data";
import { platformLabel, platformRulesLine, t, useLocale } from "../i18n";
import { PlatformIcon } from "../profile/icons";
import { initials } from "../profile/model";
import { PostStatusPill } from "../profile/pills";
import { useGo } from "../routes";
import { platformDef } from "../../shared/platforms";
import { PostScreenContext } from "./context";
import { mergeServerDraft, type Draft, type DraftField } from "./draft";
import { Editor } from "./Editor";
import {
  chatBadge,
  clampChatWidth,
  DEFAULT_CHAT,
  defaultChatWidth,
  DIVIDER_STEP,
  readStoredChatWidth,
  selectionPrompt,
  splitMode,
  toolbarPosition,
  writeStoredChatWidth,
  type SelectionAction,
  type SplitMode,
} from "./layout";
import { Preview } from "./Preview";
import { SelectionToolbar } from "./SelectionToolbar";
import { XTwins } from "./XTwins";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Popover } from "../ui/Popover";
import { TabPanel, Tabs, Toggle } from "../ui/Segmented";
import { COMPACT_AT } from "../ui/breakpoints";
import "./post.css";

const DRAFT_FIELDS: DraftField[] = ["title", "body", "tweets"];

export function PostPage({ postId }: { postId: string }) {
  useLocale();
  const query = usePost(postId);
  if (query.loading && query.data === null) {
    return <p className="mp-post-rules">{t("loading")}</p>;
  }
  if (query.error !== null && query.data === null) {
    return (
      <div>
        <p className="mp-post-error">{query.error}</p>
        <button type="button" className="mp-btn" onClick={query.refetch}>
          {t("retry")}
        </button>
      </div>
    );
  }
  if (query.data === null) return <p className="mp-post-rules">{t("loading")}</p>;
  return (
    <PostScreenContext.Provider value={{ post: query.data.post, proposals: query.data.proposals, refetch: query.refetch }}>
      <PostWorkspace key={query.data.post.id} post={query.data.post} proposals={query.data.proposals} />
    </PostScreenContext.Provider>
  );
}

function PostWorkspace({ post, proposals }: { post: Post; proposals: import("../../shared/model").Proposal[] }) {
  const rpc = useMpRpc();
  const go = useGo();
  const profile = useProfile(post.profileId);
  const posts = usePosts(post.profileId);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const selToolbarRef = useRef<HTMLDivElement>(null);
  const selLayoutRef = useRef<{
    rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
    card: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  } | null>(null);
  const pending = useRef<Partial<Draft>>({});
  const inFlight = useRef<Partial<Draft>>({});
  const timer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const seenId = useRef<string | null>(null);
  const drag = useRef<{ startX: number; startW: number } | null>(null);
  const localRef = useRef<Draft>({ title: post.title, body: post.body, tweets: post.tweets });
  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const [paneWidth, setPaneWidth] = useState(1200);
  const [chatW, setChatW] = useState(DEFAULT_CHAT);
  const [mode, setMode] = useState<"editor" | "preview">("editor");
  const [pane, setPane] = useState<"post" | "chat">("post");
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [tweets, setTweets] = useState(post.tweets);
  const [keepInSync, setKeepInSync] = useState(false);
  const [previewLang, setPreviewLang] = useState<"en" | "ru">("en");
  const [postsOpen, setPostsOpen] = useState(false);
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [focusChat, setFocusChat] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sel, setSel] = useState<{ text: string; left: number; top: number } | null>(null);

  const locale = useLocale();

  async function confirmDeletePost(): Promise<void> {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await rpc.call("post_delete", { id: post.id });
      setDeletePostOpen(false);
      go({ kind: "profile", profileId: post.profileId });
    } catch (cause) {
      setDeleteError(errorText(cause));
    } finally {
      setDeleteBusy(false);
    }
  }
  const split: SplitMode = splitMode(paneWidth);
  const navigate = useBbNavigate();
  const profileName = profile.data?.name ?? "";
  const badge = chatBadge({ tweets }, proposals);
  localRef.current = { title, body, tweets };

  function dirtyFields(): Set<DraftField> {
    const dirty = new Set<DraftField>();
    for (const field of DRAFT_FIELDS) {
      if (pending.current[field] !== undefined || inFlight.current[field] !== undefined) dirty.add(field);
    }
    return dirty;
  }

  useEffect(() => {
    if (seenId.current !== post.id) {
      seenId.current = post.id;
      pending.current = {};
      inFlight.current = {};
      setTitle(post.title);
      setBody(post.body);
      setTweets(post.tweets);
      return;
    }
    const merged = mergeServerDraft(localRef.current, { title: post.title, body: post.body, tweets: post.tweets }, dirtyFields());
    setTitle(merged.title);
    setBody(merged.body);
    setTweets(merged.tweets);
  }, [post.id, post.updatedAt]);

  useEffect(() => {
    const node = rootRef.current;
    if (node === null) return;
    const stored = readStoredChatWidth();
    const width = node.clientWidth;
    setPaneWidth(width);
    setChatW(clampChatWidth(width, stored ?? defaultChatWidth(width)));
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next === undefined) return;
      setPaneWidth(next);
      setChatW((current) => clampChatWidth(next, current));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function schedule(patch: Partial<Draft>): void {
    pending.current = { ...pending.current, ...patch };
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void flush();
    }, 600);
  }

  async function flush(): Promise<boolean> {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const patch = pending.current;
    pending.current = {};
    if (patch.title === undefined && patch.body === undefined && patch.tweets === undefined) return true;
    inFlight.current = { ...inFlight.current, ...patch };
    try {
      await rpc.call("post_update", { id: post.id, ...patch });
      for (const field of DRAFT_FIELDS) {
        if (field in patch) delete inFlight.current[field];
      }
      setSaveError(null);
      return true;
    } catch (cause) {
      pending.current = { ...patch, ...pending.current };
      for (const field of DRAFT_FIELDS) {
        if (field in patch) delete inFlight.current[field];
      }
      setSaveError(errorText(cause));
      return false;
    }
  }
  flushRef.current = flush;

  useEffect(() => {
    return () => {
      void flushRef.current();
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function setChatWidth(next: number): void {
    const clamped = clampChatWidth(paneWidth, next);
    setChatW(clamped);
    writeStoredChatWidth(clamped);
  }

  async function sendChat(text: string): Promise<void> {
    if (post.threadId === null) return;
    await rpc.call("chat_send", { threadId: post.threadId, text });
  }

  function measuredToolbarSize(): { width: number; height: number } {
    const el = selToolbarRef.current;
    return { width: el?.offsetWidth || 320, height: el?.offsetHeight || 36 };
  }

  function onSelection(text: string, rect: DOMRect | null, card: DOMRect | null): void {
    if (text === "" || rect === null || card === null) {
      selLayoutRef.current = null;
      setSel(null);
      return;
    }
    const box = (r: DOMRect) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
    selLayoutRef.current = { rect: box(rect), card: box(card) };
    const pos = toolbarPosition(selLayoutRef.current.rect, selLayoutRef.current.card, measuredToolbarSize(), {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    setSel({ text, left: pos.left, top: pos.top });
  }

  useLayoutEffect(() => {
    if (sel === null || selLayoutRef.current === null) return;
    const pos = toolbarPosition(selLayoutRef.current.rect, selLayoutRef.current.card, measuredToolbarSize(), {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    if (pos.left === sel.left && pos.top === sel.top) return;
    setSel({ ...sel, left: pos.left, top: pos.top });
  }, [sel]);

  async function onAction(action: SelectionAction): Promise<void> {
    if (sel === null) return;
    await sendChat(selectionPrompt(action, sel.text, post.platform));
    setSel(null);
    if (split === "tabs") setPane("chat");
  }

  async function onAsk(): Promise<void> {
    if (sel === null) return;
    try {
      await navigator.clipboard.writeText(`«${sel.text}»`);
      setToast(t("quoteCopied"));
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => {
        setToast(null);
        toastTimer.current = null;
      }, 2400);
    } catch {
      setToast(t("copyFailed"));
    }
    setSel(null);
    setFocusChat((n) => n + 1);
    if (split === "tabs") setPane("chat");
  }

  async function onUpdateRu(index: number): Promise<void> {
    const tweet = tweets[index];
    if (tweet === undefined) return;
    await sendChat(t("updateRuPrompt", { n: index + 1, selection: tweet.en }));
    if (split === "tabs") setPane("chat");
  }

  function onTweets(next: Tweet[], index: number, lang: "en" | "ru"): void {
    setTweets(next);
    schedule({ tweets: next });
    if (keepInSync && lang === "en") void onUpdateRu(index);
  }

  const def = platformDef(post.platform);
  const showLabel = !def.perTweet;
  const label = platformLabel(post.platform);

  async function copyText(): Promise<void> {
    const text = def.perTweet ? tweets.map((tweet) => tweet[previewLang]).join("\n\n") : body;
    await navigator.clipboard.writeText(text);
  }

  async function markReady(): Promise<void> {
    const saved = await flush();
    if (!saved) return;
    try {
      await rpc.call("post_update", { id: post.id, status: "ready" });
      setSaveError(null);
    } catch (cause) {
      setSaveError(errorText(cause));
    }
  }

  const timeLabel = formatTime(post.updatedAt, locale);
  const crumbTitleVisible = paneWidth >= COMPACT_AT;

  return (
    <div
      ref={rootRef}
      className="mp-post-page"
      data-split={split}
      data-pane={pane}
      style={{ ["--mp-chat-w" as string]: `${chatW}px` }}
    >
      <header className="mp-post-bar">
        <button
          type="button"
          className="mp-btn sm icon ghost"
          aria-label={t("backToProfile")}
          onClick={() => go({ kind: "profile", profileId: post.profileId })}
        >
          ←
        </button>
        <nav className="mp-post-crumb" aria-label={t("crumb")}>
          <button type="button" className="mp-post-crumb-btn" onClick={() => go({ kind: "profile", profileId: post.profileId })}>
            <span className="mp-post-avatar">{initials(profileName)}</span>
            <span className="mp-post-crumb-name">{profileName}</span>
          </button>
          <span aria-hidden>›</span>
          <button
            type="button"
            className="mp-post-crumb-btn"
            onClick={() => go({ kind: "profile", profileId: post.profileId, platform: post.platform })}
          >
            <span className="mp-post-tile">
              <PlatformIcon platform={post.platform} />
            </span>
            {showLabel ? <span className="mp-post-crumb-plat">{label}</span> : null}
          </button>
          {crumbTitleVisible ? (
            <>
              <span className="mp-post-crumb-title-sep" aria-hidden>
                ›
              </span>
              <span className="mp-post-crumb-title mp-truncate">{title}</span>
            </>
          ) : null}
        </nav>
        <Tabs
          label={t("tabPost")}
          size="sm"
          value={pane}
          onChange={setPane}
          items={[
            { id: "post", label: t("tabPost") },
            {
              id: "chat",
              label: (
                <>
                  {t("tabChat")}
                  <span className="mp-post-badge" data-empty={badge === 0 ? "true" : "false"}>
                    {badge === 0 ? "" : badge}
                  </span>
                </>
              ),
            },
          ]}
        />
        <Popover
          open={postsOpen}
          onClose={() => setPostsOpen(false)}
          role="menu"
          className="mp-post-posts-pop"
          anchor={
            <button
              type="button"
              className="mp-btn sm"
              aria-haspopup="menu"
              aria-expanded={postsOpen}
              onClick={() => setPostsOpen((open) => !open)}
            >
              ≡ <span className="mp-post-posts-lbl">{t("posts")}</span> ▾
            </button>
          }
        >
          <div className="mp-post-menu-label">
            {t("posts")} · {profileName}
          </div>
          {(posts.data?.posts ?? []).map((row) => (
            <button
              key={row.id}
              type="button"
              className="mp-post-nav-item"
              role="menuitem"
              aria-current={row.id === post.id ? "page" : undefined}
              onClick={() => {
                setPostsOpen(false);
                go({ kind: "post", postId: row.id });
              }}
            >
              <span className="mp-post-tile">
                <PlatformIcon platform={row.platform} />
              </span>
              <span className="mp-post-grow">{row.title}</span>
              <PostStatusPill status={row.status} />
            </button>
          ))}
          <button
            type="button"
            className="mp-post-nav-item"
            role="menuitem"
            onClick={() => {
              setPostsOpen(false);
              setDeleteError(null);
              setDeletePostOpen(true);
            }}
          >
            {t("deletePost")}
          </button>
        </Popover>
      </header>

      <div className="mp-post-split">
        <section className="mp-post-col" aria-label={t("tabPost")}>
          <div className="mp-post-head">
            <div className="mp-post-meta">
              <span className="mp-post-tile mp-post-tile-md">
                <PlatformIcon platform={post.platform} />
              </span>
              {showLabel ? <span className="mp-post-platname">{label}</span> : null}
              <PostStatusPill status={post.status} />
              <span className="mp-post-grow" />
              <Toggle
                label={t("editor")}
                size="sm"
                value={mode}
                onChange={setMode}
                items={[
                  { id: "editor", label: t("editor") },
                  { id: "preview", label: t("preview") },
                ]}
              />
            </div>
            <textarea
              className="mp-post-title"
              rows={1}
              value={title}
              aria-label={t("editor")}
              onChange={(event) => {
                setTitle(event.target.value);
                schedule({ title: event.target.value });
              }}
            />
          </div>
          <div className="mp-post-body">
            <div className="mp-post-page-inner">
              <div className="mp-post-rules">
                <span className="mp-post-rule">
                  <PlatformIcon platform={post.platform} />
                  <span>{platformRulesLine(post.platform)}</span>
                </span>
              </div>
              <TabPanel id={mode}>
                {mode === "editor" && !def.perTweet ? (
                  <Editor platform={post.platform} value={body} onChange={(next) => { setBody(next); schedule({ body: next }); }} onSelection={onSelection} cardRef={cardRef} />
                ) : null}
                {mode === "editor" && def.perTweet ? (
                  <XTwins
                    tweets={tweets}
                    keepInSync={keepInSync}
                    onKeepInSync={setKeepInSync}
                    onChange={onTweets}
                    onUpdateRu={(index) => void onUpdateRu(index)}
                    onSelection={onSelection}
                  />
                ) : null}
                {mode === "preview" ? (
                  <Preview
                    platform={post.platform}
                    title={title}
                    body={body}
                    tweets={tweets}
                    profileName={profileName}
                    previewLang={previewLang}
                    onPreviewLang={setPreviewLang}
                    timeLabel={timeLabel}
                  />
                ) : null}
              </TabPanel>
            </div>
          </div>
          <div className="mp-post-foot">
            <span className="mp-post-saved">{t("saved", { time: timeLabel })}</span>
            <span className="mp-post-grow" />
            {saveError !== null ? <span className="mp-post-error">{saveError}</span> : null}
            <button type="button" className="mp-btn mp-post-copy" aria-label={t("copy")} onClick={() => void copyText()}>
              <span className="mp-post-copy-lbl">{t("copy")}</span>
              <span className="mp-post-copy-ico" aria-hidden>
                ⧉
              </span>
            </button>
            <button type="button" className="mp-btn mp-post-accent" onClick={() => void markReady()}>
              {t("markReady")}
            </button>
          </div>
        </section>

        <div
          className="mp-post-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("resizeChat")}
          aria-valuemin={320}
          aria-valuemax={640}
          aria-valuenow={Math.round(chatW)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { startX: event.clientX, startW: chatW };
            event.currentTarget.classList.add("is-drag");
          }}
          onPointerMove={(event) => {
            if (drag.current === null) return;
            const delta = drag.current.startX - event.clientX;
            setChatWidth(drag.current.startW + delta);
          }}
          onPointerUp={(event) => {
            drag.current = null;
            event.currentTarget.classList.remove("is-drag");
          }}
          onDoubleClick={() => setChatWidth(DEFAULT_CHAT)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setChatWidth(chatW + DIVIDER_STEP);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setChatWidth(chatW - DIVIDER_STEP);
            }
          }}
        />

        <aside className="mp-post-chat" aria-label={t("copywriter")}>
          <div className="mp-post-chat-head">
            <span className="mp-post-avatar mp-post-chat-ai">AI</span>
            <span className="mp-post-chat-title">{t("copywriterTitle")}</span>
            {profileName !== "" ? <span className="mp-post-chat-profile"> · {profileName}</span> : null}
            {post.threadId !== null ? (
              <button
                type="button"
                className="mp-btn mp-ghost sm mp-post-chat-open"
                title={t("openInBbHint")}
                onClick={() => { if (post.threadId !== null) navigate.toThread(post.threadId); }}
              >
                {t("openInBb")}
              </button>
            ) : null}
          </div>
          <div className="mp-post-chat-stage">
            <div className="mp-post-chips">
              <button type="button" className="mp-post-chip" disabled={post.threadId === null} onClick={() => void sendChat(t("chipShorterPrompt"))}>
                {t("chipShorter")}
              </button>
              <button type="button" className="mp-post-chip" disabled={post.threadId === null} onClick={() => void sendChat(t("chipHooksPrompt"))}>
                {t("chipHooks")}
              </button>
              <button type="button" className="mp-post-chip" disabled={post.threadId === null} onClick={() => void sendChat(t("chipTabooPrompt"))}>
                {t("chipTaboo")}
              </button>
            </div>
            <div className="mp-post-chat-main">
              {post.threadId === null ? (
                <p className="mp-post-rules mp-chat-empty">
                  {t("noThread")}
                </p>
              ) : (
                <ThreadChat
                  threadId={post.threadId}
                  // On a phone the chat is its own tab: show it the way BB shows a chat, not as a side panel (owner 2026-11-08).
                  variant={split === "tabs" ? "full" : "compact"}
                  layout="contained"
                  className="h-full"
                  focusRequest={focusChat}
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      <SelectionToolbar
        toolbarRef={selToolbarRef}
        hidden={sel === null}
        left={sel?.left ?? 0}
        top={sel?.top ?? 0}
        onAction={(action) => void onAction(action)}
        onAsk={() => void onAsk()}
      />
      {toast !== null ? <div className="mp-post-toast">{toast}</div> : null}
      <ConfirmDialog
        open={deletePostOpen}
        title={t("deletePostTitle")}
        text={t("deletePostText", { title })}
        confirmLabel={t("deletePost")}
        danger
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => void confirmDeletePost()}
        onCancel={() => setDeletePostOpen(false)}
      />
    </div>
  );
}

function formatTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
