import type { ReactElement, ReactNode } from "react";
import type { Platform, Tweet } from "../../shared/model";
import { readingMinutes } from "../../shared/platforms";
import { t } from "../i18n";
import { Toggle } from "../ui/Segmented";
import { initials } from "../profile/model";

type PreviewProps = {
  platform: Platform;
  title: string;
  body: string;
  tweets: Tweet[];
  profileName: string;
  previewLang: "en" | "ru";
  onPreviewLang: (lang: "en" | "ru") => void;
  timeLabel: string;
};

const PREVIEWS: Record<Platform, (props: PreviewProps) => ReactElement> = {
  telegram: (props) => <TelegramPreview name={props.profileName} body={props.body} timeLabel={props.timeLabel} />,
  x: (props) => (
    <XPreview name={props.profileName} tweets={props.tweets} lang={props.previewLang} onLang={props.onPreviewLang} />
  ),
  dzen: (props) => <DzenPreview title={props.title} body={props.body} />,
  vk: (props) => <VkPreview name={props.profileName} body={props.body} />,
};

export function Preview(props: PreviewProps) {
  const PreviewForPlatform = PREVIEWS[props.platform];
  return (
    <div className="mp-col">
      <PreviewForPlatform {...props} />
      <p className="mp-post-rules mp-preview-note">
        {t("previewNote")}
      </p>
    </div>
  );
}

function TelegramPreview({ name, body, timeLabel }: { name: string; body: string; timeLabel: string }) {
  return (
    <div className="mp-post-phone">
      <div className="mp-post-phone-hd">
        <span className="mp-post-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
          {initials(name)}
        </span>
        <span className="mp-post-grow">
          <b style={{ fontSize: 13, fontWeight: 600 }}>{name}</b>
        </span>
      </div>
      <div className="mp-post-bubble">
        {formatMarkup(body)}
        <div className="mp-post-bubble-ft">{timeLabel}</div>
      </div>
    </div>
  );
}

function XPreview({
  name,
  tweets,
  lang,
  onLang,
}: {
  name: string;
  tweets: Tweet[];
  lang: "en" | "ru";
  onLang: (lang: "en" | "ru") => void;
}) {
  return (
    <>
      <div className="mp-post-meta mp-post-meta-center">
        <Toggle
          label={t("langEn")}
          size="sm"
          value={lang}
          onChange={onLang}
          items={[
            { id: "en", label: t("langEn") },
            { id: "ru", label: t("langRu") },
          ]}
        />
      </div>
      <div className="mp-post-xprev">
        {tweets.map((tweet, index) => (
          <article key={index} className="mp-post-xcard">
            <div className="mp-post-meta mp-xcard-meta">
              <span className="mp-post-avatar">{initials(name)}</span>
              <b style={{ fontSize: 13 }}>{name}</b>
            </div>
            {tweet[lang]}
          </article>
        ))}
      </div>
    </>
  );
}

function DzenPreview({ title, body }: { title: string; body: string }) {
  const minutes = readingMinutes(body);
  const blocks = splitDzen(body);
  return (
    <article className="mp-card mp-post-edcard mp-post-dzen">
      <h1 className="mp-dzen-title">{title}</h1>
      <p className="mp-post-rules mp-dzen-read">
        {t("readingMinutes", { n: minutes })}
      </p>
      {blocks.map((block, index) =>
        block.kind === "h2" ? <h2 key={index}>{block.text}</h2> : <p key={index}>{block.text}</p>,
      )}
    </article>
  );
}

function VkPreview({ name, body }: { name: string; body: string }) {
  return (
    <article className="mp-card mp-post-edcard mp-post-vk">
      <div className="mp-post-meta mp-vk-meta">
        <span className="mp-post-avatar">{initials(name)}</span>
        <b>{name}</b>
      </div>
      {body.split(/\n{2,}/u).map((para, index) => (
        <p key={index}>{para}</p>
      ))}
    </article>
  );
}

function splitDzen(body: string): { kind: "h2" | "p"; text: string }[] {
  const out: { kind: "h2" | "p"; text: string }[] = [];
  for (const chunk of body.split(/\n+/u)) {
    const trimmed = chunk.trim();
    if (trimmed === "") continue;
    const heading = trimmed.match(/^##\s+(.*)$/u);
    out.push(heading === null ? { kind: "p", text: trimmed } : { kind: "h2", text: heading[1] ?? trimmed });
  }
  return out;
}

function formatMarkup(source: string): ReactNode {
  const paragraphs = source.split(/\n{2,}/u);
  return paragraphs.map((para, index) => <p key={index}>{inlineMarkup(para.replaceAll("\n", " "))}</p>);
}

function inlineMarkup(source: string): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/gu;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > last) parts.push(source.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("[")) {
      parts.push(
        <a key={key} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>,
      );
    } else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    key += 1;
    last = match.index + token.length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return parts;
}

export { initials };
