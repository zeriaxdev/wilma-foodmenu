/**
 * @swagger
 * components:
 *   schemas:
 *     NutritionInfo:
 *       type: object
 *       properties:
 *         portionSize:
 *           type: number
 *           description: Portion size in grams
 *           example: 350
 *         diets:
 *           type: array
 *           items:
 *             type: string
 *           description: Dietary codes (e.g. G = gluten-free, L = lactose-free)
 *           example: ["G", "L"]
 *         allergens:
 *           type: array
 *           items:
 *             type: string
 *           description: Allergens extracted from ingredients
 *           example: ["maito", "vehnä"]
 *     Meal:
 *       type: object
 *       required:
 *         - id
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           example: "6_1000"
 *         name:
 *           type: string
 *           example: "Kreikkalainen kasviskiusaus"
 *         ingredients:
 *           type: string
 *           description: Full ingredient list (HTML stripped)
 *           example: "Perunasuikale (Peruna 100%), Kasvirasvasekoite ruoka..."
 *         nutrition:
 *           $ref: '#/components/schemas/NutritionInfo'
 *     Menu:
 *       type: object
 *       required:
 *         - name
 *         - meals
 *       properties:
 *         name:
 *           type: string
 *           description: Menu/meal option name
 *           example: "Lounas"
 *         meals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Meal'
 *     Day:
 *       type: object
 *       required:
 *         - date
 *         - menus
 *       properties:
 *         date:
 *           type: string
 *           description: Date in YYYY-MM-DD format
 *           example: "2026-05-05"
 *         menus:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Menu'
 *     Diet:
 *       type: object
 *       required:
 *         - name
 *         - description
 *       properties:
 *         name:
 *           type: string
 *           example: "G"
 *         description:
 *           type: string
 *           example: "Gluteeniton"
 *     MenuResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: true
 *         menu:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Day'
 *         diets:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Diet'
 *     MenuResponseWrapped:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             menu:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Day'
 *             diets:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Diet'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         cause:
 *           type: string
 *           example: "Unable to parse menu!"
 *     ISSRestaurant:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           description: Restaurant URL (use with iss:// prefix for menu endpoint)
 *           example: "https://ravintolapalvelut.iss.fi/example"
 *         name:
 *           type: string
 *           example: "Ravintola Esimerkki"
 *     Restaurant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *     MenuProvider:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the provider
 *         name:
 *           type: string
 *           description: Display name
 *         type:
 *           type: string
 *           enum: [school, restaurant, daycare, food_service]
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         endpoint:
 *           type: string
 *           description: API endpoint pattern
 *         example:
 *           type: string
 *           description: Example API call
 *         location:
 *           type: string
 *         website:
 *           type: string
 *         supported_features:
 *           type: array
 *           items:
 *             type: string
 */
