import type { SchemaTypeDefinition } from "sanity";
import { hero } from "@/sanity/schema-types/components/hero";
import { faq } from "@/sanity/schema-types/components/faq";
import { homepage } from "@/sanity/schema-types/core/homepage";
import { navigation } from "@/sanity/schema-types/core/navigation";
import { notFoundPage } from "@/sanity/schema-types/core/not-found-page";
import { siteSettings } from "@/sanity/schema-types/core/site-settings";
import { pageTypeOne } from "@/sanity/schema-types/page-types/page-type-one-page-type";
import { pageTypeTwo } from "@/sanity/schema-types/page-types/page-type-two-page-type";
import "@/sanity/schema-types/core/base-page";
import { link } from "@/sanity/schema-types/core/link";
import {
  plainRichTextType,
  richTextType,
} from "@/sanity/schema-types/core/rich-text";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [faq, hero, pageTypeOne, pageTypeTwo, richTextType, plainRichTextType, siteSettings, link, navigation, homepage, notFoundPage],
};
