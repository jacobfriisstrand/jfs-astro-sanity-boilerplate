import type { Navigation } from "sanity.types";
import { loadQuery } from "@/sanity/lib/load-query";

const navigationQuery = `
  *[_type == "navigation"][0] {
    mainNav[] {
      label,
      linkType,
      openInNewWindow,
      linkType == "internal" => {
        "internalPage": internalPage->{ _type, slug }
      },
      linkType == "external" => {
        externalUrl
      }
    },
    footerNav[] {
      label,
      linkType,
      openInNewWindow,
      linkType == "internal" => {
        "internalPage": internalPage->{ _type, slug }
      },
      linkType == "external" => {
        externalUrl
      }
    }
  }
`;

export async function loadNavigation(preview?: boolean) {
  const { data } = await loadQuery<Navigation>({
    query: navigationQuery,
    preview,
  });
  return data;
}
