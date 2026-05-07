/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import express from "express";
import bodyParser from "body-parser";
import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";
import { readFileSync } from "fs";
import { join } from "path";
import logger from "./utils/logger";

const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);
const PORT = process.env.PORT || 3000;
const SELENIUM_ARGS = process.env.SELENIUM_ARGS || null;
const asikkala = require("./handlers/asikkala").handleAsikkala;
const syk = require("./handlers/syk").handleSyk;
const tyk = require("./handlers/tyk").handleTyk;
const mayk = require("./handlers/mayk").handleMayk;
const phyk = require("./handlers/phyk").handlePhyk;
const poytyaps = require("./handlers/poytyaps").handlePoytya_PS;
const kauhajoki = require("./handlers/kauhajoki").handleKauhajoki;
const steiner = require("./handlers/steiner").handleSteiner;
const krtpl = require("./handlers/krtpl").handleKrtpl;
const lookiKbp = require("./handlers/looki-html").handleLookiKbp;
const pyhtaa = require("./handlers/pyhtaa").handlePyhtaa;
const kastelli = require("./handlers/kastelli").handleKastelli;
const mantsala = require("./handlers/mantsala").handleMantsala;
const issMenuList = require("./handlers/iss").handleISSMenuList;
const issMenu = require("./handlers/iss").handleISSMenu;
const ael = require("./handlers/ael").handleAEL;
const aromaV2 = require("./handlers/aromav2");
const matilda = require("./handlers/matilda");
const loviisa = require("./handlers/loviisa_pk");
const jamix = require("./handlers/jamix");
const menuList = require("./handlers/menu_list");

(global as any).seleniumArgs = SELENIUM_ARGS;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Food Menu API",
      version: pkg.version,
      description:
        "This API provides additional food menus which are not available as JSON. This middleware converts them to JSON format.",
      license: {
        name: "GPL-2.0",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: [
    "./src/main.ts",
    "./src/swagger-schemas.ts",
    "./src/handlers/*.ts",
    "./build/main.js",
    "./build/swagger-schemas.js",
    "./build/handlers/*.js",
  ],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

let app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("X-API-Version", pkg.version);
  next();
});

// Serve raw OpenAPI spec
app.get("/docs/openapi.json", (req, res) => {
  res.json(swaggerSpecs);
});

// Scalar API Reference
app.use(
  "/docs",
  apiReference({
    spec: {
      content: swaggerSpecs,
    },
  }),
);

app.get("/asikkala/menu", asikkala);
app.get("/syk/menu", syk);
app.get("/steiner/menu", steiner);
app.get("/pyhtaa/menu", pyhtaa);
app.get("/krtpl/menu", krtpl);
app.get("/tyk/menu", tyk);
app.get("/mayk/menu", mayk);
app.get("/phyk/menu", phyk);
app.get("/poytyaps/menu", poytyaps);
app.get("/kauhajoki/menu", kauhajoki);
app.get("/looki/:endpoint/menu", lookiKbp);
app.get("/kastelli/menu", kastelli);
app.get("/ael/menu", ael);
app.get("/mantsala/menu", mantsala);
app.get("/iss/menus", issMenuList);
app.get("/iss/menu/:url", issMenu);
app.get("/aroma/:url/restaurants/:id", (req, res) =>
  req?.params?.url == "aromiv2://matilda"
    ? matilda.getRestaurantPage(req, res)
    : aromaV2.getRestaurantPage(req, res),
);
app.get("/aroma/:url/restaurants", (req, res) =>
  req?.params?.url == "aromiv2://matilda"
    ? matilda.getMenuOptions(req, res)
    : aromaV2.getMenuOptions(req, res),
);
app.get("/loviisa/paivakoti/menu", loviisa.handleLoviisaPk);
app.get("/jamix/restaurants", jamix.getMenuOptions);
app.get("/jamix/:query/restaurants", jamix.getMenuOptions);
app.get("/jamix/menu/:customerId/:kitchenId", jamix.getRestaurantPage);

// Menu directory/list endpoint
app.get("/menus", menuList.getMenuList);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API root
 *     description: Returns API metadata including version, documentation link, and available resource paths
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: API info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 name:
 *                   type: string
 *                   example: Food Menu API
 *                 version:
 *                   type: string
 *                   example: "1.2.2"
 *                 docs:
 *                   type: string
 *                   example: /docs
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     menus:
 *                       type: string
 *                       example: /menus
 *                     docs:
 *                       type: string
 *                       example: /docs
 *                     openapi:
 *                       type: string
 *                       example: /docs/openapi.json
 */
app.get("/", (req, res) => {
  res.json({
    status: true,
    name: "Food Menu API",
    version: pkg.version,
    docs: "/docs",
    endpoints: {
      menus: "/menus",
      docs: "/docs",
      openapi: "/docs/openapi.json",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ status: false, cause: "not found" });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server listening");
  logger.info({ url: `http://localhost:${PORT}/docs` }, "API docs available");
});
