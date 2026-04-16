import { BlockElementIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const footer = defineType({
  name: "footer",
  title: "Footer",
  type: "document",
  icon: BlockElementIcon,
  fields: [
    defineField({
      name: "footerNav",
      title: "Footer navigation",
      type: "array",
      of: [{ type: "navItem" }],
      description: "Links that appear in the footer",
    }),
    defineField({
      name: "copyrightText",
      title: "Copyright text",
      type: "string",
      description:
        "Text shown in the footer copyright line (e.g. company name)",
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Footer",
        subtitle: "Footer navigation & copyright",
      };
    },
  },
});
