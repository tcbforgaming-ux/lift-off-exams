import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";
import { paths } from "../../app/urlPaths";
import { useAuth } from "../../lib/auth/useAuth";
import {
  fetchGeneratedTestManifest,
  fetchTestIdPreview,
  type TestIdPreview,
} from "../../lib/tests/generation";

export function TestIdPage() {
  const [params, setParams] = useSearchParams();
  const { status } = useAuth();
  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [preview, setPreview] = useState<TestIdPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [launchCount, setLaunchCount] = useState<number | null>(null);

  const loadPreview = async (nextCode: string) => {
    const normalized = nextCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{12}$/.test(normalized)) {
      setPreview(null);
      setMessage("Enter a 12-character Test ID using letters and numbers.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setLaunchCount(null);
    try {
      const nextPreview = await fetchTestIdPreview(normalized);
      setPreview(nextPreview);
      setMessage(nextPreview ? null : "That Test ID was not found.");
      setParams({ code: normalized }, { replace: true });
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : "Test ID lookup failed.");
    } finally {
      setLoading(false);
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
      const manifest = await fetchGeneratedTestManifest(preview.test_id);
      setLaunchCount(manifest.length);
      setMessage("The persisted test manifest is ready for the test-taking milestone.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test launch failed.");
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
                Verify Launch
              </Button>
            ) : preview.launch_available ? (
              <ButtonLink to={paths.login}>Log In to Launch</ButtonLink>
            ) : null}
          </div>

          {launchCount !== null && (
            <p className="muted">{launchCount} persisted questions verified.</p>
          )}
        </Card>
      )}
    </div>
  );
}
