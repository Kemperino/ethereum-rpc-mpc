import assert from "node:assert/strict";
import test from "node:test";
import { rpcParamsSchema } from "../dist/server/schemas.js";

test("issue #2: accepts structured Ethereum JSON-RPC parameters unchanged", () => {
  const cases = [
    [{ to: "0x0000000000000000000000000000000000000001", data: "0x" }, "latest"],
    [{ fromBlock: "0x0", toBlock: "latest", topics: [null, ["0xabc", "0xdef"]] }],
    ["latest", true],
    [4, false, null, { nested: [1, "value", { enabled: true }] }],
    [],
  ];
  for (const params of cases) {
    assert.deepEqual(rpcParamsSchema.parse(params), params);
  }
});

test("parameters must remain a positional array", () => {
  for (const params of [null, {}, "latest", 1]) {
    assert.equal(rpcParamsSchema.safeParse(params).success, false);
  }
});

test("rejects non-JSON parameter values", () => {
  for (const value of [undefined, NaN, Infinity, 1n, () => {}]) {
    assert.equal(rpcParamsSchema.safeParse([value]).success, false);
  }
});
