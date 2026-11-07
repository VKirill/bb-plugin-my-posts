import { DEFAULT_SETTINGS, type Language } from "../../shared/model";
import { t, useLocale, setLanguagePreference } from "../i18n";
import { useMpRpc, useSettings } from "../data";
import { useGo } from "../routes";
import { Toggle } from "../ui/Segmented";
import { AgentModel } from "./AgentModel";
import "../profile/profile.css";

function useGoHome() {
  try {
    return useGo();
  } catch {
    return () => undefined;
  }
}

export function SettingsPage() {
  useLocale();
  const go = useGoHome();
  const rpc = useMpRpc();
  const settings = useSettings();
  const language = settings.data?.language ?? DEFAULT_SETTINGS.language;

  function onLanguage(next: Language): void {
    setLanguagePreference(next);
    rpc.call("settings_set", { language: next }).then(() => settings.refetch());
  }

  return (
    <div className="mp-centre">
      <div className="mp-head">
        <button
          type="button"
          className="mp-btn"
          onClick={() => go({ kind: "home" })}
        >
          {t("back")}
        </button>
        <h1 className="mp-h1">{t("settings")}</h1>
      </div>
      <div className="mp-body">
        <section className="mp-panel">
          <div className="mp-panel-head">{t("language")}</div>
          <div className="mp-panel-body">
            <Toggle
              label={t("language")}
              value={language}
              onChange={onLanguage}
              items={[
                { id: "auto", label: "Авто" },
                { id: "ru", label: "Русский" },
                { id: "en", label: "English" },
              ]}
            />
          </div>
        </section>
        <section className="mp-panel">
          <div className="mp-panel-body">
            <AgentModel />
          </div>
        </section>
      </div>
    </div>
  );
}
