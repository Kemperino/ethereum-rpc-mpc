#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import packageInfo from "../package.json" with { type: "json" };
import { parseConfig } from "./config.js";
import { createServer } from "./server.js";

const args = process.argv.slice(2);
if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
  console.log(`Usage: ethereum-rpc-mpc [RPC_URL] [CHAIN_NAME] [options]

Options:
  --rpc-url URL       HTTP(S) Ethereum JSON-RPC endpoint
  --chain-name NAME   Display name (default: Ethereum)
  --timeout-ms MS     RPC timeout, 1–300000 (default: 30000)
  --help, -h          Show this help
  --version, -v       Show package version

Environment defaults: ETH_RPC_URL, ETH_CHAIN_NAME, ETH_RPC_TIMEOUT_MS
Default endpoint: https://eth.llamarpc.com
Runs over MCP stdio. The generic RPC tool can execute state-changing methods.`);
} else if (args.length === 1 && ["--version", "-v"].includes(args[0])) {
  console.log(packageInfo.version);
} else {
  try {
    const config = parseConfig(args);
    const handle = serveStdio(() => createServer(config), {
      onerror: () => console.error("MCP transport error."),
    });
    const close = () => {
      void handle.close().catch(() => {
        console.error("Failed to close MCP transport.");
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unable to start MCP server.");
    process.exitCode = 1;
  }
}
