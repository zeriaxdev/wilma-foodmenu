# ---- Build stage ----
FROM node:24-alpine AS build

RUN apk add --no-cache git make gcc g++ python3

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run production

# ---- Runtime stage ----
FROM node:24-alpine

RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    harfbuzz \
    nss \
    freetype \
    ttf-freefont \
    font-noto-emoji \
    ghostscript \
    qpdf \
    tini \
    ca-certificates \
    tzdata \
    mailcap

COPY local.conf /etc/fonts/local.conf

RUN adduser -D chrome \
    && mkdir -p /usr/src/app \
    && chown -R chrome:chrome /usr/src/app

WORKDIR /usr/src/app

ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

COPY --from=build --chown=chrome:chrome /usr/src/app/build ./build
COPY --from=build --chown=chrome:chrome /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=chrome:chrome /usr/src/app/package.json ./

USER chrome

ENV SELENIUM_ARGS="disk-cache-dir=/tmp/seleniumcache,disable-translate,disable-sync,no-first-run,safebrowsing-disable-auto-update,disable-background-networking,no-sandbox,disable-setuid-sandbox"

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build/main.js"]
