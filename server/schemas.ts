import { z } from "zod";

export const rpcParamsSchema = z.array(z.json());

// JSON-RPC quantities are minimal hex integers; byte strings contain whole bytes.
export const quantitySchema = z.string().regex(/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/)
  .describe("Hex quantity without leading zeroes, for example 0x0 or 0x10");
export const bytesSchema = z.string().regex(/^0x(?:[0-9a-fA-F]{2})*$/)
  .describe("0x-prefixed bytes with an even number of hex digits");
export const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
  .describe("20-byte hex Ethereum address; ENS names must be resolved first");
export const hashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/)
  .describe("32-byte hex hash");
export const blockNumberSchema = z.union([
  quantitySchema,
  z.enum(["latest", "earliest", "pending", "safe", "finalized"]),
]);
export const blockRefSchema = z.union([
  blockNumberSchema,
  z.strictObject({ blockHash: hashSchema, requireCanonical: z.boolean().optional() }),
  z.strictObject({ blockNumber: quantitySchema }),
]).describe("Block number/tag or EIP-1898 block reference; historical state may require an archive provider");

export const transactionSchema = z.object({
  from: addressSchema.optional(),
  to: addressSchema.optional(),
  data: bytesSchema.optional().describe("ABI-encoded calldata, including the function selector"),
  input: bytesSchema.optional(),
  value: quantitySchema.optional().describe("Value in wei as a hex quantity"),
  gas: quantitySchema.optional(),
  gasPrice: quantitySchema.optional(),
  maxFeePerGas: quantitySchema.optional(),
  maxPriorityFeePerGas: quantitySchema.optional(),
  maxFeePerBlobGas: quantitySchema.optional(),
  nonce: quantitySchema.optional(),
  type: quantitySchema.optional(),
  chainId: quantitySchema.optional(),
  accessList: z.array(z.strictObject({ address: addressSchema, storageKeys: z.array(hashSchema) })).optional(),
  blobVersionedHashes: z.array(hashSchema).optional(),
  authorizationList: z.array(z.json()).optional(),
}).catchall(z.json()).refine((tx) => tx.data === undefined || tx.input === undefined || tx.data === tx.input, {
  message: "data and input must match when both are provided",
});

export const logFilterSchema = z.strictObject({
  fromBlock: blockNumberSchema.optional(),
  toBlock: blockNumberSchema.optional(),
  blockHash: hashSchema.optional(),
  address: z.union([addressSchema, z.array(addressSchema).min(1)]).optional(),
  topics: z.array(z.union([hashSchema, z.null(), z.array(z.union([hashSchema, z.null()]))])).max(4).optional(),
}).refine((filter) => filter.blockHash === undefined || (filter.fromBlock === undefined && filter.toBlock === undefined), {
  message: "blockHash cannot be combined with fromBlock or toBlock",
}).refine((filter) => {
  if (filter.fromBlock?.startsWith("0x") && filter.toBlock?.startsWith("0x")) {
    return BigInt(filter.fromBlock) <= BigInt(filter.toBlock);
  }
  return true;
}, { message: "fromBlock must not exceed toBlock" });
