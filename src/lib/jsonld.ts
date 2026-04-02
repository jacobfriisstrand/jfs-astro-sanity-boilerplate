import type { Thing, WithContext } from "schema-dts";

/**
 * Safely serializes a JSON-LD object to a string for use in a <script> tag.
 * Escapes closing script tags to prevent XSS via embedded </script>.
 */
export function serializeJsonLd(
  data: WithContext<Thing> | WithContext<Thing>[]
): string {
  return JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>");
}
