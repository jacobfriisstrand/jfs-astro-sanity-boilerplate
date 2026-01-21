import type { APIRoute } from "astro";

export const prerender = false;

const storageZoneName = "jfs-portfolio-image";
const storageRegion = process.env.BUNNY_STORAGE_REGION || ""; // e.g. "ny", "la", etc. Leave empty for default (Frankfurt).
const LEADING_SLASHES_REGEX = /^\/+/;
const BACKSLASH_REGEX = /\\/g;
const TRAILING_SLASHES_REGEX = /\/+$/;

// Delete a Bunny Edge Storage file
// biome-ignore lint: API handler is clearer as a single function
export const DELETE: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.BUNNY_STORAGE_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing BUNNY_STORAGE_API_KEY in environment variables",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(request.url);
    let storagePath = url.searchParams.get("storagePath") ?? "";
    let path = url.searchParams.get("path") ?? "";
    let name = url.searchParams.get("name") ?? "";

    const contentType = request.headers.get("content-type") || "";
    if (!(name && storagePath) && contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as {
        storagePath?: string;
        path?: string;
        name?: string;
      } | null;
      if (body?.storagePath) {
        storagePath = body.storagePath;
      }
      if (body?.path) {
        path = body.path;
      }
      if (body?.name) {
        name = body.name;
      }
    }

    if (!(name || storagePath)) {
      return new Response(
        JSON.stringify({ error: "Missing file name or storagePath" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Prefer storagePath when provided
    let objectPath = storagePath;
    if (!objectPath) {
      const pathPrefix = path
        ? path.replace(LEADING_SLASHES_REGEX, "").replace(BACKSLASH_REGEX, "/")
        : "";
      const normalizedPath = pathPrefix
        ? `${pathPrefix.replace(TRAILING_SLASHES_REGEX, "")}/`
        : "";
      objectPath = `${normalizedPath}${name}`;
    }

    // Normalize final object path: no leading slashes and no zone prefix
    let normalizedObjectPath = objectPath.replace(LEADING_SLASHES_REGEX, "");
    const zonePrefix = `${storageZoneName}/`;
    if (normalizedObjectPath.startsWith(zonePrefix)) {
      normalizedObjectPath = normalizedObjectPath.slice(zonePrefix.length);
    }

    const hostBase = storageRegion
      ? `${storageRegion}.storage.bunnycdn.com`
      : "storage.bunnycdn.com";
    const endpoint = `https://${hostBase}/${storageZoneName}/${normalizedObjectPath}`;

    const deleteResponse = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        AccessKey: apiKey,
        accept: "application/json",
      },
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      return new Response(
        JSON.stringify({
          error: `Failed to delete file: ${deleteResponse.status} ${deleteResponse.statusText}`,
          pathTried: normalizedObjectPath,
          detail: errorText,
        }),
        {
          status: deleteResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "File deleted successfully",
        path: normalizedObjectPath,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
