import { BlockElementIcon, SearchIcon } from "@sanity/icons";

import { ALL_FIELDS_GROUP } from "sanity";
import { metadata } from "@/sanity/schema-types/core/metadata";

/**
 * Base page configuration shared across all page types
 * This provides the common structure (groups, metadata fields) that all page types use
 */
export const basePageConfig = {
  type: "document" as const,
  groups: [
    {
      name: "metadata",
      title: "Metadata",
      icon: SearchIcon,
    },
    {
      name: "content",
      title: "Content",
      icon: BlockElementIcon,
    },
    {
      ...ALL_FIELDS_GROUP,
      hidden: true,
    },
  ],
  baseFields: metadata,
  preview: {
    select: {
      title: "internalTitle",
      subtitle: "slug.current",
    },
  },
};
