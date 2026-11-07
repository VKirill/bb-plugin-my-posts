import type { RefObject } from "react";
import { t } from "../i18n";
import type { SelectionAction } from "./layout";

export function SelectionToolbar({
  hidden,
  left,
  top,
  toolbarRef,
  onAction,
  onAsk,
}: {
  hidden: boolean;
  left: number;
  top: number;
  toolbarRef?: RefObject<HTMLDivElement | null>;
  onAction: (action: SelectionAction) => void;
  onAsk: () => void;
}) {
  return (
    <div
      ref={toolbarRef}
      className="mp-post-sel"
      role="toolbar"
      aria-label={t("selectionTools")}
      hidden={hidden}
      style={{ left, top }}
    >
      <button type="button" className="mp-btn sm ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => onAction("shorter")}>
        {t("shorter")}
      </button>
      <button type="button" className="mp-btn sm ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => onAction("sharper")}>
        {t("sharper")}
      </button>
      <button type="button" className="mp-btn sm ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => onAction("voice")}>
        {t("inProfileVoice")}
      </button>
      <button type="button" className="mp-btn sm ghost" onMouseDown={(event) => event.preventDefault()} onClick={onAsk}>
        {t("ask")}
      </button>
    </div>
  );
}
