import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "../i18n";
import { errorText, useMpRpc } from "../data";
import type { Profile } from "../../shared/model";

export function RenameProfileDialog({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: Profile;
  onClose: () => void;
}) {
  const rpc = useMpRpc();
  const [name, setName] = useState(profile.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setError(null);
  }, [open, profile.id, profile.name]);

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (trimmed === "") return;
    setBusy(true);
    setError(null);
    try {
      await rpc.call("profile_update", { id: profile.id, name: trimmed });
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent hideCloseButton className="mp-portal">
        <DialogHeader>
          <DialogTitle>{t("renameTitle")}</DialogTitle>
        </DialogHeader>
        <div className="mp-field" style={{ width: "100%" }}>
          <label htmlFor="mp-rename-profile">{t("profileName")}</label>
          <input
            id="mp-rename-profile"
            className="mp-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        {error !== null ? <p className="mp-error">{error}</p> : null}
        <DialogFooter className="gap-2 sm:justify-end">
          <button type="button" className="mp-btn mp-ghost" disabled={busy} onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="mp-btn mp-accent"
            disabled={busy || name.trim() === ""}
            onClick={() => void submit()}
          >
            {t("save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
