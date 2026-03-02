/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import { ISSRestaurant } from "../models/iss/ISSRestaurant";
import { Http } from "../net/http";
import { parseList, parse } from "../parsers/iss-web";
import { Request, Response } from "express";
import { errorResponse, responseStatus } from "../utils/response_utilities";
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
 *     summary: Get list of ISS restaurants
 *     description: Retrieves a list of all ISS restaurants available for menu data
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     menus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Restaurant information
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 cause:
 *                   type: string
 */
export function handleISSMenuList(req: Request, res: Response) {
  getISSMenus()
    .then((result) => {
      responseStatus(res, 200, true, { menus: result });
    })
    .catch((err) => {
      errorResponse(res, 500, err.toString());
    });
}

/**
 * @swagger
 * /iss/menu/{url}:
 *   get:
 *     summary: Get ISS restaurant menu
 *     description: Retrieves the menu for a specific ISS restaurant using its URL
 *     tags: [ISS]
 *     parameters:
 *       - in: path
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant URL (can use iss:// prefix which gets converted to https://)
 *         example: "iss://example-restaurant.com"
 *     responses:
 *       200:
 *         description: Menu retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Parsed menu data for the restaurant
 *       400:
 *         description: Missing URL parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 cause:
 *                   type: string
 *                   example: "URL not specified!"
 *       500:
 *         description: Server error or unable to retrieve/parse menu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 cause:
 *                   type: string
 */
export function handleISSMenu(req: Request, res: Response) {
  if (!req.params.url) {
    responseStatus(res, 400, false, { cause: "URL not specified!" });
    return;
  }
  let url = req.params.url;
  url = url.replace("iss://", "https://");
  let menuKeyHash = HashUtils.sha1Digest(url + "_" + type);
  userCache
    .getItem(menuKeyHash)
    .then((cacheResponse) => {
      if (cacheResponse) responseStatus(res, 200, true, cacheResponse as any);
      else {
        httpClient.get(url, (err, resp) => {
          if (err || resp == undefined) {
            errorResponse(res, 500, err?.toString());
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
