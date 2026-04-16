import { defineField, defineType } from "sanity";
import { getPageTypeNames } from "@/registry";

const pageTypeRefs = getPageTypeNames()
  .filter((name) => name !== "homepage")
  .map((name) => ({ type: name }));

export const redirect = defineType({
  name: "redirect",
  title: "Redirect",
  type: "document",
  fields: [
    defineField({
      name: "sourceType",
      title: "Source type",
      type: "string",
      options: {
        list: [
          { title: "Internal page", value: "internal" },
          { title: "Custom path", value: "custom" },
        ],
        layout: "radio",
      },
      initialValue: "custom",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sourcePage",
      title: "Source page",
      type: "reference",
      to: pageTypeRefs,
      hidden: ({ parent }) => parent?.sourceType !== "internal",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { sourceType?: string } | undefined;
          if (parent?.sourceType === "internal" && !value) {
            return "Please select a page";
          }
          return true;
        }),
    }),
    defineField({
      name: "sourcePath",
      title: "Source path",
      type: "string",
      description: "The path to redirect from, e.g. /old-page",
      hidden: ({ parent }) => parent?.sourceType !== "custom",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { sourceType?: string } | undefined;
          if (parent?.sourceType === "custom") {
            if (!value) {
              return "Source path is required";
            }
            if (!value.startsWith("/")) {
              return "Must start with /";
            }
          }
          return true;
        }),
    }),
    defineField({
      name: "destinationType",
      title: "Destination type",
      type: "string",
      options: {
        list: [
          { title: "Internal page", value: "internal" },
          { title: "Custom path or URL", value: "custom" },
        ],
        layout: "radio",
      },
      initialValue: "custom",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "destinationPage",
      title: "Destination page",
      type: "reference",
      to: pageTypeRefs,
      hidden: ({ parent }) => parent?.destinationType !== "internal",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as
            | {
                destinationType?: string;
              }
            | undefined;
          if (parent?.destinationType === "internal" && !value) {
            return "Please select a page";
          }
          return true;
        }),
    }),
    defineField({
      name: "destinationPath",
      title: "Destination path or URL",
      type: "string",
      description: "e.g. /new-page or https://example.com",
      hidden: ({ parent }) => parent?.destinationType !== "custom",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as
            | {
                destinationType?: string;
              }
            | undefined;
          if (parent?.destinationType === "custom" && !value) {
            return "Destination is required";
          }
          return true;
        }),
    }),
    defineField({
      name: "permanent",
      title: "Permanent redirect",
      type: "boolean",
      initialValue: true,
      description:
        "Permanent (301) tells search engines to update their links. Temporary (302) keeps the original URL.",
    }),
  ],
  preview: {
    select: {
      sourceType: "sourceType",
      sourcePath: "sourcePath",
      sourcePageSlug: "sourcePage.slug.current",
      sourcePageTitle: "sourcePage.internalTitle",
      destinationType: "destinationType",
      destinationPath: "destinationPath",
      destPageSlug: "destinationPage.slug.current",
      destPageTitle: "destinationPage.internalTitle",
      permanent: "permanent",
    },
    prepare({
      sourceType,
      sourcePath,
      sourcePageSlug,
      sourcePageTitle,
      destinationType,
      destinationPath,
      destPageSlug,
      destPageTitle,
      permanent,
    }) {
      const source =
        sourceType === "internal"
          ? sourcePageTitle || `/${sourcePageSlug}` || "No page"
          : sourcePath || "No path";
      const dest =
        destinationType === "internal"
          ? destPageTitle || `/${destPageSlug}` || "No page"
          : destinationPath || "No destination";
      return {
        title: source,
        subtitle: `→ ${dest} (${permanent ? "301" : "302"})`,
      };
    },
  },
});
