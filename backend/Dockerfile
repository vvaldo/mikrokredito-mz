FROM node:20-alpine
WORKDIR /app

# Chromium do sistema para o whatsapp-web.js (Puppeteer) — evita o download do Chromium
# empacotado, que não corre em Alpine/musl.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p src/uploads src/uploads/documents logs
EXPOSE 3000
CMD ["npm", "run", "dev"]
