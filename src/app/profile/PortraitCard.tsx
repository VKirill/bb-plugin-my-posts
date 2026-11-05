import { t, useLocale } from "../i18n";
import type { Profile } from "../../shared/model";
import { metricRows, portraitLayers } from "./model";
import { LayerPill } from "./pills";

export function PortraitCard({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const locale = useLocale();
  const layers = portraitLayers(profile);
  const rows = metricRows(profile.metrics, locale);

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
                  {trait}
                </span>
              ))}
        </div>
        <div className="mp-layer">
          <div className="mp-layer-head">
            <span className="mp-h2">{t("layerC")}</span>
            <LayerPill state={layers.c} />
          </div>
        </div>
      </div>
    </section>
  );
}
