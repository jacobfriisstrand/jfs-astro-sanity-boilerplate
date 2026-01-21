import type { SchemaTypeDefinition } from "sanity";
import { hero } from "@/sanity/schema-types/components/hero";
import { siteSettings } from "@/sanity/schema-types/core/site-settings";
import { page } from "@/sanity/schema-types/page-types/page-page-type";
import "@/sanity/schema-types/core/base-page";
import { mediaSelector } from "@/sanity/schema-types/core/media-selector";
import { richTextType } from "@/sanity/schema-types/core/rich-text";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [hero, page, richTextType, siteSettings, mediaSelector],
};
