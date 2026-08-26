import { describe, expect, it } from "vitest";

import {
  QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE,
  QUESTION_REPOSITORY_MAX_PAGE_SIZE,
  parseQuestionRepositoryFilters,
  writeQuestionRepositoryFilters,
} from "./repository";

describe("question repository query state", () => {
  it("normalizes invalid and oversized URL parameters", () => {
    const filters = parseQuestionRepositoryFilters(
      new URLSearchParams("status=Archived&pageSize=999&q=%20contract%20"),
    );

    expect(filters.lifecycleState).toBe("Active");
    expect(filters.pageSize).toBe(QUESTION_REPOSITORY_MAX_PAGE_SIZE);
    expect(filters.search).toBe("contract");
  });

  it("uses defaults for missing page size", () => {
    const filters = parseQuestionRepositoryFilters(new URLSearchParams());

    expect(filters.pageSize).toBe(QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE);
  });

  it("writes compact URL state and removes default values", () => {
    const params = writeQuestionRepositoryFilters(new URLSearchParams(), {
      search: "pricing",
      lifecycleState: "Retired",
      pageSize: 50,
      cursorUpdatedAt: "2026-07-31T12:00:00Z",
      cursorId: "00000000-0000-0000-0000-000000000001",
    });

    expect(params.get("q")).toBe("pricing");
    expect(params.get("status")).toBe("Retired");
    expect(params.get("pageSize")).toBe("50");
    expect(params.get("cursorId")).toBe("00000000-0000-0000-0000-000000000001");

    const resetParams = writeQuestionRepositoryFilters(params, {
      lifecycleState: "Active",
      pageSize: QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE,
      cursorUpdatedAt: null,
      cursorId: null,
    });

    expect(resetParams.has("status")).toBe(false);
    expect(resetParams.has("pageSize")).toBe(false);
    expect(resetParams.has("cursorId")).toBe(false);
  });
});
