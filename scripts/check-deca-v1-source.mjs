import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../work/prd/prd_text.txt", import.meta.url), "utf8");
const source = readFileSync(
  new URL(
    "../supabase/migrations/20261115000600_deca_v1_blueprint_catalog.sql",
    import.meta.url,
  ),
  "utf8",
);
const manifest = JSON.parse(source.split("$catalog$")[1]);
const categories = new Map([
  ["Business Administration Core", "Business Administration Core"],
  ["Marketing Cluster", "Marketing"],
  ["Finance Cluster", "Finance"],
  ["Hospitality and Tourism Cluster", "Hospitality and Tourism"],
  ["Entrepreneurship Cluster", "Entrepreneurship"],
]);
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const exams = [];
let withinSection = false;
let family;
let exam;
for (const [index, raw] of text.split(/\r?\n/).entries()) {
  const line = raw.trim();
  if (line === "19.3 DECA Exam Blueprints") withinSection = true;
  if (line.startsWith("19.4 ")) break;
  if (!withinSection) continue;
  const heading = line.match(/^(.+) Blueprint$/);
  const level = line.match(/^(Districts?|State|ICDC) Test$/);
  const allocation = line.match(/^\u25cf\s+(.+?)\s+[\u2013\u2014]\s+(\d+)$/);
  if (heading && categories.has(heading[1])) {
    family = heading[1];
    exam = undefined;
  } else if (family && level) {
    const category = categories.get(family);
    const normalizedLevel = level[1] === "Districts" ? "District" : level[1];
    exam = {
      key: `${slug(category)}-${normalizedLevel.toLowerCase()}`,
      category,
      name: `${family}${family.endsWith("Cluster") ? " Exam" : ""} - ${normalizedLevel} Test`,
      level: normalizedLevel,
      topics: [],
    };
    exams.push(exam);
  } else if (exam && allocation) {
    const topic = allocation[1];
    const tag =
      topic === "Product/ Service Management" ? "Product/Service Management" : topic;
    exam.topics.push({
      line: index + 1,
      topic,
      tag,
      id: slug(tag),
      count: Number(allocation[2]),
    });
  }
}
assert.equal(exams.length, 15);
assert.equal(exams.flatMap((row) => row.topics).length, 268);
assert.equal(new Set(exams.map((row) => row.key)).size, 15);
for (const row of exams) {
  assert.equal(
    row.topics.reduce((total, topic) => total + topic.count, 0),
    100,
    row.name,
  );
  assert.equal(
    new Set(row.topics.map((topic) => topic.id)).size,
    row.topics.length,
    row.name,
  );
}
assert.deepEqual(exams, manifest);
console.log(
  "PRD section 19.3: 15 exams, 268 exact source allocations, 100 questions each.",
);
