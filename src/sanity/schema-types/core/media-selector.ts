import { defineField, defineType } from "sanity";
import MediaSelector from "@/sanity/components/media-selector";

export type MediaSelectorOptions = {
  allowedTypes?: "image" | "video" | "both";
};

/**
 * Media Selector schema type
 *
 * Usage:
 * - Default (both images and videos):
 *   defineField({ name: "media", type: "mediaSelector" })
 *
 * - Images only:
 *   defineField({
 *     name: "image",
 *     type: "mediaSelector",
 *     options: { allowedTypes: "image" } as MediaSelectorOptions
 *   })
 *
 * - Videos only:
 *   defineField({
 *     name: "video",
 *     type: "mediaSelector",
 *     options: { allowedTypes: "video" } as MediaSelectorOptions
 *   })
 */
export const mediaSelector = defineType({
  name: "mediaSelector",
  title: "Media Selector",
  type: "object",
  fields: [
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Video", value: "video" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "value",
      title: "Value",
      type: "string",
      description: "Video ID for videos, image URL for images",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "altText",
      title: "Alt Text",
      type: "string",
      description: "Alternative text for images (required for accessibility)",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as
            | { type?: "image" | "video" }
            | undefined;
          if (parent?.type === "image" && !value) {
            return "Alt text is required for images";
          }
          return true;
        }),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "string",
      description:
        "Description for videos (required for visually impaired users since videos have no sound)",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as
            | { type?: "image" | "video" }
            | undefined;
          if (parent?.type === "video" && !value) {
            return "Description is required for videos";
          }
          return true;
        }),
    }),
  ],
  components: {
    input: MediaSelector,
  },
});
