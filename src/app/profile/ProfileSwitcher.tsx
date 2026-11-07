import { useMemo, useState } from "react";
import { detectLocale, t } from "../i18n";
import type { Profile } from "../../shared/model";
import { initials, rememberProfileId, sourceLine } from "./model";
import { ChevronIcon, PlusIcon } from "./icons";
import { useGo } from "../routes";
import { ProfileStatusPill } from "./pills";
import { Popover } from "../ui/Popover";

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
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return profiles;
    return profiles.filter((profile) => profile.name.toLowerCase().includes(needle));
  }, [profiles, query]);

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      role="menu"
      className="mp-switcher"
      anchor={
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
      }
    >
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
            <span className="mp-switcher-source mp-truncate">{sourceLine(profile.source, detectLocale())}</span>
          </span>
          <ProfileStatusPill status={profile.status} />
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
    </Popover>
  );
}
