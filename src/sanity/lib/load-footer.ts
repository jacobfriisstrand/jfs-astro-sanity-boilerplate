import type { Footer } from "sanity.types";
import { loadQuery } from "@/sanity/lib/load-query";
import { linkProjection } from "@/sanity/lib/projections";

const footerQuery = `
  *[_type == "footer"][0] {
    footerNav[] {
      ${linkProjection},
      children[] {
        ${linkProjection},
        children[] {
          ${linkProjection}
        }
      }
    },
    copyrightText
  }
`;

export async function loadFooter(preview?: boolean) {
  const { data } = await loadQuery<Footer>({
    query: footerQuery,
    preview,
  });
  return data;
}
