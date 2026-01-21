import { CogIcon } from "@sanity/icons";
import type { StructureBuilder, StructureResolver } from "sanity/structure";
import { PAGE_TYPES } from "@/registry";
import { sanityApiVersion } from "@/sanity/constants/sanity-api-version";

export const structure: StructureResolver = (S: StructureBuilder) => {
  const items = [
    S.divider().title("Content"),
    ...Object.entries(PAGE_TYPES).map(([name, config]) => {
      // biome-ignore lint/suspicious/noExplicitAny: PAGE_TYPES config type varies based on page types
      const c = config as any;
      // Use structureTitle if provided, otherwise fall back to title
      const structureTitle = c.structureTitle ?? c.title;

      return S.listItem()
        .title(structureTitle)
        .icon(c.icon)
        .child(
          S.documentList()
            .title(structureTitle)
            .schemaType(name)
            .apiVersion(`v${sanityApiVersion}`)
            .filter(`_type == "${name}"`)
        );
    }),
    S.divider().title("General"),
    S.listItem()
      .title("Site settings")
      .icon(CogIcon)
      .child(
        S.document().schemaType("siteSettings").documentId("siteSettings")
      ),
  ];

  return S.list().title("Menu").items(items);
};
