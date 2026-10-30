export interface Config {
  rpcUrl: string;
  chainName: string;
  timeoutMs: number;
}

export const DEFAULT_TIMEOUT_MS = 30_000;

/** Parse CLI options, with explicit arguments taking precedence over environment defaults. */
export function parseConfig(args: string[], env: NodeJS.ProcessEnv = process.env): Config {
  const positional: string[] = [];
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const separator = arg.indexOf("=");
    const key = separator < 0 ? arg : arg.slice(0, separator);
    if (!["--rpc-url", "--chain-name", "--timeout-ms"].includes(key)) {
      throw new Error("Unknown option. Run with --help for supported options.");
    }
    const value = separator < 0 ? args[++i] : arg.slice(separator + 1);
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}.`);
    if (options.has(key)) throw new Error(`Duplicate option ${key}.`);
    options.set(key, value);
  }
  if (positional.length > 2) throw new Error("Expected at most RPC_URL and CHAIN_NAME.");
  if ((positional[0] && options.has("--rpc-url")) || (positional[1] && options.has("--chain-name"))) {
    throw new Error("Use either positional arguments or the corresponding named options.");
  }

  const rpcUrl = options.get("--rpc-url") ?? positional[0] ?? env.ETH_RPC_URL ?? "https://eth.llamarpc.com";
  const chainName = options.get("--chain-name") ?? positional[1] ?? env.ETH_CHAIN_NAME ?? "Ethereum";
  const timeoutMs = Number(options.get("--timeout-ms") ?? env.ETH_RPC_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  validateRpcUrl(rpcUrl);
  if (!chainName.trim()) throw new Error("Chain name must not be empty.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) {
    throw new Error("RPC timeout must be an integer between 1 and 300000 milliseconds.");
  }
  return { rpcUrl, chainName, timeoutMs };
}

/** Validate an HTTP endpoint without exposing its credentials in diagnostics. */
export function validateRpcUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("RPC URL must be an absolute HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("RPC URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password || url.hash) {
    throw new Error("RPC URL must not contain userinfo or a fragment.");
  }
  return url;
}
