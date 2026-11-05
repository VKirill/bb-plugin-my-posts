import { ThreadChat } from "@get-bb/plugin-sdk/app";
import { t } from "../i18n";
import type { Post, Profile } from "../../shared/model";
import { PLATFORMS } from "../../shared/platforms";
import { railCounts, recentPosts, initials } from "./model";
import { PlatformIcon, RefreshIcon } from "./icons";
import { PostStatusPill, ProfileStatusPill } from "./pills";
import { PortraitCard } from "./PortraitCard";
import { platformLabel } from "./Rail";
import { useGo, type ProfileTab } from "../routes";

const PLATFORM_KEYS = {
  telegram: "platformTelegram",
  x: "platformX",
  dzen: "platformDzen",
  vk: "platformVk",
} as const;

const HINT_KEYS = {
  telegram: "hintTelegram",
  x: "hintX",
  dzen: "hintDzen",
  vk: "hintVk",
} as const;

export function ProfileHome({
  profile,
  posts,
  tab,
  onRebuild,
}: {
  profile: Profile;
  posts: Post[];
  tab: ProfileTab;
  onRebuild: () => void;
}) {
  const go = useGo();
  const counts = railCounts(posts);
  const recent = recentPosts(posts, 8);
  const active = tab === "voice" ? "voice" : "overview";

  return (
    <div className="mp-centre">
      <div className="mp-head">
        <span className="mp-seg" role="tablist">
          <button
            type="button"
            className="mp-seg-item mp-btn mp-ghost"
            role="tab"
            aria-selected={active === "overview"}
            onClick={() => go({ kind: "profile", profileId: profile.id, tab: "overview" })}
          >
            {t("overview")}
          </button>
          <button
            type="button"
            className="mp-seg-item mp-btn mp-ghost"
            role="tab"
            aria-selected={active === "voice"}
            onClick={() => go({ kind: "profile", profileId: profile.id, tab: "voice" })}
          >
            {t("styleChat")}
          </button>
        </span>
        <span className="mp-grow" />
        <button type="button" className="mp-btn" onClick={onRebuild}>
          <RefreshIcon />
          {t("rebuild")}
        </button>
      </div>
      {active === "voice" ? (
        <div className="mp-chat-wrap">
          {profile.styleThreadId === null ? (
            <p className="mp-meta" style={{ padding: "var(--mp-pad-page)" }}>
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
              <div className="mp-panel-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
                {PLATFORMS.map((row) => (
                  <div key={row.id} className="mp-platcard">
                    <PlatformIcon platform={row.id} />
                    <span className="mp-grow">
                      <span className="mp-h2">{t(PLATFORM_KEYS[row.id])}</span>
                      <span className="mp-meta" style={{ display: "block" }}>
                        {t(HINT_KEYS[row.id])}
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
            <div className="mp-panel-body mp-rowlist" style={{ padding: "var(--mp-s1)" }}>
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
    </div>
  );
}
