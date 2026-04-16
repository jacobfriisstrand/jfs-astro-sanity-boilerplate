import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
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
      name: "logo",
      title: "Site logo",
      type: "image",
      description:
        "Used wherever the logo appears, including social sharing images. SVG format recommended.",
      options: {
        accept: "image/*",
      },
    }),
    defineField({
      name: "favicon",
      title: "Favicon",
      type: "image",
      description:
        "The small icon shown in browser tabs. Upload an SVG or PNG file.",
      options: {
        accept: "image/svg+xml,image/png",
      },
    }),
  ],
});
