import { randomUUID } from "node:crypto";
import { DEFAULT_TIMEOUT_MS, validateRpcUrl } from "./config.js";

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export class RpcError extends Error {
  constructor(message: string, public readonly code?: number, public readonly data?: unknown) {
    super(message);
    this.name = "RpcError";
  }
}

export interface RpcClient {
  call(method: string, params: unknown[], signal?: AbortSignal): Promise<unknown>;
}

/** Create a bounded HTTP RPC client. Calls are never retried because methods may mutate state. */
export function createRpcClient(rpcUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): RpcClient {
  validateRpcUrl(rpcUrl);
  return {
    async call(method, params, signal) {
      const id = randomUUID();
      const timeout = AbortSignal.timeout(timeoutMs);
      const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      let response: Response;
      try {
        response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
          signal: requestSignal,
          redirect: "error",
        });
      } catch {
        if (signal?.aborted) throw new RpcError("RPC request cancelled.");
        if (timeout.aborted) throw new RpcError(`RPC request timed out after ${timeoutMs} ms.`);
        throw new RpcError("Could not reach the RPC endpoint.");
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new RpcError(`RPC endpoint returned HTTP ${response.status}.`);
      }
      const body = await readResponse(response, requestSignal, timeoutMs);
      if (!isRecord(body) || body.jsonrpc !== "2.0" || body.id !== id) {
        throw new RpcError("Invalid JSON-RPC response envelope or request ID.");
      }
      const hasResult = Object.hasOwn(body, "result");
      const hasError = Object.hasOwn(body, "error");
      if (hasResult === hasError) throw new RpcError("RPC response must contain exactly one of result or error.");
      if (hasError) {
        const error = body.error;
        if (!isRecord(error) || !Number.isInteger(error.code) || typeof error.message !== "string") {
          throw new RpcError("Invalid JSON-RPC error response.");
        }
        throw new RpcError(error.message, error.code as number, error.data);
      }
      return body.result;
    },
  };
}

async function readResponse(response: Response, signal: AbortSignal, timeoutMs: number): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new RpcError("RPC endpoint returned an empty response.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new RpcError("RPC response exceeds 10 MiB. Narrow the query or request transaction hashes only.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RpcError) throw error;
    if (signal.aborted) {
      throw new RpcError(signal.reason?.name === "TimeoutError"
        ? `RPC request timed out after ${timeoutMs} ms.` : "RPC request cancelled.");
    }
    throw new RpcError("Failed to read the RPC response.");
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RpcError("RPC endpoint returned invalid JSON.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
