import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { moderationRpc } from "../../lib/auth/moderation";
export function ReportPrioritySettings() {
  const [config, setConfig] = useState<{ threshold: number; version: number }>();
  const [value, setValue] = useState("3");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void moderationRpc<{ threshold: number; version: number }>(
      "get_report_priority_config",
    )
      .then((c) => {
        if (live) {
          setConfig(c);
          setValue(String(c.threshold));
        }
      })
      .catch((e: unknown) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Priority settings could not load.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <form
      className="repository-filters"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void moderationRpc<{ threshold: number; version: number }>(
          "set_report_priority_config",
          { p_threshold: Number(value), p_version: config?.version, p_reason: reason },
        )
          .then((c) => {
            setConfig(c);
            setReason("");
            window.dispatchEvent(new Event("report-priority-changed"));
          })
          .catch((e: unknown) =>
            setError(
              e instanceof Error ? e.message : "Priority settings could not save.",
            ),
          )
          .finally(() => setBusy(false));
      }}
    >
      <label className="field-label">
        High-priority report threshold
        <input
          type="number"
          min={1}
          max={10000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <label className="field-label">
        Priority change reason
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
        />
      </label>
      <Button type="submit" disabled={!config || busy || reason.trim().length < 5}>
        Save Priority
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
