/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import { ISSRestaurant } from "../models/iss/ISSRestaurant";
import { Http } from "../net/http";
import { parseList, parse } from "../parsers/iss-web";
import { Request, Response } from "express";
import { errorResponse, responseStatus } from "../utils/response_utilities";
import logger from "../utils/logger";
import { HashUtils } from "../crypto/hash";
import { CacheContainer } from "node-ts-cache";
import { MemoryStorage } from "node-ts-cache-storage-memory";

const urlRegex =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
const listUrl =
  "https://ravintolapalvelut.iss.fi/ravintolat?nayta=koulut-ja-paivahoito";
let httpClient = new Http();
const type = "iss_web";
let userCache = new CacheContainer(new MemoryStorage());

export function getISSMenus() {
  return new Promise<ISSRestaurant[]>((resolve, reject) => {
    httpClient.get(listUrl, (err, resp) => {
      if (err || resp == undefined) {
        reject(err);
        return;
      }
      let parsedList = parseList(resp.body);
      resolve(parsedList);
    });
  });
}

/**
 * @swagger
 * /iss/menus:
 *   get:
 *     summary: List ISS restaurants
 *     description: Retrieves all ISS restaurants available for menu retrieval
 *     tags: [ISS]
 *     responses:
 *       200:
 *         description: Restaurant list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 menus:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ISSRestaurant'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export function handleISSMenuList(req: Request, res: Response) {
  getISSMenus()
    .then((result) => {
      responseStatus(res, 200, true, { menus: result });
    })
    .catch((err) => {
      logger.error({ err }, "Failed to fetch ISS restaurant list");
      errorResponse(res, 500, err.toString());
    });
}

/**
 * @swagger
 * /iss/menu/{url}:
 *   get:
 *     summary: Get ISS restaurant menu
 *     description: Retrieves the menu for a specific ISS restaurant. Use the iss:// prefix (converted to https://) or a full URL. Must point to an iss.fi domain.
 *     tags: [ISS]
 *     parameters:
 *       - in: path
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant URL (use iss:// prefix or full https:// URL pointing to iss.fi)
 *     responses:
 *       200:
 *         description: Menu retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuResponse'
 *       400:
 *         description: Missing or invalid URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export function handleISSMenu(req: Request, res: Response) {
  if (!req.params.url) {
    responseStatus(res, 400, false, { cause: "URL not specified!" });
    return;
  }
  let url = req.params.url as string;
  url = url.replace("iss://", "https://");
  if (!url.match(urlRegex)) {
    responseStatus(res, 400, false, { cause: "Invalid or malformed URL!" });
    return;
  }
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.endsWith("iss.fi")) {
      responseStatus(res, 400, false, {
        cause: "URL must point to an ISS domain!",
      });
      return;
    }
  } catch {
    responseStatus(res, 400, false, { cause: "Invalid or malformed URL!" });
    return;
  }
  let menuKeyHash = HashUtils.sha1Digest(url + "_" + type);
  userCache
    .getItem(menuKeyHash)
    .then((cacheResponse) => {
      if (cacheResponse) responseStatus(res, 200, true, cacheResponse as any);
      else {
        httpClient.get(url, (err, resp) => {
          if (err || resp == undefined) {
            logger.error({ err, url }, "ISS menu fetch failed");
            return;
          }
          let parsedMenu = parse(resp.body, menuKeyHash);
          userCache
            .setItem(menuKeyHash, parsedMenu, {})
            .then(() => {
              responseStatus(res, 200, true, parsedMenu);
            })
            .catch((err) => {
              errorResponse(res, 500, err.toString());
            });
        });
      }
    })
    .catch((err) => {
      errorResponse(res, 500, err.toString());
    });
}
