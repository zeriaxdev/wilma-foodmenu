# CLAUDE.md

Guidelines for working in this repo.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`

Scopes (optional): `jamix`, `aromi`, `iss`, `looki`, `parser`, `api`, `docker`, `deps`

Examples:
```
feat(jamix): add nutrition field to meal response
fix(parser): handle null querySelector result in iss-web
chore(deps): upgrade ts-node to v10, typescript to v5
docs: update README with fork attribution
test: add endpoint smoke tests with schema validation
```

## Structure

```
src/
  handlers/   — Express route handlers (one per provider)
  parsers/    — HTML/PDF/iCal parsing logic
  models/     — Data models (Day, Menu, Meal, NutritionInfo, Diet)
  utils/      — Shared utilities
  net/        — HTTP client wrapper
  caching/    — Cache helpers
test/         — TypeScript endpoint test runner
```

## Development

```sh
npm run build    # compile
npm run dev      # compile + start with --inspect
npm run test     # smoke test all endpoints against http://localhost:3000
npm run test:jamix    # test only Jamix endpoints
npm run test:schools  # test only school endpoints
```

Set `TEST_BASE_URL` to test against a different instance.

## Adding a provider

1. Create `src/parsers/<name>.ts` — returns `Day[]` or `{ menu: Day[], diets: Diet[] }`
2. Create `src/handlers/<name>.ts` — add JSDoc `@swagger` block, call parser, use `responseStatus`
3. Register route in `src/main.ts`
4. Add entry to `src/handlers/menu_list.ts`
5. Add endpoint to `test/endpoints.test.ts`

## Response shape

All endpoints return:
```json
{ "status": true, "menu": [...], "diets": [...] }
```

Jamix wraps in `data`: `{ "status": true, "data": { "menu": [...], "diets": [...] } }`

## Node / TypeScript

- Node ≥ 24 (see `.nvmrc`)
- TypeScript 5, ts-node 10
- `req.params.x` is `string | string[]` — always cast: `req.params.x as string`
- `querySelector` returns `null` — use optional chaining or null checks, not `!== undefined`

## Notes

- Jamix macronutrient data (ravintoarvot) is not available via the public REST API — only through the Vaadin UI's internal RPC (see OPX-75)
- Aromi handler has a Selenium fallback for legacy instances — avoid expanding it (see OPX-79)
- moment.js is a known dep to remove (OPX-78) — don't add new usages
