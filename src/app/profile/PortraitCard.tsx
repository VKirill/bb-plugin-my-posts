import type { ReactNode } from "react";
import { t, useLocale } from "../i18n";
import type { Profile } from "../../shared/model";
import { metricRows, portraitLayers, rulesLines } from "./model";
import { LayerPill } from "./pills";
import "./portrait.css";

const INLINE_MARKUP = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*)/u;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_MARKUP).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*\s][^*\n]*\*$/u.test(part)) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function PortraitCard({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const locale = useLocale();
  const layers = portraitLayers(profile);
  const rows = metricRows(profile.metrics, locale);
  const rules = rulesLines(profile.styleMd);

  return (
    <section className="mp-panel">
      <div className="mp-panel-head">{t("stylePortrait")}</div>
      <div className="mp-panel-body">
        <div className="mp-layer">
          <div className="mp-layer-head">
            <span className="mp-h2">{t("layerA")}</span>
            <LayerPill state={layers.a} />
          </div>
          {compact
            ? null
            : rows.map((row) => (
                <div key={row.label} className="mp-metric">
                  <span className="mp-metric-label">{row.label}</span>
                  <span className="mp-metric-value">{row.value}</span>
                </div>
              ))}
        </div>
        <div className="mp-layer">
          <div className="mp-layer-head">
            <span className="mp-h2">{t("layerB")}</span>
            <LayerPill state={layers.b} />
          </div>
          {compact
            ? null
            : profile.traits.map((trait) => (
                <span key={trait} className="mp-meta">
                  {renderInline(trait)}
                </span>
              ))}
        </div>
        <div className="mp-layer">
          <div className="mp-layer-head">
            <span className="mp-h2">{t("layerC")}</span>
            <LayerPill state={layers.c} />
          </div>
          {compact
            ? null
            : rules.map((line) => (
                <span key={line} className="mp-meta">
                  {renderInline(line)}
                </span>
              ))}
        </div>
      </div>
    </section>
  );
}
