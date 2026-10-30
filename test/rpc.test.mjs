import assert from "node:assert/strict";
import test from "node:test";
import { createRpcClient, RpcError } from "../dist/server/rpc.js";
import { mockRpc, reply } from "./helpers.mjs";

for (const result of [null, false, 0, "0x", { block: "0x123", values: [true, null] }]) {
  test(`preserves RPC result ${JSON.stringify(result)}`, async (t) => {
    const { url } = await mockRpc(t, (request, res) => reply(res, request, result));
    assert.deepEqual(await createRpcClient(url).call("eth_call", [{ data: "0x" }, "latest"]), result);
  });
}

test("preserves provider errors and never retries a failed write", async (t) => {
  const { url, requests } = await mockRpc(t, (request, res) => res.end(JSON.stringify({
    jsonrpc: "2.0", id: request.id, error: { code: -32000, message: "execution reverted", data: "0xdead" },
  })));
  await assert.rejects(createRpcClient(url).call("eth_sendRawTransaction", ["0x00"]), (error) => {
    assert.ok(error instanceof RpcError);
    assert.equal(error.code, -32000);
    assert.equal(error.data, "0xdead");
    return true;
  });
  assert.equal(requests.length, 1);
});

const invalid = [
  ["wrong ID", (r) => ({ jsonrpc: "2.0", id: "wrong", result: true }), /request ID/],
  ["wrong version", (r) => ({ jsonrpc: "1.0", id: r.id, result: true }), /envelope/],
  ["missing result", (r) => ({ jsonrpc: "2.0", id: r.id }), /exactly one/],
  ["result and error", (r) => ({ jsonrpc: "2.0", id: r.id, result: null, error: {} }), /exactly one/],
  ["invalid error", (r) => ({ jsonrpc: "2.0", id: r.id, error: { code: "oops" } }), /error response/],
  ["batch reply", () => [], /envelope/],
];
for (const [name, body, expected] of invalid) {
  test(`rejects ${name}`, async (t) => {
    const { url } = await mockRpc(t, (request, res) => res.end(JSON.stringify(body(request))));
    await assert.rejects(createRpcClient(url).call("eth_chainId", []), expected);
  });
}

test("rejects invalid JSON, HTTP errors and oversized responses", async (t) => {
  for (const [body, status, pattern] of [["not json", 200, /invalid JSON/], ["secret", 429, /HTTP 429/], ["x".repeat(10 * 1024 * 1024 + 1), 200, /exceeds 10 MiB/]]) {
    const { url } = await mockRpc(t, (_, res) => { res.statusCode = status; res.end(body); });
    await assert.rejects(createRpcClient(url).call("eth_blockNumber", []), pattern);
  }
});

test("deadline covers both response headers and a stalled response body", async (t) => {
  for (const sendHeaders of [false, true]) {
    const { url } = await mockRpc(t, (_, res) => {
      if (sendHeaders) { res.writeHead(200); res.write('{"jsonrpc":'); }
    });
    await assert.rejects(createRpcClient(url, 100).call("eth_blockNumber", []), /timed out/);
  }
});

test("caller cancellation aborts the RPC request", async (t) => {
  const { url } = await mockRpc(t, () => {});
  const controller = new AbortController();
  const pending = createRpcClient(url).call("eth_call", [], controller.signal);
  controller.abort();
  await assert.rejects(pending, /cancelled/);
});

test("network failures do not expose the endpoint path or query credentials", async () => {
  await assert.rejects(createRpcClient("http://127.0.0.1:1/secret?key=private").call("eth_chainId", []), (error) => {
    assert.equal(error.message, "Could not reach the RPC endpoint.");
    return true;
  });
});
