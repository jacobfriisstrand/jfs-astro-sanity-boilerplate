import { AccessDeniedIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";
import { metadataWithoutSlug } from "@/sanity/schema-types/core/metadata";

export const notFoundPage = defineType({
  icon: AccessDeniedIcon,
  name: "notFoundPage",
  title: "Not found page",
  ...basePageConfig,
  fields: [
    defineField({
      group: "content",
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      group: "content",
      name: "content",
      title: "Content",
      type: "richText",
    }),
    ...metadataWithoutSlug,
  ],
});
