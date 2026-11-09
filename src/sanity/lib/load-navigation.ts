import type { Navigation } from "sanity/types";
import { loadQuery } from "@/sanity/lib/load-query";
import { linkProjection } from "@/sanity/lib/projections";

const navigationQuery = `
  *[_type == "navigation"][0] {
    mainNav[] {
      ${linkProjection},
      children[] {
        ${linkProjection},
        children[] {
          ${linkProjection}
        }
      }
    }
  }
`;

export async function loadNavigation(preview?: boolean) {
  const { data } = await loadQuery<Navigation>({
    preview,
    query: navigationQuery,
  });
  return data;
}
