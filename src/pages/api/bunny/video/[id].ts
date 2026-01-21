import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const libraryId = import.meta.env.BUNNY_LIBRARY_ID;
  const apiKey = import.meta.env.BUNNY_API_KEY;
  const videoId = params.id;

  if (!(libraryId || apiKey)) {
    return new Response(
      JSON.stringify({
        error:
          "Missing BUNNY_LIBRARY_ID or BUNNY_API_KEY in environment variables",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!videoId) {
    return new Response(JSON.stringify({ error: "Video ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
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
