# PoC only. Playwright image already includes Chromium.
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json ./
RUN npm install --omit=dev

COPY server.mjs ./
ENV PORT=8080

USER pwuser
EXPOSE 8080
CMD ["node", "server.mjs"]
