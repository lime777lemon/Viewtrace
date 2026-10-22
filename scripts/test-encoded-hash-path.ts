import assert from "node:assert/strict";
import { encodedHashRedirectPath } from "../src/lib/encoded-hash-path";

assert.equal(encodedHashRedirectPath("/%23top"), "/");
assert.equal(encodedHashRedirectPath("/%23pricing"), "/#pricing");
assert.equal(encodedHashRedirectPath("/%23regional-behavior"), "/#regional-behavior");
assert.equal(encodedHashRedirectPath("/%23not-a-section"), null);
assert.equal(encodedHashRedirectPath("/dashboard"), null);
assert.equal(encodedHashRedirectPath("/%23top/../login"), "/");

console.log("ok");
