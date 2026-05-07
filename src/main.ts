/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import express from "express";
import bodyParser from "body-parser";
import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";
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
app.get("/api-docs/openapi.json", (req, res) => {
  res.json(swaggerSpecs);
});

// Scalar API Reference
app.use(
  "/api-docs",
  apiReference({
    spec: {
      content: swaggerSpecs,
    },
  }),
);

app.use("/asikkala/menu", asikkala);
app.use("/syk/menu", syk);
app.use("/steiner/menu", steiner);
app.use("/pyhtaa/menu", pyhtaa);
app.use("/krtpl/menu", krtpl);
app.use("/tyk/menu", tyk);
app.use("/mayk/menu", mayk);
app.use("/phyk/menu", phyk);
app.use("/poytyaps/menu", poytyaps);
app.use("/kauhajoki/menu", kauhajoki);
app.use("/looki/:endpoint/menu", lookiKbp);
app.use("/kastelli/menu", kastelli);
app.use("/ael/menu", ael);
app.use("/mantsala/menu", mantsala);
app.use("/iss/menus", issMenuList);
app.use("/iss/menu/:url", issMenu);
app.use("/aroma/:url/restaurants/:id", (req, res) =>
  req?.params?.url == "aromiv2://matilda"
    ? matilda.getRestaurantPage(req, res)
    : aromaV2.getRestaurantPage(req, res),
);
app.use("/aroma/:url/restaurants", (req, res) =>
  req?.params?.url == "aromiv2://matilda"
    ? matilda.getMenuOptions(req, res)
    : aromaV2.getMenuOptions(req, res),
);
app.use("/loviisa/paivakoti/menu", loviisa.handleLoviisaPk);
app.use("/jamix/restaurants", jamix.getMenuOptions);
app.use("/jamix/:query/restaurants", jamix.getMenuOptions);
app.use("/jamix/menu/:customerId/:kitchenId", jamix.getRestaurantPage);

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
 *                   example: /api-docs
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     menus:
 *                       type: string
 *                       example: /menus
 *                     docs:
 *                       type: string
 *                       example: /api-docs
 *                     openapi:
 *                       type: string
 *                       example: /api-docs/openapi.json
 */
app.get("/", (req, res) => {
  res.json({
    status: true,
    name: "Food Menu API",
    version: pkg.version,
    docs: "/api-docs",
    endpoints: {
      menus: "/menus",
      docs: "/api-docs",
      openapi: "/api-docs/openapi.json",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ status: false, cause: "not found" });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server listening");
  logger.info({ url: `http://localhost:${PORT}/api-docs` }, "API docs available");
});
