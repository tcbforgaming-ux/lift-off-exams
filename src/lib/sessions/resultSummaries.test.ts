import { expect, it } from "vitest";
import { summarizeResult } from "./resultSummaries";
import type { SessionResultItem } from "./session";

it("summarizes immutable result snapshots without duplicating repeated tags", () => {
  const items = [
    { question_id: "a", tags: ["Law", "Law"], difficulty: "Easy", is_correct: true },
    {
      question_id: "b",
      tags: ["Law", "Finance"],
      difficulty: "Hard",
      is_correct: false,
    },
  ] as SessionResultItem[];
  expect(
    summarizeResult(items, "topic").find((group) => group.label === "Law"),
  ).toMatchObject({ correct: 1, total: 2 });
  expect(summarizeResult(items, "difficulty")).toEqual([
    { label: "Easy", correct: 1, total: 1, questionIds: ["a"] },
    { label: "Hard", correct: 0, total: 1, questionIds: ["b"] },
  ]);
});
