// @ts-check

import path from "node:path";
import { fileURLToPath } from "node:url";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sanity from "@sanity/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { sanityApiVersion } from "./src/sanity/constants/sanity-api-version";
import { sanityTypegen } from "./vite-plugins/sanity-typegen";

const {
  PUBLIC_SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET,
  PUBLIC_SANITY_STUDIO_ROUTE,
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED,
} = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");

const studioRoute = PUBLIC_SANITY_STUDIO_ROUTE || "/studio";
const visualEditingEnabled = PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
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
  ],

  adapter: node({
    mode: "standalone",
  }),

  image: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
});
