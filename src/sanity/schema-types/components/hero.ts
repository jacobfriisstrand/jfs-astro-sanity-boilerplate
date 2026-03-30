import { defineField, defineType } from "sanity";
import { createMediaField } from "@/sanity/schema-types/core/media-selector";

export const hero = defineType({
  name: "hero",
  title: "Hero",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    createMediaField({ name: "media" }),
  ],
});
