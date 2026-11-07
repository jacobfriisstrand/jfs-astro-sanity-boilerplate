import { defineType } from "sanity";

export const hero = defineType({
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    },
  ],
  name: "hero",
  preview: {
    prepare({ title }) {
      return {
        subtitle: "Hero",
        title: title || "Untitled",
      };
    },
    select: {
      title: "title",
    },
  },
  title: "Hero",
  type: "object",
});
