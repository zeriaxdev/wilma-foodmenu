import http from "http";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

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

  // Jamix
  {
    path: "/jamix/restaurants",
    category: "jamix",
    validateShape: validateRestaurantListShape,
  },
  {
    path: "/jamix/menu/96773/12",
    category: "jamix",
    validateShape: validateJamixMenuShape,
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

async function run() {
  const categories = process.argv.slice(2);
  let specs = ENDPOINTS;

  if (categories.length > 0) {
    specs = ENDPOINTS.filter((s) => categories.includes(s.category));
  }

  console.log(`Running ${specs.length} endpoint tests against ${BASE_URL}\n`);

  const concurrency = 5;
  const results: TestResult[] = [];
  const queue = [...specs];

  async function worker() {
    while (queue.length > 0) {
      const spec = queue.shift()!;
      const result = await testEndpoint(spec);
      results.push(result);

      const icon = result.status === "pass" ? "+" : result.status === "skip" ? "-" : "x";
      const line = `[${icon}] ${result.endpoint} (${result.duration}ms)`;
      console.log(result.error ? `${line} — ${result.error}` : line);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, specs.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} total`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
