import { defineBlueprint, defineDocumentFunction } from "@sanity/blueprints";

/**
 * Sanity Blueprint — auto-redirect on slug change
 *
 * IMPORTANT: Keep the document filter in sync with your page type registry
 * (src/registry.ts). Exclude types without slugs (e.g. homepage).
 *
 * Setup:
 *   npx sanity blueprints init
 *   npx sanity blueprints deploy
 *
 * @see https://www.sanity.io/docs/blueprints/blueprints-introduction
 * @see https://www.sanity.io/recipes/auto-generating-redirects-on-slugs-change-e7c88bfc
 */

const blueprint = defineBlueprint({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  resources: [
    defineDocumentFunction({
      name: "slug-redirect",
      src: "./functions/slug-redirect",
      memory: 2,
      timeout: 30,
      event: {
        on: ["publish"],
        filter: "delta::changedAny(slug.current)",
        projection:
          '{"beforeSlug": before().slug.current, "slug": after().slug.current}',
      },
    }),
  ],
});

export default blueprint;
