# wilma-foodmenu

A middleware API that aggregates Finnish food menus from various sources (HTML, PDF, iCal, proprietary APIs) and serves them as unified JSON.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [License](#license)

## Background

Many Finnish schools, daycares, and restaurants publish their food menus in formats that are difficult to consume programmatically (HTML pages, PDFs, calendar feeds). This service acts as a scraping and normalization layer, exposing all menus through a consistent JSON API.

Supported providers include Jamix, Aromi, ISS, Matilda, and various individual school/restaurant websites.

## Install

Requires Node.js 16+.

```
npm install
```

Copy `.env.cmdrc` or configure environment variables as needed, then build:

```
npm run build
```

### Docker

```
docker compose up
```

## Usage

Start the development server:

```
npm run dev
```

Start in production mode:

```
npm start
```

The server runs on port 3001 by default. Interactive API documentation is available at `/api-docs`.

## API

### Directory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/menus` | List all available menu providers |

### Schools

| Method | Path | Description |
|--------|------|-------------|
| GET | `/asikkala/menu` | Asikkala school menu |
| GET | `/syk/menu` | SYK school menu |
| GET | `/tyk/menu` | TYK school menu |
| GET | `/mayk/menu` | MAYK school menu |
| GET | `/steiner/menu` | Tampere Steiner school menu |
| GET | `/pyhtaa/menu` | Pyhtaa school menu |
| GET | `/phyk/menu` | PHYK school menu |
| GET | `/poytyaps/menu` | Poytya school menu |
| GET | `/kauhajoki/menu` | Kauhajoki school menu |
| GET | `/mantsala/menu` | Mantsala school menu |

### Restaurants

| Method | Path | Description |
|--------|------|-------------|
| GET | `/kastelli/menu` | Kastelli restaurant menu |
| GET | `/ael/menu` | AEL restaurant menu |
| GET | `/krtpl/menu` | Tampere-Pirkkala Airport restaurant menu |
| GET | `/looki/:endpoint/menu` | Looki restaurant menu |

### Daycare

| Method | Path | Description |
|--------|------|-------------|
| GET | `/loviisa/paivakoti/menu` | Loviisa daycare menu |

### Food Services

#### ISS

| Method | Path | Description |
|--------|------|-------------|
| GET | `/iss/menus` | List ISS restaurants |
| GET | `/iss/menu/:url` | Get menu for an ISS restaurant |

#### Jamix

| Method | Path | Description |
|--------|------|-------------|
| GET | `/jamix/restaurants` | List all Jamix restaurants |
| GET | `/jamix/:query/restaurants` | Search Jamix restaurants |
| GET | `/jamix/menu/:customerId/:kitchenId` | Get menu (supports `?date=YYYYMMDD&date2=YYYYMMDD&lang=fi\|en`) |

Jamix menus include meal names, dietary codes, ingredients, and portion sizes.

#### Aromi

| Method | Path | Description |
|--------|------|-------------|
| GET | `/aroma/:url/restaurants` | List restaurants for an Aromi instance |
| GET | `/aroma/:url/restaurants/:id` | Get menu for an Aromi restaurant |

## Maintainers

[@zeriaxdev](https://github.com/zeriaxdev)

## License

[GPL-2.0](LICENSE)
