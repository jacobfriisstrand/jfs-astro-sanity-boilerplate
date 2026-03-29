/// <reference types="astro/client" />

// biome-ignore lint/style/noNamespace: Astro requires namespace declaration for App.Locals
declare namespace App {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Astro requires interface for Locals augmentation
  interface Locals {
    isPreview: boolean;
  }
}

declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const component: AstroComponentFactory;
  export default component;
}
