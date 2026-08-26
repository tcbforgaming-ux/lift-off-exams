import { describe, expect, it } from "vitest";

import {
  GENERATION_PIPELINE_DEFAULT_PAGE_SIZE,
  parseGenerationPipelineFilters,
  writeGenerationPipelineFilters,
} from "./pipeline";

describe("generation pipeline filters", () => {
  it("parses bounded filters from URL params", () => {
    const filters = parseGenerationPipelineFilters(
      new URLSearchParams({
        q: "  BL-001 ",
        status: "locked",
        category: "Marketing",
        batch: "70000000-0000-0000-0000-000000000001",
        hasErrors: "yes",
        pageSize: "999",
      }),
    );

    expect(filters.search).toBe("BL-001");
    expect(filters.status).toBe("locked");
    expect(filters.category).toBe("Marketing");
    expect(filters.hasErrors).toBe("yes");
    expect(filters.pageSize).toBe(100);
  });

  it("omits default values when writing filters", () => {
    const params = writeGenerationPipelineFilters(new URLSearchParams(), {
      search: "contract",
      hasErrors: "all",
      pageSize: GENERATION_PIPELINE_DEFAULT_PAGE_SIZE,
    });

    expect(params.get("q")).toBe("contract");
    expect(params.has("hasErrors")).toBe(false);
    expect(params.has("pageSize")).toBe(false);
  });
});
