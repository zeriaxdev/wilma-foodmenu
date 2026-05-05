/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import express from "express";
import bodyParser from "body-parser";
import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";

const PORT = process.env.PORT || 3001;
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
// Setting logs to include timestamp
require("console-stamp")(console, "HH:MM:ss.l");

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Food Menu API",
      version: "1.2.2",
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
    "./src/swagger-schemas.ts",
    "./src/handlers/*.ts",
    "./build/swagger-schemas.js",
    "./build/handlers/*.js",
  ],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

let app = express();
app.use(bodyParser.json());

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

app.get("*", (req, res) => {
  res.status(404).json({ status: false, cause: "not found" });
});

app.listen(PORT, () => {
  console.log("Listening to port " + PORT);
  console.log(
    `API documentation available at http://localhost:${PORT}/api-docs`,
  );
});
