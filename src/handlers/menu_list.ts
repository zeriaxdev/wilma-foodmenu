/*
 * Menu List Handler - Provides comprehensive list of all available menu providers
 */

import { Request, Response } from "express";
import { responseStatus } from "../utils/response_utilities";

interface MenuProvider {
  id: string;
  name: string;
  type: "school" | "restaurant" | "daycare" | "food_service";
  category: string;
  description?: string;
  logo?: string;
  image?: string;
  endpoint: string;
  example: string;
  location?: string;
  website?: string;
  supported_features?: string[];
  last_updated?: string;
}

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: List all menu providers
 *     description: Returns all available menu sources with metadata (name, type, endpoint, location, supported features)
 *     tags: [Directory]
 *     responses:
 *       200:
 *         description: Providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 providers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MenuProvider'
 */
export function getMenuList(req: Request, res: Response) {
  const providers: MenuProvider[] = [
    // Schools
    {
      id: "asikkala",
      name: "Asikkala",
      type: "school",
      category: "Municipal Schools",
      description: "School lunch menus for Asikkala municipality",
      logo: "https://www.asikkala.fi/images/logo.png",
      endpoint: "/asikkala/menu",
      example: "GET /asikkala/menu",
      location: "Asikkala, Finland",
      website: "https://www.asikkala.fi",
      supported_features: ["Daily menus", "School lunches"],
    },
    {
      id: "syk",
      name: "SYK",
      type: "school",
      category: "Educational Institution",
      description: "SYK school cafeteria menu",
      endpoint: "/syk/menu",
      example: "GET /syk/menu",
      location: "Finland",
      website: "https://syk.fi",
      supported_features: ["Daily menus", "Student meals"],
    },
    {
      id: "tyk",
      name: "TYK",
      type: "school",
      category: "Educational Institution",
      description: "Tampereen yhteiskoulu cafeteria menu",
      endpoint: "/tyk/menu",
      example: "GET /tyk/menu",
      location: "Tampere, Finland",
      website: "https://www.tyk.fi",
      supported_features: ["Daily menus", "School lunches"],
    },
    {
      id: "mayk",
      name: "MAYK",
      type: "school",
      category: "Educational Institution",
      description: "MAYK school cafeteria menu",
      endpoint: "/mayk/menu",
      example: "GET /mayk/menu",
      location: "Finland",
      website: "https://www.mayk.fi",
      supported_features: ["Daily menus", "Student meals"],
    },
    {
      id: "steiner",
      name: "Steinerin koulu",
      type: "school",
      category: "Waldorf Education",
      description: "Organic restaurant Timjami at Tampereen Steinerkoulu",
      logo: "https://www.tampereensteinerkoulu.fi/images/logo.png",
      endpoint: "/steiner/menu",
      example: "GET /steiner/menu",
      location: "Tampere, Finland",
      website: "https://www.tampereensteinerkoulu.fi",
      supported_features: ["Organic meals", "Daily menus", "School lunches"],
    },
    {
      id: "pyhtaa",
      name: "Pyhtää",
      type: "school",
      category: "Municipal Schools",
      description: "School lunch menus for Pyhtää municipality",
      endpoint: "/pyhtaa/menu",
      example: "GET /pyhtaa/menu",
      location: "Pyhtää, Finland",
      website: "https://pyhtaa.fi",
      supported_features: ["Daily menus", "School lunches"],
    },
    {
      id: "phyk",
      name: "PHYK",
      type: "school",
      category: "Educational Services",
      description: "Päijät-Hämeen koulutuskonserni cafeteria menus",
      logo: "https://www.phyk.fi/images/logo.png",
      endpoint: "/phyk/menu",
      example: "GET /phyk/menu",
      location: "Helsinki, Finland",
      website: "https://www.phyk.fi",
      supported_features: ["Daily menus", "Student meals"],
    },
    {
      id: "poytya",
      name: "Pöytyä Schools",
      type: "school",
      category: "Municipal Schools",
      description: "School menus for Pöytyä municipality",
      endpoint: "/poytyaps/menu",
      example: "GET /poytyaps/menu",
      location: "Pöytyä, Finland",
      website: "https://www.poytya.fi",
      supported_features: ["Daily menus", "School lunches"],
    },
    {
      id: "kauhajoki",
      name: "Kauhajoki Schools",
      type: "school",
      category: "Municipal Schools",
      description: "School menus from Google Calendar iCal feed",
      endpoint: "/kauhajoki/menu",
      example: "GET /kauhajoki/menu",
      location: "Kauhajoki, Finland",
      website: "https://kauhajoki.fi",
      supported_features: ["Daily menus", "Calendar integration"],
    },
    {
      id: "mantsala",
      name: "Mantsala Schools",
      type: "school",
      category: "Municipal Schools",
      description: "School menus for Mantsala from ISS food services",
      endpoint: "/mantsala/menu",
      example: "GET /mantsala/menu",
      location: "Mantsala, Finland",
      supported_features: ["Daily menus", "School lunches"],
    },

    // Restaurants
    {
      id: "kastelli",
      name: "Kastelli Restaurant",
      type: "restaurant",
      category: "Commercial Restaurant",
      description: "Daily menus from Kastelli ISS restaurant",
      endpoint: "/kastelli/menu",
      example: "GET /kastelli/menu",
      location: "Finland",
      supported_features: ["Daily menus", "Restaurant meals"],
    },
    {
      id: "ael",
      name: "AEL Restaurant",
      type: "restaurant",
      category: "Commercial Restaurant",
      description: "Daily menus from AEL ISS restaurant",
      endpoint: "/ael/menu",
      example: "GET /ael/menu",
      location: "Finland",
      supported_features: ["Daily menus", "Restaurant meals"],
    },
    {
      id: "airport",
      name: "Tampere Airport",
      type: "restaurant",
      category: "Airport Restaurant",
      description: "Kanresta restaurant at Tampere-Pirkkala Airport",
      logo: "https://www.kanresta.fi/images/logo.png",
      endpoint: "/krtpl/menu",
      example: "GET /krtpl/menu",
      location: "Tampere-Pirkkala Airport, Finland",
      website: "https://www.kanresta.fi",
      supported_features: ["Daily menus", "Airport dining"],
    },
    {
      id: "looki",
      name: "Looki Restaurants",
      type: "restaurant",
      category: "Restaurant Platform",
      description: "Menu data from Looki restaurant platform",
      logo: "https://looki.fi/images/logo.png",
      endpoint: "/looki/{endpoint}/menu",
      example: "GET /looki/restaurant-name/menu",
      location: "Finland",
      website: "https://looki.fi",
      supported_features: ["Multiple restaurants", "Dynamic endpoints"],
    },

    // Daycare
    {
      id: "loviisa",
      name: "Loviisa Daycare",
      type: "daycare",
      category: "Childcare Services",
      description: "Daycare center menus for Loviisa municipality",
      endpoint: "/loviisa/paivakoti/menu",
      example: "GET /loviisa/paivakoti/menu",
      location: "Loviisa, Finland",
      website: "https://www.loviisa.fi",
      supported_features: ["Daily menus", "Children's meals", "PDF parsing"],
    },

    // Food Service Systems
    {
      id: "iss",
      name: "ISS",
      type: "food_service",
      category: "Food Service Provider",
      description:
        "Menus from ISS restaurant services for schools and daycares",
      logo: "https://ravintolapalvelut.iss.fi/images/logo.png",
      endpoint: "/iss/menu/{url}",
      example: "GET /iss/menu/restaurant-url",
      location: "Finland (multiple locations)",
      website: "https://ravintolapalvelut.iss.fi",
      supported_features: [
        "Multiple locations",
        "Restaurant listings",
        "Cafeteria menus",
      ],
    },
    {
      id: "jamix",
      name: "Jamix",
      type: "food_service",
      category: "Restaurant Management",
      description: "Menus from Jamix food service management platform",
      logo: "https://fi.jamix.cloud/images/logo.png",
      endpoint: "/jamix/menu/{customerId}/{kitchenId}",
      example: "GET /jamix/menu/123/456?date=20241225",
      location: "Finland (multiple locations)",
      website: "https://fi.jamix.cloud",
      supported_features: [
        "Date filtering",
        "Multiple restaurants",
        "Advanced search",
        "Finnish/English",
      ],
    },
    {
      id: "aromi",
      name: "Aromi SaaS",
      type: "food_service",
      category: "Food Service Platform",
      description: "Menus from Aromi (CGI) food service systems",
      endpoint: "/aroma/{url}/restaurants/{id}",
      example: "GET /aroma/service-url/restaurants/123",
      location: "Finland (multiple locations)",
      supported_features: [
        "Multiple restaurants",
        "Service-specific endpoints",
      ],
    },
  ];

  responseStatus(res, 200, true, { providers });
}
