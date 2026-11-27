import type { SessionResultItem } from "./session";

export function summarizeResult(
  items: SessionResultItem[],
  dimension: "topic" | "difficulty",
) {
  const groups = new Map<
    string,
    { label: string; correct: number; total: number; questionIds: string[] }
  >();
  for (const item of items) {
    const labels =
      dimension === "difficulty"
        ? [item.difficulty || "Metadata unavailable"]
        : item.tags.length
          ? [...new Set(item.tags)]
          : ["Metadata unavailable"];
    for (const label of labels) {
      const group = groups.get(label) ?? {
        label,
        correct: 0,
        total: 0,
        questionIds: [],
      };
      group.correct += Number(item.is_correct);
      group.total++;
      group.questionIds.push(item.question_id);
      groups.set(label, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}
