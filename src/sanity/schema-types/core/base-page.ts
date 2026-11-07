import { BlockElementIcon, SearchIcon } from "@sanity/icons";

import { ALL_FIELDS_GROUP } from "sanity";
import { metadata } from "@/sanity/schema-types/core/metadata";

/**
 * Base page configuration shared across all page types
 * This provides the common structure (groups, metadata fields) that all page types use
 */
export const basePageConfig = {
  baseFields: metadata,
  groups: [
    {
      icon: SearchIcon,
      name: "metadata",
      title: "Metadata",
    },
    {
      icon: BlockElementIcon,
      name: "content",
      title: "Content",
    },
    {
      ...ALL_FIELDS_GROUP,
      hidden: true,
    },
  ],
  preview: {
    select: {
      subtitle: "slug.current",
      title: "internalTitle",
    },
  },
  type: "document" as const,
};
