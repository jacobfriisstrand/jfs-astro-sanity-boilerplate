import { MenuIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { getPageTypeNames } from "@/registry";

const validSchemes = /^(https?:\/\/|mailto:|tel:|ftp:\/\/)/i;

const labelField = defineField({
  name: "label",
  title: "Label",
  type: "string",
  description: "The text displayed for this item",
  validation: (rule) => rule.required(),
});

/**
 * Link fields shown only when the item is a direct link (no submenu)
 */
const linkFields = [
  defineField({
    name: "linkType",
    title: "Link type",
    type: "string",
    options: {
      list: [
        { title: "Internal page", value: "internal" },
        { title: "External URL", value: "external" },
      ],
      layout: "radio",
    },
    hidden: ({ parent }) => parent?.hasSubmenu === true,
    validation: (rule) =>
      rule.custom((value, context) => {
        const parent = context.parent as { hasSubmenu?: boolean } | undefined;
        if (parent?.hasSubmenu) {
          return true;
        }
        if (!value) {
          return "Please select a link type";
        }
        return true;
      }),
  }),
  defineField({
    name: "internalPage",
    title: "Page",
    type: "reference",
    to: getPageTypeNames().map((name) => ({ type: name })),
    hidden: ({ parent }) =>
      parent?.hasSubmenu === true || parent?.linkType !== "internal",
    validation: (rule) =>
      rule.custom((value, context) => {
        const parent = context.parent as
          | {
              hasSubmenu?: boolean;
              linkType?: string;
            }
          | undefined;
        if (!parent?.hasSubmenu && parent?.linkType === "internal" && !value) {
          return "Please select an internal page";
        }
        return true;
      }),
  }),
  defineField({
    name: "externalUrl",
    title: "URL",
    type: "url",
    description: "Full URL including http://, https://, mailto:, or tel:",
    hidden: ({ parent }) =>
      parent?.hasSubmenu === true || parent?.linkType !== "external",
    validation: (rule) =>
      rule.custom((value, context) => {
        const parent = context.parent as
          | {
              hasSubmenu?: boolean;
              linkType?: string;
            }
          | undefined;
        if (!parent?.hasSubmenu && parent?.linkType === "external" && !value) {
          return "Please enter a URL";
        }
        if (value && !validSchemes.test(value)) {
          return "URL must start with http://, https://, ftp://, mailto:, or tel:";
        }
        return true;
      }),
  }),
  defineField({
    name: "openInNewWindow",
    title: "Open in new window",
    type: "boolean",
    initialValue: false,
    description: "If enabled, link will open in a new tab/window",
    hidden: ({ parent }) => parent?.hasSubmenu === true,
  }),
];

const linkPreview = {
  select: {
    label: "label",
    hasSubmenu: "hasSubmenu",
    linkType: "linkType",
    internalPageTitle: "internalPage.title",
    externalUrl: "externalUrl",
  },
  prepare(selection: Record<string, string | boolean>) {
    const { label, hasSubmenu, linkType, internalPageTitle, externalUrl } =
      selection;
    let destination = "External link";
    if (hasSubmenu) {
      destination = "Submenu";
    } else if (linkType === "internal") {
      destination = (internalPageTitle as string) || "Internal page";
    } else if (externalUrl) {
      destination = externalUrl as string;
    }
    return {
      title: (label as string) || "Untitled item",
      subtitle: destination as string,
    };
  },
};

/**
 * Level 3 nav item — deepest level, always a link, no children
 */
export const navItemL3 = defineType({
  name: "navItemL3",
  title: "Level 3 menu item",
  type: "object",
  icon: MenuIcon,
  fields: [labelField, ...linkFields],
  preview: linkPreview,
});

/**
 * Level 2 nav item — can be a link or a group with level 3 children
 */
export const navItemL2 = defineType({
  name: "navItemL2",
  title: "Level 2 menu item",
  type: "object",
  icon: MenuIcon,
  fields: [
    labelField,
    defineField({
      name: "hasSubmenu",
      title: "Has sub-items",
      type: "boolean",
      initialValue: false,
      description:
        "Turn this into a dropdown with sub-items instead of a direct link",
    }),
    ...linkFields,
    defineField({
      name: "children",
      title: "Level 3 menu items",
      type: "array",
      of: [{ type: "navItemL3" }],
      description: "Level 3 navigation items",
      hidden: ({ parent }) => parent?.hasSubmenu !== true,
    }),
  ],
  preview: linkPreview,
});

/**
 * Level 1 nav item — can be a link or a group with level 2 children
 */
export const navItem = defineType({
  name: "navItem",
  title: "Menu item",
  type: "object",
  icon: MenuIcon,
  fields: [
    labelField,
    defineField({
      name: "hasSubmenu",
      title: "Has sub-items",
      type: "boolean",
      initialValue: false,
      description:
        "Turn this into a dropdown with sub-items instead of a direct link",
    }),
    ...linkFields,
    defineField({
      name: "children",
      title: "Level 2 menu items",
      type: "array",
      of: [{ type: "navItemL2" }],
      description: "Level 2 navigation items",
      hidden: ({ parent }) => parent?.hasSubmenu !== true,
    }),
  ],
  preview: linkPreview,
});
