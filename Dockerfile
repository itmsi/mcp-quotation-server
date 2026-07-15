# ==========================================
# Stage 1: Build TypeScript
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 9533

CMD ["node", "dist/httpServer.js"]
