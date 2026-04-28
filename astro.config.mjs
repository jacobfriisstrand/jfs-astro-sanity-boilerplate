// @ts-check

import path from "node:path";
import { fileURLToPath } from "node:url";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sanity from "@sanity/astro";
import { createClient } from "@sanity/client";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import { loadEnv } from "vite";
import { getPageTypeNames } from "./src/registry";
import { sanityApiVersion } from "./src/sanity/constants/sanity-api-version";
import { sanityTypegen } from "./vite-plugins/sanity-typegen";

const {
  PUBLIC_SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET,
  PUBLIC_SANITY_STUDIO_ROUTE,
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED,
  SITE_URL,
} = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");

const studioRoute = PUBLIC_SANITY_STUDIO_ROUTE || "/studio";
const visualEditingEnabled = PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";
const siteUrl = SITE_URL || "https://localhost:4321";
const trailingSlashRegex = /\/$/;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fetch all published page slugs from Sanity for sitemap generation.
 * Uses a standalone client since this runs at build/config time.
 */
/**
 * Recursively builds the full slug path from parent page hierarchy
 * @param {{ slug: string; slugMode?: string; parentPage?: { slug: string; slugMode?: string; parentPage?: { slug: string } } }} page
 * @returns {string}
 */
function buildFullSlug(page) {
  const currentSlug = page.slug || "";
  if (page.slugMode !== "parentPage" || !page.parentPage) {
    return currentSlug;
  }
  const parentSlug = buildFullSlug(page.parentPage);
  return parentSlug ? `${parentSlug}/${currentSlug}` : currentSlug;
}

async function getSanityPageUrls() {
  const client = createClient({
    projectId: PUBLIC_SANITY_PROJECT_ID,
    dataset: PUBLIC_SANITY_DATASET,
    apiVersion: sanityApiVersion,
    useCdn: true,
  });

  // Only include documents whose _type is a registered page type.
  // Anything else (redirects, leftover/legacy types, etc.) is not a
  // routable page in [...slug].astro and would 404 if listed here.
  const pageTypeNames = getPageTypeNames().filter(
    (name) => name !== "homepage"
  );

  if (pageTypeNames.length === 0) {
    return [];
  }

  const pages = await client.fetch(
    `*[_type in $pageTypes && defined(slug.current)]{
      "slug": slug.current,
      slugMode,
      "parentPage": parentPage->{
        "slug": slug.current,
        slugMode,
        "parentPage": parentPage->{
          "slug": slug.current,
          slugMode,
          "parentPage": parentPage->{ "slug": slug.current }
        }
      }
    }`,
    { pageTypes: pageTypeNames }
  );

  const baseUrl = siteUrl.replace(trailingSlashRegex, "");
  return pages.map(
    (/** @type {any} */ page) => `${baseUrl}/${buildFullSlug(page)}`
  );
}

const customPages = await getSanityPageUrls();

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        // Mux Video: HLS manifests, segments, analytics
        "connect-src 'self' https://*.mux.com https://*.litix.io https://*.sanity.io https://*.apicdn.sanity.io",
        "media-src 'self' blob: https://*.mux.com",
        "img-src 'self' https://image.mux.com https://*.litix.io https://cdn.sanity.io data:",
        "worker-src 'self' blob:",
        "font-src 'self'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss(), sanityTypegen()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: [
        "lodash",
        "lodash/**",
        "react/compiler-runtime",
        "sanity",
        "@sanity/client",
        "@sanity/icons",
        "@sanity/ui",
        "sanity/presentation",
        "sanity/structure",
        "sanity/router",
      ],
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
  },
  output: "server",
  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      useCdn: true,
      apiVersion: sanityApiVersion,
      studioBasePath: studioRoute,
      stega: { studioUrl: studioRoute, enabled: visualEditingEnabled },
    }),
    react(),
    sitemap({
      customPages,
      filter: (page) =>
        ["/studio", "/api/", "/404"].every((p) => !page.includes(p)),
    }),
  ],

  adapter: node({
    mode: "standalone",
  }),

  prefetch: true,

  fonts: [
    {
      provider: fontProviders.local(),
      name: "Satoshi",
      cssVariable: "--font-satoshi",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/satoshi-regular.woff2"],
            weight: "normal",
            style: "normal",
          },
        ],
      },
    },
  ],

  image: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
});
