import type { SchemaTypeDefinition } from "sanity";
import { hero } from "@/sanity/schema-types/components/hero";
import { homepage } from "@/sanity/schema-types/core/homepage";
import { notFoundPage } from "@/sanity/schema-types/core/not-found-page";
import { siteSettings } from "@/sanity/schema-types/core/site-settings";
import "@/sanity/schema-types/core/base-page";
import { mediaSelector } from "@/sanity/schema-types/core/media-selector";
import { richTextType } from "@/sanity/schema-types/core/rich-text";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    hero,
    richTextType,
    siteSettings,
    mediaSelector,
    homepage,
    notFoundPage,
  ],
};
