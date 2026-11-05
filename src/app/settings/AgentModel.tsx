import { experimental_ProviderModelPicker as ProviderModelPicker } from "@get-bb/plugin-sdk/app";
import { t } from "../i18n";
import { useMpRpc, useSettings } from "../data";
import { fromPickerValue, toPickerValue } from "./model-value";

const FALLBACK = { providerId: "claude-code", model: "claude-opus-5-5", projectId: null } as const;

export function AgentModel() {
  const rpc = useMpRpc();
  const settings = useSettings();
  const current = settings.data ?? FALLBACK;

  return (
    <div className="mp-rail-footer">
      <div className="mp-menu-label">{t("agentModel")}</div>
      <ProviderModelPicker
        value={toPickerValue(current)}
        onChange={(value) => {
          void rpc.call("settings_set", fromPickerValue(current, value)).then(() => settings.refetch());
        }}
      />
    </div>
  );
}
