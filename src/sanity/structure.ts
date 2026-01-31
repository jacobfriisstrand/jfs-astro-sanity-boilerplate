import { CogIcon, DocumentRemoveIcon, HomeIcon, MenuIcon } from "@sanity/icons";
import type { StructureBuilder, StructureResolver } from "sanity/structure";
import { PAGE_TYPES } from "@/registry";
import { excludedSchemaTypes } from "@/sanity/constants/excluded-schema-types";
import { sanityApiVersion } from "@/sanity/constants/sanity-api-version";

export const structure: StructureResolver = (S: StructureBuilder) => {
  const items = [
    S.divider().title("Content"),
    ...Object.entries(PAGE_TYPES)
      .filter(([name]) => !excludedSchemaTypes.includes(name))
      .map(([name, config]) => {
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
      .title("Navigation")
      .icon(MenuIcon)
      .child(S.document().schemaType("navigation").documentId("navigation")),
    S.listItem()
      .title("Homepage")
      .icon(HomeIcon)
      .child(S.document().schemaType("homepage").documentId("homepage")),
    S.listItem()
      .title("Not found page")
      .icon(DocumentRemoveIcon)
      .child(
        S.document().schemaType("notFoundPage").documentId("notFoundPage")
      ),
    S.listItem()
      .title("Site settings")
      .icon(CogIcon)
      .child(
        S.document().schemaType("siteSettings").documentId("siteSettings")
      ),
  ];

  return S.list().title("Menu").items(items);
};
