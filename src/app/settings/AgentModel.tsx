import { experimental_ProviderModelPicker as ProviderModelPicker } from "@get-bb/plugin-sdk/app";
import { t } from "../i18n";
import { useMpRpc, useSettings } from "../data";
import { DEFAULT_SETTINGS } from "../../shared/model";
import { fromPickerValue, toPickerValue } from "./model-value";

export function AgentModel() {
  const rpc = useMpRpc();
  const settings = useSettings();
  const current = settings.data ?? DEFAULT_SETTINGS;

  return (
    <div>
      <div className="mp-menu-label">{t("agentModel")}</div>
      <ProviderModelPicker
        value={toPickerValue(current)}
        onChange={(value) => {
          rpc.call("settings_set", fromPickerValue(current, value)).then(() => settings.refetch());
        }}
      />
    </div>
  );
}
