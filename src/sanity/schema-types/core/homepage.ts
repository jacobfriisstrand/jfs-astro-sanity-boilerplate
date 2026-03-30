import { HomeIcon } from "@sanity/icons";
import { defineType } from "sanity";
import type { PageTypeName } from "@/registry";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";
import { createComponentBuilder } from "@/sanity/schema-types/core/component-builder";
import { metadataWithoutSlug } from "@/sanity/schema-types/core/metadata";

export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  icon: HomeIcon,
  ...basePageConfig,
  fields: [
    createComponentBuilder("homepage" as PageTypeName),
    ...metadataWithoutSlug,
  ],
});
