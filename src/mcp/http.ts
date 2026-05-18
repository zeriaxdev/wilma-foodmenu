/*
 * Stateless Streamable HTTP transport mounted on the Express app at /mcp.
 * A fresh transport + server is created per request — simplest for stateless
 * tool calls, and avoids cross-request state. The loopback baseUrl is
 * derived from req.socket.localPort so callers don't have to plumb the
 * bound port through at startup.
 */

import { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import logger from "../utils/logger";
import { createMcpServer } from "./server";

export function mcpHttpHandler() {
  return async (req: Request, res: Response) => {
    const port = req.socket.localPort;
    const baseUrl = `http://127.0.0.1:${port}`;

    const server = createMcpServer(baseUrl);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      logger.error({ err }, "MCP request failed");
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal MCP error" },
          id: null,
        });
      }
    }
  };
}
