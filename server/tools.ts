import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { RpcClient } from "./rpc.js";
import { rpcResult } from "./results.js";
import { addressSchema, blockNumberSchema, blockRefSchema, hashSchema, logFilterSchema, quantitySchema, transactionSchema } from "./schemas.js";

/** Register discoverable read and simulation tools; results retain the provider's JSON-RPC encoding. */
export function registerEthereumTools(server: McpServer, rpc: RpcClient): void {
  function register<S extends z.ZodRawShape>(
    name: string,
    description: string,
    inputSchema: z.ZodObject<S>,
    request: (args: z.output<z.ZodObject<S>>) => [method: string, params: unknown[]],
  ) {
    server.registerTool(name, {
      description,
      inputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async (args, ctx) => rpcResult(() => {
      const [method, params] = request(args as z.output<z.ZodObject<S>>);
      return rpc.call(method, params, ctx.mcpReq.signal);
    }));
  }

  register("eth_chain_id", "Get the endpoint's chain ID as a hex quantity. Use this to verify the chain independently of its configured display name.",
    z.strictObject({}), () => ["eth_chainId", []]);
  register("eth_block_number", "Get the current head block number as a hex quantity.",
    z.strictObject({}), () => ["eth_blockNumber", []]);
  register("eth_get_balance", "Read an address's native currency balance in wei, returned as a hex quantity.",
    z.strictObject({ address: addressSchema, block: blockRefSchema.default("latest") }),
    ({ address, block }) => ["eth_getBalance", [address, block]]);
  register("eth_get_transaction_count", "Read an address's transaction count (nonce) as a hex quantity. Use pending to include pending transactions.",
    z.strictObject({ address: addressSchema, block: blockRefSchema.default("latest") }),
    ({ address, block }) => ["eth_getTransactionCount", [address, block]]);
  register("eth_get_code", "Read deployed bytecode at an address. A result of 0x means no code at that block.",
    z.strictObject({ address: addressSchema, block: blockRefSchema.default("latest") }),
    ({ address, block }) => ["eth_getCode", [address, block]]);
  register("eth_get_storage_at", "Read a 32-byte contract storage slot. Position is a hex quantity; derive mapping and array slots before calling.",
    z.strictObject({ address: addressSchema, position: quantitySchema, block: blockRefSchema.default("latest") }),
    ({ address, position, block }) => ["eth_getStorageAt", [address, position, block]]);
  register("eth_get_block", "Get a block by number/tag or by {blockHash}. Set fullTransactions to return transaction objects instead of hashes. Returns null if unavailable.",
    z.strictObject({
      block: z.union([blockNumberSchema, z.strictObject({ blockHash: hashSchema })]).default("latest"),
      fullTransactions: z.boolean().default(false),
    }), ({ block, fullTransactions }) => typeof block === "string"
      ? ["eth_getBlockByNumber", [block, fullTransactions]]
      : ["eth_getBlockByHash", [block.blockHash, fullTransactions]]);
  register("eth_get_transaction", "Get a transaction by hash, including pending transactions. Returns null when unknown to the provider.",
    z.strictObject({ hash: hashSchema }), ({ hash }) => ["eth_getTransactionByHash", [hash]]);
  register("eth_get_transaction_receipt", "Get a mined transaction's receipt, execution status, gas use and logs. Returns null while pending or unknown.",
    z.strictObject({ hash: hashSchema }), ({ hash }) => ["eth_getTransactionReceipt", [hash]]);
  register("eth_get_logs", "Query event logs using a filter. Prefer a narrow block range and address/topics. Topic positions use AND, nested arrays use OR, and null is a wildcard. blockHash excludes fromBlock/toBlock. Provider range and result limits apply.",
    z.strictObject({ filter: logFilterSchema }), ({ filter }) => ["eth_getLogs", [filter]]);
  register("eth_call", "Simulate a contract call without broadcasting a transaction. Supply ABI-encoded data/input; returns raw hex return data. Optional state overrides are provider-dependent.",
    z.strictObject({ transaction: transactionSchema, block: blockRefSchema.default("latest"), stateOverrides: z.record(addressSchema, z.json()).optional() }),
    ({ transaction, block, stateOverrides }) => ["eth_call", stateOverrides === undefined ? [transaction, block] : [transaction, block, stateOverrides]]);
  register("eth_estimate_gas", "Estimate gas units for a transaction without broadcasting it. Returns a hex quantity; execution can still change before inclusion.",
    z.strictObject({ transaction: transactionSchema, block: blockRefSchema.optional() }),
    ({ transaction, block }) => ["eth_estimateGas", block === undefined ? [transaction] : [transaction, block]]);
  register("eth_fee_history", "Get historical base fees (wei), gas usage ratios and optional priority-fee percentiles. blockCount is a decimal integer from 1 to 1024; the provider may return fewer blocks.",
    z.strictObject({
      blockCount: z.number().int().min(1).max(1024).default(10),
      newestBlock: blockNumberSchema.default("latest"),
      rewardPercentiles: z.array(z.number().min(0).max(100)).refine(
        (values) => values.every((value, i) => i === 0 || value >= values[i - 1]),
        { message: "Reward percentiles must be sorted in ascending order" },
      ).default([]),
    }), ({ blockCount, newestBlock, rewardPercentiles }) => ["eth_feeHistory", [`0x${blockCount.toString(16)}`, newestBlock, rewardPercentiles]]);
}
