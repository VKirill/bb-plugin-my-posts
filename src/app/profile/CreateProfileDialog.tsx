import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t, useLocale } from "../i18n";
import { useMpRpc } from "../data";
import type { Profile } from "../../shared/model";

export function CreateProfileForm({
  onCreated,
  onCancel,
}: {
  onCreated: (profile: Profile) => void;
  onCancel?: () => void;
}) {
  const rpc = useMpRpc();
  const locale = useLocale();
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
        locale,
        ...(source.trim() === "" ? {} : { source: source.trim() }),
      });
      onCreated(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
      <DialogFooter className="gap-2 sm:justify-end">
        {onCancel !== undefined ? (
          <button type="button" className="mp-btn mp-ghost" onClick={onCancel}>
            {t("cancel")}
          </button>
        ) : null}
        <button
          type="button"
          className="mp-btn mp-accent"
          disabled={busy || name.trim() === ""}
          onClick={() => void submit()}
        >
          {t("createProfile")}
        </button>
      </DialogFooter>
    </>
  );
}

export function CreateProfileDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (profile: Profile) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="mp-portal">
        <DialogHeader>
          <DialogTitle>{t("createProfileTitle")}</DialogTitle>
        </DialogHeader>
        <CreateProfileForm
          onCreated={onCreated}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
