import { sanityClient } from "sanity:client";
import type { QueryParams } from "sanity";

const envVisualEditing =
  import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";
// `process.env` is not populated from `.env` files in `astro dev` (only during
// `astro build`), so prefer `import.meta.env` with a `process.env` fallback for
// production/standalone runtime.
const token =
  import.meta.env.SANITY_API_READ_TOKEN ?? process.env.SANITY_API_READ_TOKEN;

export async function loadQuery<QueryResponse>({
  query,
  params,
  preview,
}: {
  query: string;
  params?: QueryParams;
  preview?: boolean;
}) {
  const visualEditingEnabled = preview ?? envVisualEditing;

  if (visualEditingEnabled && !token) {
    throw new Error(
      "The `SANITY_API_READ_TOKEN` environment variable is required during Visual Editing."
    );
  }

  const perspective = visualEditingEnabled ? "drafts" : "published";

  const skipCdn = visualEditingEnabled || import.meta.env.DEV;
  const client = skipCdn
    ? sanityClient.withConfig({ useCdn: false })
    : sanityClient;

  const { result, resultSourceMap } = await client.fetch<QueryResponse>(
    query,
    params ?? {},
    {
      filterResponse: false,
      perspective,
      resultSourceMap: visualEditingEnabled ? "withKeyArraySelector" : false,
      stega: visualEditingEnabled,
      ...(visualEditingEnabled ? { token } : {}),
    }
  );

  return {
    data: result,
    perspective,
    sourceMap: resultSourceMap,
  };
}
