/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Request, Response} from "express";
import {Http} from "../net/http";
import {errorResponse, responseStatus} from "../utils/response_utilities";
import {parse} from "../parsers/ael";


const url = "https://ravintolapalvelut.iss.fi/ael";
let httpClient = new Http();



    /**
 * @swagger
 * /ael/menu:
 *   get:
 *     summary: Get AEL restaurant menu
 *     description: Retrieves the menu for AEL restaurant from ISS food services
 *     tags: [Restaurants]
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
 *                   description: Parsed menu data
 *       500:
 *         description: Server error or unable to parse menu
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
 *                   example: "Unable to parse menu!"
 */
export function handleAEL(req: Request, res: Response) {
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
    })
}