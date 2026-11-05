import { useRef } from "react";
import { emptyTweet, type Tweet } from "../../shared/model";
import { countChars, platformDef } from "../../shared/platforms";
import { t } from "../i18n";

const MAX = platformDef("x").maxTweets ?? 25;

export function XTwins({
  tweets,
  keepInSync,
  onKeepInSync,
  onChange,
  onUpdateRu,
  onSelection,
}: {
  tweets: Tweet[];
  keepInSync: boolean;
  onKeepInSync: (next: boolean) => void;
  onChange: (tweets: Tweet[], changedIndex: number, lang: "en" | "ru") => void;
  onUpdateRu: (index: number) => void;
  onSelection: (text: string, rect: DOMRect | null, card: DOMRect | null) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function patch(index: number, lang: "en" | "ru", value: string): void {
    const next = tweets.map((tweet, i) => (i === index ? { ...tweet, [lang]: value } : tweet));
    onChange(next, index, lang);
  }

  function emit(area: HTMLTextAreaElement): void {
    const text = area.value.slice(area.selectionStart, area.selectionEnd);
    onSelection(text, area.getBoundingClientRect(), cardRef.current?.getBoundingClientRect() ?? null);
  }

  return (
    <div className="mp-post-x" ref={cardRef} style={{ display: "flex", flexDirection: "column", gap: "var(--mp-s2)" }}>
      <div className="mp-post-meta">
        <span style={{ fontWeight: 600 }}>{t("tweet")}</span>
        <span className="mp-post-grow" />
        <label className="mp-post-saved" style={{ gap: 6 }}>
          <input type="checkbox" checked={keepInSync} onChange={(event) => onKeepInSync(event.target.checked)} />
          {t("keepInSync")}
        </label>
      </div>
      {tweets.map((tweet, index) => (
        <article key={index} className="mp-post-tweet">
          <div className="mp-post-tweet-head">
            {t("tweet")} {index + 1}
          </div>
          <div className="mp-post-twins">
            <Twin
              lang="en"
              value={tweet.en}
              onChange={(value) => patch(index, "en", value)}
              onSelect={emit}
            />
            <Twin
              lang="ru"
              value={tweet.ru}
              stale={tweet.ruStale}
              onChange={(value) => patch(index, "ru", value)}
              onSelect={emit}
              onUpdateRu={() => onUpdateRu(index)}
            />
          </div>
        </article>
      ))}
      {tweets.length < MAX ? (
        <button
          type="button"
          className="mp-btn sm ghost"
          style={{ alignSelf: "flex-start" }}
          onClick={() => onChange([...tweets, emptyTweet()], tweets.length, "en")}
        >
          {t("addTweet")}
        </button>
      ) : null}
      <p className="mp-post-rules" style={{ margin: 0 }}>
        {t("tweetCountNote")}
      </p>
    </div>
  );
}

function Twin({
  lang,
  value,
  stale,
  onChange,
  onSelect,
  onUpdateRu,
}: {
  lang: "en" | "ru";
  value: string;
  stale?: boolean;
  onChange: (value: string) => void;
  onSelect: (area: HTMLTextAreaElement) => void;
  onUpdateRu?: () => void;
}) {
  const used = countChars("x", value);
  const over = used > 280;
  return (
    <div className="mp-post-twin">
      <div className="mp-post-twin-head">
        <span className="mp-pill mp-pill-neutral">{lang === "en" ? t("langEn") : t("langRu")}</span>
        <span className="mp-post-grow" />
        <span className={over ? "mp-pill mp-pill-danger" : "mp-pill mp-pill-muted"}>{used} / 280</span>
      </div>
      <textarea
        className="mp-post-textarea"
        style={{ minHeight: 96 }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={(event) => onSelect(event.currentTarget)}
        onKeyUp={(event) => onSelect(event.currentTarget)}
        onMouseUp={(event) => onSelect(event.currentTarget)}
      />
      {stale === true ? (
        <div className="mp-post-sync">
          <span className="mp-pill mp-pill-warning">{t("ruBehind")}</span>
          <button type="button" className="mp-btn sm ghost" onClick={onUpdateRu}>
            {t("updateRu")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
