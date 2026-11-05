import { useLayoutEffect, useRef, type RefObject } from "react";
import type { Platform } from "../../shared/model";
import { countChars, platformDef } from "../../shared/platforms";
import { t } from "../i18n";

export function fitTextarea(el: HTMLTextAreaElement): void {
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

export function Editor({
  platform,
  value,
  onChange,
  onSelection,
  cardRef,
}: {
  platform: Platform;
  value: string;
  onChange: (next: string) => void;
  onSelection: (text: string, rect: DOMRect | null, card: DOMRect | null) => void;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const def = platformDef(platform);
  const used = countChars(platform, value);
  const limit = def.limit;
  const over = limit !== null && used > limit;

  useLayoutEffect(() => {
    if (areaRef.current !== null) fitTextarea(areaRef.current);
  }, [value]);

  function emitSelection(): void {
    const area = areaRef.current;
    if (area === null) return;
    const text = area.value.slice(area.selectionStart, area.selectionEnd);
    onSelection(text, area.getBoundingClientRect(), cardRef.current?.getBoundingClientRect() ?? null);
  }

  function wrap(before: string, after: string): void {
    const area = areaRef.current;
    if (area === null) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const next = area.value.slice(0, start) + before + area.value.slice(start, end) + after + area.value.slice(end);
    onChange(next);
    queueMicrotask(() => {
      area.focus();
      area.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function link(): void {
    const href = globalThis.prompt(t("linkUrl"), "https://");
    if (href === null || href === "") return;
    wrap("[", `](${href})`);
  }

  return (
    <div className="mp-card mp-post-edcard" ref={cardRef}>
      <div className="mp-post-edwrap">
        <textarea
          ref={areaRef}
          className="mp-post-textarea"
          rows={1}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            fitTextarea(event.target);
          }}
          onSelect={emitSelection}
          onKeyUp={emitSelection}
          onMouseUp={emitSelection}
        />
      </div>
      <div className="mp-post-edtools">
        <button type="button" className="mp-btn sm icon ghost" aria-label="B" onClick={() => wrap("**", "**")}>
          B
        </button>
        <button type="button" className="mp-btn sm icon ghost" aria-label="I" onClick={() => wrap("*", "*")}>
          I
        </button>
        <button type="button" className="mp-btn sm icon ghost" aria-label="link" onClick={link}>
          🔗
        </button>
        <span className="mp-post-grow" />
        <span className={over ? "mp-pill mp-pill-danger" : "mp-pill mp-pill-muted"}>
          {limit === null ? String(used) : `${used} / ${limit}`}
        </span>
      </div>
    </div>
  );
}
