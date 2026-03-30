import { LinkIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { getPageTypeNames } from "@/registry";

const validSchemes = /^(https?:\/\/|mailto:|tel:|ftp:\/\/)/i;

export const link = defineType({
  name: "link",
  title: "Link",
  type: "object",
  icon: LinkIcon,
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      description: "The text displayed for this link",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "linkType",
      title: "Link Type",
      type: "string",
      options: {
        list: [
          { title: "Internal Page", value: "internal" },
          { title: "External URL", value: "external" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "internalPage",
      title: "Page",
      type: "reference",
      to: getPageTypeNames().map((name) => ({ type: name })),
      hidden: ({ parent }) => parent?.linkType !== "internal",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined;
          if (parent?.linkType === "internal" && !value) {
            return "Please select an internal page";
          }
          return true;
        }),
    }),
    defineField({
      name: "externalUrl",
      title: "URL",
      type: "url",
      description: "Supports http://, https://, mailto:, and tel: schemes",
      hidden: ({ parent }) => parent?.linkType !== "external",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined;
          if (parent?.linkType === "external" && !value) {
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
    }),
  ],
  preview: {
    select: {
      label: "label",
      linkType: "linkType",
      internalPageTitle: "internalPage.title",
      externalUrl: "externalUrl",
    },
    prepare(selection) {
      const { label, linkType, internalPageTitle, externalUrl } = selection;
      const destination =
        linkType === "internal"
          ? internalPageTitle || "Internal page"
          : externalUrl || "External link";
      return {
        title: label || "Untitled link",
        subtitle: destination,
      };
    },
  },
});
