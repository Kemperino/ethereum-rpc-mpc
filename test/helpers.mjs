import { createServer } from "node:http";
import { once } from "node:events";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

export async function mockRpc(t, handler) {
  const requests = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const request = JSON.parse(body);
    requests.push(request);
    await handler(request, res);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return { url: `http://127.0.0.1:${server.address().port}`, requests };
}

export function reply(res, request, result) {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }));
}

export async function connectMcp(t, args, mode = "legacy") {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/server/index.js", ...args],
    stderr: "pipe",
    env: { PATH: process.env.PATH },
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => { stderr += chunk; });
  const client = new Client({ name: "regression-tests", version: "1.0.0" }, { versionNegotiation: { mode } });
  const protocolErrors = [];
  client.onerror = (error) => protocolErrors.push(error.message);
  t.after(() => client.close());
  await client.connect(transport);
  return { client, protocolErrors, stderr: () => stderr };
}
