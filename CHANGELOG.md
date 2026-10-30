# Changelog

## Unreleased

### Breaking changes

- Require Node.js 22 or newer.
- Remove Zircuit-specific tools and chain detection.
- Remove SQLite analytics and its command-line flags.
- Return JSON configuration metadata from `text://rpc_info`, omitting endpoint credentials in URL paths and queries.
- Change the default RPC endpoint to `https://ethereum-rpc.publicnode.com`.

### Added

- Thirteen discoverable Ethereum read/simulation tools with input validation, block tags and EIP-1898 state references.
- Named CLI flags and environment-based endpoint, chain-label and timeout configuration.
- MCP v2 support for legacy clients and the 2026-07-28 protocol.
- Structured results and errors, bounded responses, configurable deadlines and cancellation.
- Tests with local RPC mocks and real stdio clients, plus CI for Node 22, 24 and 26.
- Clean package builds and a release workflow that verifies versions and tests before publishing.

### Fixed

- [#2](https://github.com/Kemperino/ethereum-rpc-mpc/issues/2): accept objects, booleans, numbers, null and nested arrays in JSON-RPC parameters.
- Keep startup diagnostics out of the MCP stdout channel.
- Allow MCP startup and tool discovery when the RPC provider is unavailable.
- Validate JSON-RPC response IDs, versions, result/error envelopes and HTTP failures.
- Preserve provider error codes and revert data, marking failed tool calls with `isError`.
- Report the package version consistently through MCP and the CLI.

### Dependencies

- Replace the v1 MCP SDK with `@modelcontextprotocol/server` v2 and upgrade to Zod 4 and TypeScript 7.
- Replace Axios with Node's built-in fetch and remove unused dotenv.
- Move compiler, Node types and the MCP test client into development dependencies.
