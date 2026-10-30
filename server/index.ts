#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';
import { callRPC, validateRpcUrl, getChainId } from "./utils.js";
export let RPC_URL = process.argv[2];

if (!RPC_URL) {
  RPC_URL = "https://eth.llamarpc.com"
  console.log(`No RPC URL provided, using default: ${RPC_URL}`);
}

const CHAIN_NAME = process.argv[3] || "Ethereum";

await validateRpcUrl(RPC_URL);

// Get and display the chain ID during initialization
let chainId = 1;
try {
  chainId = await getChainId();
  console.log(`Connected to network with Chain ID: ${chainId}`);
} catch (error) {
  console.warn("Could not retrieve chain ID, but continuing with server initialization");
}

let server = new McpServer({
  name: "ethereum-rpc-mpc",
  version: "1.0.0"
});

server.tool(
  'eth_json_rpc_call',
  `Parameters:
- method (string, REQUIRED): The JSON-RPC method to execute.
- params (array, REQUIRED): The parameters for the JSON-RPC method.`,
  {
    method: z.string(),
    params: z.array(z.string())
  },
  async ({ method, params }) => {
    try {
      const result = await callRPC(method, params);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error executing RPC call: ${error.message || 'Unknown error'}`
        }]
      };
    }
  }
);

server.resource(
  "rpc_info",
  "text://rpc_info",
  async (uri: URL, extra: any) => {
    return {
      contents: [{
        uri: uri.href,
        text: `Current RPC URL: ${RPC_URL} for ${CHAIN_NAME}`
      }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
