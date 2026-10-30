# Ethereum RPC MCP Server

[![npm version](https://img.shields.io/npm/v/ethereum-rpc-mpc.svg)](https://www.npmjs.com/package/ethereum-rpc-mpc)
[![CI](https://github.com/Kemperino/ethereum-rpc-mpc/actions/workflows/ci.yml/badge.svg)](https://github.com/Kemperino/ethereum-rpc-mpc/actions/workflows/ci.yml)

Connect an MCP client to Ethereum or another EVM chain through an HTTP JSON-RPC endpoint. The server provides 13 focused read/simulation tools, a generic RPC tool, and a configuration resource. It runs over stdio and supports both older MCP clients and the 2026-07-28 protocol through the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

The npm package and executable retain the historical spelling **`ethereum-rpc-mpc`** for compatibility. The protocol is MCP.

## Requirements and installation

Requires **Node.js 22 or newer**. CI covers Node 22, 24 and 26.

```sh
npx -y ethereum-rpc-mpc [RPC_URL] [CHAIN_NAME]
```

To build and run from source:

```sh
git clone https://github.com/Kemperino/ethereum-rpc-mpc.git
cd ethereum-rpc-mpc
yarn install --frozen-lockfile
yarn build
node dist/server/index.js https://ethereum-rpc.publicnode.com Ethereum
```

The default endpoint is `https://ethereum-rpc.publicnode.com`. Supply your own provider URL or local node when you need dedicated capacity, archive data, or provider-specific methods. Each server process connects to one endpoint.

## MCP client configuration

For a client that accepts `mcpServers` configuration, launch the built checkout with an absolute path:

```json
{
  "mcpServers": {
    "ethereum": {
      "command": "node",
      "args": ["/absolute/path/to/ethereum-rpc-mpc/dist/server/index.js"],
      "env": {
        "ETH_RPC_URL": "https://ethereum-rpc.publicnode.com",
        "ETH_CHAIN_NAME": "Ethereum",
        "ETH_RPC_TIMEOUT_MS": "30000"
      }
    }
  }
}
```

Alternatively, use `"command": "npx"` and `"args": ["-y", "ethereum-rpc-mpc"]` to run the npm package instead. Keep private provider URLs in your client's local environment configuration.

You can also pass positional arguments or named flags:

```sh
node dist/server/index.js http://127.0.0.1:8545 Local
node dist/server/index.js --rpc-url https://ethereum-rpc.publicnode.com --chain-name Ethereum --timeout-ms 15000
node dist/server/index.js --help
node dist/server/index.js --version
```

Explicit arguments override environment variables. Timeout values must be integers from 1 to 300000 milliseconds. URLs must use HTTP(S), without embedded username/password or fragments. Startup does not contact the RPC provider; failures are reported when a tool is used. A configured chain name is only a label: use `eth_chain_id` to verify the network.

## Tools

All focused tools are annotated as read-only. `eth_call` and `eth_estimate_gas` simulate execution without broadcasting a transaction.

| Tool | Purpose |
| --- | --- |
| `eth_chain_id` | Verify the connected chain |
| `eth_block_number` | Read the current head block number |
| `eth_get_balance` | Read a native currency balance in wei |
| `eth_get_transaction_count` | Read an account nonce, including pending state |
| `eth_get_code` | Read deployed bytecode |
| `eth_get_storage_at` | Read a contract storage slot |
| `eth_get_block` | Read a block by number, tag or hash, with optional full transactions |
| `eth_get_transaction` | Read a transaction by hash |
| `eth_get_transaction_receipt` | Read execution status, gas usage and logs |
| `eth_get_logs` | Query event logs with address, topic and block filters |
| `eth_call` | Simulate ABI-encoded calldata, optionally with state overrides |
| `eth_estimate_gas` | Estimate transaction gas units |
| `eth_fee_history` | Read base fees, gas usage ratios and priority-fee percentiles |
| `eth_json_rpc_call` | Call any RPC method supported by the provider |

**The generic tool can execute state-changing methods**, including transaction submission and node/account operations if the provider exposes them. Its MCP annotations reflect this. The server does not hold private keys or sign transactions. Restrict your endpoint's methods if you need an entirely read-only setup.

Successful tool results preserve the provider's JSON values in `structuredContent.result` and JSON text content. Quantities remain hex strings, including values too large for JavaScript numbers. Unknown or pending receipts can return `null`; this is not a tool failure. RPC failures return `isError: true`, with the provider's error code and data when available.

### Examples of tool arguments

Read a balance at a finalized block:

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "block": "finalized"
}
```

Call `eth_call` with pre-encoded ERC-20 `totalSupply()` calldata:

```json
{
  "transaction": {
    "to": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "data": "0x18160ddd"
  },
  "block": "latest"
}
```

Call `eth_get_logs` over a specific range:

```json
{
  "filter": {
    "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "fromBlock": "0x1234000",
    "toBlock": "0x1234010"
  }
}
```

The generic tool accepts arbitrary positional JSON values, including objects and booleans:

```json
{
  "method": "eth_getBlockByNumber",
  "params": ["latest", true]
}
```

Block tags include `latest`, `earliest`, `pending`, `safe` and `finalized`. State reads also accept EIP-1898 objects such as `{"blockHash": "0x<64 hex digits>", "requireCanonical": true}`. For `eth_get_block`, use `{"block": {"blockHash": "0x<64 hex digits>"}}` to select a hash.

Log topics use positional AND, nested arrays for OR, and `null` as a wildcard. A log filter's `blockHash` cannot be combined with `fromBlock` or `toBlock`. Fee-history `blockCount` is a decimal integer (1–1024); most other numeric RPC inputs are minimal hex quantities such as `0x0` or `0x10`.

## Behavior and limits

- `text://rpc_info` reports the configured label, endpoint origin, and timeout. It omits URL paths and query strings because they can contain API keys.
- Calls have a 30-second default deadline, honor MCP cancellation, and limit each RPC response to 10 MiB. Narrow log ranges or request transaction hashes if a response is too large.
- Requests are never automatically retried. A timeout on transaction submission does not establish whether the provider accepted it.
- Provider errors, limits and method support still apply. Historical state may require an archive node. There is no automatic pagination, failover, indexing, ENS resolution, ABI encoding/decoding, or WebSocket subscription support.
- New Ethereum result fields are passed through unchanged. Transaction simulation accepts additional JSON fields, including provider extensions; the generic tool remains available for new RPC methods.

## Development

With Nix installed and `nix-command` and `flakes` enabled, enter a development shell with Node.js 24 (including npm) and Yarn 1.22.22:

```sh
nix develop
```

The committed `flake.lock` pins the toolchain for macOS and Linux on Apple Silicon/ARM64 and x86-64. Entering the shell does not install JavaScript dependencies; run the commands below explicitly. To run a command without entering an interactive shell, use `nix develop --command yarn test` after installing dependencies. Update the Nixpkgs pin with `nix flake update nixpkgs`.

```sh
yarn install --frozen-lockfile
yarn typecheck
yarn test
yarn inspector
npm pack --dry-run
```

Tests use local mock RPC endpoints and real MCP stdio clients; they need loopback socket access but no external RPC credentials. They cover both protocol generations, structured parameters, tool dispatch, input validation, malformed provider replies, errors, deadlines, cancellation, and credential-safe configuration reporting.

Builds clear `dist` first so removed features cannot survive in a package as stale JavaScript. Only compiled files, package metadata, README and license are distributed. TypeScript and the MCP test client are development dependencies.

## Migration and release

See [CHANGELOG.md](CHANGELOG.md). Version 2.0.0 introduces these compatibility changes:

- Node 22+ replaces the previous unspecified runtime requirement.
- Zircuit-specific tools and automatic chain detection are removed.
- SQLite analytics, `--analytics` and `--db-path` are removed. Old flags now fail with a configuration error.
- `rpc_info` now returns JSON with an endpoint origin instead of the full RPC URL.
- The default RPC provider is PublicNode. Explicit endpoints and the generic tool name remain supported.

The publish workflow runs on **published stable GitHub releases**, verifies that the tag is exactly `v<package.json version>`, installs the frozen lockfile, type-checks, tests and checks the package before publishing with the existing `NPM_TOKEN` secret. Prereleases are skipped. Before publishing, update the package version and changelog in a separate release commit and confirm that CI and npm credentials are working.

## References

- [Ethereum Execution API specifications](https://github.com/ethereum/execution-apis)
- [MCP SDK v2 migration](https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2)
- [PublicNode Ethereum endpoint](https://ethereum.publicnode.com/)

## License

MIT. See [LICENSE.md](LICENSE.md).
