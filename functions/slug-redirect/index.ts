import { createClient } from "@sanity/client";
import { documentEventHandler } from "@sanity/functions";

/**
 * Sanity Function: slug-redirect
 *
 * Triggered on publish when a document's slug changes.
 * Creates a permanent redirect from the old slug to the new slug using the
 * existing redirect schema (sourceType/sourcePath/destinationType/destinationPath).
 *
 * Also resolves redirect chains: if A→B exists and B changes to C,
 * updates A→B to A→C.
 *
 * @see https://www.sanity.io/recipes/auto-generating-redirects-on-slugs-change-e7c88bfc
 */
export const handler = documentEventHandler(async ({ context, event }) => {
  const client = createClient({
    ...context.clientOptions,
    useCdn: false,
    apiVersion: "2025-05-08",
  });

  const { beforeSlug, slug } = event.data as {
    beforeSlug: string | undefined;
    slug: string | undefined;
  };

  if (!(slug && beforeSlug) || slug === beforeSlug) {
    console.log("No slug change detected");
    return;
  }

  const sourcePath = beforeSlug.startsWith("/") ? beforeSlug : `/${beforeSlug}`;
  const destinationPath = slug.startsWith("/") ? slug : `/${slug}`;

  // Check if redirect already exists for the old slug
  const existingRedirect = await client.fetch(
    `*[_type == "redirect" && sourceType == "custom" && sourcePath == $sourcePath][0]`,
    { sourcePath }
  );

  if (existingRedirect) {
    console.log(`Redirect already exists for source ${sourcePath}`);
    return;
  }

  // Check for redirect loops (new slug → old slug already exists)
  const loopRedirect = await client.fetch(
    `*[_type == "redirect" && sourceType == "custom" && sourcePath == $destinationPath && destinationType == "custom" && destinationPath == $sourcePath][0]`,
    { sourcePath, destinationPath }
  );

  if (loopRedirect) {
    console.log("Redirect loop detected");
    return;
  }

  // Create a new permanent redirect
  try {
    const res = await client.create({
      _type: "redirect",
      sourceType: "custom",
      sourcePath,
      destinationType: "custom",
      destinationPath,
      permanent: true,
    });

    console.log(
      `Redirect from ${sourcePath} to ${destinationPath} was created ${JSON.stringify(res)}`
    );
  } catch (error) {
    console.log(error);
    return;
  }

  // Resolve redirect chains: update any redirects pointing TO the old slug
  // so they point to the new slug instead (A→B becomes A→C)
  const chainingRedirects = await client.fetch<string[]>(
    `*[_type == "redirect" && destinationType == "custom" && destinationPath == $sourcePath]._id`,
    { sourcePath }
  );

  if (chainingRedirects.length > 0) {
    const transaction = client.transaction();
    for (const id of chainingRedirects) {
      transaction.patch(id, (patch) => patch.set({ destinationPath }));
    }
    await transaction.commit();
    console.log(
      `Updated ${chainingRedirects.length} chained redirect(s) to point to ${destinationPath}`
    );
  }
});
