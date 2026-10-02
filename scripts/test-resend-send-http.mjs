import assert from "node:assert/strict";

function resultFromResendSendHttp(status, rawBody) {
  let parsed = {};
  if (rawBody) {
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = {};
    }
  }
  if (status >= 200 && status < 300) {
    const id = typeof parsed.id === "string" && parsed.id ? parsed.id : "unknown";
    return { ok: true, id };
  }
  const message =
    typeof parsed.message === "string" && parsed.message ? parsed.message : `Resend HTTP ${status}`;
  return { ok: false, error: message };
}

assert.deepEqual(resultFromResendSendHttp(201, '{"id":"abc"}'), { ok: true, id: "abc" });
assert.deepEqual(resultFromResendSendHttp(200, '{"id":"abc"}'), { ok: true, id: "abc" });
assert.deepEqual(resultFromResendSendHttp(201, ""), { ok: true, id: "unknown" });
assert.deepEqual(resultFromResendSendHttp(201, "not-json"), { ok: true, id: "unknown" });
assert.deepEqual(resultFromResendSendHttp(422, '{"message":"Invalid from"}'), {
  ok: false,
  error: "Invalid from",
});
assert.deepEqual(resultFromResendSendHttp(500, ""), { ok: false, error: "Resend HTTP 500" });

console.log("test-resend-send-http: ok");
