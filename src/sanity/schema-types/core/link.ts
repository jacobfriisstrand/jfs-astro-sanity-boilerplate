import { LinkIcon } from "@sanity/icons/Link";
import { defineField, defineType } from "sanity";
import { getPageTypeNames } from "@/registry";

const validSchemes = /^(?<scheme>https?:\/\/|mailto:|tel:|ftp:\/\/)/iu;

export const link = defineType({
  fields: [
    defineField({
      description: "The text displayed for this link",
      name: "label",
      title: "Label",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
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
      validation: (rule) => rule.required(),
    }),
    defineField({
      hidden: ({ parent }) => parent?.linkType !== "internal",
      name: "internalPage",
      title: "Page",
      to: getPageTypeNames().map((name) => ({ type: name })),
      type: "reference",
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
      description: "Full URL including http://, https://, mailto:, or tel:",
      hidden: ({ parent }) => parent?.linkType !== "external",
      name: "externalUrl",
      title: "URL",
      type: "url",
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
      description: "If enabled, link will open in a new tab/window",
      initialValue: false,
      name: "openInNewWindow",
      title: "Open in new window",
      type: "boolean",
    }),
  ],
  icon: LinkIcon,
  name: "link",
  preview: {
    prepare(selection) {
      const { label, linkType, internalPageTitle, externalUrl } = selection;
      const destination =
        linkType === "internal"
          ? internalPageTitle || "Internal page"
          : externalUrl || "External link";
      return {
        subtitle: destination,
        title: label || "Untitled link",
      };
    },
    select: {
      externalUrl: "externalUrl",
      internalPageTitle: "internalPage.title",
      label: "label",
      linkType: "linkType",
    },
  },
  title: "Link",
  type: "object",
});
