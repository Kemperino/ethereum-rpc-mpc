import assert from "node:assert/strict";
import test from "node:test";
import { connectMcp, mockRpc, reply } from "./helpers.mjs";

const address = "0x" + "11".repeat(20);
const hash = "0x" + "22".repeat(32);
const transaction = { to: address, data: "0x1234", authorizationList: [{ chainId: "0x1" }] };
const filter = { fromBlock: "0x1", toBlock: "0x10", address: [address], topics: [null, [hash]] };
const cases = [
  ["eth_chain_id", {}, "eth_chainId", []],
  ["eth_block_number", {}, "eth_blockNumber", []],
  ["eth_get_balance", { address }, "eth_getBalance", [address, "latest"]],
  ["eth_get_balance", { address, block: { blockHash: hash, requireCanonical: true } }, "eth_getBalance", [address, { blockHash: hash, requireCanonical: true }]],
  ["eth_get_transaction_count", { address, block: "pending" }, "eth_getTransactionCount", [address, "pending"]],
  ["eth_get_code", { address, block: "safe" }, "eth_getCode", [address, "safe"]],
  ["eth_get_storage_at", { address, position: "0x0", block: { blockNumber: "0x10" } }, "eth_getStorageAt", [address, "0x0", { blockNumber: "0x10" }]],
  ["eth_get_block", {}, "eth_getBlockByNumber", ["latest", false]],
  ["eth_get_block", { block: "finalized", fullTransactions: true }, "eth_getBlockByNumber", ["finalized", true]],
  ["eth_get_block", { block: { blockHash: hash } }, "eth_getBlockByHash", [hash, false]],
  ["eth_get_transaction", { hash }, "eth_getTransactionByHash", [hash]],
  ["eth_get_transaction_receipt", { hash }, "eth_getTransactionReceipt", [hash]],
  ["eth_get_logs", { filter }, "eth_getLogs", [filter]],
  ["eth_get_logs", { filter: { blockHash: hash } }, "eth_getLogs", [{ blockHash: hash }]],
  ["eth_call", { transaction }, "eth_call", [transaction, "latest"]],
  ["eth_call", { transaction, stateOverrides: { [address]: { balance: "0x1" } } }, "eth_call", [transaction, "latest", { [address]: { balance: "0x1" } }]],
  ["eth_estimate_gas", { transaction }, "eth_estimateGas", [transaction]],
  ["eth_estimate_gas", { transaction, block: "pending" }, "eth_estimateGas", [transaction, "pending"]],
  ["eth_fee_history", {}, "eth_feeHistory", ["0xa", "latest", []]],
  ["eth_fee_history", { blockCount: 16, newestBlock: "safe", rewardPercentiles: [10, 50, 90] }, "eth_feeHistory", ["0x10", "safe", [10, 50, 90]]],
];

for (const mode of ["legacy", { pin: "2026-07-28" }]) {
  test(`Ethereum tools dispatch correctly (${JSON.stringify(mode)})`, { timeout: 15000 }, async (t) => {
    const expectedResult = { futureField: "0x123", blobGasUsed: "0x10", authorizationList: [], value: "0xffffffffffffffffffffffffffffffff" };
    const { url, requests } = await mockRpc(t, (request, res) => reply(res, request, expectedResult));
    const { client } = await connectMcp(t, [url], mode);
    const { tools } = await client.listTools();
    const readTools = tools.filter((tool) => tool.name !== "eth_json_rpc_call");
    assert.equal(readTools.length, 13);
    assert.ok(readTools.every((tool) => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint));
    for (const [name, args, method, params] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, `${name}: ${JSON.stringify(result)}`);
      assert.deepEqual(result.structuredContent, { result: expectedResult });
      assert.equal(requests.at(-1).method, method);
      assert.deepEqual(requests.at(-1).params, params);
    }
    assert.equal(requests.length, cases.length);
    assert.equal(new Set(requests.map((r) => r.id)).size, cases.length);
  });
}

test("bad tool inputs are rejected before reaching the RPC provider", { timeout: 15000 }, async (t) => {
  const { url, requests } = await mockRpc(t, (request, res) => reply(res, request, true));
  const { client } = await connectMcp(t, [url]);
  const invalid = [
    ["eth_get_balance", { address: "alice.eth" }],
    ["eth_get_balance", { address, block: "0x01" }],
    ["eth_get_balance", { address, block: { blockHash: hash, blockNumber: "0x1" } }],
    ["eth_get_balance", { address, blok: "safe" }],
    ["eth_get_transaction", { hash: "0x123" }],
    ["eth_call", { transaction: { to: address, data: "0x123" } }],
    ["eth_call", { transaction: { to: address, data: "0x12", input: "0x34" } }],
    ["eth_get_logs", { filter: { blockHash: hash, fromBlock: "0x1" } }],
    ["eth_get_logs", { filter: { fromBlock: "0x10", toBlock: "0x1" } }],
    ["eth_get_logs", { filter: { topics: [null, null, null, null, null] } }],
    ["eth_fee_history", { rewardPercentiles: [90, 10] }],
    ["eth_fee_history", { rewardPercentiles: [101] }],
    ["eth_fee_history", { blockCount: 1025 }],
    ["eth_json_rpc_call", { method: "", params: [] }],
    ["eth_json_rpc_call", { method: "eth_call", params: {} }],
  ];
  for (const [name, args] of invalid) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, true, name);
  }
  assert.equal(requests.length, 0);
});

test("unknown/pending transactions preserve a null result through MCP", { timeout: 10000 }, async (t) => {
  const { url } = await mockRpc(t, (request, res) => reply(res, request, null));
  const { client } = await connectMcp(t, [url]);
  const result = await client.callTool({ name: "eth_get_transaction_receipt", arguments: { hash } });
  assert.ok(!result.isError);
  assert.deepEqual(result.structuredContent, { result: null });
});
