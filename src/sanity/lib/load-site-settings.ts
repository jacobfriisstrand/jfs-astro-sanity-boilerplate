import type { SiteSettings } from "sanity.types";
import { loadQuery } from "@/sanity/lib/load-query";

const siteSettingsQuery = `
  *[_type == "siteSettings"][0] {
    title,
    description
  }
`;

export async function loadSiteSettings(preview?: boolean) {
  const { data } = await loadQuery<SiteSettings>({
    query: siteSettingsQuery,
    preview,
  });
  return data;
}
