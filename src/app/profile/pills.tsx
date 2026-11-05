import { t } from "../i18n";
import type { PostStatus, ProfileStatus } from "../../shared/model";
import type { LayerState } from "./model";

export function ProfileStatusPill({ status }: { status: ProfileStatus }) {
  if (status === "ready") return <span className="mp-pill mp-pill-success">{t("statusReady")}</span>;
  if (status === "building") return <span className="mp-pill mp-pill-info">{t("statusBuilding")}</span>;
  return <span className="mp-pill mp-pill-warning">{t("tooFewTexts")}</span>;
}

export function PostStatusPill({ status }: { status: PostStatus }) {
  if (status === "writing") return <span className="mp-pill mp-pill-info">{t("statusWriting")}</span>;
  if (status === "ready") return <span className="mp-pill mp-pill-success">{t("statusReady")}</span>;
  if (status === "published") return <span className="mp-pill mp-pill-muted">{t("statusPublished")}</span>;
  return <span className="mp-pill mp-pill-muted">{t("statusDraft")}</span>;
}

export function LayerPill({ state }: { state: LayerState }) {
  if (state === "ready") return <span className="mp-pill mp-pill-success">{t("layerReady")}</span>;
  if (state === "running") return <span className="mp-pill mp-pill-info">{t("layerRunning")}</span>;
  return <span className="mp-pill mp-pill-muted">{t("layerWaiting")}</span>;
}
