import { defineField, type FieldDefinition } from "sanity";

interface MediaFieldConfig {
  allowedTypes?: "image" | "video" | "both";
  group?: string;
  name: string;
  title?: string;
}

/**
 * Creates a media selector field with configurable allowed types.
 *
 * Usage:
 * - Default (both images and videos):
 *   createMediaField({ name: "media" })
 *
 * - Images only:
 *   createMediaField({ name: "media", allowedTypes: "image" })
 *
 * - Videos only:
 *   createMediaField({ name: "video", allowedTypes: "video" })
 *
 * GROQ query examples:
 *   Both:   media { type, image { ..., asset-> { _id, url, metadata { lqip, dimensions { width, height } } }, hotspot, crop }, video { file { asset-> { playbackId, assetId } }, description } }
 *   Image:  media { image { ..., asset-> { _id, url, metadata { lqip, dimensions { width, height } } }, hotspot, crop } }
 *   Video:  media { video { file { asset-> { playbackId, assetId } }, description } }
 */
export function createMediaField({
  name,
  title = "Media",
  allowedTypes = "both",
  group,
}: MediaFieldConfig) {
  const fields: FieldDefinition[] = [];

  if (allowedTypes === "both") {
    fields.push(
      defineField({
        name: "type",
        options: {
          layout: "radio",
          list: [
            { title: "Image", value: "image" },
            { title: "Video", value: "video" },
          ],
        },
        title: "Type",
        type: "string",
        validation: (rule) => rule.required(),
      })
    );
  }

  if (allowedTypes === "image" || allowedTypes === "both") {
    fields.push(
      defineField({
        fields: [
          defineField({
            description:
              "Describe the image for screen readers and accessibility",
            name: "altText",
            title: "Alt text",
            type: "string",
            validation: (rule) => rule.required(),
          }),
        ],
        hidden:
          allowedTypes === "both"
            ? ({ parent }) =>
                (parent as { type?: string } | undefined)?.type !== "image"
            : false,
        name: "image",
        options: { collapsible: false, hotspot: true },
        title: "Image",
        type: "image",
      })
    );
  }

  if (allowedTypes === "video" || allowedTypes === "both") {
    fields.push(
      defineField({
        fields: [
          defineField({
            name: "file",
            options: { collapsed: false },
            title: "Video file",
            type: "mux.video",
            validation: (rule) => rule.required(),
          }),
          defineField({
            description:
              "Describe the video for screen readers and accessibility",
            name: "description",
            title: "Video description",
            type: "string",
            validation: (rule) => rule.required(),
          }),
        ],
        hidden:
          allowedTypes === "both"
            ? ({ parent }) =>
                (parent as { type?: string } | undefined)?.type !== "video"
            : false,
        name: "video",
        options: { collapsible: false },
        title: "Video",
        type: "object",
      })
    );
  }

  return defineField({
    name,
    title,
    type: "object",
    ...(group && { group }),
    fields,
  });
}
