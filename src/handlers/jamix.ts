/*
 * Copyright (c) 2025 zeriaxdev
 */

import { Request, Response } from "express";
import { responseStatus, errorResponse } from "../utils/response_utilities";
import { Day } from "../models/Day";
import { Menu } from "../models/Menu";
import { Meal, NutritionInfo } from "../models/Meal";
import { Diet } from "../models/Diet";
import { HashUtils } from "../crypto/hash";
import { CacheContainer } from "node-ts-cache";
import { MemoryStorage } from "node-ts-cache-storage-memory";
import fetch from "node-fetch";
import moment from "moment";

const searchUrl = "https://fi.jamix.cloud/apps/menuservice/rest/haku/public";
const menuBaseUrl = "https://fi.jamix.cloud/apps/menuservice/rest/haku/menu";
const userCache = new CacheContainer(new MemoryStorage());

// --- Jamix API type definitions ---

interface JamixKitchen {
  kitchenName: string;
  kitchenId: number;
  address: string;
  city: string;
  email: string;
  phone: string;
  info: string;
  styles?: any;
  menuTypes: Array<{
    menuTypeId: number;
    menuTypeName: string;
    menus: Array<{
      menuName: string;
      menuAdditionalName: string;
      menuId: number;
      menuSettings?: number;
      favorite?: boolean;
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
      days: JamixDay[];
    }>;
  }>;
}

// --- Response types for Swagger-matching output ---

interface KitchenSummary {
  kitchenName: string;
  kitchenId: number;
  address: string;
  city: string;
}

interface CustomerRestaurant {
  customerId: string;
  kitchens: KitchenSummary[];
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
 *       500:
 *         description: Server error
 *
 * /jamix/{query}/restaurants:
 *   get:
 *     summary: Search Jamix restaurants
 *     description: Searches for restaurants/kitchens by name, address, or city. The full restaurant list is fetched from Jamix and filtered by the query string.
 *     tags: [Jamix]
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for filtering restaurants by kitchen name, address, or city (case-insensitive)
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
 *       500:
 *         description: Server error
 */
export async function getMenuOptions(req: Request, res: Response) {
  try {
    const query = (req.params.query || "").trim().toLowerCase();
    const hashKey = HashUtils.sha1Digest(`jamix_restaurants_${query || "all"}`);
    const cached = await userCache.getItem<CustomerRestaurant[]>(hashKey);

    if (cached) {
      responseStatus(res, 200, true, { data: { restaurants: cached } });
      return;
    }

    // The Jamix public API is a simple GET — returns all customers & kitchens
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      responseStatus(res, 500, false, {
        cause: `Jamix API returned ${response.status}`,
      });
      return;
    }

    const data: JamixSearchResponse[] = await response.json();
    let restaurants = extractRestaurants(data);

    // If a search query is provided, filter client-side
    if (query) {
      restaurants = filterRestaurants(restaurants, query);
    }

    await userCache.setItem(hashKey, restaurants, { ttl: 3600 });
    responseStatus(res, 200, true, { data: { restaurants } });
  } catch (error: any) {
    errorResponse(res, 500, error);
  }
}

/**
 * Transform raw Jamix search response into the Swagger-documented structure.
 * Preserves the nested customerId → kitchens hierarchy.
 */
function extractRestaurants(data: JamixSearchResponse[]): CustomerRestaurant[] {
  return data.map((customer) => ({
    customerId: customer.customerId,
    kitchens: customer.kitchens.map((k) => ({
      kitchenName: k.kitchenName,
      kitchenId: k.kitchenId,
      address: k.address,
      city: k.city,
    })),
  }));
}

/**
 * Filter restaurants by a search query (matches kitchen name, address, or city).
 * Customers with no matching kitchens are excluded entirely.
 */
function filterRestaurants(
  restaurants: CustomerRestaurant[],
  query: string,
): CustomerRestaurant[] {
  const results: CustomerRestaurant[] = [];

  for (const customer of restaurants) {
    const matchingKitchens = customer.kitchens.filter(
      (k) =>
        k.kitchenName.toLowerCase().includes(query) ||
        k.address.toLowerCase().includes(query) ||
        k.city.toLowerCase().includes(query),
    );

    if (matchingKitchens.length > 0) {
      results.push({
        customerId: customer.customerId,
        kitchens: matchingKitchens,
      });
    }
  }

  return results;
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
 *                   properties:
 *                     menu:
 *                       type: array
 *                       description: Array of Day objects, each containing menus for that day
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             example: "2024-12-25"
 *                           menus:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                   example: "Lounas pääruoat"
 *                                 meals:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                       name:
 *                                         type: string
 *                                       ingredients:
 *                                         type: string
 *                     diets:
 *                       type: array
 *                       description: Array of unique diet codes found in the menu
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "G"
 *                           description:
 *                             type: string
 *                             example: "G"
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
      responseStatus(res, 400, false, {
        cause: "Customer ID and Kitchen ID not specified!",
      });
      return;
    }

    const customerId = req.params.customerId;
    const kitchenId = req.params.kitchenId;
    const lang = (req.query.lang as string) || "fi";
    const date = req.query.date as string | undefined;
    const date2 = req.query.date2 as string | undefined;

    const hashKey = HashUtils.sha1Digest(
      `jamix_menu_${customerId}_${kitchenId}_${lang}_${date || ""}_${date2 || ""}`,
    );
    const cached = await userCache.getItem(hashKey);

    if (cached) {
      responseStatus(res, 200, true, { data: cached });
      return;
    }

    let menuUrl = `${menuBaseUrl}/${customerId}/${kitchenId}?lang=${lang}`;
    if (date) menuUrl += `&date=${date}`;
    if (date2) menuUrl += `&date2=${date2}`;

    const menuResponse = await fetch(menuUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!menuResponse.ok) {
      responseStatus(res, 500, false, {
        cause: `Menu API returned ${menuResponse.status}`,
      });
      return;
    }

    const data: JamixMenuResponse[] = await menuResponse.json();

    if (!data || data.length === 0) {
      const empty = { menu: [], diets: [] };
      responseStatus(res, 200, true, { data: empty });
      return;
    }

    // The API returns an array but typically only one kitchen per request
    const kitchen = data[0];
    const { days, diets } = parseMenuData(kitchen);

    const result = { menu: days, diets };
    await userCache.setItem(hashKey, result, { ttl: 3600 });
    responseStatus(res, 200, true, { data: result });
  } catch (error: any) {
    errorResponse(res, 500, error);
  }
}

// --- Internal helpers ---

/**
 * Strip HTML tags from a string (Jamix ingredients contain <strong> tags)
 */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

/**
 * Extract allergens from <strong>(allergen1, allergen2)</strong> patterns in ingredients.
 */
function extractAllergens(ingredients: string): string[] {
  const allergens: Set<string> = new Set();
  const regex = /<strong>\(([^)]+)\)<\/strong>/g;
  let match;
  while ((match = regex.exec(ingredients)) !== null) {
    for (const allergen of match[1].split(",")) {
      const trimmed = allergen.trim().toLowerCase();
      if (trimmed) allergens.add(trimmed);
    }
  }
  return Array.from(allergens);
}

/**
 * Parse a Jamix menu API response into Day[] and Diet[] models.
 */
function parseMenuData(kitchen: JamixMenuResponse): {
  days: Day[];
  diets: Diet[];
} {
  const daysMap = new Map<string, Map<string, Meal[]>>();
  const dietsSet = new Map<string, Diet>();

  for (const menuType of kitchen.menuTypes) {
    for (const menu of menuType.menus) {
      for (const day of menu.days) {
        const dateStr = formatDate(day.date);

        if (!daysMap.has(dateStr)) {
          daysMap.set(dateStr, new Map<string, Meal[]>());
        }
        const mealOptionsMap = daysMap.get(dateStr)!;

        for (const mealOption of day.mealoptions) {
          if (!mealOptionsMap.has(mealOption.name)) {
            mealOptionsMap.set(mealOption.name, []);
          }

          for (const menuItem of mealOption.menuItems) {
            const mealId = `${mealOption.id}_${menuItem.orderNumber}`;
            const rawIngredients = menuItem.ingredients || "";
            const ingredients = rawIngredients
              ? stripHtml(rawIngredients)
              : undefined;

            const nutrition: NutritionInfo = {};
            if (menuItem.portionSize) {
              nutrition.portionSize = menuItem.portionSize;
            }
            if (menuItem.diets && menuItem.diets.trim()) {
              nutrition.diets = menuItem.diets
                .split(",")
                .map((d) => d.trim())
                .filter(Boolean);
            }
            if (rawIngredients) {
              const allergens = extractAllergens(rawIngredients);
              if (allergens.length > 0) {
                nutrition.allergens = allergens;
              }
            }

            const hasNutrition = Object.keys(nutrition).length > 0;
            mealOptionsMap
              .get(mealOption.name)!
              .push(
                new Meal(
                  mealId,
                  menuItem.name,
                  ingredients,
                  hasNutrition ? nutrition : undefined,
                ),
              );

            // Collect unique diet codes
            if (menuItem.diets && menuItem.diets.trim()) {
              for (const code of menuItem.diets
                .split(",")
                .map((d) => d.trim())) {
                if (code && !dietsSet.has(code)) {
                  dietsSet.set(code, new Diet(code, code));
                }
              }
            }
          }
        }
      }
    }
  }

  // Convert maps into model objects
  const days: Day[] = [];
  for (const [dateStr, mealOptionsMap] of daysMap) {
    const menus: Menu[] = [];
    for (const [menuName, meals] of mealOptionsMap) {
      menus.push(new Menu(menuName, meals));
    }
    days.push(new Day(dateStr, menus));
  }

  // Sort chronologically
  days.sort((a, b) => moment(a.date).diff(moment(b.date)));

  return { days, diets: Array.from(dietsSet.values()) };
}

/**
 * Format a YYYYMMDD number into YYYY-MM-DD string
 */
function formatDate(dateNum: number): string {
  const s = dateNum.toString();
  if (s.length !== 8) {
    return moment(dateNum).format("YYYY-MM-DD");
  }
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}
