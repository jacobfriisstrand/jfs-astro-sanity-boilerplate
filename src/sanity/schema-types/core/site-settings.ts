import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Site title",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Site description",
      type: "text",
    }),
    defineField({
      description:
        "Used wherever the logo appears, including social sharing images. SVG format recommended.",
      name: "logo",
      options: {
        accept: "image/*",
      },
      title: "Site logo",
      type: "image",
    }),
    defineField({
      description:
        "The small icon shown in browser tabs. Upload an SVG or PNG file.",
      name: "favicon",
      options: {
        accept: "image/svg+xml,image/png",
      },
      title: "Favicon",
      type: "image",
    }),
  ],
  name: "siteSettings",
  title: "Site settings",
  type: "document",
});
