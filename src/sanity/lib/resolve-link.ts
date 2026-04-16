/**
 * Relaxed link type that accepts both schema types and GROQ-resolved data
 */
type LinkInput = {
  label?: string;
  linkType?: "internal" | "external";
  internalPage?: Record<string, unknown>;
  externalUrl?: string;
  openInNewWindow?: boolean;
};

export type ResolvedLink = {
  href: string;
  target?: "_blank";
  rel?: string;
};

/**
 * Recursively builds the full URL path by traversing parent page references
 */
function buildParentPath(pageRef: {
  _type?: string;
  slug?: { current?: string };
  slugMode?: string;
  parentPage?: {
    _type?: string;
    slug?: { current?: string };
    slugMode?: string;
    parentPage?: {
      _type?: string;
      slug?: { current?: string };
    };
  };
}): string {
  const currentSlug = pageRef.slug?.current || "";

  if (pageRef.slugMode !== "parentPage" || !pageRef.parentPage) {
    return currentSlug;
  }

  const parentSlug = buildParentPath(pageRef.parentPage);
  return parentSlug ? `${parentSlug}/${currentSlug}` : currentSlug;
}

/**
 * Resolves a Sanity link object to an href, target, and rel attributes
 *
 * Internal links:
 * - Homepage returns "/"
 * - Pages with parentPage in "parentPage" slugMode build recursive URLs
 * - Other pages return "/[slug.current]"
 *
 * External links:
 * - Returns the URL as-is
 * - Applies security attributes when opening in new window
 *
 * @param link - The link object from Sanity
 * @returns ResolvedLink object with href and optional target/rel, or null if invalid
 */
export function resolveLink(
  link: LinkInput | null | undefined
): ResolvedLink | null {
  if (!link) {
    return null;
  }

  const result: ResolvedLink = { href: "" };

  if (link.linkType === "internal" && link.internalPage) {
    const pageRef = link.internalPage as {
      _type?: string;
      slug?: { current?: string };
      slugMode?: string;
      parentPage?: {
        _type?: string;
        slug?: { current?: string };
        slugMode?: string;
        parentPage?: {
          _type?: string;
          slug?: { current?: string };
        };
      };
    };

    // Homepage special case - no slug field
    if (pageRef._type === "homepage") {
      result.href = "/";
    } else if (pageRef.slug?.current) {
      const fullSlug = buildParentPath(pageRef);
      result.href = `/${fullSlug}`;
    } else {
      // Invalid internal page reference
      return null;
    }
  } else if (link.linkType === "external" && link.externalUrl) {
    result.href = link.externalUrl;
  } else {
    // No valid link destination
    return null;
  }

  // Apply new window behavior
  if (link.openInNewWindow) {
    result.target = "_blank";
    // Security best practice: prevent window.opener access
    result.rel = "noopener noreferrer";
  }

  return result;
}
