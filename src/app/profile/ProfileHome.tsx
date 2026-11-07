import { useState } from "react";
import { ThreadChat } from "@get-bb/plugin-sdk/app";
import { platformHint, platformLabel, t, useLocale } from "../i18n";
import type { Post, Profile } from "../../shared/model";
import { PLATFORM_LIST } from "../../shared/platforms";
import { errorText, useMpRpc } from "../data";
import { railCounts, recentPosts, initials } from "./model";
import { deleteProfileText, rebuildPrompt, routeAfterProfileDelete } from "./manage";
import { PlatformIcon, RefreshIcon } from "./icons";
import { PostStatusPill, ProfileStatusPill } from "./pills";
import { PortraitCard } from "./PortraitCard";
import { RenameProfileDialog } from "./RenameProfileDialog";
import { useGo, type ProfileTab } from "../routes";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Popover } from "../ui/Popover";
import { TabPanel, Tabs } from "../ui/Segmented";

export function ProfileHome({
  profile,
  profiles,
  posts,
  tab,
  onRebuild,
}: {
  profile: Profile;
  profiles: Profile[];
  posts: Post[];
  tab: ProfileTab;
  onRebuild: () => void;
}) {
  const go = useGo();
  const rpc = useMpRpc();
  const locale = useLocale();
  const counts = railCounts(posts);
  const recent = recentPosts(posts, 8);
  const active = tab === "voice" ? "voice" : "overview";
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rebuild(): Promise<void> {
    if (profile.styleThreadId === null) return;
    await rpc.call("chat_send", { threadId: profile.styleThreadId, text: rebuildPrompt(locale) });
    onRebuild();
    go({ kind: "profile", profileId: profile.id, tab: "voice" });
  }

  async function confirmDelete(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await rpc.call("profile_delete", { id: profile.id });
      setDeleteOpen(false);
      go(routeAfterProfileDelete(profiles, profile.id));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mp-centre">
      <div className="mp-head">
        <Tabs
          label={t("overview")}
          value={active}
          onChange={(tab) => go({ kind: "profile", profileId: profile.id, tab })}
          items={[
            { id: "overview", label: t("overview") },
            { id: "voice", label: t("styleChat") },
          ]}
        />
        <span className="mp-grow" />
        <button
          type="button"
          className="mp-btn"
          disabled={profile.styleThreadId === null}
          onClick={() => void rebuild()}
        >
          <RefreshIcon />
          {t("rebuild")}
        </button>
        <Popover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          role="menu"
          className="mp-switcher"
          anchor={
            <button
              type="button"
              className="mp-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t("more")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ⋯
            </button>
          }
        >
          <button
            type="button"
            className="mp-nav-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setRenameOpen(true);
            }}
          >
            {t("rename")}
          </button>
          <button
            type="button"
            className="mp-nav-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setError(null);
              setDeleteOpen(true);
            }}
          >
            {t("deleteProfile")}
          </button>
        </Popover>
      </div>
      <TabPanel id={active}>
        {active === "voice" ? (
          <div className="mp-chat-wrap">
            {profile.styleThreadId === null ? (
              <p className="mp-meta mp-meta-pad">
                {t("chatUnavailable")}
              </p>
            ) : (
              <ThreadChat threadId={profile.styleThreadId} variant="compact" layout="contained" className="h-full" />
            )}
          </div>
        ) : (
          <div className="mp-body">
            <div className="mp-panel mp-hero">
              <span className="mp-avatar mp-avatar-lg">{initials(profile.name)}</span>
              <span className="mp-grow">
                <h1 className="mp-h1">{profile.name}</h1>
                <span className="mp-meta">{profile.source === "" ? t("stylePortrait") : profile.source}</span>
              </span>
              <ProfileStatusPill status={profile.status} />
            </div>
            <div className="mp-grid2">
              <PortraitCard profile={profile} />
              <section className="mp-panel">
                <div className="mp-panel-head">
                  <span>{t("platforms")}</span>
                  <span className="mp-grow" />
                  <span className="mp-meta">{counts.all}</span>
                </div>
                <div className="mp-panel-body mp-panel-body-flush">
                  {PLATFORM_LIST.map((row) => (
                    <div key={row.id} className="mp-platcard">
                      <PlatformIcon platform={row.id} />
                      <span className="mp-grow">
                        <span className="mp-h2">{platformLabel(row.id)}</span>
                        <span className="mp-meta">
                          {platformHint(row.id)}
                        </span>
                      </span>
                      <span className="mp-meta">{counts[row.id]}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="mp-panel">
              <div className="mp-panel-head">{t("recentPosts")}</div>
              <div className="mp-panel-body mp-rowlist">
                {recent.map((post) => (
                  <button key={post.id} type="button" className="mp-row" onClick={() => go({ kind: "post", postId: post.id })}>
                    <PlatformIcon platform={post.platform} />
                    <span className="mp-grow">
                      <span className="mp-rail-post-title mp-truncate">{post.title}</span>
                      <span className="mp-meta">{platformLabel(post.platform)}</span>
                    </span>
                    <PostStatusPill status={post.status} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </TabPanel>
      <RenameProfileDialog open={renameOpen} profile={profile} onClose={() => setRenameOpen(false)} />
      <ConfirmDialog
        open={deleteOpen}
        title={t("deleteProfileTitle")}
        text={deleteProfileText(profile.name, posts.length, locale)}
        confirmLabel={t("deleteProfile")}
        danger
        busy={busy}
        error={error}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
