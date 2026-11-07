/// <reference types="astro/client" />

// biome-ignore lint/style/noNamespace: Astro requires namespace declaration for App.Locals
declare namespace App {
  interface Locals {
    isPreview: boolean;
  }
}

declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";

  const component: AstroComponentFactory;
  export default component;
}
