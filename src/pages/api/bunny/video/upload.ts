import type { APIRoute } from "astro";

export const prerender = false;

// Upload video to Bunny Stream (create video + upload file)
export const POST: APIRoute = async ({ request }) => {
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) || "";

    if (!file) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 1: Create a video in the library
    const createVideoResponse = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          AccessKey: apiKey,
        },
        body: JSON.stringify({
          title: title || file.name || "Untitled Video",
        }),
      }
    );

    if (!createVideoResponse.ok) {
      const errorText = await createVideoResponse.text();
      return new Response(
        JSON.stringify({
          error: `Failed to create video: ${createVideoResponse.status} ${createVideoResponse.statusText}`,
          detail: errorText,
        }),
        {
          status: createVideoResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const videoData = await createVideoResponse.json();
    const videoId = videoData.guid;

    if (!videoId) {
      return new Response(
        JSON.stringify({
          error: "Failed to get video ID (guid) from creation response",
          detail: JSON.stringify(videoData),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upload the video file
    const arrayBuffer = await file.arrayBuffer();

    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: apiKey,
          "Content-Type": "application/octet-stream",
          accept: "application/json",
        },
        body: arrayBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return new Response(
        JSON.stringify({
          error: `Failed to upload video: ${uploadResponse.status} ${uploadResponse.statusText}`,
          detail: errorText,
        }),
        {
          status: uploadResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Video uploaded successfully",
        videoId,
        title: videoData.title || title || file.name,
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
