import { defineDocuments, defineLocations } from "sanity/presentation";

export const mainDocuments = defineDocuments([
  {
    filter: `_type in ["pageTypeOne", "pageTypeTwo"] && slug.current == $slug`,
    route: "/:slug+",
  },
]);

export const locations = {
  homepage: defineLocations({
    resolve: (doc) => ({
      locations: [{ href: "/", title: doc?.title || "Homepage" }],
    }),
    select: { title: "internalTitle" },
  }),
  pageTypeOne: defineLocations({
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
  }),
  pageTypeTwo: defineLocations({
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
  }),
};
