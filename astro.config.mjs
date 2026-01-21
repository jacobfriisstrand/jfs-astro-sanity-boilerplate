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

const {
  PUBLIC_SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET,
  PUBLIC_BUNNY_CDN_HOSTNAME,
} = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  image: PUBLIC_BUNNY_CDN_HOSTNAME
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: PUBLIC_BUNNY_CDN_HOSTNAME,
          },
        ],
      }
    : undefined,
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },

  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      useCdn: false,
      apiVersion: sanityApiVersion,
      studioBasePath: "/studio",
      stega: {
        studioUrl: "/studio",
      },
    }),
    react(),
  ],

  adapter: node({
    mode: "standalone",
  }),
});
