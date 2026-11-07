import { DEFAULT_SETTINGS, type Language } from "../../shared/model";
import { t, useLocale, setLanguagePreference } from "../i18n";
import { useMpRpc, useSettings } from "../data";
import { Toggle } from "../ui/Segmented";
import { AgentModel } from "./AgentModel";
import "../profile/profile.css";

export function SettingsPage() {
  useLocale();
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
