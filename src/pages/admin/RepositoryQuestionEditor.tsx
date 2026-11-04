import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { parseAnswerOptions } from "../../lib/sessions/session";
import { repositoryQuestionRequest } from "../../lib/questions/repository";

type Question = {
  question_text: string;
  explanation: string | null;
  performance_indicator: string | null;
  partition_key: string;
  question_type: string;
  difficulty: string;
  correct_option_id: string;
  options: unknown;
  tags: string[];
  updated_at: string;
  lifecycle_state: string;
};
const partitions = [
  "Business Administration Core",
  "Marketing",
  "Finance",
  "Business Management and Administration",
  "Hospitality and Tourism",
  "Entrepreneurship",
];
function draftFor(q: Question) {
  const options = parseAnswerOptions(q.options);
  return {
    question_text: q.question_text,
    explanation: q.explanation ?? "",
    performance_indicator: q.performance_indicator ?? "",
    partition_key: q.partition_key,
    question_type: q.question_type,
    difficulty: q.difficulty,
    correct_option_id: q.correct_option_id,
    options: ["A", "B", "C", "D"].map((id) => ({
      id,
      text: options.find((o) => o.id === id)?.text ?? "",
    })),
    tags: q.tags.join(", "),
  };
}
export function RepositoryQuestionEditor({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof draftFor> | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setSaved(false);
    void repositoryQuestionRequest<Question>("get_repository_question", { p_id: id })
      .then((q) => {
        if (active) {
          setQuestion(q);
          setDraft(draftFor(q));
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setQuestion(null);
          setDraft(null);
          setError(e instanceof Error ? e.message : "Could not load question.");
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [id, refresh]);
  async function save() {
    if (!draft || !question || busy) return;
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const q = await repositoryQuestionRequest<Question>("edit_repository_question", {
        p_id: id,
        p_expected: question.updated_at,
        p_reason: reason,
        p_content: {
          ...draft,
          tags: draft.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      setQuestion(q);
      setDraft(draftFor(q));
      setReason("");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save question.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      <h1 ref={heading} tabIndex={-1}>
        Question Detail
      </h1>
      <div className="button-row">
        <Button
          type="button"
          variant="secondary"
          disabled={busy && question !== null}
          onClick={onBack}
        >
          Back to Questions
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => setRefresh((n) => n + 1)}
        >
          Reload Question
        </Button>
      </div>
      {busy && <p role="status">{question ? "Working..." : "Loading question..."}</p>}
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Question saved.</p>}
      {question && draft && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p>
            {question.lifecycle_state} · Updated{" "}
            {new Date(question.updated_at).toLocaleString()}
          </p>
          <fieldset disabled={busy} className="form-stack">
            <legend>Question content</legend>
            <label className="field-label">
              Question
              <textarea
                required
                minLength={5}
                maxLength={5000}
                value={draft.question_text}
                onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
              />
            </label>
            {draft.options.map((option, index) => (
              <label key={option.id} className="field-label">
                Option {option.id}
                <input
                  required
                  maxLength={1000}
                  value={option.text}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      options: draft.options.map((o, i) =>
                        i === index ? { ...o, text: e.target.value } : o,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <label className="field-label">
              Correct option
              <select
                value={draft.correct_option_id}
                onChange={(e) =>
                  setDraft({ ...draft, correct_option_id: e.target.value })
                }
              >
                {["A", "B", "C", "D"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Explanation
              <textarea
                required
                minLength={5}
                maxLength={5000}
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
              />
            </label>
            <label className="field-label">
              Indicator
              <input
                required
                maxLength={200}
                value={draft.performance_indicator}
                onChange={(e) =>
                  setDraft({ ...draft, performance_indicator: e.target.value })
                }
              />
            </label>
            {(
              [
                ["partition_key", "Partition", partitions],
                [
                  "question_type",
                  "Type",
                  ["Scenario", "Definition", "Fill In The Blank", "All Except"],
                ],
                ["difficulty", "Difficulty", ["Easy", "Medium", "Hard"]],
              ] as const
            ).map(([key, label, values]) => (
              <label key={key} className="field-label">
                {label}
                <select
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                >
                  {[...new Set([draft[key], ...values])].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="field-label">
              Tags (comma-separated)
              <input
                required
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              />
            </label>
            <label className="field-label">
              Edit reason
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button type="submit">Save Question</Button>
          </fieldset>
        </form>
      )}
    </div>
  );
}
