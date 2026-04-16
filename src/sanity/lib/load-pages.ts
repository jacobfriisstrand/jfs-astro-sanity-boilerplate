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
  slugMode,
  "parentPage": parentPage-> {
    _type,
    slug,
    slugMode,
    "parentPage": parentPage-> {
      _type,
      slug,
      slugMode,
      "parentPage": parentPage-> {
        _type,
        slug
      }
    }
  },
  components[] {
    ...,
    media { ${MEDIA_PROJECTION} }
  }
`;

/**
 * Recursively builds the full URL path for a page by traversing parent pages
 */
function buildFullSlug(page: {
  slug?: string;
  slugMode?: string;
  parentPage?: {
    _type?: string;
    slug?: string;
    slugMode?: string;
    parentPage?: {
      _type?: string;
      slug?: string;
      slugMode?: string;
      parentPage?: { _type?: string; slug?: string };
    };
  };
}): string {
  const currentSlug = page.slug || "";

  if (page.slugMode !== "parentPage" || !page.parentPage) {
    return currentSlug;
  }

  const parentSlug = buildFullSlug(page.parentPage);
  return parentSlug ? `${parentSlug}/${currentSlug}` : currentSlug;
}

/**
 * Gets all page slugs for static path generation
 * Resolves parent page hierarchy to build full URL paths
 */
export async function getAllPageSlugs(): Promise<
  Array<{ slug: string; pageType: string }>
> {
  const pageTypeNames = getPageTypeNames();
  const typeFilter = pageTypeNames
    .map((name) => `_type == "${name}"`)
    .join(" || ");

  const { data: pages } = await loadQuery<
    Array<{
      slug: string;
      _type: string;
      slugMode?: string;
      parentPage?: {
        _type?: string;
        slug?: string;
        slugMode?: string;
        parentPage?: {
          _type?: string;
          slug?: string;
          slugMode?: string;
          parentPage?: { _type?: string; slug?: string };
        };
      };
    }>
  >({
    query: `*[(${typeFilter}) && defined(slug.current)]{
      _type,
      "slug": slug.current,
      slugMode,
      "parentPage": parentPage-> {
        _type,
        "slug": slug.current,
        slugMode,
        "parentPage": parentPage-> {
          _type,
          "slug": slug.current,
          slugMode,
          "parentPage": parentPage-> {
            _type,
            "slug": slug.current
          }
        }
      }
    }`,
  });

  return pages.map((page) => ({
    slug: buildFullSlug(page),
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
  // For parent-page mode, only the last segment is stored in slug.current
  // For default mode, the full path (possibly with slashes) is stored
  const slugSegments = slug.split("/");
  const lastSegment = slugSegments.at(-1) || "";

  let query: string;
  let params: Record<string, string>;

  if (pageType) {
    query = `*[_type == $pageType && (slug.current == $fullSlug || slug.current == $lastSegment)]{
      ${PAGE_FIELDS}
    }`;
    params = { pageType, fullSlug: slug, lastSegment };
  } else {
    // Fallback: query across all page types (SSR without props)
    const pageTypeNames = getPageTypeNames();
    const typeFilter = pageTypeNames
      .map((name) => `_type == "${name}"`)
      .join(" || ");
    query = `*[(${typeFilter}) && (slug.current == $fullSlug || slug.current == $lastSegment)]{
      ${PAGE_FIELDS}
    }`;
    params = { fullSlug: slug, lastSegment };
  }

  const { data: pages } = await loadQuery<SanityDocument[]>({
    query,
    params,
    preview,
  });

  if (!pages || pages.length === 0) {
    return null;
  }
  if (pages.length === 1) {
    return pages[0];
  }

  // Multiple matches: find the one whose resolved full slug matches the requested URL
  for (const page of pages) {
    const pageSlug =
      typeof page.slug === "string"
        ? page.slug
        : (page.slug as { current?: string })?.current || "";
    const resolvedSlug = buildFullSlug({
      slug: pageSlug,
      slugMode: page.slugMode as string | undefined,
      parentPage: page.parentPage as Parameters<
        typeof buildFullSlug
      >[0]["parentPage"],
    });
    if (resolvedSlug === slug) {
      return page;
    }
  }

  return pages[0];
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
