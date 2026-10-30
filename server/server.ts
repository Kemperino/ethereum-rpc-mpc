import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import packageInfo from "../package.json" with { type: "json" };
import type { Config } from "./config.js";
import { createRpcClient, type RpcClient } from "./rpc.js";
import { rpcResult } from "./results.js";
import { registerEthereumTools } from "./tools.js";
import { rpcParamsSchema } from "./schemas.js";

/** Build an independent MCP server without connecting a transport or contacting the endpoint. */
export function createServer(config: Config, rpc: RpcClient = createRpcClient(config.rpcUrl, config.timeoutMs)): McpServer {
  const server = new McpServer({ name: packageInfo.name, version: packageInfo.version });
  server.registerTool("eth_json_rpc_call", {
    description: "Execute an Ethereum JSON-RPC method with positional JSON parameters. Supports objects, arrays, booleans, numbers and null. Methods such as eth_sendRawTransaction can change chain state. HTTP requests only; subscriptions require WebSocket support and are not supported.",
    inputSchema: z.object({
      method: z.string().trim().min(1).describe("RPC method name, for example eth_call or eth_getLogs"),
      params: rpcParamsSchema.default([]).describe("Positional JSON parameters in the order required by the RPC method"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }, async ({ method, params }, ctx) => rpcResult(() => rpc.call(method, params, ctx.mcpReq.signal)));

  server.registerResource("rpc_info", "text://rpc_info", {
    description: "Configured chain label and RPC origin. URL paths and query parameters are omitted to protect endpoint credentials. The label does not verify the chain ID.",
    mimeType: "application/json",
  }, async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify({ chainName: config.chainName, rpcOrigin: new URL(config.rpcUrl).origin, timeoutMs: config.timeoutMs }),
    }],
  }));
  registerEthereumTools(server, rpc);
  return server;
}
