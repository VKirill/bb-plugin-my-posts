import type { PluginMessageDirectiveProps } from "@get-bb/plugin-sdk/app";
import { t } from "../i18n";

export function EditDirective(_props: PluginMessageDirectiveProps) {
  return <p className="text-sm text-muted-foreground">{t("editDirectiveHint")}</p>;
}
