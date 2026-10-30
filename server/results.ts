import type { CallToolResult } from "@modelcontextprotocol/server";
import { RpcError } from "./rpc.js";

/** Map RPC results and provider errors into MCP tool results while preserving error codes and data. */
export async function rpcResult(call: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const result = await call();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: { result } };
  } catch (error) {
    const details = error instanceof RpcError
      ? { message: error.message, ...(error.code !== undefined && { code: error.code }), ...(error.data !== undefined && { data: error.data }) }
      : { message: "Unexpected error executing RPC call." };
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify({ error: details }, null, 2) }],
      structuredContent: { error: details },
    };
  }
}
