import type { APIRoute } from "astro";

export const prerender = false;

// List files from Bunny Edge Storage (images)
export const GET: APIRoute = async ({ url }) => {
  const storageZoneName = "jfs-portfolio-image";
  const apiKey = import.meta.env.BUNNY_STORAGE_API_KEY;
  // Pull zone hostname, e.g., "jacobfriisstrand.b-cdn.net"
  const pullZoneName = import.meta.env.BUNNY_PULL_ZONE_NAME;

  // Get optional path from query params (defaults to root)
  const path = url.searchParams.get("path") || "";

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing BUNNY_STORAGE_API_KEY in environment variables",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!pullZoneName) {
    return new Response(
      JSON.stringify({
        error: "Missing BUNNY_PULL_ZONE_NAME in environment variables",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const endpoint = `https://storage.bunnycdn.com/${storageZoneName}/${path}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        AccessKey: apiKey,
      },
    });

    const files = await response.json();

    // Add cdnUrl and thumbnailUrl to each file using Bunny Dynamic Image API
    const filesWithUrls = Array.isArray(files)
      ? files.map((file: { ObjectName: string; Path: string }) => {
          const storagePath = `${file.Path}${file.ObjectName}`;
          return {
            ...file,
            // Full relative path inside the storage zone, e.g. "/images/foo.jpg"
            storagePath,
            cdnUrl: `https://${pullZoneName}/${file.ObjectName}`,
            thumbnailUrl: `https://${pullZoneName}/${file.ObjectName}?width=400&aspect_ratio=1:1`,
          };
        })
      : files;

    return new Response(JSON.stringify(filesWithUrls, null, 2), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
