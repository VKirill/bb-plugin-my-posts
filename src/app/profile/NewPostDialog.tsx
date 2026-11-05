import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "../i18n";
import { useMpRpc } from "../data";
import { useGo } from "../routes";
import type { Platform } from "../../shared/model";
import { PLATFORMS } from "../../shared/platforms";
import { canCreatePost, kindForNewPost } from "./model";
import { PlatformIcon } from "./icons";

const PLATFORM_KEYS = {
  telegram: "platformTelegram",
  x: "platformX",
  dzen: "platformDzen",
  vk: "platformVk",
} as const;

const HINT_KEYS = {
  telegram: "hintTelegram",
  x: "hintX",
  dzen: "hintDzen",
  vk: "hintVk",
} as const;

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
        ...(trimmed === "" ? {} : { brief: trimmed }),
      });
      onOpenChange(false);
      go({ kind: "post", postId: post.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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
          <span className="mp-seg" role="group">
            <button
              type="button"
              className="mp-seg-item mp-btn mp-ghost"
              aria-pressed={!article}
              onClick={() => setArticle(false)}
            >
              {t("kindPost")}
            </button>
            <button
              type="button"
              className="mp-seg-item mp-btn mp-ghost"
              aria-pressed={article}
              disabled={platform === "x"}
              onClick={() => setArticle(true)}
            >
              {t("kindArticle")}
            </button>
          </span>
        </DialogHeader>
        <div className="mp-plat-grid">
          {PLATFORMS.map((row) => {
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
                  if (row.id === "x") setArticle(false);
                }}
              >
                <PlatformIcon platform={row.id} label={t(PLATFORM_KEYS[row.id])} />
                <span>{t(PLATFORM_KEYS[row.id])}</span>
              </button>
            );
          })}
        </div>
        <p className="mp-plat-rules">{t(HINT_KEYS[platform])}</p>
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
        <DialogFooter>
          <button type="button" className="mp-btn mp-accent" disabled={busy || !allowed} onClick={() => void start()}>
            {t("startPost")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
