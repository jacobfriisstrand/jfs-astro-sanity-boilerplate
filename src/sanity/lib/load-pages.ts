import type { SanityDocument } from "@sanity/client";
import { getPageTypeNames } from "@/registry";
import { loadQuery } from "@/sanity/lib/load-query";

/**
 * Base query fields for page documents
 * Uses spread to get all fields (works for both flexible and fixed page types)
 */
const PAGE_FIELDS = `
  ...,
  seoImage {
    type,
    value,
    altText,
    description
  }
`;

/**
 * Gets all page slugs for static path generation
 */
export async function getAllPageSlugs(): Promise<
  Array<{ slug: string; pageType: string }>
> {
  const pageTypeNames = getPageTypeNames();
  const typeFilter = pageTypeNames
    .map((name) => `_type == "${name}"`)
    .join(" || ");

  const { data: pages } = await loadQuery<
    Array<{ slug: string; _type: string }>
  >({
    query: `*[(${typeFilter}) && defined(slug.current)]{
      _type,
      "slug": slug.current
    }`,
  });

  return pages.map((page) => ({
    slug: page.slug,
    pageType: page._type,
  }));
}

/**
 * Loads a full page document by slug and page type
 */
export async function loadPageBySlug(
  slug: string,
  pageType: string
): Promise<SanityDocument | null> {
  const { data: page } = await loadQuery<SanityDocument>({
    query: `*[_type == $pageType && slug.current == $slug][0]{
      ${PAGE_FIELDS}
    }`,
    params: {
      pageType,
      slug,
    },
  });

  return page || null;
}
