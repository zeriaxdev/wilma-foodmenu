import http from "http";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

interface TestResult {
  endpoint: string;
  status: "pass" | "fail" | "skip";
  httpStatus?: number;
  duration: number;
  error?: string;
}

interface EndpointSpec {
  path: string;
  category: string;
  validateShape?: (data: any) => string | null;
}

function validateMenuShape(data: any): string | null {
  if (!Array.isArray(data.menu)) return "data.menu is not an array";
  for (const day of data.menu) {
    if (typeof day.date !== "string") return "day.date is not a string";
    if (!Array.isArray(day.menus)) return "day.menus is not an array";
    for (const menu of day.menus) {
      if (typeof menu.name !== "string") return "menu.name is not a string";
      if (!Array.isArray(menu.meals)) return "menu.meals is not an array";
      for (const meal of menu.meals) {
        if (typeof meal.id !== "string") return "meal.id is not a string";
        if (typeof meal.name !== "string") return "meal.name is not a string";
      }
    }
  }
  return null;
}

function validateJamixMenuShape(data: any): string | null {
  const base = validateMenuShape(data);
  if (base) return base;
  for (const day of data.menu) {
    for (const menu of day.menus) {
      for (const meal of menu.meals) {
        if (meal.nutrition !== undefined) {
          if (
            meal.nutrition.portionSize !== undefined &&
            typeof meal.nutrition.portionSize !== "number"
          )
            return "nutrition.portionSize is not a number";
          if (
            meal.nutrition.diets !== undefined &&
            !Array.isArray(meal.nutrition.diets)
          )
            return "nutrition.diets is not an array";
          if (
            meal.nutrition.allergens !== undefined &&
            !Array.isArray(meal.nutrition.allergens)
          )
            return "nutrition.allergens is not an array";
        }
      }
    }
  }
  return null;
}

function validateRestaurantListShape(data: any): string | null {
  if (!data.restaurants && !Array.isArray(data))
    return "expected restaurants array";
  const list = data.restaurants || data;
  if (!Array.isArray(list)) return "restaurants is not an array";
  return null;
}

const ENDPOINTS: EndpointSpec[] = [
  // Directory
  { path: "/menus", category: "directory" },

  // Schools
  { path: "/asikkala/menu", category: "school", validateShape: validateMenuShape },
  { path: "/syk/menu", category: "school", validateShape: validateMenuShape },
  { path: "/tyk/menu", category: "school", validateShape: validateMenuShape },
  { path: "/mayk/menu", category: "school", validateShape: validateMenuShape },
  { path: "/steiner/menu", category: "school", validateShape: validateMenuShape },
  { path: "/pyhtaa/menu", category: "school", validateShape: validateMenuShape },
  { path: "/phyk/menu", category: "school", validateShape: validateMenuShape },
  { path: "/poytyaps/menu", category: "school", validateShape: validateMenuShape },
  { path: "/kauhajoki/menu", category: "school", validateShape: validateMenuShape },
  { path: "/mantsala/menu", category: "school", validateShape: validateMenuShape },

  // Restaurants
  { path: "/kastelli/menu", category: "restaurant", validateShape: validateMenuShape },
  { path: "/ael/menu", category: "restaurant", validateShape: validateMenuShape },
  { path: "/krtpl/menu", category: "restaurant", validateShape: validateMenuShape },

  // Daycare
  { path: "/loviisa/paivakoti/menu", category: "daycare", validateShape: validateMenuShape },

  // ISS
  { path: "/iss/menus", category: "iss", validateShape: validateRestaurantListShape },

  // Jamix (restaurant list only — menu test uses a dynamically discovered kitchen)
  {
    path: "/jamix/restaurants",
    category: "jamix",
    validateShape: validateRestaurantListShape,
  },
];

async function fetchEndpoint(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
      })
      .on("error", reject);
  });
}

async function testEndpoint(spec: EndpointSpec): Promise<TestResult> {
  const start = Date.now();
  try {
    const { status, body } = await fetchEndpoint(spec.path);
    const duration = Date.now() - start;

    if (status !== 200) {
      return {
        endpoint: spec.path,
        status: "fail",
        httpStatus: status,
        duration,
        error: `HTTP ${status}`,
      };
    }

    if (body.status === false) {
      return {
        endpoint: spec.path,
        status: "fail",
        httpStatus: status,
        duration,
        error: `API error: ${body.cause || "unknown"}`,
      };
    }

    if (spec.validateShape && body.data) {
      const shapeError = spec.validateShape(body.data);
      if (shapeError) {
        return {
          endpoint: spec.path,
          status: "fail",
          httpStatus: status,
          duration,
          error: `Schema: ${shapeError}`,
        };
      }
    }

    return { endpoint: spec.path, status: "pass", httpStatus: status, duration };
  } catch (err: any) {
    return {
      endpoint: spec.path,
      status: "fail",
      duration: Date.now() - start,
      error: err.message,
    };
  }
}

function printResult(result: TestResult) {
  if (result.status === "pass") {
    const line = `${GREEN}[+]${RESET} ${result.endpoint} ${DIM}(${result.duration}ms)${RESET}`;
    console.log(line);
  } else if (result.status === "skip") {
    const line = `${YELLOW}[-]${RESET} ${result.endpoint} ${DIM}(${result.duration}ms)${RESET}`;
    console.log(line);
  } else {
    const line = `${RED}[x]${RESET} ${result.endpoint} ${DIM}(${result.duration}ms)${RESET}`;
    console.log(result.error ? `${line} — ${result.error}` : line);
  }
}

/**
 * Dynamically discover a Jamix kitchen and test its menu endpoint.
 * Avoids hardcoding any specific customer/kitchen ID.
 */
async function runJamixMenuTest(): Promise<TestResult> {
  const start = Date.now();
  const endpoint = "/jamix/menu (dynamic)";
  try {
    const { status, body } = await fetchEndpoint("/jamix/restaurants");
    if (status !== 200 || body.status === false) {
      return {
        endpoint,
        status: "fail",
        duration: Date.now() - start,
        error: "Could not fetch restaurant list to discover a kitchen",
      };
    }

    const restaurants = body.data?.restaurants || [];
    if (restaurants.length === 0 || restaurants[0].kitchens?.length === 0) {
      return {
        endpoint,
        status: "skip",
        duration: Date.now() - start,
        error: "No Jamix restaurants available",
      };
    }

    const customer = restaurants[0];
    const kitchen = customer.kitchens[0];
    const menuPath = `/jamix/menu/${customer.customerId}/${kitchen.kitchenId}`;

    const menuResult = await testEndpoint({
      path: menuPath,
      category: "jamix",
      validateShape: validateJamixMenuShape,
    });

    return {
      ...menuResult,
      endpoint: `${endpoint} → ${menuPath}`,
    };
  } catch (err: any) {
    return {
      endpoint,
      status: "fail",
      duration: Date.now() - start,
      error: err.message,
    };
  }
}

/**
 * Test Jamix search filtering
 */
async function runJamixSearchTest(): Promise<TestResult> {
  const start = Date.now();
  const endpoint = "/jamix/{query}/restaurants";
  try {
    const { status, body } = await fetchEndpoint("/jamix/espoo/restaurants");
    const duration = Date.now() - start;

    if (status !== 200) {
      return { endpoint, status: "fail", httpStatus: status, duration, error: `HTTP ${status}` };
    }
    if (body.status === false) {
      return { endpoint, status: "fail", httpStatus: status, duration, error: `API error: ${body.cause}` };
    }

    const restaurants = body.data?.restaurants || [];
    for (const customer of restaurants) {
      for (const kitchen of customer.kitchens) {
        const match =
          kitchen.kitchenName?.toLowerCase().includes("espoo") ||
          kitchen.address?.toLowerCase().includes("espoo") ||
          kitchen.city?.toLowerCase().includes("espoo");
        if (!match) {
          return {
            endpoint,
            status: "fail",
            duration,
            error: `Search filter leaked: ${kitchen.kitchenName} (${kitchen.city}) doesn't match "espoo"`,
          };
        }
      }
    }

    return { endpoint, status: "pass", httpStatus: status, duration };
  } catch (err: any) {
    return { endpoint, status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function run() {
  const categories = process.argv.slice(2);
  let specs = ENDPOINTS;

  if (categories.length > 0) {
    specs = ENDPOINTS.filter((s) => categories.includes(s.category));
  }

  const totalEstimate = specs.length + (categories.length === 0 || categories.includes("jamix") ? 2 : 0);
  console.log(`Running ${totalEstimate} endpoint tests against ${BASE_URL}\n`);

  const concurrency = 5;
  const results: TestResult[] = [];
  const queue = [...specs];

  async function worker() {
    while (queue.length > 0) {
      const spec = queue.shift()!;
      const result = await testEndpoint(spec);
      results.push(result);
      printResult(result);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, specs.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  // Jamix-specific tests (dynamic discovery, search filter)
  if (categories.length === 0 || categories.includes("jamix")) {
    const jamixMenu = await runJamixMenuTest();
    results.push(jamixMenu);
    printResult(jamixMenu);

    const jamixSearch = await runJamixSearchTest();
    results.push(jamixSearch);
    printResult(jamixSearch);
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  console.log(
    `\n${GREEN}${passed} passed${RESET}, ${failed > 0 ? RED : ""}${failed} failed${RESET}${skipped > 0 ? `, ${YELLOW}${skipped} skipped${RESET}` : ""} out of ${results.length} total`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

run();
