import assert from "node:assert/strict";
import test from "node:test";
import packageInfo from "../package.json" with { type: "json" };
import { connectMcp, mockRpc, reply } from "./helpers.mjs";

for (const mode of ["legacy", { pin: "2026-07-28" }]) {
  test(`stdio negotiation and structured params (${JSON.stringify(mode)})`, { timeout: 10000 }, async (t) => {
    const { url, requests } = await mockRpc(t, (request, res) => reply(res, request, request.params));
    const { client, protocolErrors, stderr } = await connectMcp(t, [url + "/secret?key=private", "Test"], mode);
    assert.equal(requests.length, 0, "startup must not depend on provider availability");
    assert.equal(client.getServerVersion().version, packageInfo.version);
    const { tools } = await client.listTools();
    assert.ok(tools.some((tool) => tool.name === "eth_json_rpc_call"));
    assert.ok(tools.every((tool) => !tool.name.startsWith("zirc_")));
    const params = [{ to: "0x0000000000000000000000000000000000000001", data: "0x" }, "latest", true, 3, null];
    const result = await client.callTool({ name: "eth_json_rpc_call", arguments: { method: "eth_call", params } });
    assert.ok(!result.isError);
    assert.deepEqual(result.structuredContent, { result: params });
    assert.deepEqual(requests[0].params, params);
    const empty = await client.callTool({ name: "eth_json_rpc_call", arguments: { method: "eth_chainId" } });
    assert.ok(!empty.isError);
    assert.deepEqual(requests[1].params, []);
    const resource = await client.readResource({ uri: "text://rpc_info" });
    assert.doesNotMatch(JSON.stringify(resource.contents), /secret|private/);
    assert.deepEqual(protocolErrors, []);
    assert.equal(stderr(), "");
  });
}

test("RPC errors carry isError, provider code and revert data through MCP", { timeout: 10000 }, async (t) => {
  const { url } = await mockRpc(t, (request, res) => res.end(JSON.stringify({
    jsonrpc: "2.0", id: request.id, error: { code: 3, message: "execution reverted", data: "0xdeadbeef" },
  })));
  const { client } = await connectMcp(t, [url]);
  const result = await client.callTool({ name: "eth_json_rpc_call", arguments: { method: "eth_call", params: [] } });
  assert.equal(result.isError, true);
  assert.deepEqual(result.structuredContent, { error: { message: "execution reverted", code: 3, data: "0xdeadbeef" } });
});

test("server starts with unreachable RPC and reports failure only on tool use", { timeout: 10000 }, async (t) => {
  const { client } = await connectMcp(t, ["http://127.0.0.1:1"]);
  assert.ok((await client.listTools()).tools.length > 0);
  const result = await client.callTool({ name: "eth_json_rpc_call", arguments: { method: "eth_chainId" } });
  assert.equal(result.isError, true);
});
