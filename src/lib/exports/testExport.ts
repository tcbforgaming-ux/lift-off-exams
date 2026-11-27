import { type Json } from "../supabase/database.types";

export type ExportKind = "result" | "analytics" | "history";
export type ExportFormat = "pdf" | "csv";
export type ExportRow = [section: string, record: string, field: string, value: string];

export const exportTitles = {
  result: "Test Result",
  analytics: "Test Analytics Report",
  history: "Test Performance History",
};

type RecordData = { [key: string]: Json | undefined };
const object = (value: Json | undefined): RecordData =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const array = (value: Json | undefined) => (Array.isArray(value) ? value : []);
const display = (value: Json | undefined): string => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(display).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
const percent = (value: Json | undefined) =>
  typeof value === "number" ? value.toFixed(2) + "%" : "Not available";
const answer = (value: Json | undefined) =>
  value === "UNKNOWN" ? "I Don’t Know (UNKNOWN)" : display(value) || "Unanswered";

const resultFields = {
  test_id: "Test ID",
  category: "Category",
  started_at: "Started (UTC)",
  submitted_at: "Submitted (UTC)",
  questions: "Questions",
  answered: "Answered",
  correct: "Correct",
  incorrect: "Incorrect",
  unanswered: "Unanswered",
  active_seconds: "Active time (seconds)",
  topics: "Topics",
  difficulties: "Difficulties",
};

export function exportRows(kind: ExportKind, payload: Json): ExportRow[] {
  const data = object(payload);
  if (data.kind !== kind || typeof data.count !== "number" || data.count < 1)
    throw new Error("The server returned an invalid export. Try again.");
  const rows: ExportRow[] = [];
  const add = (
    section: string,
    record: string,
    field: string,
    value: Json | undefined,
  ) => rows.push([section, record, field, display(value)]);
  const fields = (
    section: string,
    record: string,
    values: RecordData,
    labels: Record<string, string>,
  ) =>
    Object.entries(labels).forEach(([key, label]) =>
      add(section, record, label, values[key]),
    );

  add("Scope", "", "Report", exportTitles[kind]);
  add("Scope", "", "Mode", "Test");
  if (kind !== "result") {
    add("Scope", "", "Range", data.range);
    if (data.range === "custom") {
      add("Scope", "", "From (UTC, inclusive)", data.from);
      add("Scope", "", "Through (UTC, inclusive)", data.through);
    }
  }
  add("Scope", "", "Cutoff (UTC, exclusive)", data.cutoff);
  add("Scope", "", "Completed tests", data.count);

  if (kind === "result") {
    const result = object(data.result);
    add("Result", "", "Score", percent(result.score));
    fields("Result", "", result, resultFields);
    array(data.questions)
      .map(object)
      .forEach((item) => {
        const record = display(item.position);
        fields("Questions", record, item, {
          question: "Question",
          type: "Question type",
          difficulty: "Difficulty",
          topics: "Topics",
        });
        ["A", "B", "C", "D"].forEach((id, index) =>
          add("Questions", record, "Option " + id, array(item.options)[index]),
        );
        add("Questions", record, "Submitted answer", answer(item.answer));
        add("Questions", record, "Correct answer", item.correct_answer);
        add(
          "Questions",
          record,
          "Outcome",
          item.answer == null ? "Unanswered" : item.correct ? "Correct" : "Incorrect",
        );
        if ("explanation" in item)
          add("Questions", record, "Explanation", item.explanation);
      });
  } else {
    array(data.history)
      .map(object)
      .forEach((item, index) => {
        const record = String(index + 1);
        if (kind === "history") fields("Score History", record, item, resultFields);
        else add("Score History", record, "Submitted (UTC)", item.submitted_at);
        add("Score History", record, "Score", percent(item.score ?? item.percentage));
      });
  }

  if (kind === "analytics") {
    const summary = object(data.summary);
    add("Summary", "", "Average score", percent(summary.average_score));
    for (const name of ["highest", "lowest"]) {
      const extreme = object(object(summary.extremes)[name]);
      add("Summary", name, "Score", percent(extreme.score));
      fields("Summary", name, extreme, {
        category: "Category",
        difficulties: "Difficulties",
        tags: "Topics",
      });
    }
    array(data.topics)
      .map(object)
      .forEach((item) => {
        const record = display(item.tag);
        fields("Topic Accuracy", record, item, {
          correct: "Correct",
          total: "Total",
          answered: "Answered",
          uncertain: "I Don’t Know",
          required: "Required answers",
        });
        add(
          "Topic Accuracy",
          record,
          "Accuracy",
          typeof item.correct === "number" &&
            typeof item.total === "number" &&
            item.total > 0
            ? percent((100 * item.correct) / item.total)
            : "Not available",
        );
        add(
          "Topic Accuracy",
          record,
          "Sample",
          item.eligible ? "Eligible" : "Insufficient Data",
        );
      });
    const confidence = object(data.confidence);
    fields("Confidence", "", confidence, {
      uncertain: "I Don’t Know",
      answered: "Submitted answers",
      wrong_choices: "Wrong A–D",
      skipped: "Unanswered",
    });
    add(
      "Confidence",
      "",
      "Uncertainty among submitted answers",
      percent(confidence.percentage),
    );
    for (const group of ["categories", "difficulties"]) {
      array(confidence[group])
        .map(object)
        .forEach((item) =>
          fields(
            group === "categories"
              ? "Confidence by Category"
              : "Confidence by Difficulty",
            display(item.label),
            item,
            { uncertain: "I Don’t Know", answered: "Submitted answers" },
          ),
        );
    }
    array(data.uncertainty)
      .map(object)
      .forEach((item, index) => {
        const record = String(index + 1);
        fields("Uncertainty Details", record, item, {
          position: "Question position",
          question_text: "Question",
          category: "Category",
          difficulty: "Difficulty",
          tags: "Topics",
        });
        if ("explanation" in item)
          add("Uncertainty Details", record, "Explanation", item.explanation);
      });
    array(data.recommendations).forEach((tag, index) =>
      add("Recommendations", String(index + 1), "Topic", tag),
    );
  }
  return rows;
}

export function makeCsv(rows: ExportRow[]): Blob {
  const cell = (value: string) => {
    const safe = /^[\t\r\n]|^[\s\p{Cf}]*[=+\-@＝＋－＠]/u.test(value)
      ? "'" + value
      : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return new Blob(
    [
      "\uFEFF",
      [["Section", "Record", "Field", "Value"], ...rows]
        .map((row) => row.map(cell).join(","))
        .join("\r\n"),
      "\r\n",
    ],
    { type: "text/csv;charset=utf-8" },
  );
}
