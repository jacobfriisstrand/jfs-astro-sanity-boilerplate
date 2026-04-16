import { Stack, Text, TextArea } from "@sanity/ui";
import type React from "react";
import { defineField, set } from "sanity";
import { getPageTypeNames } from "@/registry";

export const metadata = [
  defineField({
    name: "internalTitle",
    title: "Internal title",
    description: "Only visible to editors. Not shown on the website.",
    type: "string",
    group: "metadata",
    validation: (rule) => rule.required().error("Internal title is required"),
  }),
  defineField({
    name: "seoTitle",
    title: "SEO title",
    type: "string",
    group: "metadata",
    validation: (rule) => rule.required().error("SEO title is required"),
  }),
  defineField({
    name: "slugMode",
    title: "URL structure",
    type: "string",
    group: "metadata",
    description:
      "Choose how the page URL is built. 'Default' uses the slug as-is. 'Parent page' builds the URL from a selected parent page.",
    options: {
      list: [
        { title: "Default", value: "default" },
        { title: "Parent page", value: "parentPage" },
      ],
      layout: "radio",
    },
    initialValue: "default",
  }),
  defineField({
    name: "parentPage",
    title: "Parent page",
    type: "reference",
    group: "metadata",
    to: getPageTypeNames().map((name) => ({ type: name })),
    description:
      "Select a parent page. The URL will be built as /parent-slug/this-page-slug.",
    hidden: ({ document }) => document?.slugMode !== "parentPage",
    validation: (rule) =>
      rule.custom((value, context) => {
        if (context.document?.slugMode === "parentPage" && !value) {
          return "Please select a parent page";
        }
        return true;
      }),
  }),
  defineField({
    name: "slug",
    type: "slug",
    group: "metadata",
    options: {
      source: "seoTitle",
    },
    description:
      "The page URL. In 'Default' mode, you can type any path including slashes (e.g. 'products/shoes'). In 'Parent page' mode, this is just the last part of the URL.",
  }),
  defineField({
    name: "seoDescription",
    title: "SEO description",
    type: "text",
    rows: 3,
    group: "metadata",
    description:
      "A short summary of the page. This appears in search results and when the page is shared on social media.",
    components: {
      input: (props) => {
        const { value, onChange } = props;
        const charCount = value ? value.length : 0;

        return (
          <Stack space={2}>
            <TextArea
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
    name: "seoImage",
    title: "SEO image",
    type: "image",
    group: "metadata",
    description:
      "Shown when the page is shared on social media. Recommended size: 1200×630.",
  }),
  defineField({
    name: "noIndex",
    title: "No index",
    type: "boolean",
    initialValue: false,
    group: "metadata",
    description: "Hide this page from search engines like Google",
  }),
];

/**
 * Get metadata fields excluding the slug field
 * Used for special pages like homepage and not-found page that don't need slugs
 */
export const metadataWithoutSlug = metadata.filter(
  (field) => field.name !== "slug"
);
