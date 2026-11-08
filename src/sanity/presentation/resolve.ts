import { defineDocuments, defineLocations } from "sanity/presentation";
import { getFlexiblePageTypes } from "@/registry";

// Slug-based flexible page types, derived from the registry so the template
// stays in sync when page types are created or deleted.
const flexiblePageTypes = getFlexiblePageTypes();

export const mainDocuments = defineDocuments([
  ...(flexiblePageTypes.length > 0
    ? [
        {
          filter: `_type in ${JSON.stringify(flexiblePageTypes)} && slug.current == $slug`,
          route: "/:slug+",
        },
      ]
    : []),
]);

// Location config shared by all flexible page types: pages live at their
// full slug path (with parent-page slugs when applicable).
const flexiblePageLocation = defineLocations({
  resolve: (doc) => ({
    locations: [
      {
        href:
          doc?.slugMode === "parentPage" && doc?.parentSlug
            ? `/${doc.parentSlug}/${doc.slug}`
            : `/${doc?.slug}`,
        title: doc?.title || "Untitled",
      },
    ],
  }),
  select: {
    parentSlug: "parentPage->slug.current",
    slug: "slug.current",
    slugMode: "slugMode",
    title: "internalTitle",
  },
});

export const locations = {
  homepage: defineLocations({
    resolve: (doc) => ({
      locations: [{ href: "/", title: doc?.title || "Homepage" }],
    }),
    select: { title: "internalTitle" },
  }),
  ...Object.fromEntries(
    flexiblePageTypes.map((name) => [name, flexiblePageLocation])
  ),
};
