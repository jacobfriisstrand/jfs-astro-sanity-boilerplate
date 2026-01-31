import { AccessDeniedIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";
import { metadataWithoutSlug } from "@/sanity/schema-types/core/metadata";

export const notFoundPage = defineType({
  name: "notFoundPage",
  title: "Not found page",
  icon: AccessDeniedIcon,
  ...basePageConfig,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "richText",
      group: "content",
    }),
    ...metadataWithoutSlug,
  ],
});
