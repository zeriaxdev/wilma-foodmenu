/*
 * MCP server exposing the food menu API as Model Context Protocol tools.
 * Tools call the same Express server over loopback HTTP — single source of truth.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MENU_PROVIDERS } from "../handlers/menu_list";

const pkg = require("../../package.json");

interface ApiResponse {
  status: boolean;
  cause?: string;
  [k: string]: unknown;
}

async function fetchJson(baseUrl: string, path: string): Promise<ApiResponse> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });
  const body = (await res.json()) as ApiResponse;
  if (!res.ok || body.status === false) {
    throw new Error(body.cause || `Request failed: HTTP ${res.status}`);
  }
  return body;
}

function toolJson(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Error: ${message}` }],
  };
}

/**
 * Menu providers exposed via the simple `get_menu` tool — IDs that resolve
 * to a static endpoint with no required parameters.
 */
const SIMPLE_MENU_IDS = MENU_PROVIDERS.filter(
  (p) => !p.endpoint.includes("{"),
).map((p) => p.id);

/**
 * Register a tool with a Zod input schema. The SDK's overloaded `tool()` types
 * trigger TS2589 (excessively deep instantiation) under strict mode, so we
 * route through a single thin wrapper with an `any`-typed callback. Runtime
 * validation is preserved by Zod inside the SDK.
 */
function registerTool<S extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  schema: S | undefined,
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>,
): void {
  const cb = async (args: any) => handler(args);
  if (schema) {
    (server.tool as any)(name, description, schema, cb);
  } else {
    server.tool(name, description, cb as any);
  }
}

export function createMcpServer(baseUrl: string): McpServer {
  const server = new McpServer({ name: "menu-api", version: pkg.version });

  registerTool(
    server,
    "list_menu_providers",
    "List all available food menu providers with their endpoints, types (school/restaurant/daycare/food_service), and supported features.",
    undefined,
    async () => {
      try {
        const data = await fetchJson(baseUrl, "/menus");
        return toolJson(data.providers);
      } catch (err: any) {
        return toolError(err.message);
      }
    },
  );

  registerTool(
    server,
    "get_menu",
    `Fetch the food menu for a provider with a static endpoint. Returns { menu: Day[], diets: Diet[] }. Supported IDs: ${SIMPLE_MENU_IDS.join(", ")}. For Jamix, Aromi or ISS use the dedicated tools.`,
    {
      provider: z
        .enum(SIMPLE_MENU_IDS as [string, ...string[]])
        .describe("Menu provider id (see list_menu_providers)"),
    },
    async ({ provider }) => {
      const entry = MENU_PROVIDERS.find((p) => p.id === provider);
      if (!entry) return toolError(`Unknown provider: ${provider}`);
      try {
        const data = await fetchJson(baseUrl, entry.endpoint);
        return toolJson({ menu: data.menu, diets: data.diets });
      } catch (err: any) {
        return toolError(err.message);
      }
    },
  );

  registerTool(
    server,
    "search_jamix_restaurants",
    "Search Jamix kitchens by name, address, or city (case-insensitive). Returns customers grouped by customerId, each with their kitchens. Use the returned customerId + kitchenId with get_jamix_menu.",
    {
      query: z
        .string()
        .optional()
        .describe("Search query — omit to list all kitchens"),
    },
    async ({ query }) => {
      const path = query?.trim()
        ? `/jamix/${encodeURIComponent(query.trim())}/restaurants`
        : "/jamix/restaurants";
      try {
        const data = await fetchJson(baseUrl, path);
        return toolJson(data.restaurants);
      } catch (err: any) {
        return toolError(err.message);
      }
    },
  );

  registerTool(
    server,
    "get_jamix_menu",
    "Get the menu for a Jamix kitchen. Includes per-meal portion size, dietary codes, and allergens.",
    {
      customerId: z.string().describe("Jamix customer id"),
      kitchenId: z.string().describe("Jamix kitchen id"),
      date: z
        .string()
        .regex(/^\d{8}$/, "Use YYYYMMDD")
        .optional()
        .describe("Start date (YYYYMMDD)"),
      date2: z
        .string()
        .regex(/^\d{8}$/, "Use YYYYMMDD")
        .optional()
        .describe("End date (YYYYMMDD) — pair with date for a range"),
      lang: z
        .enum(["fi", "en"])
        .optional()
        .describe("Language (defaults to fi)"),
    },
    async ({ customerId, kitchenId, date, date2, lang }) => {
      const params = new URLSearchParams();
      if (lang) params.set("lang", lang);
      if (date) params.set("date", date);
      if (date2) params.set("date2", date2);
      const qs = params.toString();
      const path = `/jamix/menu/${encodeURIComponent(customerId)}/${encodeURIComponent(kitchenId)}${qs ? `?${qs}` : ""}`;
      try {
        const data = await fetchJson(baseUrl, path);
        return toolJson({ menu: data.menu, diets: data.diets });
      } catch (err: any) {
        return toolError(err.message);
      }
    },
  );

  return server;
}
