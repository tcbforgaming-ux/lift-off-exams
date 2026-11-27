import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../app/urlPaths";
import { Button } from "../../components/ui/Button";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Finding = { id: string; question_text: string; score: number; created_at: string };
type Evidence = {
  matches: Finding[];
  basis: string;
  overflow: boolean;
  decision: string | null;
};
const decisions = [
  ["keep", "Keep Candidate"],
  ["edit", "Request Edit"],
  ["cancel", "Cancel Candidate"],
] as const;

export function CandidateSimilarityPanel({
  id,
  revision,
  prompt,
  createdAt,
  reviewable,
  onDecision,
}: {
  id: string;
  revision: number;
  prompt: string;
  createdAt: string;
  reviewable: boolean;
  onDecision: () => void;
}) {
  const [evidence, setEvidence] = useState<Evidence>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await getSupabaseBrowserClient().rpc(
          "get_candidate_similarity",
          { p_id: id },
        );
        if (result.error) throw new Error(result.error.message);
        if (active) setEvidence(result.data as unknown as Evidence);
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "Duplicate check failed.");
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);
  async function decide(action: string) {
    if (pending || !evidence) return;
    setPending(true);
    setError("");
    const signature = JSON.stringify([evidence.basis, action, reason.trim()]);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await getSupabaseBrowserClient().rpc(
        "decide_candidate_similarity",
        {
          p_id: id,
          p_revision: revision,
          p_basis: evidence.basis,
          p_decision: action,
          p_reason: reason,
          p_key: request.current.key,
        },
      );
      if (result.error) throw new Error(result.error.message);
      onDecision();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Duplicate decision failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="page-stack" aria-labelledby="similarity-title">
      <h2 id="similarity-title">Near-Duplicate Review</h2>
      {error && <p role="alert">{error}</p>}
      {!error && !evidence && (
        <p role="status">Checking similar published questions…</p>
      )}
      {evidence && evidence.matches.length === 0 && <p>No near matches found.</p>}
      {evidence && evidence.matches.length > 0 && (
        <>
          <div>
            <strong>Candidate question</strong>
            <p>{prompt}</p>
            <time dateTime={createdAt}>{new Date(createdAt).toLocaleString()}</time>
          </div>
          <ol>
            {evidence.matches.slice(0, 10).map((match) => (
              <li key={match.id}>
                <Link to={`${paths.adminQuestions}?question=${match.id}`}>
                  {match.question_text}
                </Link>
                <p>
                  {(match.score * 100).toFixed(1)}% similarity ·{" "}
                  <time dateTime={match.created_at}>
                    {new Date(match.created_at).toLocaleString()}
                  </time>
                </p>
              </li>
            ))}
          </ol>
          {evidence.overflow && (
            <p>More than ten matches. Edit or cancel before publication.</p>
          )}
          {evidence.decision && <p>Recorded decision: {evidence.decision}</p>}
          {reviewable && !evidence.decision && (
            <div>
              <label className="field-label">
                Duplicate decision reason
                <textarea
                  value={reason}
                  maxLength={1000}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className="button-row">
                {decisions.map(([action, label]) => (
                  <Button
                    key={action}
                    type="button"
                    variant="secondary"
                    disabled={
                      pending ||
                      reason.trim().length < 5 ||
                      (action === "keep" && evidence.overflow)
                    }
                    onClick={() => void decide(action)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
