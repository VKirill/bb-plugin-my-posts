import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { t } from "../i18n";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialogBody({
  title,
  text,
  confirmLabel,
  danger,
  busy,
  error,
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, "open">) {
  return (
    <div>
      <h2 className="mp-h1">{title}</h2>
      <p className="mp-meta">{text}</p>
      {error !== null && error !== undefined && error !== "" ? <p className="mp-error">{error}</p> : null}
      <DialogFooter className="gap-2 sm:justify-end">
        <button type="button" className="mp-btn mp-ghost" disabled={busy} onClick={onCancel}>
          {t("cancel")}
        </button>
        <button
          type="button"
          className={danger === true ? "mp-btn mp-danger-btn" : "mp-btn mp-accent"}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </DialogFooter>
    </div>
  );
}

export function ConfirmDialog({ open, onCancel, ...body }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent hideCloseButton className="mp-portal">
        <ConfirmDialogBody onCancel={onCancel} {...body} />
      </DialogContent>
    </Dialog>
  );
}
