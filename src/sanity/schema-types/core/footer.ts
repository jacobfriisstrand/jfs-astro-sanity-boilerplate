import { BlockElementIcon } from "@sanity/icons/BlockElement";
import { defineField, defineType } from "sanity";

export const footer = defineType({
  fields: [
    defineField({
      description: "Links that appear in the footer",
      name: "footerNav",
      of: [{ type: "navItem" }],
      title: "Footer navigation",
      type: "array",
    }),
    defineField({
      description:
        "Text shown in the footer copyright line (e.g. company name)",
      name: "copyrightText",
      title: "Copyright text",
      type: "string",
    }),
  ],
  icon: BlockElementIcon,
  name: "footer",
  preview: {
    prepare() {
      return {
        subtitle: "Footer navigation & copyright",
        title: "Footer",
      };
    },
  },
  title: "Footer",
  type: "document",
});
