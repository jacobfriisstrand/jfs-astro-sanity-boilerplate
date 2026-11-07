import { MenuIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { getPageTypeNames } from "@/registry";

const validSchemes = /^(?<scheme>https?:\/\/|mailto:|tel:|ftp:\/\/)/iu;

const labelField = defineField({
  description: "The text displayed for this item",
  name: "label",
  title: "Label",
  type: "string",
  validation: (rule) => rule.required(),
});

/**
 * Link fields shown only when the item is a direct link (no submenu)
 */
const linkFields = [
  defineField({
    hidden: ({ parent }) => parent?.hasSubmenu === true,
    name: "linkType",
    options: {
      layout: "radio",
      list: [
        { title: "Internal page", value: "internal" },
        { title: "External URL", value: "external" },
      ],
    },
    title: "Link type",
    type: "string",
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
    hidden: ({ parent }) =>
      parent?.hasSubmenu === true || parent?.linkType !== "internal",
    name: "internalPage",
    title: "Page",
    to: getPageTypeNames().map((name) => ({ type: name })),
    type: "reference",
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
    description: "Full URL including http://, https://, mailto:, or tel:",
    hidden: ({ parent }) =>
      parent?.hasSubmenu === true || parent?.linkType !== "external",
    name: "externalUrl",
    title: "URL",
    type: "url",
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
    description: "If enabled, link will open in a new tab/window",
    hidden: ({ parent }) => parent?.hasSubmenu === true,
    initialValue: false,
    name: "openInNewWindow",
    title: "Open in new window",
    type: "boolean",
  }),
];

const linkPreview = {
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
      subtitle: destination as string,
      title: (label as string) || "Untitled item",
    };
  },
  select: {
    externalUrl: "externalUrl",
    hasSubmenu: "hasSubmenu",
    internalPageTitle: "internalPage.title",
    label: "label",
    linkType: "linkType",
  },
};

/**
 * Level 3 nav item — deepest level, always a link, no children
 */
export const navItemL3 = defineType({
  fields: [labelField, ...linkFields],
  icon: MenuIcon,
  name: "navItemL3",
  preview: linkPreview,
  title: "Level 3 menu item",
  type: "object",
});

/**
 * Level 2 nav item — can be a link or a group with level 3 children
 */
export const navItemL2 = defineType({
  fields: [
    labelField,
    defineField({
      description:
        "Turn this into a dropdown with sub-items instead of a direct link",
      initialValue: false,
      name: "hasSubmenu",
      title: "Has sub-items",
      type: "boolean",
    }),
    ...linkFields,
    defineField({
      description: "Level 3 navigation items",
      hidden: ({ parent }) => parent?.hasSubmenu !== true,
      name: "children",
      of: [{ type: "navItemL3" }],
      title: "Level 3 menu items",
      type: "array",
    }),
  ],
  icon: MenuIcon,
  name: "navItemL2",
  preview: linkPreview,
  title: "Level 2 menu item",
  type: "object",
});

/**
 * Level 1 nav item — can be a link or a group with level 2 children
 */
export const navItem = defineType({
  fields: [
    labelField,
    defineField({
      description:
        "Turn this into a dropdown with sub-items instead of a direct link",
      initialValue: false,
      name: "hasSubmenu",
      title: "Has sub-items",
      type: "boolean",
    }),
    ...linkFields,
    defineField({
      description: "Level 2 navigation items",
      hidden: ({ parent }) => parent?.hasSubmenu !== true,
      name: "children",
      of: [{ type: "navItemL2" }],
      title: "Level 2 menu items",
      type: "array",
    }),
  ],
  icon: MenuIcon,
  name: "navItem",
  preview: linkPreview,
  title: "Menu item",
  type: "object",
});
