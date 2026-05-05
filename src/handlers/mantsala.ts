/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import { Request, Response } from "express";
import { Http } from "../net/http";
import { errorResponse, responseStatus } from "../utils/response_utilities";
import { parse } from "../parsers/kastelli";

const url = "https://mantsala.ravintolapalvelut.iss.fi/mantsalan-koulu";
let httpClient = new Http();

/**
 * @swagger
 * /mantsala/menu:
 *   get:
 *     summary: Get Mantsala school menu
 *     description: Retrieves the weekly menu for Mäntsälä schools via ISS food services
 *     tags: [Schools]
 *     responses:
 *       200:
 *         description: Menu retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuResponse'
 *       500:
 *         description: Server error or unable to parse menu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export function handleMantsala(req: Request, res: Response) {
  httpClient.get(url, (error, response) => {
    if (error || response == undefined) {
      errorResponse(res, 500, error);
      return;
    }
    let parsedMenu = parse(response.body);
    if (parsedMenu !== undefined) {
      responseStatus(res, 200, true, parsedMenu);
    } else {
      errorResponse(res, 500, "Unable to parse menu!");
    }
  });
}
