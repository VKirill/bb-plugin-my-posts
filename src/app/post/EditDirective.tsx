import { useState } from "react";
import type { PluginMessageDirectiveProps } from "@get-bb/plugin-sdk/app";
import { errorText, useMpRpc } from "../data";
import { t } from "../i18n";
import { usePostScreen } from "./context";

export function EditDirective(props: PluginMessageDirectiveProps) {
  const screen = usePostScreen();
  const rpc = useMpRpc();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = props.attributes.id ?? "";
  const proposal = screen?.proposals.find((row) => row.id === id) ?? null;

  if (proposal === null) {
    return <p className="text-sm text-muted-foreground">{t("editDirectiveHint")}</p>;
  }

  async function run(kind: "apply" | "reject"): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (kind === "apply") await rpc.call("proposal_apply", { id });
      else await rpc.call("proposal_reject", { id });
      screen?.refetch();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  const done = proposal.status !== "pending";
  return (
    <div className="mp-post-proposal">
      <div className="mp-post-proposal-row">
        <span className="mp-post-rules">{t("before")}</span>
        <div>
          <del>{proposal.before}</del>
        </div>
      </div>
      <div className="mp-post-proposal-row">
        <span className="mp-post-rules">{t("after")}</span>
        <div>
          <ins>{proposal.after}</ins>
        </div>
        {proposal.note !== "" ? <p className="mp-post-rules">{proposal.note}</p> : null}
      </div>
      <div className="mp-post-proposal-actions">
        {done ? (
          <span className={proposal.status === "applied" ? "mp-pill mp-pill-success" : "mp-pill mp-pill-muted"}>
            {proposal.status === "applied" ? t("proposalApplied") : t("proposalRejected")}
          </span>
        ) : (
          <>
            <button type="button" className="mp-btn sm mp-post-accent" disabled={busy} onClick={() => void run("apply")}>
              {t("apply")}
            </button>
            <button type="button" className="mp-btn sm ghost" disabled={busy} onClick={() => void run("reject")}>
              {t("reject")}
            </button>
          </>
        )}
      </div>
      {error !== null ? <p className="mp-post-error" style={{ padding: "0 12px 8px" }}>{error}</p> : null}
    </div>
  );
}
