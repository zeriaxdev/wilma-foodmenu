/*
 * Smoke tests for the MCP endpoint mounted on the Express app at /mcp.
 * Walks the JSON-RPC handshake → tools/list → a couple of tools/call.
 */

import http from "http";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

interface TestCase {
  name: string;
  run: () => Promise<void>;
}

interface RpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: { code: number; message: string };
}

function rpc(id: number, method: string, params?: any): Promise<RpcResponse> {
  const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  const url = new URL(`${BASE_URL}/mcp`);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: "POST",
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          // Streamable HTTP responses are SSE — extract the JSON from "data: <json>"
          const match = data.match(/^data: (.+)$/m);
          if (!match) {
            return reject(
              new Error(`No SSE data line in response (HTTP ${res.statusCode}): ${data.slice(0, 200)}`),
            );
          }
          try {
            resolve(JSON.parse(match[1]));
          } catch (err: any) {
            reject(new Error(`Invalid JSON in SSE payload: ${err.message}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function statusOf(method: "GET" | "DELETE", path: string): Promise<number> {
  const url = new URL(`${BASE_URL}${path}`);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode || 0));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

const EXPECTED_TOOLS = [
  "list_menu_providers",
  "get_menu",
  "search_jamix_restaurants",
  "get_jamix_menu",
];

const CASES: TestCase[] = [
  {
    name: "initialize handshake",
    run: async () => {
      const res = await rpc(1, "initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "menu-api-tests", version: "0.0.1" },
      });
      assert(!res.error, `initialize errored: ${res.error?.message}`);
      assert(res.result?.serverInfo?.name === "menu-api", "wrong serverInfo.name");
      assert(res.result?.capabilities?.tools, "missing tools capability");
    },
  },
  {
    name: "tools/list returns expected tools",
    run: async () => {
      const res = await rpc(2, "tools/list");
      assert(!res.error, `tools/list errored: ${res.error?.message}`);
      const names: string[] = (res.result?.tools ?? []).map((t: any) => t.name);
      for (const expected of EXPECTED_TOOLS) {
        assert(names.includes(expected), `missing tool: ${expected}`);
      }
    },
  },
  {
    name: "tools/call list_menu_providers",
    run: async () => {
      const res = await rpc(3, "tools/call", {
        name: "list_menu_providers",
        arguments: {},
      });
      assert(!res.error, `tool errored: ${res.error?.message}`);
      assert(!res.result?.isError, "tool returned isError");
      const text = res.result?.content?.[0]?.text;
      assert(typeof text === "string", "missing text content");
      const providers = JSON.parse(text);
      assert(Array.isArray(providers), "providers is not an array");
      assert(providers.length > 0, "providers is empty");
    },
  },
  {
    name: "tools/call get_menu rejects unknown provider via schema",
    run: async () => {
      const res = await rpc(4, "tools/call", {
        name: "get_menu",
        arguments: { provider: "does-not-exist" },
      });
      // Schema validation should reject — either as JSON-RPC error or tool error
      const failed =
        !!res.error || res.result?.isError === true;
      assert(failed, "expected schema validation to reject unknown provider");
    },
  },
  {
    name: "GET /mcp returns 405",
    run: async () => {
      const status = await statusOf("GET", "/mcp");
      assert(status === 405, `expected 405, got ${status}`);
    },
  },
  {
    name: "DELETE /mcp returns 405",
    run: async () => {
      const status = await statusOf("DELETE", "/mcp");
      assert(status === 405, `expected 405, got ${status}`);
    },
  },
];

async function run() {
  console.log(`Running ${CASES.length} MCP tests against ${BASE_URL}/mcp\n`);
  let passed = 0;
  let failed = 0;
  for (const c of CASES) {
    const start = Date.now();
    try {
      await c.run();
      const ms = Date.now() - start;
      console.log(`${GREEN}[+]${RESET} ${c.name} ${DIM}(${ms}ms)${RESET}`);
      passed++;
    } catch (err: any) {
      const ms = Date.now() - start;
      console.log(`${RED}[x]${RESET} ${c.name} ${DIM}(${ms}ms)${RESET} — ${err.message}`);
      failed++;
    }
  }
  console.log(
    `\n${GREEN}${passed} passed${RESET}, ${failed > 0 ? RED : ""}${failed} failed${RESET} out of ${CASES.length} total`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

run();
