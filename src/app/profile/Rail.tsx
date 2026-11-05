import { t } from "../i18n";
import type { Platform, Post, Profile } from "../../shared/model";
import { PLATFORMS } from "../../shared/platforms";
import { railCounts } from "./model";
import { PlatformIcon, PlusIcon } from "./icons";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { PostStatusPill } from "./pills";
import { useGo, type Route } from "../routes";

const PLATFORM_KEYS = {
  telegram: "platformTelegram",
  x: "platformX",
  dzen: "platformDzen",
  vk: "platformVk",
} as const;

export function Rail({
  profiles,
  current,
  posts,
  route,
  creating,
  onNewPost,
}: {
  profiles: Profile[];
  current: Profile | null;
  posts: Post[];
  route: Route;
  creating: boolean;
  onNewPost: () => void;
}) {
  const go = useGo();
  const counts = railCounts(posts);
  const selectedPlatform = route.kind === "profile" ? route.platform : undefined;
  const visiblePosts =
    selectedPlatform === undefined ? posts : posts.filter((post) => post.platform === selectedPlatform);

  return (
    <aside className="mp-rail">
      <ProfileSwitcher profiles={profiles} current={current} />
      {current !== null && !creating ? (
        <button type="button" className="mp-btn mp-accent" style={{ width: "100%" }} onClick={onNewPost}>
          <PlusIcon />
          {t("newPost")}
        </button>
      ) : null}
      {current !== null && !creating ? (
        <div className="mp-rail-scroll">
          <div className="mp-menu-label">{t("platforms")}</div>
          <button
            type="button"
            className="mp-nav-item"
            aria-current={selectedPlatform === undefined ? "page" : undefined}
            onClick={() => {
              if (current === null) return;
              go({ kind: "profile", profileId: current.id, tab: route.kind === "profile" ? route.tab : undefined });
            }}
          >
            <PlatformIcon platform="all" />
            <span>{t("allPlatforms")}</span>
            <span className="mp-nav-count">{counts.all}</span>
          </button>
          {PLATFORMS.map((row) => (
            <button
              key={row.id}
              type="button"
              className="mp-nav-item"
              aria-current={selectedPlatform === row.id ? "page" : undefined}
              onClick={() => {
                if (current === null) return;
                go({
                  kind: "profile",
                  profileId: current.id,
                  tab: route.kind === "profile" ? route.tab : undefined,
                  platform: row.id,
                });
              }}
            >
              <PlatformIcon platform={row.id} />
              <span>{t(PLATFORM_KEYS[row.id])}</span>
              <span className="mp-nav-count">{counts[row.id]}</span>
            </button>
          ))}
          <div className="mp-menu-label">{t("posts")}</div>
          {visiblePosts.map((post) => (
            <button
              key={post.id}
              type="button"
              className="mp-rail-post mp-nav-item"
              onClick={() => go({ kind: "post", postId: post.id })}
            >
              <PlatformIcon platform={post.platform} />
              <span className="mp-grow">
                <span className="mp-rail-post-title mp-truncate">{post.title}</span>
                <span className="mp-meta" style={{ display: "flex", gap: "var(--mp-s2)", marginTop: "var(--mp-s1)" }}>
                  <PostStatusPill status={post.status} />
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mp-meta mp-note">{creating ? t("createRailNote") : t("emptyRailNote")}</p>
      )}
    </aside>
  );
}

export function platformLabel(platform: Platform): string {
  return t(PLATFORM_KEYS[platform]);
}
