// ./src/sanity/schemaTypes/blockContent.ts
import { defineArrayMember, defineType } from "sanity";

/**
 * Rich text with full configurability: styles, lists, marks, annotations, images.
 * Use for content where editors need headings, lists, links, etc.
 */

const helpText = "Tip: To create new lines, press Shift + Enter key.";

export const richTextType = defineType({
  title: "Rich Text",
  name: "richText",
  type: "array",
  description: helpText,
  of: [
    defineArrayMember({
      type: "block",
      // Styles let you define what blocks can be marked up as. The default
      // set corresponds with HTML tags, but you can set any title or value
      // you want, and decide how you want to deal with it where you want to
      // use your content.
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "H4", value: "h4" },
        { title: "H5", value: "h5" },
        { title: "H6", value: "h6" },
        // { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Number", value: "number" },
      ],
      // Marks let you mark up inline text in the Portable Text Editor
      marks: {
        // Decorators usually describe a single property – e.g. a typographic
        // preference or highlighting
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
        ],
        // Annotations can be any object structure – e.g. a link or a footnote.
        annotations: [
          {
            title: "URL",
            name: "link",
            type: "object",
            fields: [
              {
                title: "URL",
                name: "href",
                type: "url",
              },
            ],
          },
        ],
      },
    }),
    // You can add additional types here. Note that you can't use
    // primitive types such as 'string' and 'number' in the same array
    // as a block type.
    defineArrayMember({
      type: "image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative Text",
        },
      ],
    }),
  ],
});

/**
 * Plain text only: normal paragraphs and newlines. No styles, lists, marks,
 * annotations, or images. Use for short copy (e.g. captions, labels) where
 * formatting is not allowed.
 */
export const plainRichTextType = defineType({
  title: "Text",
  name: "plainRichText",
  type: "array",
  description: helpText,
  of: [
    defineArrayMember({
      type: "block",
      styles: [{ title: "Normal", value: "normal" }],
      lists: [],
      marks: {
        decorators: [],
        annotations: [],
      },
    }),
  ],
});
