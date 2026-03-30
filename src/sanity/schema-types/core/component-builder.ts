import { defineField } from "sanity";
import { getComponentsForPageType, type PageTypeName } from "@/registry";

/**
 * Creates a component builder field for a specific page type
 * Components are filtered based on the registry configuration
 */
export function createComponentBuilder(pageTypeName: PageTypeName) {
  const componentNames = getComponentsForPageType(pageTypeName);

  return defineField({
    name: "components",
    title: "Components",
    type: "array",
    group: "content",
    of: componentNames.map((name) => ({ type: name })),
  });
}
