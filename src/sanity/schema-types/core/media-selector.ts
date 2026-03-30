import { defineField, type FieldDefinition } from "sanity";

type MediaFieldConfig = {
  name: string;
  title?: string;
  allowedTypes?: "image" | "video" | "both";
  group?: string;
};

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
        title: "Type",
        type: "string",
        options: {
          list: [
            { title: "Image", value: "image" },
            { title: "Video", value: "video" },
          ],
          layout: "radio",
        },
        validation: (rule) => rule.required(),
      })
    );
  }

  if (allowedTypes === "image" || allowedTypes === "both") {
    fields.push(
      defineField({
        name: "image",
        title: "Image",
        type: "image",
        options: { hotspot: true, collapsible: false },
        hidden:
          allowedTypes === "both"
            ? ({ parent }) =>
                (parent as { type?: string } | undefined)?.type !== "image"
            : false,
        fields: [
          defineField({
            name: "altText",
            title: "Alt Text",
            type: "string",
            description:
              "Alternative text for images (required for accessibility)",
            validation: (rule) => rule.required(),
          }),
        ],
      })
    );
  }

  if (allowedTypes === "video" || allowedTypes === "both") {
    fields.push(
      defineField({
        name: "video",
        title: "Video",
        type: "object",
        options: { collapsible: false },
        hidden:
          allowedTypes === "both"
            ? ({ parent }) =>
                (parent as { type?: string } | undefined)?.type !== "video"
            : false,
        fields: [
          defineField({
            name: "file",
            title: "Video File",
            type: "mux.video",
            options: { collapsed: false },
            validation: (rule) => rule.required(),
          }),
          defineField({
            name: "description",
            title: "Video Description",
            type: "string",
            description:
              "Description for videos (required for visually impaired users)",
            validation: (rule) => rule.required(),
          }),
        ],
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
