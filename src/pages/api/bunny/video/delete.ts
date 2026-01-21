import type { APIRoute } from "astro";

export const prerender = false;

// Delete a Bunny Stream video by its GUID
export const DELETE: APIRoute = async ({ request }) => {
  const libraryId = import.meta.env.BUNNY_LIBRARY_ID;
  const apiKey = import.meta.env.BUNNY_API_KEY;

  if (!(libraryId && apiKey)) {
    return new Response(
      JSON.stringify({
        error:
          "Missing BUNNY_LIBRARY_ID or BUNNY_API_KEY in environment variables",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(request.url);
    let videoId = url.searchParams.get("videoId");

    // Also accept JSON body: { videoId: "..." }
    if (
      !videoId &&
      request.headers.get("content-type")?.includes("application/json")
    ) {
      const body = (await request.json().catch(() => null)) as {
        videoId?: string;
      } | null;
      if (body?.videoId) {
        videoId = body.videoId;
      }
    }

    if (!videoId) {
      return new Response(JSON.stringify({ error: "Missing videoId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const endpoint = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;

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
          error: `Failed to delete video: ${deleteResponse.status} ${deleteResponse.statusText}`,
          detail: errorText,
        }),
        {
          status: deleteResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "Video deleted successfully", videoId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
