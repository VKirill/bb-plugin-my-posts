import { platformLabel, t } from "../i18n";
import type { Post, Profile } from "../../shared/model";
import { PLATFORM_LIST } from "../../shared/platforms";
import { railCounts } from "./model";
import { PlatformIcon, PlusIcon } from "./icons";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { PostStatusPill } from "./pills";
import { useGo, type Route } from "../routes";

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
        <button type="button" className="mp-btn mp-accent mp-btn-block" onClick={onNewPost}>
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
            aria-current={route.kind === "profile" && selectedPlatform === undefined ? "page" : undefined}
            onClick={() => {
              if (current === null) return;
              go({ kind: "profile", profileId: current.id, tab: route.kind === "profile" ? route.tab : undefined });
            }}
          >
            <PlatformIcon platform="all" />
            <span>{t("allPlatforms")}</span>
            <span className="mp-nav-count">{counts.all}</span>
          </button>
          {PLATFORM_LIST.map((row) => (
            <button
              key={row.id}
              type="button"
              className="mp-nav-item"
              aria-current={route.kind === "profile" && selectedPlatform === row.id ? "page" : undefined}
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
              <span>{platformLabel(row.id)}</span>
              <span className="mp-nav-count">{counts[row.id]}</span>
            </button>
          ))}
          <div className="mp-menu-label">{t("posts")}</div>
          {selectedPlatform !== undefined && visiblePosts.length === 0 ? (
            <p className="mp-meta mp-note">{t("emptyPlatformPosts")}</p>
          ) : (
            visiblePosts.map((post) => (
              <button
                key={post.id}
                type="button"
                className="mp-rail-post mp-nav-item"
                aria-current={route.kind === "post" && route.postId === post.id ? "page" : undefined}
                onClick={() => go({ kind: "post", postId: post.id })}
              >
                <PlatformIcon platform={post.platform} />
                <span className="mp-grow">
                  <span className="mp-rail-post-title mp-truncate">{post.title}</span>
                  <span className="mp-meta">
                    <PostStatusPill status={post.status} />
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <p className="mp-meta mp-note">{creating ? t("createRailNote") : t("emptyRailNote")}</p>
      )}
      <div className="mp-rail-footer">
        <button
          type="button"
          className="mp-nav-item"
          aria-current={route.kind === "settings" ? "page" : undefined}
          onClick={() => go({ kind: "settings" })}
        >
          {t("settings")}
        </button>
      </div>
    </aside>
  );
}
