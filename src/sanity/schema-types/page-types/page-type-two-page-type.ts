import { AccessDeniedIcon } from "@sanity/icons";
import { defineType } from "sanity";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";
import { createComponentBuilder } from "@/sanity/schema-types/core/component-builder";

export const pageTypeTwo = defineType({
  name: "pageTypeTwo",
  title: "Page type two",
  icon: AccessDeniedIcon,
  ...basePageConfig,
  fields: [createComponentBuilder("pageTypeTwo"), ...basePageConfig.baseFields],
});
