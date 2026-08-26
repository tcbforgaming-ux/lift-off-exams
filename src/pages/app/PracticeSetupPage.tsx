import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  fetchActiveBlueprints,
  generateTestFromBlueprint,
  parseRequestedQuestionCount,
  validateSeed,
  type TestBlueprintSummary,
  type TestGenerationResult,
} from "../../lib/tests/generation";

function newIdempotencyKey() {
  return globalThis.crypto.randomUUID();
}

export function PracticeSetupPage() {
  const [blueprints, setBlueprints] = useState<TestBlueprintSummary[]>([]);
  const [blueprintId, setBlueprintId] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TestGenerationResult | null>(null);
  const idempotencyKey = useRef(newIdempotencyKey());

  const selectedBlueprint = useMemo(
    () => blueprints.find((blueprint) => blueprint.id === blueprintId) ?? null,
    [blueprintId, blueprints],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchActiveBlueprints()
      .then((rows) => {
        if (!active) return;
        setBlueprints(rows);
        const first = rows[0];
        if (first) {
          setBlueprintId(first.id);
          setQuestionCount(String(first.total_questions));
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(
          error instanceof Error ? error.message : "Blueprints could not load.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleBlueprintChange = (nextId: string) => {
    setBlueprintId(nextId);
    const nextBlueprint = blueprints.find((blueprint) => blueprint.id === nextId);
    setQuestionCount(nextBlueprint ? String(nextBlueprint.total_questions) : "");
    setResult(null);
    setMessage(null);
    idempotencyKey.current = newIdempotencyKey();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setResult(null);

    if (!selectedBlueprint) {
      setMessage("Select an approved blueprint.");
      return;
    }

    try {
      const requestedCount = parseRequestedQuestionCount(questionCount);
      validateSeed(seed);
      setSubmitting(true);
      const generated = await generateTestFromBlueprint({
        blueprintId: selectedBlueprint.id,
        expectedVersion: selectedBlueprint.version,
        requestedCount,
        seed,
        idempotencyKey: idempotencyKey.current,
      });
      setResult(generated);

      if (generated.success) {
        setMessage("Your deterministic test definition is ready.");
      } else {
        setMessage("The approved blueprint cannot be satisfied by the active pool.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test generation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Deterministic generation</p>
        <h1>Practice Setup</h1>
        <p>
          Generate a persistent Test ID from an approved blueprint. Selection and
          ordering happen securely on the server.
        </p>
      </header>

      <div className="generation-layout">
        <Card>
          <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
            <label className="field-label" htmlFor="blueprint">
              Blueprint
            </label>
            <select
              id="blueprint"
              value={blueprintId}
              disabled={loading || submitting}
              onChange={(event) => handleBlueprintChange(event.target.value)}
            >
              {blueprints.length === 0 && (
                <option value="">No active blueprints</option>
              )}
              {blueprints.map((blueprint) => (
                <option key={blueprint.id} value={blueprint.id}>
                  {blueprint.blueprint_name} - {blueprint.version}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="question-count">
              Questions
            </label>
            <input
              id="question-count"
              type="number"
              min="1"
              max="250"
              step="1"
              inputMode="numeric"
              value={questionCount}
              disabled={submitting}
              onChange={(event) => setQuestionCount(event.target.value)}
            />
            <p className="field-help">
              Approved blueprint total: {selectedBlueprint?.total_questions ?? "-"}
            </p>

            <label className="field-label" htmlFor="seed">
              Seed
            </label>
            <input
              id="seed"
              value={seed}
              maxLength={128}
              disabled={submitting}
              placeholder="Leave empty to generate securely"
              onChange={(event) => setSeed(event.target.value)}
            />
            <p className="field-help">
              Leading zeros are preserved. The same seed and eligible pool reproduce the
              same ordered questions.
            </p>

            <Button
              type="submit"
              disabled={loading || submitting || !selectedBlueprint}
            >
              {submitting ? "Generating…" : "Generate Test"}
            </Button>
          </form>
        </Card>

        <aside className="generation-summary" aria-label="Blueprint summary">
          <p className="eyebrow">Approved blueprint</p>
          <h2>{selectedBlueprint?.blueprint_name ?? "Select a blueprint"}</h2>
          <dl className="detail-list">
            <div>
              <dt>Category</dt>
              <dd>{selectedBlueprint?.category ?? "-"}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{selectedBlueprint?.level ?? "-"}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{selectedBlueprint?.version ?? "-"}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {message && (
        <p
          className={`form-message ${result?.success ? "form-message-success" : "form-message-error"}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {result?.success && result.test_id && (
        <Card className="test-id-success">
          <p className="eyebrow">Test ready</p>
          <h2>{result.test_id}</h2>
          <p className="muted">
            {result.selected_count} ordered questions · {result.algorithm_version}
          </p>
          <Link
            className="button button-primary"
            to={`/test-id?code=${result.test_id}`}
          >
            View Test ID
          </Link>
        </Card>
      )}

      {result && !result.success && (
        <Card>
          <h2>Question pool shortage</h2>
          <div className="shortage-list">
            {(result.shortage.unsatisfied_strata ?? []).map((item) => (
              <div key={item.stratum_id}>
                <strong>{item.stratum_id}</strong>
                <span>
                  {item.available} of {item.requested} available
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
