import { MenuIcon } from "@sanity/icons/Menu";
import { defineField, defineType } from "sanity";

export const navigation = defineType({
  fields: [
    defineField({
      description: "Links that appear in the main navigation menu",
      name: "mainNav",
      of: [{ type: "navItem" }],
      title: "Main navigation",
      type: "array",
      validation: (rule) => rule.required().min(1),
    }),
  ],
  icon: MenuIcon,
  name: "navigation",
  preview: {
    prepare() {
      return {
        subtitle: "Main menu",
        title: "Navigation",
      };
    },
  },
  title: "Navigation",
  type: "document",
});
