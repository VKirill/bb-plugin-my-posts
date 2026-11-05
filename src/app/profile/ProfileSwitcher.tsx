import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n";
import type { Profile } from "../../shared/model";
import { initials, rememberProfileId } from "./model";
import { ChevronIcon, PlusIcon } from "./icons";
import { useGo } from "../routes";
import { ProfileStatusPill } from "./pills";

export function ProfileSwitcher({
  profiles,
  current,
}: {
  profiles: Profile[];
  current: Profile | null;
}) {
  const go = useGo();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return profiles;
    return profiles.filter((profile) => profile.name.toLowerCase().includes(needle));
  }, [profiles, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="mp-switcher-wrap">
      <button
        type="button"
        className="mp-switch"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("switchProfile")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="mp-avatar">{current === null ? "—" : initials(current.name)}</span>
        <span className="mp-grow">
          <span className="mp-switch-name mp-truncate">{current?.name ?? t("noProfile")}</span>
          <span className="mp-switch-meta mp-truncate">{current === null ? t("pickFirstProfile") : current.source || t("stylePortrait")}</span>
        </span>
        <ChevronIcon />
      </button>
      {open ? (
        <div className="mp-switcher" role="menu">
          <div className="mp-switcher-search">
            <input
              className="mp-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchProfiles")}
              aria-label={t("searchProfiles")}
            />
          </div>
          {filtered.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="mp-nav-item"
              role="menuitem"
              aria-current={current?.id === profile.id ? "true" : undefined}
              onClick={() => {
                rememberProfileId(profile.id);
                setOpen(false);
                go({ kind: "profile", profileId: profile.id });
              }}
            >
              <span className="mp-avatar">{initials(profile.name)}</span>
              <span className="mp-grow">
                <span className="mp-truncate" style={{ display: "block", fontWeight: 500, color: "var(--foreground)" }}>
                  {profile.name}
                </span>
                <span className="mp-row" style={{ minHeight: "auto", padding: 0, gap: "var(--mp-s2)" }}>
                  <ProfileStatusPill status={profile.status} />
                </span>
              </span>
            </button>
          ))}
          <hr className="mp-divider" />
          <button
            type="button"
            className="mp-nav-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              go({ kind: "create-profile" });
            }}
          >
            <PlusIcon />
            <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{t("createProfile")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
