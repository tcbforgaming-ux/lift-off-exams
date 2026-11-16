import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";
import {
  fetchActiveBlueprints,
  generateCustomPractice,
  generateTestFromBlueprint,
  blueprintStrata,
  blueprintTopics,
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
  const [generationMode, setGenerationMode] = useState<"custom" | "blueprint">(
    "custom",
  );
  const [questionCount, setQuestionCount] = useState("");
  const [seed, setSeed] = useState("");
  const [category, setCategory] = useState("");
  const [difficulties, setDifficulties] = useState(["Easy", "Medium", "Hard"]);
  const [topics, setTopics] = useState<string[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [timer, setTimer] = useState("60");
  const [customMinutes, setCustomMinutes] = useState("60");
  const [showAnswers, setShowAnswers] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TestGenerationResult | null>(null);
  const idempotencyKey = useRef(newIdempotencyKey());

  const selectedBlueprint = useMemo(
    () => blueprints.find((blueprint) => blueprint.id === blueprintId) ?? null,
    [blueprintId, blueprints],
  );
  const availableTopics = useMemo(
    () => blueprintTopics(selectedBlueprint),
    [selectedBlueprint],
  );
  const allocations = blueprintStrata(selectedBlueprint);
  const preset = generationMode === "blueprint";
  const rankedTopics = useMemo(() => {
    const priority = new Map(weakTopics.map((tag, index) => [tag, index]));
    return [...availableTopics].sort(
      (a, b) => (priority.get(a) ?? Infinity) - (priority.get(b) ?? Infinity),
    );
  }, [availableTopics, weakTopics]);
  const categories = [
    ...new Set(blueprints.map((blueprint) => blueprint.category)),
  ].sort();

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
          setCategory(first.category);
          setTopics(blueprintTopics(first));
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

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await getSupabaseBrowserClient().rpc(
        "get_my_test_analytics_detail",
        { p_section: "recommendations" },
      );
      if (
        !active ||
        error ||
        !data ||
        typeof data !== "object" ||
        !("items" in data) ||
        !Array.isArray(data.items)
      )
        return;
      setWeakTopics(
        data.items.filter((topic): topic is string => typeof topic === "string"),
      );
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleBlueprintChange = (nextId: string) => {
    setBlueprintId(nextId);
    const nextBlueprint = blueprints.find((blueprint) => blueprint.id === nextId);
    setQuestionCount(nextBlueprint ? String(nextBlueprint.total_questions) : "");
    setTopics(blueprintTopics(nextBlueprint ?? null));
    setResult(null);
    setMessage(null);
    idempotencyKey.current = newIdempotencyKey();
  };

  const resetRequest = () => {
    idempotencyKey.current = newIdempotencyKey();
    setResult(null);
    setMessage(null);
  };

  const toggle = (value: string, items: string[], update: (next: string[]) => void) => {
    update(
      items.includes(value)
        ? items.filter((item) => item !== value)
        : [...items, value],
    );
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
      validateSeed(seed);
      if (preset) {
        setSubmitting(true);
        const generated = await generateTestFromBlueprint({
          blueprintId: selectedBlueprint.id,
          expectedVersion: selectedBlueprint.version,
          requestedCount: selectedBlueprint.total_questions,
          seed,
          idempotencyKey: idempotencyKey.current,
        });
        setResult(generated);
        setMessage(
          generated.success
            ? "Your test is ready."
            : "The active question bank cannot fill every blueprint allocation. Choose another blueprint or switch to Custom practice.",
        );
        return;
      }
      const requestedCount = parseRequestedQuestionCount(questionCount);
      if (difficulties.length === 0) throw new Error("Select at least one difficulty.");
      if (availableTopics.length > 0 && topics.length === 0)
        throw new Error("Select at least one topic.");
      const timerMinutes =
        timer === "none" ? null : Number(timer === "custom" ? customMinutes : timer);
      if (
        timerMinutes !== null &&
        (!Number.isInteger(timerMinutes) || timerMinutes < 1 || timerMinutes > 999)
      ) {
        throw new Error("Timer must be between 1 and 999 minutes.");
      }
      setSubmitting(true);
      const generated = await generateCustomPractice({
        blueprintId: selectedBlueprint.id,
        expectedVersion: selectedBlueprint.version,
        requestedCount,
        seed,
        idempotencyKey: idempotencyKey.current,
        difficulties,
        topicTags: topics,
        timerMinutes,
        showAnswers,
        showExplanations,
      });
      setResult(generated);

      if (generated.success) {
        setMessage("Your test is ready.");
      } else {
        setMessage(
          "Not enough eligible questions. Reduce the question count or adjust your topics and difficulty.",
        );
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
        <p className="eyebrow">Practice</p>
        <h1>Generate Test</h1>
      </header>

      <div className="generation-layout">
        <Card>
          <form
            className="form-stack"
            onChange={resetRequest}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <fieldset className="practice-options" disabled={submitting}>
              <legend>Generation mode</legend>
              <label>
                <input
                  type="radio"
                  name="generation-mode"
                  checked={!preset}
                  onChange={() => setGenerationMode("custom")}
                />{" "}
                Custom practice
              </label>
              <label>
                <input
                  type="radio"
                  name="generation-mode"
                  checked={preset}
                  onChange={() => setGenerationMode("blueprint")}
                />{" "}
                Blueprint exam
              </label>
            </fieldset>
            <label className="field-label" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              value={category}
              disabled={loading || submitting}
              onChange={(event) => {
                setCategory(event.target.value);
                handleBlueprintChange(
                  blueprints.find(
                    (blueprint) => blueprint.category === event.target.value,
                  )?.id ?? "",
                );
              }}
            >
              {categories.length === 0 && (
                <option value="">No active categories</option>
              )}
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
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
              {blueprints
                .filter((blueprint) => blueprint.category === category)
                .map((blueprint) => (
                  <option key={blueprint.id} value={blueprint.id}>
                    {blueprint.blueprint_name} - {blueprint.version}
                  </option>
                ))}
            </select>

            {!preset && (
              <>
                <fieldset className="practice-options" disabled={submitting}>
                  <legend>Difficulty</legend>
                  {(["Easy", "Medium", "Hard"] as const).map((value) => (
                    <label key={value}>
                      <input
                        type="checkbox"
                        checked={difficulties.includes(value)}
                        onChange={() => toggle(value, difficulties, setDifficulties)}
                      />
                      {value}
                    </label>
                  ))}
                </fieldset>
                <fieldset className="practice-options" disabled={submitting}>
                  <legend>Topic Tags</legend>
                  {rankedTopics.map((value) => (
                    <label key={value}>
                      <input
                        type="checkbox"
                        checked={topics.includes(value)}
                        onChange={() => toggle(value, topics, setTopics)}
                      />
                      {value}
                      {weakTopics.includes(value) && <small> · Needs practice</small>}
                    </label>
                  ))}
                  {availableTopics.length === 0 && (
                    <span className="muted">All topics in this blueprint</span>
                  )}
                </fieldset>

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

                <label className="field-label" htmlFor="timer">
                  Timer
                </label>
                <select
                  id="timer"
                  value={timer}
                  disabled={submitting}
                  onChange={(event) => setTimer(event.target.value)}
                >
                  <option value="60">60 minutes</option>
                  <option value="none">No timer</option>
                  <option value="custom">Custom</option>
                </select>
                {timer === "custom" && (
                  <>
                    <label className="field-label" htmlFor="timer-minutes">
                      Minutes
                    </label>
                    <input
                      id="timer-minutes"
                      type="number"
                      min="1"
                      max="999"
                      step="1"
                      value={customMinutes}
                      disabled={submitting}
                      onChange={(event) => setCustomMinutes(event.target.value)}
                    />
                  </>
                )}
                <fieldset className="practice-options" disabled={submitting}>
                  <legend>Study Mode</legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={showAnswers}
                      onChange={(event) => setShowAnswers(event.target.checked)}
                    />
                    Show answers after answering
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={showExplanations}
                      onChange={(event) => setShowExplanations(event.target.checked)}
                    />
                    Show explanations after answering
                  </label>
                </fieldset>
                <p className="field-help">Study mode requires premium access.</p>
              </>
            )}

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
              <dt>Questions</dt>
              <dd>
                {preset
                  ? (selectedBlueprint?.total_questions ?? "-")
                  : questionCount || "-"}
              </dd>
            </div>
            <div>
              <dt>Topics</dt>
              <dd>{(preset ? allocations.length : topics.length) || "All"}</dd>
            </div>
            <div>
              <dt>Timer</dt>
              <dd>
                {preset
                  ? "60 minutes"
                  : timer === "none"
                    ? "None"
                    : `${timer === "custom" ? customMinutes : timer} minutes`}
              </dd>
            </div>
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
          {preset && allocations.length > 0 && (
            <table className="detail-list" aria-label="Blueprint allocations">
              <thead>
                <tr>
                  <th scope="col">Topic</th>
                  <th scope="col">Questions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((row) => (
                  <tr key={row.id}>
                    <td>{row.tags.join(" + ") || row.id}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                <strong>
                  {allocations
                    .find((row) => row.id === item.stratum_id)
                    ?.tags.join(" + ") || item.stratum_id}
                </strong>
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
