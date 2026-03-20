import type { SanityDocument } from "@sanity/client";
import { stegaClean } from "@sanity/client/stega";

export type SEOData = {
  title: string;
  description: string;
  image: string | undefined;
  imageAlt: string | undefined;
  noIndex: boolean;
};

/**
 * Extracts SEO metadata from a Sanity page document
 * All SEO fields are required in Sanity schema, so they will always be present
 */
export function extractSEOFromPage(page: SanityDocument): SEOData {
  const cleanedTitle = page.seoTitle ? stegaClean(page.seoTitle) : "";
  const cleanedDescription = page.seoDescription
    ? stegaClean(page.seoDescription)
    : "";

  // Extract image URL from Sanity native image asset reference
  const cleanedSeoImage = page.seoImage ? stegaClean(page.seoImage) : null;
  const imageUrl = cleanedSeoImage?.asset?.url ?? undefined;

  return {
    title: cleanedTitle,
    description: cleanedDescription,
    image: imageUrl,
    imageAlt: undefined,
    noIndex: page.noIndex ?? false,
  };
}
