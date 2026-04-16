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
      title: "Main navigation",
      type: "array",
      of: [{ type: "navItem" }],
      description: "Links that appear in the main navigation menu",
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Navigation",
        subtitle: "Main menu",
      };
    },
  },
});
