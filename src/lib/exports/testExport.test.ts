import { describe, expect, it } from "vitest";
import { exportRows, makeCsv } from "./testExport";

describe("Test exports", () => {
  it("quotes multiline Unicode and prevents formula interpretation", async () => {
    const blob = makeCsv([
      ["Questions", "1", "Question", '  =SUM("café")\nsecond line'],
      ["Questions", "1", "Option A", "\t@sheet"],
      ["Questions", "1", "Option B", "\u200b+1"],
    ]);
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("CSV was not read as text."));
      };
      reader.onerror = reject;
      reader.readAsText(blob);
    });
    expect(blob.type).toBe("text/csv;charset=utf-8");
    expect(text).toContain(`"'  =SUM(""café"")\nsecond line"\r\n`);
    expect(text).toContain(`"'\t@sheet"`);
    expect(text).toContain(`"'\u200b+1"`);
  });

  it("distinguishes wrong, uncertain and skipped while omitting absent explanations", () => {
    const rows = exportRows("result", {
      kind: "result",
      count: 1,
      result: { score: 0 },
      questions: [
        { position: 1, answer: "B", correct: false },
        { position: 2, answer: "UNKNOWN", correct: false },
        { position: 3, answer: null, correct: false, hidden: "never output" },
      ],
    });
    expect(
      rows.filter((row) => row[2] === "Submitted answer").map((row) => row[3]),
    ).toEqual(["B", "I Don’t Know (UNKNOWN)", "Unanswered"]);
    expect(
      rows.some((row) => row[2] === "Explanation" || row[3] === "never output"),
    ).toBe(false);
  });
});
