import { defineField, defineType } from "sanity";
import { getPageTypeNames } from "@/registry";

// Reference every page type (including the homepage singleton) so the
// reference list is never empty — even in a fresh project where only the
// singleton documents exist yet.
const pageTypeRefs = getPageTypeNames().map((name) => ({ type: name }));

export const redirect = defineType({
  fields: [
    defineField({
      initialValue: "custom",
      name: "sourceType",
      options: {
        layout: "radio",
        list: [
          { title: "Internal page", value: "internal" },
          { title: "Custom path", value: "custom" },
        ],
      },
      title: "Source type",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      hidden: ({ parent }) => parent?.sourceType !== "internal",
      name: "sourcePage",
      title: "Source page",
      to: pageTypeRefs,
      type: "reference",
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
      description: "The path to redirect from, e.g. /old-page",
      hidden: ({ parent }) => parent?.sourceType !== "custom",
      name: "sourcePath",
      title: "Source path",
      type: "string",
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
      initialValue: "custom",
      name: "destinationType",
      options: {
        layout: "radio",
        list: [
          { title: "Internal page", value: "internal" },
          { title: "Custom path or URL", value: "custom" },
        ],
      },
      title: "Destination type",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      hidden: ({ parent }) => parent?.destinationType !== "internal",
      name: "destinationPage",
      title: "Destination page",
      to: pageTypeRefs,
      type: "reference",
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
      description: "e.g. /new-page or https://example.com",
      hidden: ({ parent }) => parent?.destinationType !== "custom",
      name: "destinationPath",
      title: "Destination path or URL",
      type: "string",
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
      description:
        "Permanent (301) tells search engines to update their links. Temporary (302) keeps the original URL.",
      initialValue: true,
      name: "permanent",
      title: "Permanent redirect",
      type: "boolean",
    }),
  ],
  name: "redirect",
  preview: {
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
        subtitle: `→ ${dest} (${permanent ? "301" : "302"})`,
        title: source,
      };
    },
    select: {
      destinationPath: "destinationPath",
      destinationType: "destinationType",
      destPageSlug: "destinationPage.slug.current",
      destPageTitle: "destinationPage.internalTitle",
      permanent: "permanent",
      sourcePageSlug: "sourcePage.slug.current",
      sourcePageTitle: "sourcePage.internalTitle",
      sourcePath: "sourcePath",
      sourceType: "sourceType",
    },
  },
  title: "Redirect",
  type: "document",
});
