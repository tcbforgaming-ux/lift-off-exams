import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";
import { paths } from "../../app/urlPaths";
import { useAuth } from "../../lib/auth/useAuth";
import {
  fetchTestIdPreview,
  generateUpdatedTest,
  type TestIdPreview,
} from "../../lib/tests/generation";
import {
  startTestSession,
  fetchLaunchOptions,
  type LaunchOptions,
} from "../../lib/sessions/session";

export function TestIdPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const launchKey = useRef(crypto.randomUUID());
  const updateKey = useRef(crypto.randomUUID());
  const lookupRevision = useRef(0);
  const [options, setOptions] = useState<
    (LaunchOptions & { can_customize: boolean }) | null
  >(null);
  const { status } = useAuth();
  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [preview, setPreview] = useState<TestIdPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadPreview = async (nextCode: string) => {
    const revision = ++lookupRevision.current;
    launchKey.current = crypto.randomUUID();
    updateKey.current = crypto.randomUUID();
    setOptions(null);
    const normalized = nextCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{12}$/.test(normalized)) {
      setPreview(null);
      setMessage("Enter a 12-character Test ID using letters and numbers.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const nextPreview = await fetchTestIdPreview(normalized);
      if (lookupRevision.current !== revision) return;
      setPreview(nextPreview);
      if (nextPreview?.launch_available && status === "authenticated") {
        const resolved = await fetchLaunchOptions(normalized);
        if (lookupRevision.current !== revision) return;
        setOptions(resolved);
      }
      setMessage(nextPreview ? null : "That Test ID was not found.");
      setParams({ code: normalized }, { replace: true });
    } catch (error) {
      if (lookupRevision.current !== revision) return;
      setPreview(null);
      setMessage(error instanceof Error ? error.message : "Test ID lookup failed.");
    } finally {
      if (lookupRevision.current === revision) setLoading(false);
    }
  };

  useEffect(() => {
    const initialCode = params.get("code");
    if (initialCode) void loadPreview(initialCode);
    // The initial URL is the only automatic lookup. Form submissions own later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const launch = async () => {
    if (!preview) return;
    setLoading(true);
    setMessage(null);
    try {
      const session = options?.can_customize
        ? await startTestSession(preview.test_id, launchKey.current, {
            question_count: options.question_count,
            timer_minutes: options.timer_minutes,
            show_answers: options.show_answers,
            show_explanations: options.show_explanations,
          })
        : await startTestSession(preview.test_id, launchKey.current);
      void navigate(
        session.status === "submitted"
          ? `/results/${session.session_id}`
          : `/sessions/${session.session_id}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test launch failed.");
    } finally {
      setLoading(false);
    }
  };

  const generateUpdated = async () => {
    if (!preview) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await generateUpdatedTest(preview.test_id, updateKey.current);
      if (!result.success || !result.test_id)
        throw new Error(
          "The current pool cannot satisfy the original blueprint. Create a shorter test or revise filters in Generate; the original Test ID is unchanged.",
        );
      setCode(result.test_id);
      await loadPreview(result.test_id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Updated generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Permanent test definitions</p>
        <h1>Open a Test ID</h1>
        <p>Preview a shared test safely. Signing in is required before launch.</p>
      </header>

      <Card className="narrow-card">
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void loadPreview(code);
          }}
        >
          <label className="field-label" htmlFor="test-id-code">
            Test ID
          </label>
          <input
            id="test-id-code"
            value={code}
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            placeholder="AB4F9D72K1PQ"
            onChange={(event) =>
              setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Checking…" : "Preview Test"}
          </Button>
        </form>
      </Card>

      {message && (
        <p
          className="form-message form-message-success"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {preview && (
        <Card>
          <div className="repository-toolbar">
            <div>
              <p className="eyebrow">{preview.test_id}</p>
              <h2>{preview.blueprint_name}</h2>
            </div>
            <span className="status-pill status-pill-active">
              {preview.generation_status}
            </span>
          </div>

          <dl className="preview-grid">
            <div>
              <dt>Category</dt>
              <dd>{preview.category}</dd>
            </div>
            <div>
              <dt>Questions</dt>
              <dd>{preview.original_question_count}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{preview.difficulties.join(", ") || "All difficulties"}</dd>
            </div>
            <div>
              <dt>Topic tags</dt>
              <dd>{preview.topic_tags.join(", ") || "All blueprint topics"}</dd>
            </div>
            <div>
              <dt>Blueprint version</dt>
              <dd>{preview.blueprint_version}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(preview.creation_date).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt>Content policy</dt>
              <dd>Current content with update warnings</dd>
            </div>
          </dl>

          {preview.updated_question_count > 0 && (
            <p className="form-message form-message-error" role="alert">
              {preview.updated_question_count} question
              {preview.updated_question_count === 1 ? " has" : "s have"} been updated
              since this test was generated.
            </p>
          )}

          {!preview.launch_available && (
            <p className="form-message form-message-error" role="alert">
              {preview.generation_status === "Legacy"
                ? "This legacy Test ID does not have a verified ordered question list and cannot launch."
                : "This Test ID has been retired and cannot launch."}
            </p>
          )}

          <div className="button-row">
            {preview.updated_question_count > 0 && status === "authenticated" && (
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => void generateUpdated()}
              >
                Generate Updated Test
              </Button>
            )}
            {preview.replacement_test_id && (
              <ButtonLink
                to={`/test-id?code=${preview.replacement_test_id}`}
                variant="secondary"
              >
                Open Replacement Test ID
              </ButtonLink>
            )}
            {preview.launch_available && status === "authenticated" ? (
              <Button type="button" disabled={loading} onClick={() => void launch()}>
                {preview.updated_question_count > 0 ? "Continue" : "Start Test"}
              </Button>
            ) : preview.launch_available ? (
              <ButtonLink to={paths.login}>Log In to Launch</ButtonLink>
            ) : null}
          </div>
          {status === "authenticated" && (
            <p>An unfinished attempt resumes with its saved questions and settings.</p>
          )}
          {options && (
            <fieldset
              className="form-stack"
              disabled={loading || !options.can_customize}
            >
              <legend>Launch settings</legend>
              <label className="field-label">
                Question count
                <input
                  type="number"
                  min={1}
                  max={Math.min(250, preview.original_question_count)}
                  step={1}
                  value={options.question_count}
                  onChange={(event) => {
                    launchKey.current = crypto.randomUUID();
                    setOptions({
                      ...options,
                      question_count: Number(event.target.value),
                    });
                  }}
                />
              </label>
              <label className="field-label">
                Timer
                <select
                  value={options.timer_minutes === null ? "none" : "timed"}
                  onChange={(event) => {
                    launchKey.current = crypto.randomUUID();
                    setOptions({
                      ...options,
                      timer_minutes: event.target.value === "none" ? null : 60,
                    });
                  }}
                >
                  <option value="timed">Timed</option>
                  <option value="none">No timer</option>
                </select>
              </label>
              {options.timer_minutes !== null && (
                <label className="field-label">
                  Minutes
                  <input
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    value={options.timer_minutes}
                    onChange={(event) => {
                      launchKey.current = crypto.randomUUID();
                      setOptions({
                        ...options,
                        timer_minutes: Number(event.target.value),
                      });
                    }}
                  />
                </label>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={options.show_answers}
                  onChange={(event) => {
                    launchKey.current = crypto.randomUUID();
                    setOptions({ ...options, show_answers: event.target.checked });
                  }}
                />
                Show correct answers during test
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.show_explanations}
                  onChange={(event) => {
                    launchKey.current = crypto.randomUUID();
                    setOptions({ ...options, show_explanations: event.target.checked });
                  }}
                />
                Show explanations during test
              </label>
            </fieldset>
          )}
          {options && !options.can_customize && (
            <p>
              Free access uses up to 40 questions, a 60-minute timer and no study
              feedback.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
