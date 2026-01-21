import { AddDocumentIcon } from "@sanity/icons";
import { defineType } from "sanity";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";
import { createComponentBuilder } from "@/sanity/schema-types/core/component-builder";

export const page = defineType({
  name: "page",
  title: "page",
  icon: AddDocumentIcon,
  ...basePageConfig,
  fields: [createComponentBuilder("page"), ...basePageConfig.baseFields],
});
