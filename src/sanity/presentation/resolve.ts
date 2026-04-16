import { defineDocuments, defineLocations } from "sanity/presentation";

export const mainDocuments = defineDocuments([
  {
    route: "/:slug+",
    filter: `_type in ["pageTypeOne", "pageTypeTwo"] && slug.current == $slug`,
  },
]);

export const locations = {
  homepage: defineLocations({
    select: { title: "internalTitle" },
    resolve: (doc) => ({
      locations: [{ title: doc?.title || "Homepage", href: "/" }],
    }),
  }),
  pageTypeOne: defineLocations({
    select: {
      title: "internalTitle",
      slug: "slug.current",
      slugMode: "slugMode",
      parentSlug: "parentPage->slug.current",
    },
    resolve: (doc) => ({
      locations: [
        {
          title: doc?.title || "Untitled",
          href:
            doc?.slugMode === "parentPage" && doc?.parentSlug
              ? `/${doc.parentSlug}/${doc.slug}`
              : `/${doc?.slug}`,
        },
      ],
    }),
  }),
  pageTypeTwo: defineLocations({
    select: {
      title: "internalTitle",
      slug: "slug.current",
      slugMode: "slugMode",
      parentSlug: "parentPage->slug.current",
    },
    resolve: (doc) => ({
      locations: [
        {
          title: doc?.title || "Untitled",
          href:
            doc?.slugMode === "parentPage" && doc?.parentSlug
              ? `/${doc.parentSlug}/${doc.slug}`
              : `/${doc?.slug}`,
        },
      ],
    }),
  }),
};
