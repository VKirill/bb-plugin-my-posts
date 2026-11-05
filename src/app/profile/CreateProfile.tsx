import { useState } from "react";
import { ThreadChat } from "@get-bb/plugin-sdk/app";
import { t } from "../i18n";
import { useMpRpc } from "../data";
import { useGo } from "../routes";
import type { Profile } from "../../shared/model";
import { ProfileStatusPill } from "./pills";
import { PortraitCard } from "./PortraitCard";

export function CreateProfile({
  profile,
  onCreated,
}: {
  profile: Profile | null;
  onCreated: (profile: Profile) => void;
}) {
  const rpc = useMpRpc();
  const go = useGo();
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (trimmed === "") return;
    setBusy(true);
    setError(null);
    try {
      const next = await rpc.call("profile_create", {
        name: trimmed,
        ...(source.trim() === "" ? {} : { source: source.trim() }),
      });
      onCreated(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  if (profile !== null) {
    return (
      <div className="mp-centre">
        <div className="mp-head">
          <span className="mp-h2">{profile.name}</span>
          <ProfileStatusPill status={profile.status} />
          <span className="mp-grow" />
          <button type="button" className="mp-btn mp-ghost" onClick={() => go({ kind: "home" })}>
            {t("cancel")}
          </button>
        </div>
        <div className="mp-chat-wrap">
          <div className="mp-pinned">
            <PortraitCard profile={profile} compact />
          </div>
          {profile.styleThreadId === null ? (
            <p className="mp-meta" style={{ padding: "var(--mp-pad-page)" }}>
              {t("chatUnavailable")}
            </p>
          ) : (
            <ThreadChat threadId={profile.styleThreadId} variant="compact" layout="contained" className="h-full" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mp-centre">
      <div className="mp-head">
        <span className="mp-h2">{t("createProfileTitle")}</span>
        <span className="mp-grow" />
        <button type="button" className="mp-btn mp-ghost" onClick={() => go({ kind: "home" })}>
          {t("cancel")}
        </button>
      </div>
      <div className="mp-body" style={{ justifyContent: "center" }}>
        <div className="mp-card mp-empty">
          <h1 className="mp-h1">{t("createProfileTitle")}</h1>
          <div className="mp-field" style={{ width: "100%" }}>
            <label htmlFor="mp-profile-name">{t("profileName")}</label>
            <input
              id="mp-profile-name"
              className="mp-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="mp-field" style={{ width: "100%" }}>
            <label htmlFor="mp-profile-source">{t("profileSource")}</label>
            <textarea
              id="mp-profile-source"
              className="mp-textarea"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder={t("profileSourceHint")}
            />
          </div>
          {error !== null ? <p className="mp-error">{error}</p> : null}
          <button type="button" className="mp-btn mp-accent" disabled={busy || name.trim() === ""} onClick={() => void submit()}>
            {t("createProfile")}
          </button>
        </div>
      </div>
    </div>
  );
}
