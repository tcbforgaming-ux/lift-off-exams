// The prototype allowed an owner to delete another account. Permanently
// disable that endpoint; the self-service lifecycle uses trusted worker RPCs.
Deno.serve(() =>
  Response.json({ error: "Owner-executed account deletion is no longer available." }, {
    status: 410,
  }),
);
