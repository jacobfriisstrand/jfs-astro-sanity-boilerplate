/**
 * Type declarations for Sanity virtual modules provided by @sanity/astro
 */
declare module "sanity:client" {
  import type { SanityClient } from "@sanity/client";

  export const sanityClient: SanityClient;
}
