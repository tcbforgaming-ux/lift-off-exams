import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverModerationMail } from "../supabase/functions/_shared/moderation-mail.ts";
test("provider failure schedules retry; lost acknowledgment preserves stable provider identity", async () => {
  const mail = {
    id: "stable-notice",
    lease: "lease-one",
    email: "fixture@example.test",
    title: "Suspension",
    body: "Reason",
    path: "/account/suspension",
  };
  const sent = [];
  const acks = [];
  const db = {
    rpc: async (name, args) => {
      if (name === "claim_moderation_mail") return { data: mail, error: null };
      acks.push(args);
      return { data: true, error: null };
    },
  };
  assert.equal(
    await deliverModerationMail(db, async () => {
      throw Error("offline");
    }),
    "retry",
  );
  assert.equal(acks[0].p_sent, false);
  assert.equal(
    await deliverModerationMail(db, async (m) => {
      sent.push(m.id);
    }),
    "sent",
  );
  assert.equal(acks[1].p_sent, true);
  const losingAck = {
    rpc: async (name) =>
      name === "claim_moderation_mail"
        ? { data: mail, error: null }
        : { data: null, error: "lost" },
  };
  await assert.rejects(
    deliverModerationMail(losingAck, async (m) => {
      sent.push(m.id);
    }),
    /acknowledgment/,
  );
  assert.deepEqual(sent, ["stable-notice", "stable-notice"]);
});
test("empty queue sends nothing and database errors fail closed", async () => {
  assert.equal(
    await deliverModerationMail(
      { rpc: async () => ({ data: null, error: null }) },
      async () => {
        throw Error("unexpected");
      },
    ),
    "empty",
  );
  await assert.rejects(
    deliverModerationMail(
      { rpc: async () => ({ data: null, error: "denied" }) },
      async () => {},
    ),
    /claim/,
  );
});
