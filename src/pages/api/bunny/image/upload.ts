import type { APIRoute } from "astro";

export const prerender = false;

const storageZoneName = "jfs-portfolio-image";
const storageRegion = process.env.BUNNY_STORAGE_REGION || ""; // e.g. "ny", "la", etc. Leave empty for default (Frankfurt).
const LEADING_SLASHES_REGEX = /^\/+/;
const BACKSLASH_REGEX = /\\/g;
const TRAILING_SLASHES_REGEX = /\/+$/;

// Upload binary image data to Bunny Edge Storage
// Expects: PUT /api/bunny/image/upload?filename=foo.jpg&path=optional/
export const PUT: APIRoute = async ({ request }) => {
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
    const filenameFromQuery = url.searchParams.get("filename") ?? "";
    const path = url.searchParams.get("path") ?? "";

    const arrayBuffer = await request.arrayBuffer();

    if (!arrayBuffer?.byteLength) {
      return new Response(JSON.stringify({ error: "Empty file body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filename = filenameFromQuery.trim() || `upload-${Date.now()}`;

    // Normalize leading/trailing slashes and backslashes in the optional path
    const pathPrefix = path
      ? path.replace(LEADING_SLASHES_REGEX, "").replaceAll(BACKSLASH_REGEX, "/")
      : "";
    const normalizedPath = pathPrefix
      ? `${pathPrefix.replace(TRAILING_SLASHES_REGEX, "")}/`
      : "";

    const hostBase = storageRegion
      ? `${storageRegion}.storage.bunnycdn.com`
      : "storage.bunnycdn.com";
    const endpoint = `https://${hostBase}/${storageZoneName}/${normalizedPath}${filename}`;

    const putResponse = await fetch(endpoint, {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/octet-stream",
        accept: "application/json",
      },
      body: arrayBuffer,
    });

    const text = await putResponse.text();
    if (!putResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `Upload failed: ${putResponse.status} ${putResponse.statusText}`,
          detail: text,
        }),
        {
          status: putResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Uploaded",
        path: `${normalizedPath}${filename}`,
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
