import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { useAuth } from "../../lib/auth/useAuth";
import { parseAnswerOptions } from "../../lib/sessions/session";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

const demos = [
  ["marketing", "Marketing"],
  ["finance", "Finance"],
  ["management", "Management"],
  ["hospitality", "Hospitality"],
  ["entrepreneurship", "Entrepreneurship"],
] as const;
type Question = { position: number; prompt: string; choices: unknown };
type Result = {
  score: number;
  skipped: number;
  items: { position: number; answer: string; selected: string | null }[];
};

export function DemoPage() {
  const { demoId } = useParams();
  const demo = demos.find(([id]) => id === demoId);
  if (demo) return <DemoAttempt key={demo[0]} id={demo[0]} title={demo[1]} />;
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>{demoId ? "Demo not found" : "Choose a Demo"}</h1>
      </header>
      <div className="button-row">
        {demos.map(([id, name]) => (
          <ButtonLink key={id} to={`/demo/${id}`}>
            {name} Demo Test
          </ButtonLink>
        ))}
      </div>
    </div>
  );
}

function DemoAttempt({ id, title }: { id: string; title: string }) {
  const { session } = useAuth();
  const [questions, setQuestions] = useState<Question[]>();
  const [answers, setAnswers] = useState<(string | null)[]>(
    Array<string | null>(5).fill(null),
  );
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient().rpc(
          "get_public_demo",
          { p_demo: id },
        );
        if (error) throw new Error(error.message);
        if (active) setQuestions(data as unknown as Question[]);
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "Could not load the demo.");
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const { data, error } = await getSupabaseBrowserClient().rpc(
        "grade_public_demo",
        {
          p_demo: id,
          // The generated RPC type excludes nullable elements; PostgreSQL text[] permits skips.
          p_answers: answers as string[],
        },
      );
      if (error) throw new Error(error.message);
      setResult(data as unknown as Result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit the demo.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>{title} Demo Test</h1>
      </header>
      <div>
        <ButtonLink to="/demo" variant="secondary">
          Choose another demo
        </ButtonLink>
      </div>
      {error && <p role="alert">{error}</p>}
      {!questions && !error && <p role="status">Loading demo…</p>}
      {questions && !result && (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {questions.map((question, index) => (
            <fieldset key={question.position} disabled={pending}>
              <legend>
                {question.position}. {question.prompt}
              </legend>
              {parseAnswerOptions(question.choices).map(({ id, text }) => (
                <div key={id}>
                  <label>
                    <input
                      name={`demo-${question.position}`}
                      type="radio"
                      checked={answers[index] === id}
                      onChange={() =>
                        setAnswers((current) =>
                          current.map((value, i) => (i === index ? id : value)),
                        )
                      }
                    />{" "}
                    {text}
                  </label>
                </div>
              ))}
              {answers[index] && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setAnswers((current) =>
                      current.map((value, i) => (i === index ? null : value)),
                    )
                  }
                >
                  Clear answer
                </Button>
              )}
            </fieldset>
          ))}
          <div>
            <Button type="submit" disabled={pending}>
              Submit demo
            </Button>
          </div>
        </form>
      )}
      {questions && result && (
        <section className="page-stack" aria-label="Demo results">
          <h2>{result.score} of 5 correct</h2>
          <p>
            {5 - result.score - result.skipped} incorrect · {result.skipped} skipped
          </p>
          <ol>
            {result.items.map((item, index) => {
              const options = parseAnswerOptions(questions[index].choices);
              return (
                <li key={item.position}>
                  <p>{questions[index].prompt}</p>
                  <p>
                    {item.selected === null
                      ? "Skipped"
                      : item.selected === item.answer
                        ? "Correct"
                        : "Incorrect"}
                  </p>
                  {item.selected && (
                    <p>
                      Your answer:{" "}
                      {options.find((option) => option.id === item.selected)?.text}
                    </p>
                  )}
                  <p>
                    Correct answer:{" "}
                    {options.find((option) => option.id === item.answer)?.text}
                  </p>
                </li>
              );
            })}
          </ol>
          <div className="button-row">
            <Button
              onClick={() => {
                setResult(undefined);
                setAnswers(Array<string | null>(5).fill(null));
              }}
            >
              Replay demo
            </Button>
            {!session && (
              <ButtonLink to="/signup">
                Create an account to save future results
              </ButtonLink>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
