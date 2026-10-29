# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Development: Vite dev server with hot reload (source is bind-mounted by compose)
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
# Vite inlines VITE_* vars at build time
ARG VITE_THIRDWEB_CLIENT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ETHEREUM_USDC_ADDRESS
ARG VITE_POLYGON_USDC_ADDRESS
ARG VITE_BASE_USDC_ADDRESS
ARG VITE_BASE_CHAIN_ID
ARG VITE_ETHEREUM_CHAIN_ID
ARG VITE_POLYGON_CHAIN_ID
ARG VITE_DEFAULT_CHAIN_ID
ARG VITE_AUTH_EXCHANGE_URL
COPY . .
RUN npm run build

# Production: static files served by nginx
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
