# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Không truyền ADMIN_PASSWORD lúc build: mật khẩu chỉ cấp lúc chạy container.
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Đơn hàng JSON (storage/orders.json): gắn volume vào /app/storage để giữ dữ liệu.
RUN mkdir -p storage && chown node:node storage
VOLUME ["/app/storage"]
USER node
EXPOSE 3000
CMD ["node", "server.js"]
