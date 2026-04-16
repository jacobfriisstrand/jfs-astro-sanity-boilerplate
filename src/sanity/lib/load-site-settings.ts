import type { SiteSettings } from "sanity.types";
import { loadQuery } from "@/sanity/lib/load-query";

const siteSettingsQuery = `
  *[_type == "siteSettings"][0] {
    title,
    description,
    logo { asset-> { _id, url, mimeType, extension, metadata { dimensions { width, height } } } },
    favicon { asset-> { _id, url, mimeType, extension } }
  }
`;

export async function loadSiteSettings(preview?: boolean) {
  const { data } = await loadQuery<SiteSettings>({
    query: siteSettingsQuery,
    preview,
  });
  return data;
}
