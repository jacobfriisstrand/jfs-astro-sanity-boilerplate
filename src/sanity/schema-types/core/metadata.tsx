import { Stack, Text, TextArea } from "@sanity/ui";
import type React from "react";
import { defineField, set } from "sanity";
import { getPageTypeNames } from "@/registry";

export const metadata = [
  defineField({
    description: "Only visible to editors. Not shown on the website.",
    group: "metadata",
    name: "internalTitle",
    title: "Internal title",
    type: "string",
    validation: (rule) => rule.required().error("Internal title is required"),
  }),
  defineField({
    group: "metadata",
    name: "seoTitle",
    title: "SEO title",
    type: "string",
    validation: (rule) => rule.required().error("SEO title is required"),
  }),
  defineField({
    description:
      "Choose how the page URL is built. 'Default' uses the slug as-is. 'Parent page' builds the URL from a selected parent page.",
    group: "metadata",
    initialValue: "default",
    name: "slugMode",
    options: {
      layout: "radio",
      list: [
        { title: "Default", value: "default" },
        { title: "Parent page", value: "parentPage" },
      ],
    },
    title: "URL structure",
    type: "string",
  }),
  defineField({
    description:
      "Select a parent page. The URL will be built as /parent-slug/this-page-slug.",
    group: "metadata",
    hidden: ({ document }) => document?.slugMode !== "parentPage",
    name: "parentPage",
    title: "Parent page",
    to: getPageTypeNames().map((name) => ({ type: name })),
    type: "reference",
    validation: (rule) =>
      rule.custom((value, context) => {
        if (context.document?.slugMode === "parentPage" && !value) {
          return "Please select a parent page";
        }
        return true;
      }),
  }),
  defineField({
    description:
      "The page URL. In 'Default' mode, you can type any path including slashes (e.g. 'products/shoes'). In 'Parent page' mode, this is just the last part of the URL.",
    group: "metadata",
    name: "slug",
    options: {
      source: "seoTitle",
    },
    type: "slug",
  }),
  defineField({
    components: {
      input: (props) => {
        const { value, onChange } = props;
        const charCount = value ? value.length : 0;

        return (
          <Stack space={2}>
            <TextArea
              // biome-ignore lint/performance/noJsxPropsBind: Sanity Studio input components receive onChange per render; extraction would change the component API for no measurable gain
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onChange(set(e.target.value))
              }
              rows={3}
              value={value || ""}
            />
            <Text muted size={1}>
              {charCount} characters
            </Text>
          </Stack>
        );
      },
    },
    description:
      "A short summary of the page. This appears in search results and when the page is shared on social media.",
    group: "metadata",
    name: "seoDescription",
    rows: 3,
    title: "SEO description",
    type: "text",
    validation: (rule) => [
      rule.required().error("SEO description is required"),
      rule.info(
        "A good description helps search engines understand your page. Use keywords relevant to the page content."
      ),
      rule
        .min(150)
        .max(160)
        .warning("For best results, keep this between 150–160 characters"),
    ],
  }),
  defineField({
    description:
      "Shown when the page is shared on social media. Recommended size: 1200×630.",
    group: "metadata",
    name: "seoImage",
    title: "SEO image",
    type: "image",
  }),
  defineField({
    description: "Hide this page from search engines like Google",
    group: "metadata",
    initialValue: false,
    name: "noIndex",
    title: "No index",
    type: "boolean",
  }),
];

/**
 * Get metadata fields excluding the slug field
 * Used for special pages like homepage and not-found page that don't need slugs
 */
export const metadataWithoutSlug = metadata.filter(
  (field) => field.name !== "slug"
);
