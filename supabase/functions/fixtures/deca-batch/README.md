These fixtures are sanitized OpenAI Batch output samples for the DECA generation
importer. They are intentionally small and safe to commit.

- `valid-completed.jsonl`: one completed response with two generated questions.
- `partial-success.jsonl`: one valid line followed by one failed OpenAI line.
- `missing-model-text.jsonl`: response object with no extractable output text.
- `malformed-json.jsonl`: model text that is not valid JSON.
- `duplicate-custom-id.jsonl`: two completed lines with the same queue id.
