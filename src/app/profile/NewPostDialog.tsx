import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { platformHint, platformLabel, t, useLocale } from "../i18n";
import { errorText, useMpRpc } from "../data";
import { useGo } from "../routes";
import type { Platform } from "../../shared/model";
import { PLATFORM_LIST } from "../../shared/platforms";
import { canCreatePost, kindForNewPost } from "./model";
import { PlatformIcon } from "./icons";
import { Toggle } from "../ui/Segmented";

export function NewPostDialog({
  open,
  onOpenChange,
  profileId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
}) {
  const rpc = useMpRpc();
  const go = useGo();
  const locale = useLocale();
  const [platform, setPlatform] = useState<Platform>("telegram");
  const [article, setArticle] = useState(false);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const kind = kindForNewPost(platform, article);
  const allowed = canCreatePost(platform, kind);

  async function start() {
    if (!allowed) return;
    setBusy(true);
    setError(null);
    try {
      const trimmed = brief.trim();
      const post = await rpc.call("post_create", {
        profileId,
        platform,
        kind,
        locale,
        ...(trimmed === "" ? {} : { brief: trimmed }),
      });
      onOpenChange(false);
      go({ kind: "post", postId: post.id });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="mp-portal">
        <DialogHeader className="flex-row items-center gap-2">
          <DialogTitle>{t("newPostTitle")}</DialogTitle>
          <span className="mp-grow" />
          <Toggle
            label={t("kindPost")}
            value={article ? "article" : "post"}
            onChange={(id) => setArticle(id === "article")}
            items={[
              { id: "post", label: t("kindPost") },
              { id: "article", label: t("kindArticle"), disabled: !canCreatePost(platform, "article") },
            ]}
          />
        </DialogHeader>
        <div className="mp-plat-grid">
          {PLATFORM_LIST.map((row) => {
            const disabled = article && !canCreatePost(row.id, "article");
            return (
              <button
                key={row.id}
                type="button"
                className="mp-plat-btn"
                aria-pressed={platform === row.id}
                disabled={disabled}
                onClick={() => {
                  setPlatform(row.id);
                  if (!canCreatePost(row.id, "article")) setArticle(false);
                }}
              >
                <PlatformIcon platform={row.id} label={platformLabel(row.id)} />
                <span>{platformLabel(row.id)}</span>
              </button>
            );
          })}
        </div>
        <p className="mp-plat-rules">{platformHint(platform)}</p>
        <div className="mp-field">
          <label htmlFor="mp-brief">{t("briefLabel")}</label>
          <textarea
            id="mp-brief"
            className="mp-textarea"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder={t("briefHint")}
          />
        </div>
        {error !== null ? <p className="mp-error">{error}</p> : null}
        <DialogFooter className="gap-2 sm:justify-end">
          <button type="button" className="mp-btn mp-ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </button>
          <button type="button" className="mp-btn mp-accent" disabled={busy || !allowed} onClick={() => void start()}>
            {t("startPost")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
