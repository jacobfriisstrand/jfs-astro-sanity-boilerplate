import { Stack, Text, TextArea } from "@sanity/ui";
import type React from "react";
import { defineField, set } from "sanity";

export const metadata = [
  defineField({
    name: "internalTitle",
    title: "Internal title",
    description:
      "This title is used for internal purposes only. It is not displayed to the public.",
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
    name: "slug",
    type: "slug",
    group: "metadata",
    options: {
      source: "seoTitle",
    },
    description:
      "This is used to generate the URL for the page, and can be generated from the SEO title.",
    // TODO: Add validation and hidden logic
    // hidden: ({ document }) =>
    //   document?._type === "homePage" || document?._type === "notFoundPage",
    // validation: (rule) =>
    //   rule.custom((slug, context) => {
    //     if (
    //       context.document?._type === "homePage" ||
    //       context.document?._type === "notFoundPage"
    //     ) {
    //       return true;
    //     }
    //     if (!slug?.current) {
    //       return "Slug is required";
    //     }
    //     return true;
    //   }),
  }),
  defineField({
    name: "seoDescription",
    title: "SEO description",
    type: "text",
    rows: 3,
    group: "metadata",
    description:
      "The SEO description is a concise summary of your page. This appears in search results and when your page is shared on social media.",
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
        "A SEO description will help search engines understand your page and its content. Use keywords that are relevant to your page and content for better search engine visibility."
      ),
      rule
        .min(150)
        .max(160)
        .warning(
          "For optimal SEO, this summary should be between 150-160 characters"
        ),
    ],
  }),
  defineField({
    name: "seoImage",
    title: "SEO image",
    type: "image",
    group: "metadata",
    description:
      "Used for social sharing (Open Graph / Twitter cards). Recommended size: 1200x630.",
  }),
  defineField({
    name: "noIndex",
    title: "No index",
    type: "boolean",
    initialValue: false,
    group: "metadata",
    description:
      "If enabled, the page will not be recognized by search engines",
  }),
];

/**
 * Get metadata fields excluding the slug field
 * Used for special pages like homepage and not-found page that don't need slugs
 */
export const metadataWithoutSlug = metadata.filter(
  (field) => field.name !== "slug"
);
