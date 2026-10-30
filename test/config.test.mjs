import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import packageInfo from "../package.json" with { type: "json" };
import { parseConfig } from "../dist/server/config.js";

test("supports positional, named and environment configuration", () => {
  assert.equal(parseConfig([], {}).rpcUrl, "https://ethereum-rpc.publicnode.com");
  const expected = { rpcUrl: "http://localhost:8545", chainName: "Local", timeoutMs: 500 };
  assert.deepEqual(parseConfig([expected.rpcUrl, "Local", "--timeout-ms", "500"], {}), expected);
  assert.deepEqual(parseConfig(["--chain-name=Local", "--timeout-ms=500", "--rpc-url", expected.rpcUrl], {}), expected);
  assert.deepEqual(parseConfig([], { ETH_RPC_URL: expected.rpcUrl, ETH_CHAIN_NAME: "Local", ETH_RPC_TIMEOUT_MS: "500" }), expected);
  assert.equal(parseConfig([expected.rpcUrl], { ETH_RPC_URL: "https://example.com" }).rpcUrl, expected.rpcUrl);
});

test("rejects invalid or ambiguous configuration", () => {
  for (const args of [
    ["--analytics"], ["--rpc-url"], ["--rpc-url", "--chain-name", "test"], ["not-a-url"],
    ["file:///tmp/rpc"], ["wss://example.com"], ["https://user:secret@example.com"],
    ["https://example.com/#fragment"], ["https://a.com", "--rpc-url=https://b.com"],
    ["--timeout-ms=0"], ["--timeout-ms=NaN"], ["--timeout-ms=300001"], ["--timeout-ms=1.5"],
    ["--timeout-ms=100", "--timeout-ms=200"], ["https://a.com", "x", "extra"],
  ]) assert.throws(() => parseConfig(args, {}));
});

test("help and version exit without network access; invalid options use stderr", () => {
  const run = (arg) => spawnSync(process.execPath, ["dist/server/index.js", arg], { encoding: "utf8", timeout: 5000 });
  assert.match(run("--help").stdout, /Usage:/);
  assert.equal(run("--version").stdout.trim(), packageInfo.version);
  const invalid = run("--unknown");
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /Unknown option/);
});
