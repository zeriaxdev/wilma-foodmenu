/*
 * Copyright (c) 2025 zeriaxdev
 */

import {Request, Response} from "express";
import {responseStatus, errorResponse} from "../utils/response_utilities";
import {Restaurant} from "../models/Restaurant";
import {Day} from "../models/Day";
import {Menu} from "../models/Menu";
import {Meal} from "../models/Meal";
import {Diet} from "../models/Diet";
import {HashUtils} from "../crypto/hash";
import {CacheContainer} from "node-ts-cache";
import {MemoryStorage} from "node-ts-cache-storage-memory";
import fetch, {Response as FetchResponse} from "node-fetch";
import moment from "moment";

const searchUrl = "https://fi.jamix.cloud/apps/menuservice/rest/haku/public";
const menuBaseUrl = "http://fi.jamix.cloud/apps/menuservice/rest/haku/menu";
let userCache = new CacheContainer(new MemoryStorage());

interface JamixKitchen {
    kitchenName: string;
    kitchenId: number;
    address: string;
    city: string;
    email: string;
    phone: string;
    info: string;
    menuTypes: Array<{
        menuTypeId: number;
        menuTypeName: string;
        menus: Array<{
            menuName: string;
            menuAdditionalName: string;
            menuId: number;
            menuSettings: number;
            favorite: boolean;
        }>;
    }>;
}

interface JamixSearchResponse {
    customerId: string;
    kitchens: JamixKitchen[];
}

interface JamixMenuItem {
    name: string;
    orderNumber: number;
    portionSize: number;
    diets: string;
    ingredients: string;
    images: string[];
}

interface JamixMealOption {
    name: string;
    orderNumber: number;
    id: number;
    menuItems: JamixMenuItem[];
}

interface JamixDay {
    date: number;
    weekday: number;
    mealoptions: JamixMealOption[];
    lang: string;
}

interface JamixMenuResponse {
    kitchenName: string;
    kitchenId: number;
    menuTypes: Array<{
        menuTypeId: number;
        menuTypeName: string;
        menus: Array<{
            menuName: string;
            menuAdditionalName: string;
            menuId: number;
            days: JamixDay[];
        }>;
    }>;
}

/**
 * @swagger
 * /jamix/restaurants:
 *   get:
 *     summary: Get all Jamix restaurants
 *     description: Retrieves a list of all available restaurants/kitchens from Jamix food service
 *     tags: [Jamix]
 *     responses:
 *       200:
 *         description: Restaurants retrieved successfully
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
 *                     restaurants:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           customerId:
 *                             type: string
 *                           kitchens:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 kitchenName:
 *                                   type: string
 *                                 kitchenId:
 *                                   type: number
 *                                 address:
 *                                   type: string
 *                                 city:
 *                                   type: string
 *
 * /jamix/{query}/restaurants:
 *   get:
 *     summary: Search Jamix restaurants
 *     description: Search for restaurants/kitchens from Jamix food service using a query parameter
 *     tags: [Jamix]
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for filtering restaurants
 *     responses:
 *       200:
 *         description: Restaurants retrieved successfully
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
 *                     restaurants:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           customerId:
 *                             type: string
 *                           kitchens:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 kitchenName:
 *                                   type: string
 *                                 kitchenId:
 *                                   type: number
 *                                 address:
 *                                   type: string
 *                                 city:
 *                                   type: string
 */
export async function getMenuOptions(req: Request, res: Response) {
    try {
        const query = req.params.query || '';
        const hashKey = HashUtils.sha1Digest(`jamix_search_${query || 'all'}`);
        const cache = await userCache.getItem(hashKey);
        
        if (cache) {
            responseStatus(res, 200, true, {restaurants: cache});
            return;
        }

        // Try GET request to the public API
        // The API might return all kitchens or accept query parameters
        let searchResponse: FetchResponse;
        if (query) {
            searchResponse = await fetch(`${searchUrl}?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
        } else {
            searchResponse = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
        }

        if (!searchResponse.ok) {
            // Try POST if GET fails (some APIs require POST)
            const postResponse = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: query ? JSON.stringify({query: query}) : '{}'
            });

            if (!postResponse.ok) {
                responseStatus(res, 500, false, {cause: `Search API returned ${postResponse.status}: ${await postResponse.text()}`});
                return;
            }

            const data: JamixSearchResponse[] = await postResponse.json();
            const restaurants = extractRestaurants(data);
            await userCache.setItem(hashKey, restaurants, {ttl: 3600});
            responseStatus(res, 200, true, {restaurants});
            return;
        }

        const data: JamixSearchResponse[] = await searchResponse.json();
        const restaurants = extractRestaurants(data);
        await userCache.setItem(hashKey, restaurants, {ttl: 3600});
        responseStatus(res, 200, true, {restaurants});
    } catch (error: any) {
        errorResponse(res, 500, error);
    }
}

/**
 * Extract Restaurant objects from Jamix search response
 */
function extractRestaurants(data: JamixSearchResponse[]): Restaurant[] {
    const restaurants: Restaurant[] = [];
    
    for (const customer of data) {
        for (const kitchen of customer.kitchens) {
            // Use customerId and kitchenId as the ID
            const id = `${customer.customerId}_${kitchen.kitchenId}`;
            restaurants.push(new Restaurant(id, kitchen.kitchenName));
        }
    }
    
    return restaurants;
}

/**
 * @swagger
 * /jamix/menu/{customerId}/{kitchenId}:
 *   get:
 *     summary: Get restaurant menu
 *     description: Retrieves the menu for a specific Jamix restaurant/kitchen. Supports date filtering for specific days or date ranges.
 *     tags: [Jamix]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID of the restaurant
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kitchen ID of the restaurant
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Start date in YYYYMMDD format (e.g., 20241225). If not provided, returns current menu.
 *         example: "20241225"
 *       - in: query
 *         name: date2
 *         schema:
 *           type: string
 *         description: End date in YYYYMMDD format (e.g., 20241231). Use with date for date range.
 *         example: "20241231"
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [fi, en]
 *         description: Language for menu data (fi = Finnish, en = English)
 *         default: fi
 *         example: "fi"
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
 *                   description: Menu data for the restaurant
 *       400:
 *         description: Missing required parameters
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
 *                   example: "Customer ID and Kitchen ID not specified!"
 *       500:
 *         description: Server error or unable to retrieve menu
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
export async function getRestaurantPage(req: Request, res: Response) {
    try {
        if (!req.params.customerId || !req.params.kitchenId) {
            responseStatus(res, 400, false, {cause: 'Customer ID and Kitchen ID not specified!'});
            return;
        }

        const customerId = req.params.customerId;
        const kitchenId = req.params.kitchenId;
        const lang = req.query.lang || 'fi';
        const date = req.query.date as string;
        const date2 = req.query.date2 as string;

        const hashKey = HashUtils.sha1Digest(`jamix_menu_${customerId}_${kitchenId}_${lang}_${date || ''}_${date2 || ''}`);
        const cache = await userCache.getItem(hashKey);

        if (cache) {
            responseStatus(res, 200, true, cache as any);
            return;
        }

        let menuUrl = `${menuBaseUrl}/${customerId}/${kitchenId}?lang=${lang}`;

        // Add date parameters if provided
        if (date) {
            menuUrl += `&date=${date}`;
        }
        if (date2) {
            menuUrl += `&date2=${date2}`;
        }

        const menuResponse = await fetch(menuUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!menuResponse.ok) {
            responseStatus(res, 500, false, {cause: `Menu API returned ${menuResponse.status}`});
            return;
        }

        const data: JamixMenuResponse[] = await menuResponse.json();
        
        if (!data || data.length === 0) {
            responseStatus(res, 200, true, {menu: [], diets: []});
            return;
        }

        // Extract days and diets from the first kitchen (should only be one)
        const kitchen = data[0];
        const {days, diets} = parseMenuData(kitchen);
        
        const result = {menu: days, diets: diets};
        await userCache.setItem(hashKey, result, {ttl: 3600});
        responseStatus(res, 200, true, result);
    } catch (error: any) {
        errorResponse(res, 500, error);
    }
}

/**
 * Parse Jamix menu response into Day[] and Diet[]
 */
function parseMenuData(kitchen: JamixMenuResponse): {days: Day[], diets: Diet[]} {
    const days: Day[] = [];
    const dietsMap = new Map<string, Diet>();

    // Iterate through menu types and menus
    for (const menuType of kitchen.menuTypes) {
        for (const menu of menuType.menus) {
            // Group days by date
            const daysMap = new Map<string, JamixDay[]>();
            
            for (const day of menu.days) {
                const dateStr = formatDate(day.date);
                if (!daysMap.has(dateStr)) {
                    daysMap.set(dateStr, []);
                }
                daysMap.get(dateStr)!.push(day);
            }

            // Convert to Day objects
            for (const [dateStr, dayData] of daysMap) {
                const menus: Menu[] = [];
                
                // Group meal options by name (e.g., "Lounas")
                const mealOptionsMap = new Map<string, Meal[]>();
                
                for (const dayItem of dayData) {
                    for (const mealOption of dayItem.mealoptions) {
                        if (!mealOptionsMap.has(mealOption.name)) {
                            mealOptionsMap.set(mealOption.name, []);
                        }
                        
                        // Add all menu items as meals
                        for (const menuItem of mealOption.menuItems) {
                            const mealId = `${mealOption.id}_${menuItem.orderNumber}`;
                            mealOptionsMap.get(mealOption.name)!.push(
                                new Meal(mealId, menuItem.name, menuItem.ingredients || undefined)
                            );
                            
                            // Extract diets from menu item
                            if (menuItem.diets && menuItem.diets.trim()) {
                                const dietCodes = menuItem.diets.split(',').map(d => d.trim());
                                for (const dietCode of dietCodes) {
                                    if (dietCode && !dietsMap.has(dietCode)) {
                                        dietsMap.set(dietCode, new Diet(dietCode, `Diet code: ${dietCode}`));
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Convert meal options to Menu objects
                for (const [menuName, meals] of mealOptionsMap) {
                    menus.push(new Menu(menuName, meals));
                }
                
                // Create Day object
                const dayDate = moment(dayData[0].date.toString(), 'YYYYMMDD');
                days.push(new Day(dayDate.format('YYYY-MM-DD'), menus));
            }
        }
    }

    // Sort days by date
    days.sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    const diets = Array.from(dietsMap.values());
    
    return {days, diets};
}

/**
 * Format date from YYYYMMDD to YYYY-MM-DD
 */
function formatDate(dateNum: number): string {
    const dateStr = dateNum.toString();
    if (dateStr.length !== 8) {
        return moment(dateNum).format('YYYY-MM-DD');
    }
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}