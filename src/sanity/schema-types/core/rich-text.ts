// ./src/sanity/schemaTypes/blockContent.ts
import { defineArrayMember, defineType } from "sanity";

/**
 * Rich text with full configurability: styles, lists, marks, annotations, images.
 * Use for content where editors need headings, lists, links, etc.
 */

const helpText = "Tip: press Shift + Enter to create a new line.";

export const richTextType = defineType({
  description: helpText,
  name: "richText",
  of: [
    defineArrayMember({
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Number", value: "number" },
      ],
      // Marks let you mark up inline text in the Portable Text Editor
      marks: {
        // Annotations can be any object structure – e.g. a link or a footnote.
        annotations: [
          {
            fields: [
              {
                name: "href",
                title: "URL",
                type: "url",
              },
            ],
            name: "link",
            title: "URL",
            type: "object",
          },
        ],
        // Decorators usually describe a single property – e.g. a typographic
        // preference or highlighting
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
        ],
      },
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
      type: "block",
    }),
    // You can add additional types here. Note that you can't use
    // primitive types such as 'string' and 'number' in the same array
    // as a block type.
    defineArrayMember({
      fields: [
        {
          name: "alt",
          title: "Alternative text",
          type: "string",
        },
      ],
      options: { hotspot: true },
      type: "image",
    }),
  ],
  title: "Rich text",
  type: "array",
});

/**
 * Plain text only: normal paragraphs and newlines. No styles, lists, marks,
 * annotations, or images. Use for short copy (e.g. captions, labels) where
 * formatting is not allowed.
 */
export const plainRichTextType = defineType({
  description: helpText,
  name: "plainRichText",
  of: [
    defineArrayMember({
      lists: [],
      marks: {
        annotations: [],
        decorators: [],
      },
      styles: [{ title: "Normal", value: "normal" }],
      type: "block",
    }),
  ],
  title: "Text",
  type: "array",
});
