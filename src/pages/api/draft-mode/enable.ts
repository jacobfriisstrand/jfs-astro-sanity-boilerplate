import { sanityClient } from "sanity:client";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import type { APIRoute } from "astro";

const token = process.env.SANITY_API_READ_TOKEN;

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  if (!token) {
    return new Response("Missing SANITY_API_READ_TOKEN", { status: 500 });
  }

  const client = sanityClient.withConfig({ token });
  const { isValid, redirectTo = "/" } = await validatePreviewUrl(
    client,
    request.url
  );

  if (!isValid) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  cookies.set("__sanity_preview", "true", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  return redirect(redirectTo, 307);
};
