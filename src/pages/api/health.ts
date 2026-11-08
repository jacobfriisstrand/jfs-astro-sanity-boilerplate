import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
      },
      status: 200,
    }
  );
