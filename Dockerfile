FROM node:24-alpine

# Install Chromium, Ghostscript, fonts, build tools, and tini
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
    git \
    make \
    gcc \
    g++ \
    python3 \
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

# Install dependencies before copying full source (better layer caching)
COPY --chown=chrome:chrome package.json ./

USER chrome
RUN npm install

COPY --chown=chrome:chrome . .
RUN npm run build

# no-sandbox required — Docker is already an isolated environment
ENV SELENIUM_ARGS="disk-cache-dir=/tmp/seleniumcache,disable-translate,disable-sync,no-first-run,safebrowsing-disable-auto-update,disable-background-networking,no-sandbox,disable-setuid-sandbox"

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build/main.js"]