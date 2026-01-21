import type { APIRoute } from "astro";

export const prerender = false;

// List videos in Bunny Stream library
export const GET: APIRoute = async () => {
  const libraryId = import.meta.env.BUNNY_LIBRARY_ID;
  const apiKey = import.meta.env.BUNNY_API_KEY;

  if (!(libraryId || apiKey)) {
    return new Response(
      JSON.stringify({
        error:
          "Missing BUNNY_LIBRARY_ID or BUNNY_API_KEY in environment variables",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=10`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          AccessKey: apiKey,
        },
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data, null, 2), {
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
