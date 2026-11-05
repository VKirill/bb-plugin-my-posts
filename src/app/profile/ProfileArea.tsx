import { useEffect, useState } from "react";
import "./profile.css";
import { t, useLocale } from "../i18n";
import { usePosts, useProfile, useProfiles } from "../data";
import { useGo, type Route } from "../routes";
import { afterCreateRoute, lastProfileId, rememberProfileId } from "./model";
import { CreateProfile } from "./CreateProfile";
import { NewPostDialog } from "./NewPostDialog";
import { ProfileHome } from "./ProfileHome";
import { Rail } from "./Rail";
import type { Profile } from "../../shared/model";

export function ProfileArea({ route }: { route: Route }) {
  useLocale();
  const go = useGo();
  const profilesQuery = useProfiles();
  const profiles = profilesQuery.data?.profiles ?? [];
  const creating = route.kind === "create-profile";
  const [created, setCreated] = useState<Profile | null>(null);
  const [pane, setPane] = useState<"posts" | "voice">(creating ? "voice" : "posts");
  const [newPostOpen, setNewPostOpen] = useState(false);

  useEffect(() => {
    if (route.kind !== "home") return;
    if (profilesQuery.loading) return;
    const id = lastProfileId(profiles);
    if (id === null) return;
    rememberProfileId(id);
    go({ kind: "profile", profileId: id }, { replace: true });
  }, [go, profiles, profilesQuery.loading, route.kind]);

  useEffect(() => {
    if (route.kind !== "create-profile") return;
    setCreated(null);
  }, [route.kind]);

  const listedId = route.kind === "profile" ? route.profileId : lastProfileId(profiles);
  const queryId = (creating ? created?.id : listedId) ?? "prf_none";
  const profileQuery = useProfile(queryId);
  const postsQuery = usePosts(queryId);
  const liveProfile: Profile | null =
    queryId === "prf_none" ? null : (profileQuery.data ?? created ?? profiles.find((row) => row.id === queryId) ?? null);
  const current = creating ? liveProfile : (liveProfile ?? profiles.find((row) => row.id === listedId) ?? null);
  const posts = postsQuery.data?.posts ?? [];

  if (profilesQuery.loading && profiles.length === 0) {
    return <p className="mp-meta">{t("loading")}</p>;
  }
  if (profilesQuery.error !== null && profiles.length === 0) {
    return (
      <div className="mp-empty">
        <p className="mp-error">{profilesQuery.error}</p>
        <button type="button" className="mp-btn" onClick={profilesQuery.refetch}>
          {t("retry")}
        </button>
      </div>
    );
  }

  const empty = profiles.length === 0 && !creating && created === null;

  return (
    <div className="mp-profile">
      <div className="mp-pane-tabs">
        <div className="mp-seg" role="tablist">
          <button
            type="button"
            className="mp-seg-item mp-btn mp-ghost"
            role="tab"
            aria-selected={pane === "posts"}
            onClick={() => setPane("posts")}
          >
            {t("tabPosts")}
          </button>
          <button
            type="button"
            className="mp-seg-item mp-btn mp-ghost"
            role="tab"
            aria-selected={pane === "voice"}
            onClick={() => setPane("voice")}
          >
            {t("tabVoice")}
          </button>
        </div>
      </div>
      <div className="mp-layout" data-pane={pane}>
        <Rail
          profiles={profiles}
          current={current}
          posts={posts}
          route={route}
          creating={creating}
          onNewPost={() => setNewPostOpen(true)}
        />
        {empty ? (
          <main className="mp-centre">
            <div className="mp-empty-wrap">
              <div className="mp-card mp-empty">
                <h1 className="mp-h1">{t("profileEmptyTitle")}</h1>
                <p className="mp-meta" style={{ margin: 0 }}>
                  {t("profileEmptyHint")}
                </p>
                <button type="button" className="mp-btn mp-accent" onClick={() => go({ kind: "create-profile" })}>
                  {t("createProfile")}
                </button>
              </div>
            </div>
          </main>
        ) : creating ? (
          <CreateProfile
            profile={null}
            onCreated={(profile) => {
              setCreated(profile);
              rememberProfileId(profile.id);
              go(afterCreateRoute(profile));
            }}
          />
        ) : current === null ? (
          <main className="mp-centre">
            <p className="mp-meta" style={{ padding: "var(--mp-pad-page)" }}>
              {profileQuery.loading ? t("loading") : t("noProfile")}
            </p>
          </main>
        ) : (
          <ProfileHome
            profile={current}
            posts={posts}
            tab={route.kind === "profile" ? (route.tab ?? "overview") : "overview"}
            onRebuild={() => {
              profileQuery.refetch();
              postsQuery.refetch();
            }}
          />
        )}
      </div>
      {current !== null && !creating ? (
        <NewPostDialog open={newPostOpen} onOpenChange={setNewPostOpen} profileId={current.id} />
      ) : null}
    </div>
  );
}
