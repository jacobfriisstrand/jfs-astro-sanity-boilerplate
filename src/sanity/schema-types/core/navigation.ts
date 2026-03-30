import { MenuIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const navigation = defineType({
  name: "navigation",
  title: "Navigation",
  type: "document",
  icon: MenuIcon,
  fields: [
    defineField({
      name: "mainNav",
      title: "Main Navigation",
      type: "array",
      of: [{ type: "link" }],
      description: "Links that appear in the main navigation menu",
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Main navigation",
        subtitle: "Main menu",
      };
    },
  },
});
