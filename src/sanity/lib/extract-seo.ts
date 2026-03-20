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
  // Clean Stega-encoded invisible characters from all fields
  const cleanedSeoImage = page.seoImage ? stegaClean(page.seoImage) : null;
  const cleanedTitle = page.seoTitle ? stegaClean(page.seoTitle) : "";
  const cleanedDescription = page.seoDescription
    ? stegaClean(page.seoDescription)
    : "";

  // Extract image URL from Sanity native image asset reference
  const imageUrl =
    cleanedSeoImage?.type === "image" && cleanedSeoImage.image?.asset?.url
      ? cleanedSeoImage.image.asset.url
      : undefined;
  const imageAlt =
    cleanedSeoImage?.type === "image"
      ? cleanedSeoImage.image?.altText
      : undefined;

  return {
    title: cleanedTitle,
    description: cleanedDescription,
    image: imageUrl,
    imageAlt,
    noIndex: page.noIndex ?? false,
  };
}
