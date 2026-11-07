import { AccessDeniedIcon } from "@sanity/icons";
import { defineType } from "sanity";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";
import { createComponentBuilder } from "@/sanity/schema-types/core/component-builder";

export const pageTypeOne = defineType({
  icon: AccessDeniedIcon,
  name: "pageTypeOne",
  title: "Page type 1",
  ...basePageConfig,
  fields: [createComponentBuilder("pageTypeOne"), ...basePageConfig.baseFields],
});
