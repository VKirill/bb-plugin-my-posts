import { t } from "../i18n";
import type { Profile } from "../../shared/model";
import { portraitLayers } from "./model";
import { LayerPill } from "./pills";

export function PortraitCard({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const layers = portraitLayers(profile);
  const metricEntries = Object.entries(profile.metrics).slice(0, 6);

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
            : metricEntries.map(([key, value]) => (
                <span key={key} className="mp-meta">
                  {key}: {typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value)}
                </span>
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
