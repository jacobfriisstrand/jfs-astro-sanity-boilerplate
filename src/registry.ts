/**
 * REGISTRY - Single source of truth for page types and components
 *
 * This file is designed to be easily modified by scripts.
 * When adding new page types or components:
 * 1. Add the page type to PAGE_TYPES
 * 2. Add the component to COMPONENTS with its pageTypes array
 * 3. Run `sanity typegen generate` to update types
 */

import { AccessDeniedIcon, HomeIcon } from "@sanity/icons";
import type { PageTypeOne, PageTypeTwo } from "sanity.types";
// ============================================================================
// PAGE TYPES
// ============================================================================

/**
 * Union type of all flexible page types (with components array)
 */
export type FlexiblePageType = never | PageTypeOne | PageTypeTwo;

/**
 * Union type of all fixed page types (with predefined fields)
 * Add fixed page types here when created
 */
export type FixedPageType = never;

/**
 * Union type of all page types
 */
export type AnyPageType = FlexiblePageType | FixedPageType;

/**
 * Component type extracted from flexible page types
 * When FlexiblePageType is never, this resolves to never
 */
export type SanityComponent = FlexiblePageType extends never
  ? never
  : NonNullable<FlexiblePageType["components"]>[number];

export const PAGE_TYPES = {
  homepage: {
    title: "Homepage",
    structureTitle: "Homepage",
    icon: HomeIcon,
  },
  pageTypeOne: {
    title: "Page type 1",
    structureTitle: "Page Type 1's",
    icon: AccessDeniedIcon,
  },
  pageTypeTwo: {
    title: "Page type two",
    structureTitle: "Page type twos",
    icon: AccessDeniedIcon,
  },
} as const;

export type PageTypeName = keyof typeof PAGE_TYPES;

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Component registry entry
 * - title: Display name in Sanity Studio
 * - pageTypes: Which page types can use this component
 * - component: Lazy-loaded component (Astro or React)
 */
type ComponentEntry = {
  title: string;
  pageTypes: PageTypeName[];
  // biome-ignore lint/suspicious/noExplicitAny: Supports both Astro (default export) and React (named export) components
  component: () => Promise<any>;
};

export const COMPONENTS = {
  hero: {
    title: "Hero",
    pageTypes: ["homepage", "pageTypeOne", "pageTypeTwo"],
    component: () => import("@/components/hero.astro"),
  },
} as const satisfies Record<string, ComponentEntry>;

export type ComponentName = keyof typeof COMPONENTS;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get component names available for a specific page type
 */
export function getComponentsForPageType(
  pageType: PageTypeName
): ComponentName[] {
  return (Object.entries(COMPONENTS) as [ComponentName, ComponentEntry][])
    .filter(([_, config]) => config.pageTypes.includes(pageType))
    .map(([name]) => name);
}

/**
 * Get all page type names as array
 */
export function getPageTypeNames(): PageTypeName[] {
  return Object.keys(PAGE_TYPES) as PageTypeName[];
}

/**
 * Get page type config by name
 */
export function getPageType(name: PageTypeName) {
  return PAGE_TYPES[name];
}

/**
 * Check if a page type is fixed (has predefined fields vs components array)
 */
export function isFixedPageType(name: PageTypeName): boolean {
  if (Object.keys(PAGE_TYPES).length === 0) {
    return false;
  }
  const config = PAGE_TYPES[name];
  return "fixed" in config && (config as { fixed?: boolean }).fixed === true;
}
