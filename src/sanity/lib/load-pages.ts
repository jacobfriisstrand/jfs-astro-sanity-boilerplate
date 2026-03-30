import type { SanityDocument } from "@sanity/client";
import { getPageTypeNames } from "@/registry";
import { loadQuery } from "@/sanity/lib/load-query";

/**
 * Shared media projection for dereferencing image/video assets
 * Includes LQIP for blur placeholders and dimensions for aspect ratio
 */
const MEDIA_PROJECTION = `
  type,
  image {
    ...,
    asset-> {
      _id,
      url,
      metadata {
        lqip,
        dimensions { width, height }
      }
    },
    hotspot,
    crop
  },
  video { file { asset-> { playbackId, assetId } }, description }
`;

/**
 * Base query fields for page documents
 * Uses spread to get all fields (works for both flexible and fixed page types)
 * Components array items need explicit dereferencing for nested references
 */
const PAGE_FIELDS = `
  ...,
  seoImage { asset-> { url } },
  components[] {
    ...,
    media { ${MEDIA_PROJECTION} }
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
  pageType?: string,
  preview?: boolean
): Promise<SanityDocument | null> {
  let query: string;
  let params: Record<string, string>;

  if (pageType) {
    query = `*[_type == $pageType && slug.current == $slug][0]{
      ${PAGE_FIELDS}
    }`;
    params = { pageType, slug };
  } else {
    // Fallback: query across all page types (SSR without props)
    const pageTypeNames = getPageTypeNames();
    const typeFilter = pageTypeNames
      .map((name) => `_type == "${name}"`)
      .join(" || ");
    query = `*[(${typeFilter}) && slug.current == $slug][0]{
      ${PAGE_FIELDS}
    }`;
    params = { slug };
  }

  const { data } = await loadQuery<SanityDocument>({
    query,
    params,
    preview,
  });

  return data || null;
}

/**
 * Loads the homepage singleton document
 */
export async function loadHomepage(
  preview?: boolean
): Promise<SanityDocument | null> {
  const { data: page } = await loadQuery<SanityDocument>({
    query: `*[_type == "homepage"][0]{
      ${PAGE_FIELDS}
    }`,
    preview,
  });

  return page || null;
}

/**
 * Loads the not-found page singleton document
 */
export async function loadNotFoundPage(
  preview?: boolean
): Promise<SanityDocument | null> {
  const { data: page } = await loadQuery<SanityDocument>({
    query: `*[_type == "notFoundPage"][0]{
      ${PAGE_FIELDS}
    }`,
    preview,
  });

  return page || null;
}
