import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Tag = { label: string; description: string; revision: number; retired?: boolean };
type Blueprint = {
  id: string;
  blueprint_name: string;
  version: string;
  category: string;
  level: string;
  status: string;
  total_questions: number;
  created_at: string;
};
type Dependency = {
  active_questions: number;
  pending_candidates: number;
  blueprints: Blueprint[];
};
type Detail = Blueprint & {
  distribution: unknown;
  active_ids: string[];
  joint_shortage: number;
  inventory: {
    id: string;
    required: number;
    available_up_to_251: number;
    shortage: number;
  }[];
};
type Cursor = { label?: string; at?: string; id?: string };
const categories = [
  "Business Administration Core",
  "Marketing",
  "Finance",
  "Business Management and Administration",
  "Hospitality and Tourism",
  "Entrepreneurship",
];
const sample = JSON.stringify(
  { schema_version: 1, strata: [{ id: "core", count: 1 }] },
  null,
  2,
);
async function call<T>(name: string, args: Record<string, unknown>) {
  const client = getSupabaseBrowserClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}
function useListing<T>(mode: "tags" | "blueprints", revision: number) {
  const [search, setSearch] = useState("");
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cursor = cursors.at(-1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRows([]);
    const args =
      mode === "tags"
        ? { p_search: search, p_after: cursor?.label ?? null }
        : {
            p_search: search,
            p_before: cursor?.at ?? null,
            p_before_id: cursor?.id ?? null,
          };
    void call<T[]>(mode === "tags" ? "list_staff_tags" : "list_staff_blueprints", args)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e: unknown) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, search, cursor, revision]);
  return {
    rows: rows.slice(0, 25),
    search,
    loading,
    error,
    changeSearch: (value: string) => {
      setSearch(value);
      setCursors([]);
    },
    page: cursors.length,
    hasNext: rows.length > 25,
    next: (value: Cursor) => setCursors([...cursors, value]),
    previous: () => setCursors(cursors.slice(0, -1)),
  };
}

export function CatalogManagementPage() {
  const [mode, setMode] = useState<"tags" | "blueprints">("tags");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Tags &amp; Blueprints</h1>
      </header>
      <div className="button-row" aria-label="Catalog view">
        <Button
          type="button"
          aria-pressed={mode === "tags"}
          onClick={() => setMode("tags")}
        >
          Tags
        </Button>
        <Button
          type="button"
          aria-pressed={mode === "blueprints"}
          onClick={() => setMode("blueprints")}
        >
          Blueprints
        </Button>
      </div>
      {mode === "tags" ? <TagManager /> : <BlueprintManager />}
    </div>
  );
}

function TagManager() {
  const [revision, setRevision] = useState(0);
  const list = useListing<Tag>("tags", revision);
  const [selected, setSelected] = useState<Tag | null>(null);
  const [dependencies, setDependencies] = useState<Dependency | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function open(tag: Tag) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    setDependencies(null);
    setSelected(tag);
    setLabel(tag.label);
    setDescription(tag.description);
    setReason("");
    try {
      setDependencies(
        await call<Dependency>("get_staff_tag_dependencies", { p_label: tag.label }),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const tag = await call<Tag>("save_staff_tag", {
        p_label: label,
        p_description: description,
        p_expected: selected?.revision ?? 0,
        p_reason: reason,
      });
      setSelected(tag);
      setLabel(tag.label);
      setDescription(tag.description);
      setReason("");
      setRevision((n) => n + 1);
      setStatus("Tag saved. Existing associations are unchanged.");
    } catch (e) {
      setError(message(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function toggleRetired() {
    if (!selected || busy || reason.trim().length < 5) return;
    setBusy(true);
    setError("");
    try {
      const tag = await call<Tag>("set_staff_tag_retired", {
        p_label: selected.label,
        p_revision: selected.revision,
        p_retired: !selected.retired,
        p_reason: reason,
      });
      setSelected(tag);
      setReason("");
      setRevision((x) => x + 1);
      setStatus(
        tag.retired
          ? "Tag retired. Existing references are unchanged."
          : "Tag restored.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page-stack" aria-label="Tag management">
      <label className="field-label">
        Search tags
        <input
          maxLength={100}
          value={list.search}
          onChange={(e) => list.changeSearch(e.target.value)}
        />
      </label>
      {list.loading && <p role="status">Loading tags...</p>}
      {list.error && <p role="alert">{list.error}</p>}
      {!list.loading && !list.error && !list.rows.length && <p>No matching tags.</p>}
      <ul>
        {list.rows.map((tag) => (
          <li key={tag.label} style={{ overflowWrap: "anywhere" }}>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void open(tag)}
            >
              {tag.label}
            </Button>
          </li>
        ))}
      </ul>
      <CursorNavigation
        page={list.page}
        loading={list.loading}
        hasNext={list.hasNext}
        onPrevious={list.previous}
        onNext={() => list.next({ label: list.rows.at(-1)?.label })}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setSelected(null);
          setDependencies(null);
          setLabel("");
          setDescription("");
          setReason("");
          setError("");
          setStatus("");
        }}
      >
        New Tag
      </Button>
      {dependencies && (
        <div style={{ overflowWrap: "anywhere" }}>
          <h2>Tag Dependencies</h2>
          <p>
            {dependencies.active_questions} active questions ·{" "}
            {dependencies.pending_candidates} review candidates
          </p>
          <Link to={`/admin/questions?tag=${encodeURIComponent(label)}`}>
            View associated questions
          </Link>
          <ul>
            {dependencies.blueprints.slice(0, 25).map((b) => (
              <li key={b.id}>
                {b.blueprint_name} · {b.version} · {b.status}
              </li>
            ))}
          </ul>
          {dependencies.blueprints.length > 25 && (
            <p>More than 25 blueprint versions reference this tag.</p>
          )}
        </div>
      )}
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2>{selected ? "Edit Tag Description" : "Create Tag"}</h2>
        <fieldset className="form-stack" disabled={busy} style={{ minInlineSize: 0 }}>
          <label className="field-label">
            Tag label
            <input
              required
              readOnly={!!selected}
              maxLength={100}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="field-label">
            Description
            <textarea
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field-label">
            Tag change reason
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {selected && selected.label !== selected.label.trim() && (
            <p>This legacy label is read-only because it contains outer whitespace.</p>
          )}
          <Button
            type="submit"
            disabled={
              !!selected && (!dependencies || selected.label !== selected.label.trim())
            }
          >
            Save Tag
          </Button>
          {selected && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy || reason.trim().length < 5}
              onClick={() => void toggleRetired()}
            >
              {selected.retired ? "Restore Tag" : "Retire Tag"}
            </Button>
          )}
        </fieldset>
      </form>
      {busy && <p role="status">Working...</p>}
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}

function BlueprintManager() {
  const [revision, setRevision] = useState(0);
  const list = useListing<Blueprint>("blueprints", revision);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    category: "Finance",
    level: "State",
    version: "",
    total: "1",
    distribution: sample,
  });
  const [reason, setReason] = useState("");
  const [activationReason, setActivationReason] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function load(id: string) {
    const detail = await call<Detail>("get_staff_blueprint", { p_id: id });
    setSelected(detail);
    setDraft({
      name: detail.blueprint_name,
      category: detail.category,
      level: detail.level,
      version: "",
      total: String(detail.total_questions),
      distribution: JSON.stringify(detail.distribution, null, 2),
    });
    setReason("");
    setActivationReason("");
  }
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
    } catch (e) {
      setError(message(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function save() {
    let distribution: unknown;
    try {
      distribution = JSON.parse(draft.distribution) as unknown;
    } catch {
      throw new Error("Allocation must be valid JSON.");
    }
    const id = await call<string>("create_staff_blueprint_draft", {
      p_name: draft.name,
      p_category: draft.category,
      p_level: draft.level,
      p_version: draft.version,
      p_total: Number(draft.total),
      p_distribution: distribution,
      p_reason: reason,
      p_source: selected?.id ?? null,
      p_expected_active: selected?.active_ids ?? [],
    });
    setRevision((n) => n + 1);
    await load(id);
    setStatus("Draft created. The active version is unchanged.");
  }
  async function activate() {
    if (!selected) return;
    const id = await call<string>("activate_staff_blueprint", {
      p_id: selected.id,
      p_reason: activationReason,
    });
    setRevision((n) => n + 1);
    await load(id);
    setStatus("Blueprint activated.");
  }
  return (
    <section className="page-stack" aria-label="Blueprint management">
      <label className="field-label">
        Search blueprints
        <input
          maxLength={120}
          value={list.search}
          onChange={(e) => list.changeSearch(e.target.value)}
        />
      </label>
      {list.loading && <p role="status">Loading blueprints...</p>}
      {list.error && <p role="alert">{list.error}</p>}
      {!list.loading && !list.error && !list.rows.length && (
        <p>No matching blueprints.</p>
      )}
      <ul>
        {list.rows.map((b) => (
          <li key={b.id} style={{ overflowWrap: "anywhere" }}>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void run(() => load(b.id))}
            >
              {b.blueprint_name} · {b.version} · {b.status}
            </Button>
          </li>
        ))}
      </ul>
      <CursorNavigation
        page={list.page}
        loading={list.loading}
        hasNext={list.hasNext}
        onPrevious={list.previous}
        onNext={() => {
          const b = list.rows.at(-1);
          if (b) list.next({ at: b.created_at, id: b.id });
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setSelected(null);
          setDraft({
            name: "",
            category: "Finance",
            level: "State",
            version: "",
            total: "1",
            distribution: sample,
          });
          setReason("");
          setError("");
          setStatus("");
        }}
      >
        New Blueprint
      </Button>
      {selected && (
        <section aria-label="Blueprint allocation" style={{ overflowWrap: "anywhere" }}>
          <h2>
            {selected.blueprint_name} · {selected.version}
          </h2>
          <p>
            {selected.status} · {selected.total_questions} questions
          </p>
          <ul>
            {selected.inventory.map((s) => (
              <li key={s.id}>
                {s.id}: {s.required} required,{" "}
                {s.available_up_to_251 === 251 ? "251+" : s.available_up_to_251}{" "}
                eligible, {s.shortage} shortage
              </li>
            ))}
          </ul>
          <p>
            {selected.joint_shortage > 0
              ? `Combined shortage: ${selected.joint_shortage} distinct questions.`
              : "Combined inventory can fill all strata without reuse."}
          </p>
          {selected.status === "Draft" && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                void run(activate);
              }}
            >
              <label className="field-label">
                Activation reason
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  disabled={busy}
                  value={activationReason}
                  onChange={(e) => setActivationReason(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={busy}>
                Activate Draft
              </Button>
            </form>
          )}
        </section>
      )}
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(save);
        }}
      >
        <h2>{selected ? "Create Draft from Version" : "Create Blueprint Draft"}</h2>
        <fieldset className="form-stack" disabled={busy} style={{ minInlineSize: 0 }}>
          <label className="field-label">
            Blueprint name
            <input
              required
              readOnly={!!selected}
              maxLength={120}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="field-label">
            Category
            <select
              disabled={!!selected}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Level
            <input
              required
              readOnly={!!selected}
              maxLength={40}
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: e.target.value })}
            />
          </label>
          <label className="field-label">
            New version
            <input
              required
              maxLength={40}
              value={draft.version}
              onChange={(e) => setDraft({ ...draft, version: e.target.value })}
            />
          </label>
          <label className="field-label">
            Total questions
            <input
              type="number"
              min={1}
              max={250}
              step={1}
              required
              value={draft.total}
              onChange={(e) => setDraft({ ...draft, total: e.target.value })}
            />
          </label>
          <label className="field-label">
            Allocation JSON
            <textarea
              required
              rows={10}
              maxLength={65536}
              value={draft.distribution}
              onChange={(e) => setDraft({ ...draft, distribution: e.target.value })}
            />
          </label>
          <label className="field-label">
            Draft reason
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button type="submit">Save as Draft</Button>
        </fieldset>
      </form>
      {busy && <p role="status">Working...</p>}
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
