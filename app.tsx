import { useEffect } from "react";
import "./app.css";
import { definePluginApp, type PluginNavPanelProps } from "@get-bb/plugin-sdk/app";
import { setLanguagePreference, t, useLocale } from "./src/app/i18n";
import { useSettings } from "./src/app/data";
import { EditDirective } from "./src/app/post/EditDirective";
import { PostPage } from "./src/app/post/PostPage";
import { ProfileArea } from "./src/app/profile/ProfileArea";
import { PANEL_PATH, parseRoute } from "./src/app/routes";
import { SettingsPage } from "./src/app/settings/SettingsPage";

function LanguagePreference() {
  const settings = useSettings();
  useEffect(() => {
    if (settings.data !== null) setLanguagePreference(settings.data.language);
  }, [settings.data]);
  return null;
}

function MyPostsPanel({ subPath }: PluginNavPanelProps) {
  useLocale();
  const route = parseRoute(subPath);
  return (
    <div className="mp-app box-border h-full min-h-0 overflow-y-auto" style={{ padding: "var(--mp-pad-page)" }}>
      <LanguagePreference />
      {route.kind === "post" ? (
        <PostPage postId={route.postId} />
      ) : route.kind === "settings" ? (
        <SettingsPage />
      ) : (
        <ProfileArea route={route} />
      )}
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "my-posts",
    title: t("appTitle"),
    icon: "my-posts/quill",
    path: PANEL_PATH,
    component: MyPostsPanel,
  });
  app.slots.messageDirective({ id: "mp-edit", component: EditDirective });
});
