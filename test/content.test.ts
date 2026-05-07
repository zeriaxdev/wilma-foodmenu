import http from "http";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

interface MenuEndpoint {
  path: string;
  name: string;
  dataPath?: "data" | "root";
}

const MENU_ENDPOINTS: MenuEndpoint[] = [
  { path: "/asikkala/menu", name: "Asikkala" },
  { path: "/syk/menu", name: "SYK" },
  { path: "/tyk/menu", name: "TYK" },
  { path: "/mayk/menu", name: "MAYK" },
  { path: "/steiner/menu", name: "Steiner" },
  { path: "/pyhtaa/menu", name: "Pyhtää" },
  { path: "/phyk/menu", name: "PHYK" },
  { path: "/poytyaps/menu", name: "Pöytyä PS" },
  { path: "/kauhajoki/menu", name: "Kauhajoki" },
  { path: "/mantsala/menu", name: "Mäntsälä" },
  { path: "/kastelli/menu", name: "Kastelli" },
  { path: "/ael/menu", name: "AEL" },
  { path: "/krtpl/menu", name: "Tampere Airport" },
  { path: "/loviisa/paivakoti/menu", name: "Loviisa pk" },
];

function fetchJSON(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    http
      .get(`${BASE_URL}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, body: null });
          }
        });
      })
      .on("error", reject);
  });
}

function countContent(body: any): { days: number; meals: number; sample: string | null } {
  const menu = body?.data?.menu ?? body?.menu ?? [];
  if (!Array.isArray(menu)) return { days: 0, meals: 0, sample: null };

  let totalMeals = 0;
  let sample: string | null = null;

  for (const day of menu) {
    for (const m of day.menus ?? []) {
      for (const meal of m.meals ?? []) {
        totalMeals++;
        if (!sample && meal.name) sample = meal.name;
      }
    }
  }

  return { days: menu.length, meals: totalMeals, sample };
}

async function testContent(ep: MenuEndpoint): Promise<void> {
  const start = Date.now();
  try {
    const { status, body } = await fetchJSON(ep.path);
    const duration = Date.now() - start;
    const tag = `${DIM}(${duration}ms)${RESET}`;

    if (status !== 200 || body?.status === false) {
      console.log(`${RED}[x]${RESET} ${ep.name.padEnd(18)} ${RED}HTTP ${status}${RESET} ${tag}`);
      return;
    }

    const { days, meals, sample } = countContent(body);

    if (days === 0) {
      console.log(`${YELLOW}[!]${RESET} ${ep.name.padEnd(18)} ${YELLOW}0 days, 0 meals${RESET} (empty menu) ${tag}`);
    } else if (meals === 0) {
      console.log(`${YELLOW}[!]${RESET} ${ep.name.padEnd(18)} ${days} days, ${YELLOW}0 meals${RESET} ${tag}`);
    } else {
      const sampleText = sample ? ` ${DIM}e.g. "${sample}"${RESET}` : "";
      console.log(`${GREEN}[+]${RESET} ${ep.name.padEnd(18)} ${BOLD}${days}${RESET} days, ${BOLD}${meals}${RESET} meals${sampleText} ${tag}`);
    }
  } catch (err: any) {
    console.log(`${RED}[x]${RESET} ${ep.name.padEnd(18)} ${RED}${err.message}${RESET}`);
  }
}

async function testJamixContent(): Promise<void> {
  const start = Date.now();
  try {
    const { body: listBody } = await fetchJSON("/jamix/restaurants");
    const restaurants = listBody?.data?.restaurants ?? [];
    const kitchenCount = restaurants.reduce(
      (sum: number, c: any) => sum + (c.kitchens?.length ?? 0),
      0,
    );
    console.log(`${GREEN}[+]${RESET} ${"Jamix list".padEnd(18)} ${BOLD}${restaurants.length}${RESET} customers, ${BOLD}${kitchenCount}${RESET} kitchens ${DIM}(${Date.now() - start}ms)${RESET}`);

    if (restaurants.length === 0) return;

    const customer = restaurants[0];
    const kitchen = customer.kitchens?.[0];
    if (!kitchen) return;

    const menuStart = Date.now();
    const { body: menuBody } = await fetchJSON(
      `/jamix/menu/${customer.customerId}/${kitchen.kitchenId}`,
    );
    const { days, meals, sample } = countContent(menuBody);
    const tag = `${DIM}(${Date.now() - menuStart}ms)${RESET}`;
    const label = `Jamix: ${kitchen.kitchenName}`.slice(0, 30);

    if (days === 0) {
      console.log(`${YELLOW}[!]${RESET} ${label.padEnd(18)} ${YELLOW}0 days${RESET} ${tag}`);
    } else {
      const sampleText = sample ? ` ${DIM}e.g. "${sample}"${RESET}` : "";
      console.log(`${GREEN}[+]${RESET} ${label.padEnd(18)} ${BOLD}${days}${RESET} days, ${BOLD}${meals}${RESET} meals${sampleText} ${tag}`);
    }
  } catch (err: any) {
    console.log(`${RED}[x]${RESET} ${"Jamix".padEnd(18)} ${RED}${err.message}${RESET}`);
  }
}

async function run() {
  console.log(`${BOLD}Menu content report${RESET} — ${BASE_URL}\n`);

  for (const ep of MENU_ENDPOINTS) {
    await testContent(ep);
  }

  await testJamixContent();

  console.log(`\n${DIM}Endpoints with 0 days/meals may be seasonal, upstream-down, or broken.${RESET}`);
}

run();
