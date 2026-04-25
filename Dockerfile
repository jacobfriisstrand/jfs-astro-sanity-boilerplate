# syntax=docker/dockerfile:1.7

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

# Sanity / site env required at build time (sitemap + schema extract + typegen)
# Coolify: mark these as "Build Variable" in the Environment Variables tab
ARG PUBLIC_SANITY_PROJECT_ID
ARG PUBLIC_SANITY_DATASET
ARG PUBLIC_SANITY_STUDIO_ROUTE=/studio
ARG PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false
ARG SANITY_API_READ_TOKEN
ARG SITE_URL

ENV PUBLIC_SANITY_PROJECT_ID=$PUBLIC_SANITY_PROJECT_ID \
    PUBLIC_SANITY_DATASET=$PUBLIC_SANITY_DATASET \
    PUBLIC_SANITY_STUDIO_ROUTE=$PUBLIC_SANITY_STUDIO_ROUTE \
    PUBLIC_SANITY_VISUAL_EDITING_ENABLED=$PUBLIC_SANITY_VISUAL_EDITING_ENABLED \
    SANITY_API_READ_TOKEN=$SANITY_API_READ_TOKEN \
    SITE_URL=$SITE_URL \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Husky's prepare runs on `npm ci`; it's a no-op without .git, but skip noise
RUN npm run build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

# Only copy what's needed to run the standalone server
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4321/api/health || exit 1

CMD ["node", "./dist/server/entry.mjs"]
