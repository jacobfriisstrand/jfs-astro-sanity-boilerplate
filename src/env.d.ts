/// <reference types="astro/client" />

// biome-ignore lint/style/noNamespace: Astro requires namespace declaration for App.Locals
declare namespace App {
  interface Locals {
    isPreview: boolean;
  }
}

interface ImportMetaEnv {
  /** Sanity API token (viewer role), used for draft mode / visual editing. Server-only. */
  readonly SANITY_API_READ_TOKEN: string | undefined;
}

declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";

  const component: AstroComponentFactory;
  export default component;
}
