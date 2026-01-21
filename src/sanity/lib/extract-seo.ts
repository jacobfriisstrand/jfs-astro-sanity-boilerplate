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

  return {
    title: cleanedTitle,
    description: cleanedDescription,
    // Extract from mediaSelector structure (type: "image", value: image URL, altText: alt text)
    image:
      cleanedSeoImage?.type === "image" ? cleanedSeoImage.value : undefined,
    imageAlt:
      cleanedSeoImage?.type === "image" ? cleanedSeoImage.altText : undefined,
    noIndex: page.noIndex ?? false,
  };
}
